# Sherpas Lens
 
**A plan you can understand in 90 seconds, that feels written for you, and that reminds you to act.**
 
Sherpas Lens turns a family's financial plan into a short, personal, mobile-first experience. It was built for the *Bring the plan to life* challenge (Sherpas x UPV Sigma Data Club hackathon, 12 to 19 November 2026).
 
- Languages: English and Spanish
- Cases: the four households in [`cases/`](cases/)
- Stack: React + Vite + Tailwind (frontend), FastAPI (backend), `gpt-5-mini` through the Sherpas AI proxy
---
 
## What we built and why
 
When Sherpas sends a family their plan, they open it on their own, often before any meeting with an advisor, and may be left with one question: what should we do first? Sherpas Lens turns that plan into a short, personal experience that adapts to how each person feels, explains one idea at a time in plain words, and keeps reminding the family of their next step. They arrive at the advisor's meeting already understanding their plan.

 
**What it does**
 
- **Adapts to how you feel.** The first question is how you feel about your money today. The tone, the length and the number of cards change, while the words stay plain for everyone.
- **One idea per card.** A short front and a back that explains what happens, why it matters to this family and what to do. Exact figures live in an optional detail line.
- **A life map.** The plan's real goals on a timeline, plus an illustrative "what if?" simulator.
- **Couples.** When partners feel differently, the review uses the gentler pace and gives them one step they can take together.
- **A chat that only knows the plan.** For real advice or delicate topics, it hands over to the advisor.
- **Reminders.** Families can import a calendar file with reminders tied to their goals. For upcoming goals, it also includes eight check-ins spaced ten days apart.
The AI writes the words and picks "what if?" levers from a closed list. It does not calculate: every fact comes from the plan.
 
---
 
## How it works
 
| Endpoint | What it does |
|---|---|
| `POST /generar-resumen` | Hook sentence, flip cards, life-map milestones, "what if?" levers and the first step |
| `POST /chat` | Chat limited to the plan; hands over to the advisor when needed |
| `GET /recordatorios/{case}.ics` | Calendar file with the goal dates of the plan |
| `POST /precalcular` | Fills the cache for all combinations |
| `GET /caso/{case}/claves` | Debug: how the case file was read |
 
```
backend/
  main.py       endpoints
  cases.py      reads each family's plan and profile
  prompts.py    instructions for the AI (tone, plain language, no figures on cards)
  summary.py    generation, validation and fallback
  translate.py  English to Spanish
  reminders.py  .ics generator
  cache.py      disk cache
  texts.py      tones, levers and texts per language
frontend/       React + Vite + Tailwind
cases/          the four synthetic households from Sherpas
```
 
## Data and credits
 
All data comes from the four synthetic households provided by Sherpas Wealth for the hackathon. No real client data is used. Amounts are in US dollars.
 
Built by NarratIA for the Sherpas x UPV Sigma Data Club hackathon.
 
