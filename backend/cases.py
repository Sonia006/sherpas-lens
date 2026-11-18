"""Lectura del informe de cada familia (ficheros locales o MCP) y los datos que se sacan de el."""
import json
import os
import re
from pathlib import Path

from fastapi import HTTPException

from config import PLAN_MODE


# Primero ficheros locales (no caducan), luego MCP
def _cases_dir() -> Path | None:
    for c in (os.getenv("CASES_DIR"), "cases", "../cases"):
        if c and Path(c).is_dir():
            return Path(c)
    return None

async def _load_mcp(case_id: str):
    # El backend funciona sin 'mcp' si usas ficheros locales
    from mcp import ClientSession
    from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client

    http = create_mcp_http_client(headers={"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"})
    async with streamable_http_client(os.environ["MCP_URL"], http_client=http) as (read, write, *_):
        async with ClientSession(read, write) as mcp:
            await mcp.initialize()

            async def fetch(part, section=None):
                args = {"caseId": case_id, "part": part}
                if section:
                    args["section"] = section
                r = await mcp.call_tool("get_case", args)
                txt = r.content[0].text
                try:
                    d = json.loads(txt)
                    return d.get("value", d)
                except json.JSONDecodeError:
                    return txt  # la persona viene como Markdown

            fh = await fetch("financial-health")
            persona = await fetch("persona")
    return fh, persona if isinstance(persona, str) else json.dumps(persona)


_CTX: dict[str, dict] = {}  # contexto ya preparado por caso (evita releer en cada peticion)

async def case_context(case_id: str) -> dict:
    if case_id in _CTX:
        return _CTX[case_id]

    fh, persona_md = None, ""
    base = _cases_dir()
    if base and (base / case_id / "financial-health.json").exists():
        folder = base / case_id
        fh = json.loads((folder / "financial-health.json").read_text(encoding="utf-8"))
        pm = folder / "persona.md"
        persona_md = pm.read_text(encoding="utf-8") if pm.exists() else ""
    elif os.getenv("MCP_TOKEN") and os.getenv("MCP_URL"):
        fh, persona_md = await _load_mcp(case_id)
    else:
        raise HTTPException(404, f"No encuentro el caso '{case_id}' (ni en cases/ ni por MCP)")

    ctx = {
        "plan": extract_plan(fh),
        "persona": extract_persona(persona_md),
        "score": find_score(fh),
        "score_block": fh.get("score") if isinstance(fh, dict) else None,
        "free_month": find_free_month(fh),
        "_fh": fh,
    }
    _CTX[case_id] = ctx
    return ctx

# Lee la puntuacion publicada del plan (score.published_score)
def find_score(fh):
    try:
        v = fh["score"]["published_score"]
    except (KeyError, TypeError):
        return None
    is_num = isinstance(v, (int, float)) and not isinstance(v, bool)
    return v if is_num and 0 <= v <= 100 else None

def find_free_month(fh):
    """Dinero libre al mes (flujo de caja anual del plan / 12). None si no está."""
    try:
        v = fh["key_metrics"]["facts"]["retirement"]["netCashFlowThisYear"]["value"]
    except (KeyError, TypeError):
        return None
    return v / 12 if isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0 else None

# Plan para el prompt: el informe completo, o solo las secciones utiles si PLAN_MODE=lean
def extract_plan(fh) -> str:
    """Version del plan para el prompt."""
    if PLAN_MODE == "lean" and isinstance(fh, dict):
        chosen = {k: fh[k] for k in ("case", "goals", "narrative", "score") if k in fh}
        key_metrics = fh.get("key_metrics")
        if isinstance(key_metrics, dict) and key_metrics.get("facts"):
            chosen["key_facts"] = key_metrics["facts"]
        fh = chosen or fh
    return json.dumps(fh, ensure_ascii=False, separators=(",", ":"))

# Perfil del cliente: persona.md entero, o solo las secciones utiles si PLAN_MODE=lean
def extract_persona(md: str) -> str:
    """Perfil para el prompt: vida, riesgo, decision, motivacion, preocupaciones y tensiones."""
    if not md or PLAN_MODE != "lean":
        return md
    parts = re.split(r"(?m)^(?=#{1,4}\s)", md)
    keys = ("d1", "d4", "d5", "d6", "subjective", "objective", "tension")
    chosen = [p[:1500] for p in parts if any(c in p.split("\n", 1)[0].lower() for c in keys)]
    return "\n\n".join(chosen) if chosen else md[:6000]