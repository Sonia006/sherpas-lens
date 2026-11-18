"""Generacion del resumen: llama a la IA, limpia lo que devuelve y tiene plan B."""
import asyncio
import json

from cache import cache_key, nearest_cache, read_cache, save_cache
from cases import case_context
from config import BASE_LANG, LLM_MODEL, llm, log
from links import advisor_link, reminders_link
from models import SummaryRequest
from prompts import summary_prompt
from texts import DEFAULT_LEVERS, LEVERS, TEXTS, build_levers
from translate import translate_summary


# Cuantas flashcards mostrar. Agobiado o con poco tiempo -> menos.
def num_cards(mood: int, duration: str) -> int:
    if duration == "corto":
        base = 5
    else:
        base = 10

    if mood <= 2:
        base = max(5, base - 1)
    return base

def normalize(raw: dict, req: SummaryRequest, n: int, score, score_block=None, free_month=None) -> dict:
    cards = []
    for t in (raw.get("tarjetas") or [])[:n]:
        front, back = str(t.get("frente", "")).strip(), str(t.get("reverso", "")).strip()
        if front and back:
            cards.append({
                "id": f"t{len(cards) + 1}",
                "frente": front,
                "reverso": back,
                "detalle": str(t.get("detalle") or "").strip(),
                "meta_id": t.get("meta_id") or None,
            })
    if len(cards) < n:
        raise ValueError(f"La IA devolvio {len(cards)} tarjetas validas y se piden {n}")
    if not str(raw.get("frase_inicial") or "").strip():
        raise ValueError("La IA no devolvio frase inicial")

    milestones = []
    for h in raw.get("hitos") or []:
        try:
            milestones.append({"id": str(h["id"]), "anio": int(h["anio"]), "titulo": str(h["titulo"]).strip()})
        except (KeyError, TypeError, ValueError):
            continue
    milestones.sort(key=lambda h: h["anio"])

    valid_ids = {h["id"] for h in milestones}
    for c in cards:
        if c["meta_id"] not in valid_ids:
            c["meta_id"] = None

    ids, seen = [], set()
    for p in raw.get("palancas") or []:
        if p in LEVERS and p not in seen:
            seen.add(p)
            ids.append(p)
    ids = (ids or DEFAULT_LEVERS)[:3]
    levers = build_levers(ids, req.idioma, free_month, req.case_id)

    step = raw.get("siguiente_paso") or {}
    step_title = str(step.get("titulo") or TEXTS[req.idioma]["default_step"]).strip()
    try:
        minutes = max(1, min(120, int(step.get("minutos"))))
    except (TypeError, ValueError):
        minutes = None
    next_step = {
        "titulo": step_title,
        "razon": str(step.get("razon") or "").strip(),
        "minutos": minutes,
        "pasos": [str(p).strip() for p in (step.get("pasos") or [])][:5],
        "acciones": {"recordatorios_url": reminders_link(req.case_id, req.idioma), "asesor_url": advisor_link(step_title, req.idioma)},
    }

    block = score_block if isinstance(score_block, dict) else {}
    return {
        "case_id": req.case_id,
        "animo": req.animo,
        "tono": TEXTS[req.idioma]["mood"][req.animo_efectivo],
        "tiempo": req.tiempo,
        "idioma": req.idioma,
        "num_tarjetas": len(cards),
        "frase_inicial": str(raw.get("frase_inicial") or "").strip(),
        "tarjetas": cards,
        "mapa": {
            "score_base": score,  # puntuacion real del plan (0-100) o None
            "pilares": block.get("pillars") or [],
            "movimientos": block.get("top_moves") or [],
            "combinaciones": block.get("combined_moves") or [],
            "limites": block.get("caps_applied") or [],
            "hitos": milestones,
            "palancas": levers,
            "ilustrativo": True,
            "aviso": TEXTS[req.idioma]["notice"],
        },
        "siguiente_paso": next_step,
        "fallback": False,
    }

def fallback_summary(req: SummaryRequest) -> dict:
    """Ultimo recurso: que el frontend nunca se quede sin nada."""
    nearest = nearest_cache(req.case_id, req.animo, req.idioma)
    if nearest:
        return {**nearest, "fallback": True}
    texts = TEXTS[req.idioma]
    step = texts["fallback_step"]
    return {
        "case_id": req.case_id, "animo": req.animo, "tono": texts["mood"][req.animo_efectivo], "tiempo": req.tiempo, "idioma": req.idioma,
        "num_tarjetas": 1,
        "frase_inicial": texts["fallback_intro"],
        "tarjetas": [{"id": "t1", "frente": texts["fallback_front"], "reverso": texts["fallback_back"],
                      "detalle": "", "meta_id": None}],
        "mapa": {"score_base": None, "pilares": [], "movimientos": [], "combinaciones": [], "limites": [],
                 "hitos": [], "palancas": build_levers(DEFAULT_LEVERS, req.idioma),
                 "ilustrativo": True, "aviso": texts["short_notice"]},
        "siguiente_paso": {"titulo": step, "razon": "", "minutos": None, "pasos": [],
                           "acciones": {"recordatorios_url": reminders_link(req.case_id, req.idioma), "asesor_url": advisor_link(step, req.idioma)}},
        "fallback": True,
    }

async def build_summary(req: SummaryRequest) -> dict:
    key = cache_key(req.case_id, req.animo, req.tiempo, req.idioma, req.persona, req.animo_pareja)
    if not req.regenerar:
        cached = read_cache(key)
        if cached:
            return cached

    ctx = await case_context(req.case_id)

    if req.idioma != BASE_LANG:
        base = await build_summary(req.model_copy(update={"idioma": BASE_LANG, "regenerar": False}))
        result = await translate_summary(base, req, ctx)
        save_cache(key, result)
        return result

    n = num_cards(req.animo_efectivo, req.tiempo)
    last_error = None
    for attempt in (1, 2):
        try:
            # Sin max_tokens ni temperature: gpt-5-mini razona y un limite bajo devuelve respuestas vacias
            resp = await llm.chat.completions.create(
                model=LLM_MODEL,
                reasoning_effort="minimal",
                messages=summary_prompt(req, ctx, n),
                response_format={"type": "json_object"},
            )
            raw = json.loads(resp.choices[0].message.content)
            result = normalize(raw, req, n, ctx["score"], ctx["score_block"], ctx.get("free_month"))
            save_cache(key, result)
            return result
        except Exception as e:  # JSON roto, timeout, 429...
            last_error = e
            log.warning("Intento %s fallido (%s): %s", attempt, key, e)
            await asyncio.sleep(1.5)
    raise RuntimeError(f"No se pudo generar el resumen: {last_error}")