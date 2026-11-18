"""Enlaces que lleva la respuesta: recordatorios y correo al asesor."""
from urllib.parse import quote

from config import ADVISOR_EMAIL
from texts import TEXTS


def reminders_link(case_id: str, language: str) -> str:
    return f"/recordatorios/{case_id}.ics?idioma={language}"


def advisor_link(title: str, language: str) -> str:
    subject = quote(TEXTS[language]["mail_subject"])
    body = quote(TEXTS[language]["mail_body"].format(title=title))
    return f"mailto:{ADVISOR_EMAIL}?subject={subject}&body={body}"
