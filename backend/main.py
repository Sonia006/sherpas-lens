"""
Sherpas Lens - backend

Endpoints:
  POST /generar-resumen   -> frase inicial + flashcards + datos del mapa + siguiente paso
  POST /chat              -> chat con IA que solo habla del plan de la familia
  POST /precalcular       -> genera y guarda en cache todas las combinaciones (hacerlo antes de la demo)
  GET  /caso/{id}/claves  -> depuracion: que estructura tienen los JSON y que se extrae

Idea clave: la IA solo redacta textos y elige palancas de una lista cerrada.
Las cifras salen del plan y el mapa lo dibuja un componente fijo del frontend.

Ficheros (cada uno hace una sola cosa):
  main.py       los endpoints: lo que llama el frontend
  config.py     variables de entorno, constantes y cliente de la IA
  models.py     los datos que recibe la API
  cases.py      lee el informe de cada familia (ficheros locales o MCP)
  prompts.py    instrucciones que se dan a la IA (resumen y chat)
  summary.py    genera el resumen: llama a la IA, lo limpia y tiene plan B
  translate.py  pasa el resumen y el mapa al español
  texts.py      textos y datos fijos (tonos, palancas, textos por idioma)
  links.py      enlaces de la respuesta (recordatorios y correo al asesor)
  reminders.py  genera el .ics con las metas del plan
  cache.py      guarda en disco los resumenes ya generados

Arranque:  uvicorn main:app --reload --port 8000
"""
import asyncio
import json
import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException, Path as FPath, Response
from fastapi.middleware.cors import CORSMiddleware

from cases import case_context
from config import ADMIN_TOKEN, BASE_LANG, CASE_PATTERN, CASES, LLM_MODEL, PLAN_MODE, llm, log
from links import advisor_link
from models import ChatRequest, SummaryRequest
from prompts import COMMON_RULES, LANGUAGE_RULE, LANGUAGES, audience
from reminders import build_ics, plan_goals
from summary import build_summary, fallback_summary
from texts import TEXTS, TONES

app = FastAPI(title="Sherpas Lens API", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_ORIGINS", "*").split(","),
    allow_credentials=False,  # con "*" no puede ser True
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generar-resumen")
async def generate_summary(req: SummaryRequest):
    try:
        return {"status": "success", "resultado": await build_summary(req)}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Usando reserva: %s", e)
        return {"status": "fallback", "error": str(e)[:300], "resultado": fallback_summary(req)}

@app.get("/recordatorios/{case_id}.ics")
async def reminders(case_id: str = FPath(pattern=CASE_PATTERN), idioma: Literal["es", "en"] = "en"):
    goals = plan_goals((await case_context(case_id))["_fh"])
    if not goals:
        raise HTTPException(404, "El plan no tiene metas con fecha")
    return Response(build_ics(case_id, goals, idioma), media_type="text/calendar",
                    headers={"Content-Disposition": f'attachment; filename="{case_id}.ics"'})

# Chat con el plan
@app.post("/chat")
async def chat(req: ChatRequest):
    ctx = await case_context(req.case_id)
    label, tone = TONES[req.animo_efectivo]
    who, couple = audience(req)
    who = who.replace("Habla con", "Hablas con") if not req.animo_pareja else who
    system = f"""Eres el asistente de 'Sherpas Lens'. Respondes dudas sobre el plan financiero de esta familia.
{who} Idioma: {LANGUAGES[req.idioma]}.
TONO: {tone}

{COMMON_RULES}
- Responde SOLO con lo que dice el plan. Menciona de donde sale ("segun tu plan...").
- Si preguntan por una cifra o un termino, dales el dato del plan y explicalo con palabras normales; no calcules cifras nuevas.
- Maximo 80 palabras. Frases cortas.{couple}
- Si la pregunta no se puede responder con el plan, o pide asesoramiento fiscal/legal/de inversion concreto,
  o toca algo delicado (muerte, salud, divorcio, mucha angustia), di que no puedes decidirlo por el
  y pon "derivar_asesor": true.

<plan>
{ctx['plan']}
</plan>

<perfil>
{ctx['persona']}
</perfil>

Devuelve EXCLUSIVAMENTE un JSON: {{"respuesta": "...", "derivar_asesor": false}}

{LANGUAGE_RULE[req.idioma]}"""

    history = [{"role": m.role, "content": m.content} for m in req.mensajes[-10:]]
    try:
        resp = await llm.chat.completions.create(
            model=LLM_MODEL,
            reasoning_effort="minimal",
            messages=[{"role": "system", "content": system}, *history],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        text = str(data.get("respuesta") or "").strip()
        escalate = bool(data.get("derivar_asesor"))
        if not text:
            raise ValueError("respuesta vacia")
    except Exception as e:
        log.error("Chat fallido: %s", e)
        text, escalate = TEXTS[req.idioma]["chat_error"], True

    return {
        "respuesta": text,
        "derivar_asesor": escalate,
        "asesor_url": advisor_link(req.mensajes[-1].content[:120], req.idioma) if escalate else None,
    }

# Utilidades: precalcular y depurar
@app.post("/precalcular")
async def precompute(x_admin_token: str = Header(default=""), regenerar: bool = False, idiomas: str = "en,es"):
    """Genera 4 casos x 5 animos x 2 tiempos y los guarda en cache. Ejecurar antes de la demo."""
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "Falta X-Admin-Token")

    sem = asyncio.Semaphore(3)  # el proxy permite 4 peticiones concurrentes por equipo
    results = {"ok": 0, "errores": []}

    langs = sorted((l for l in idiomas.split(",") if l in TEXTS), key=lambda l: l != BASE_LANG)

    async def run_one(case_id, mood, duration, lang):
        async with sem:
            try:
                await build_summary(SummaryRequest(case_id=case_id, animo=mood, tiempo=duration,
                                                   idioma=lang, regenerar=regenerar))
                results["ok"] += 1
            except Exception as e:
                results["errores"].append(f"{case_id} a{mood} {duration}: {e}")

    for lang in langs:  # primero el idioma base; los demas solo traducen
        await asyncio.gather(*[run_one(c, a, t, lang) for c in CASES for a in range(1, 6) for t in ("corto", "completo")])

    return results


@app.get("/caso/{case_id}/claves")
async def case_keys(case_id: str = FPath(pattern=CASE_PATTERN), x_admin_token: str = Header(default=""),):
    """Para comprobar que se lee bien cada caso y ajustar extraer_plan/buscar_score si hace falta."""
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "Falta X-Admin-Token válido")
    ctx = await case_context(case_id)
    fh = ctx["_fh"]
    return {
        "claves_financial_health": list(fh.keys()) if isinstance(fh, dict) else type(fh).__name__,
        "score_detectado": ctx["score"],
        "modo": PLAN_MODE,
        "tokens_aprox_prompt": (len(ctx["plan"]) + len(ctx["persona"])) // 4,
        "caracteres_plan": len(ctx["plan"]),
        "caracteres_persona": len(ctx["persona"]),
        "persona_inicio": ctx["persona"][:300],
        "free_month_detectado": ctx["free_month"],
    }

@app.get("/")
async def health():
    return {"status": "ok", "modelo": LLM_MODEL, "casos": CASES}
