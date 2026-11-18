"""Traduccion al español del resumen y del mapa."""
import asyncio
import copy
import json
import re

from cache import read_cache, save_cache
from config import LLM_MODEL, llm, log
from links import advisor_link, reminders_link
from models import SummaryRequest
from texts import TEXTS, build_levers


_MAP_LOCK = asyncio.Lock()

# Traduce al español los textos del mapa una vez por caso (se guarda en cache)
async def map_texts(case_id, block, language):
    if language != "es" or not isinstance(block, dict):
        return block
    keys = ("pillars", "top_moves", "combined_moves", "caps_applied")
    src = {k: block.get(k) or [] for k in keys}
    async with _MAP_LOCK:
        cached = read_cache(f"mapa_{case_id}")
        if cached:
            return {**block, **cached}
        try:
            resp = await llm.chat.completions.create(
                model=LLM_MODEL,
                reasoning_effort="minimal",
                messages=[
                    {"role": "system", "content": "Adapta al español sencillo y natural, sin jerga financiera y sin calcos del inglés, los textos de este JSON. Vocabulario fijo: " + GLOSSARY + ". "},
                    {"role": "user", "content": json.dumps(src, ensure_ascii=False)},
                ],
                response_format={"type": "json_object"},
            )
            out = json.loads(resp.choices[0].message.content)
            trad = {k: out.get(k) or [] for k in keys}
            if all(len(trad[k]) == len(src[k]) for k in keys):
                save_cache(f"mapa_{case_id}", trad)
                return {**block, **trad}
        except Exception as e:
            log.warning("Traduccion del mapa fallida (%s): %s", case_id, e)
        return block

GLOSSARY = ("emergency fund / cash reserve = colchón para imprevistos; life insurance = seguro de vida; "
            "umbrella insurance = seguro extra por si os reclaman una cantidad muy grande; "
            "401(k) = plan de ahorro para la jubilación de la empresa; 529 = ahorro para la universidad de los niños; "
            "home equity = la parte de la casa que ya es vuestra; credit card debt = la deuda de la tarjeta; "
            "goal = meta; next step = siguiente paso; "
            "cash account = cuenta de efectivo; per year = al año; per month = al mes; "
            "Chase CC = la tarjeta de Chase")

TRANSLATE_RULES = """You adapt a short financial-plan summary from English into {language}. This is NOT a literal translation: rewrite each text the way a warm, clear person would say it in a kitchen conversation with a family that has no financial training.

READER: a family in the US. Today they feel "{mood}": let that set the warmth of the wording, and never mention it.

HOW TO ADAPT
- Translate the meaning, not the words. Rephrase and reorder freely inside each field, as long as the facts stay the same and each sentence keeps one idea.
- Avoid calques and stiff phrasing. Examples: "you're on track" -> "vais por buen camino" (not "estáis en la pista"); "put your cash to work" -> "que ese dinero trabaje para vosotros"; "a cushion for surprises" -> "un colchón para imprevistos".
- Short sentences and everyday verbs (pagar, apartar, comprobar, elegir, mantener). No bank or finance jargon, no acronyms.
- Register: tú for one person, vosotros for two or more.
- Use this vocabulary every time: {glossary}.
- Keep "hitos" titles ultra-short: maximum 3 words per title.
- "hitos": each item has an "id" (keep it unchanged) and a "titulo" that you MUST translate into {language}
  (e.g. "Buy a home" -> "Comprar una casa", "Emma's college" -> "Universidad de Emma"). Keep it to 3 words max.
  Only people's names stay as they are.

KEEP EXACTLY: people's names, bank names (e.g. Chase), years, dates, numbers, currency symbols and amounts (write $6,800 as "$6,800"), JSON keys, and the order and number of items. Empty strings stay empty.
EVERY text value must come back in {language}: frase_inicial, frente, reverso, detalle, the "titulo" of each hito, and the titulo, razon and pasos of siguiente_paso.
TRANSLATE EVERYTHING ELSE, including "detalle": it is expert text full of figures and plan labels, but every word that is not a name, number or symbol must be in {language}. Translate generic account types ("Cash account" -> "cuenta de efectivo"), units ("/yr" -> "al año") and plan terms. A "detalle" left in English is an error."""

ENGLISH_WORDS = (r"\b(the|and|your|you|from|with|for|per|toward|after|needed|estimated|current|cash|reach|to|of|is|are"
                 r"|in|on|it|we|be|can|will|not|more|first|if|at|by|an|this|that|have|about|before|than)\b")

async def translate_texts(texts: list[str]) -> list[str]:
    resp = await llm.chat.completions.create(
        model=LLM_MODEL,
        reasoning_effort="low",
        messages=[{"role": "system", "content": "Translate each text from English into plain Spanish. Keep people's names, years, numbers, currency amounts and the order. Translate every other word, including account types and units. Vocabulary: " + GLOSSARY + '. Reply with JSON {"textos": [...]} with exactly the same number of items.'},
                  {"role": "user", "content": json.dumps({"textos": texts}, ensure_ascii=False)}],
        response_format={"type": "json_object"},
    )
    out = json.loads(resp.choices[0].message.content)["textos"]
    if len(out) != len(texts):
        raise ValueError("La traduccion no conserva el numero de textos")
    return [str(x).strip() for x in out]

