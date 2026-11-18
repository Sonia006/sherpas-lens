"""Configuracion: variables de entorno, constantes y cliente de la IA."""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sherpas-lens")


LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://llm-hackathon.sherpaswealth.com/v1")
LLM_API_KEY = os.getenv("TEAM_KEY") or os.getenv("GROQ_API_KEY") or "missing"
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-5-mini")
ADVISOR_EMAIL = os.getenv("ASESOR_EMAIL", "asesor@example.com")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
APP_URL = os.getenv("APP_URL", "")  # enlace a la app que llevan los recordatorios
API_URL = os.getenv("API_URL", "").rstrip("/")
PLAN_MODE = os.getenv("PLAN_MODE", "full")  # "full" = informes completos, "lean" = solo secciones clave
CACHE_DIR = Path(os.getenv("CACHE_DIR", "cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)

CASES = ["timothy-melanie-weah", "michael-carter", "daniel-emily-johnson", "samantha-lewis"]
BASE_LANG = "en"  # idioma en el que se genera; el resto se traduce
CASE_PATTERN = r"^[a-z0-9-]{3,60}$"  # evita rutas raras

llm = AsyncOpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY, timeout=90, max_retries=0)
