"""Recordatorios: genera el .ics con las metas reales del plan (un clic y el calendario avisa solo)."""
import random
from datetime import date, datetime, timedelta, timezone

from cache import _slug
from config import APP_URL
from texts import TEXTS


def plan_goals(fh) -> list[dict]:
    goals = []
    for g in ((fh or {}).get("goals") or {}).get("chartGoals") or [] if isinstance(fh, dict) else []:
        try:
            day = datetime.fromisoformat(g["date"].replace("Z", "+00:00")).date()
        except (KeyError, ValueError, AttributeError):
            continue
        goals.append({"date": day, "type": g.get("subType") or g.get("goalType"), "name": str(g.get("name") or "")})
    return goals

def goal_label(g: dict, lang: str) -> str:
    texts = TEXTS[lang]
    template = texts["goal_names"].get(g["type"])
    if not template:
        return g["name"]
    name = g["name"]
    who = name[:-len("'s Retirement")] if name.endswith("'s Retirement") else name.split(" ", 1)[1] if " " in name else ""
    return template.format(who=who or texts["family"])

def _ics_text(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

def _fold(line: str) -> str:  # las lineas de un .ics no pasan de 75 bytes
    parts, cur = [], ""
    for ch in line:
        if len((cur + ch).encode()) > (74 if parts else 75):
            parts.append(cur)
            cur = ch
        else:
            cur += ch
    parts.append(cur)
    return "\r\n ".join(parts)

NUDGE_ANCHOR = date(2026, 1, 5)  # los avisos sueltos caen siempre en una rejilla de 10 dias contada desde esta fecha

def build_ics(case_id: str, goals: list[dict], lang: str) -> str:
    ics = TEXTS[lang]["ics"]
    today = date.today()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    events = []

    def add(uid, day, hour, summary, desc):
        start = datetime(day.year, day.month, day.day, hour)
        events.append(["BEGIN:VEVENT", f"UID:{uid}@sherpas-lens", f"DTSTAMP:{stamp}",
                       f"DTSTART:{start:%Y%m%dT%H%M%S}", f"DTEND:{start + timedelta(minutes=15):%Y%m%dT%H%M%S}",
                       f"SUMMARY:{_ics_text(summary)}", f"DESCRIPTION:{_ics_text(desc)}"]
                      + ([f"URL:{APP_URL}"] if APP_URL else [])
                      + ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{_ics_text(summary)}", "TRIGGER:PT0S",
                         "END:VALARM", "END:VEVENT"])

    upcoming = [g for g in goals if g["date"] >= today]
    for g in upcoming:  # avisos en las fechas reales de cada meta
        label = goal_label(g, lang)
        for days, when in ics["when"].items():
            day = g["date"] - timedelta(days=days)
            if day >= today:
                add(f"{case_id}-{g['date']}-{days}-{_slug(label)}", day, 9, f"{label}: {when}", ics["open"])
    start = today + timedelta(days=(-(today - NUDGE_ANCHOR).days) % 10)
    for i in range(8 if upcoming else 0):  # avisos sueltos, repartidos entre las metas
        day = start + timedelta(days=i * 10)
        r = random.Random(f"{case_id}-{day}")
        g = upcoming[r.randrange(len(upcoming))]
        add(f"{case_id}-nudge-{day}", day, r.randint(9, 19), f"{goal_label(g, lang)} · {g['date'].year}", r.choice(ics["nudges"]))

    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sherpas Lens//EN", "CALSCALE:GREGORIAN",
             f"X-WR-CALNAME:{_ics_text(ics['cal_name'])}", "REFRESH-INTERVAL;VALUE=DURATION:P1D", "X-PUBLISHED-TTL:P1D"]
    for ev in events:
        lines += ev
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(l) for l in lines) + "\r\n"