LANGUAGE_NAMES = {"es": "Spanish (informal 'tú', plain everyday words)", "en": "English"}

# Traduce un resumen ya generado en BASE_LANG: mucho mas rapido que generarlo de nuevo
async def translate_summary(base: dict, req: SummaryRequest, ctx: dict) -> dict:
    lang, texts = req.idioma, TEXTS[req.idioma]
    step = base["siguiente_paso"]
    src = {
        "frase_inicial": base["frase_inicial"],
        "tarjetas": [{k: t[k] for k in ("frente", "reverso", "detalle")} for t in base["tarjetas"]],
        "hitos": [{"id": h["id"], "titulo": h["titulo"]} for h in base["mapa"]["hitos"]],
        "siguiente_paso": {k: step[k] for k in ("titulo", "razon", "pasos")},
    }
    system = TRANSLATE_RULES.format(language=LANGUAGE_NAMES[lang], mood=texts["mood"][req.animo_efectivo], glossary=GLOSSARY)

    block_task = asyncio.create_task(map_texts(req.case_id, ctx["score_block"], lang))
    last_error = None
    for attempt in (1, 2):
        try:
            resp = await llm.chat.completions.create(
                model=LLM_MODEL,
                reasoning_effort="minimal",
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": json.dumps(src, ensure_ascii=False)}],
                response_format={"type": "json_object"},
            )
            out = json.loads(resp.choices[0].message.content)
            sp = out["siguiente_paso"]
            if (len(out["tarjetas"]) != len(src["tarjetas"]) or len(out["hitos"]) != len(src["hitos"])
                    or [h.get("id") for h in out["hitos"]] != [h["id"] for h in src["hitos"]]
                    or len(sp["pasos"]) != len(step["pasos"]) or not str(out["frase_inicial"]).strip()):
                raise ValueError("La traduccion no conserva la estructura")

            break
        except Exception as e:
            last_error = e
            log.warning("Traduccion del resumen fallida, intento %s: %r", attempt, e)
            await asyncio.sleep(0.5)
    else:
        raise RuntimeError(f"No se pudo traducir el resumen: {last_error}")

    block = await block_task
    block = block if isinstance(block, dict) else {}
    result = copy.deepcopy(base)
    result.update(idioma=lang, tono=texts["mood"][req.animo_efectivo], frase_inicial=str(out["frase_inicial"]).strip())

    for c, t in zip(result["tarjetas"], out["tarjetas"]):
        for k in ("frente", "reverso", "detalle"):
            c[k] = str(t.get(k) or "").strip()

    for h, t in zip(result["mapa"]["hitos"], out["hitos"]):
        h["titulo"] = str(t.get("titulo") or h["titulo"]).strip()
    title = str(sp.get("titulo") or texts["default_step"]).strip()

    result["siguiente_paso"].update(
        titulo=title, razon=str(sp.get("razon") or "").strip(),
        pasos=[str(p).strip() for p in sp["pasos"]],
        acciones={"recordatorios_url": reminders_link(req.case_id, lang), "asesor_url": advisor_link(title, lang)})
    result["mapa"].update(
        pilares=block.get("pillars") or [], movimientos=block.get("top_moves") or [],
        combinaciones=block.get("combined_moves") or [], limites=block.get("caps_applied") or [],
        palancas=build_levers([p["id"] for p in base["mapa"]["palancas"]], lang, ctx.get("free_month"), req.case_id),
        aviso=texts["notice"])

    # Lo que siga en ingles (el modelo se salta campos a veces) se traduce aparte, sea del campo que sea
    sp_out, pasos = result["siguiente_paso"], result["siguiente_paso"]["pasos"]
    fields = [(result, "frase_inicial", base["frase_inicial"]), (sp_out, "titulo", step["titulo"]), (sp_out, "razon", step["razon"])]
    fields += [(pasos, i, step["pasos"][i]) for i in range(len(pasos))]
    for c, b in zip(result["tarjetas"], base["tarjetas"]):
        fields += [(c, "frente", b["frente"]), (c, "reverso", b["reverso"]), (c, "detalle", b["detalle"])]
    fields += [(h, "titulo", b["titulo"]) for h, b in zip(result["mapa"]["hitos"], base["mapa"]["hitos"])]
    pending = [(d, k) for d, k, original in fields
               if d[k] and (re.search(ENGLISH_WORDS, d[k], re.I) or (k != "detalle" and d[k] == original))]
    if pending:
        try:
            for (d, k), text in zip(pending, await translate_texts([d[k] for d, k in pending])):
                d[k] = text
        except Exception as e:
            log.warning("Traduccion de los textos pendientes fallida: %r", e)
    return result