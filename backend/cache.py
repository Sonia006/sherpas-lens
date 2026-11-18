"""Cache en disco de los resumenes ya generados."""
import json
import re

from config import CACHE_DIR


# Cache en disco (la demo no depende de la API en vivo)
def _slug(s: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())[:20] or "todos"

def cache_key(case_id, mood, duration, language, persona, partner_mood=None) -> str:
    extra = f"_p{partner_mood}" if partner_mood else ""
    return f"{case_id}_a{mood}_{duration}_{language}_{_slug(persona)}{extra}"

def read_cache(key: str):
    f = CACHE_DIR / f"{key}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None

def save_cache(key: str, data: dict):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{key}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

# Si la IA falla: cualquier resumen ya guardado de ese caso, mejor si es del mismo animo.
def nearest_cache(case_id: str, mood: int, language: str):
    candidates = sorted(CACHE_DIR.glob(f"{case_id}_*.json"), key=lambda f: (f"_{language}_" not in f.name, f"_a{mood}_" not in f.name, f.name))
    return json.loads(candidates[0].read_text(encoding="utf-8")) if candidates else None
