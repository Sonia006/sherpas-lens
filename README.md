# Sherpas Lens

**A plan you can understand in 90 seconds, that feels written for you, and that reminds you to act.**

Sherpas Lens turns a family's financial plan into a short, personal, mobile-first experience. It was built for the *Bring the plan to life* challenge (Sherpas x UPV Sigma Data Club hackathon, 12 to 19 November 2026).

- Languages: English and Spanish
- Cases: the four households in [`cases/`](cases/)
- Stack: React + Vite + Tailwind (frontend), FastAPI (backend), `gpt-5-mini` through the Sherpas AI proxy

---

## What we built and why

When Sherpas sends a family their plan, they often open it alone, before any meeting with an advisor. It is a lot to take in, and the real question is simple: *what should we do first?* Sherpas Lens turns the plan into a short, personal experience that adapts to how each person feels, explains one idea at a time in plain words, and keeps reminding the family of their next step. They arrive at the advisor's meeting already understanding their plan, or, if they never meet one, the plan still works on its own.

**What it does**

- **Adapts to how you feel.** The first question is how you feel about your money today. The tone, the length and the number of cards change, while the words stay plain for everyone.
- **One idea per card.** A short front and a back that explains what happens, why it matters to this family and what to do. Exact figures live in an optional detail line.
- **A life map.** The plan's real goals on a timeline, plus an illustrative "what if?" simulator.
- **Couples.** When partners feel differently, the review uses the gentler pace and gives them one step they can take together.
- **A chat that only knows the plan.** For real advice or delicate topics, it hands over to the advisor.
- **Reminders.** Families can import a calendar file with reminders tied to their goals. For upcoming goals, it also includes eight check-ins spaced ten days apart, so the plan comes back on day 3 or day 30, not only on the day it arrives.

The AI writes the words and picks "what if?" levers from a closed list. It does not calculate: every fact comes from the plan, so no numbers are invented.

---

## Run the MVP locally

**Requirements:** Python 3.10+, Node 20+ and a team AI key (from your [access page](https://mcp-hackathon.sherpaswealth.com/personal-token)).

### 0. First time only: clone and install

```bash
git clone https://github.com/Sonia006/sherpas-lens.git
cd sherpas-lens
```

Create a `.env` file at the root of the repo (it is git-ignored):

```env
TEAM_KEY=your-team-ai-key
# Optional
# LLM_BASE_URL=https://llm-hackathon.sherpaswealth.com/v1
# LLM_MODEL=gpt-5-mini
# ASESOR_EMAIL=advisor@example.com
# PLAN_MODE=full        # "lean" sends only the key sections to the model
```

Install the dependencies:

```bash
cd backend
pip install fastapi "uvicorn[standard]" openai python-dotenv pydantic
cd ../frontend
npm install
```

### 1. Start the backend (terminal 1)

Open a terminal and go to the `backend` folder:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Check it at <http://localhost:8000/>: it should return `{"status":"ok", ...}`.

### 2. Start the frontend (terminal 2)

Open a second terminal and go to the `frontend` folder:

```bash
cd frontend
npm run dev
```

### 3. Open a family

When you run `npm run dev`, the terminal prints the address where the app is running, for example:

```
➜  Local:   http://localhost:5173/sherpas-lens
```

Use **the address your terminal shows** (the port or path may be different on your machine) and add `/?caso=<family>&lang=en` at the end. With the address above, these are the four families:

- Michael Carter: <http://localhost:5173/sherpas-lens/?caso=michael-carter&lang=en>
- Samantha Lewis: <http://localhost:5173/sherpas-lens/?caso=samantha-lewis&lang=en>
- Timothy & Melanie Weah: <http://localhost:5173/sherpas-lens/?caso=timothy-melanie-weah&lang=en>
- Daniel & Emily Johnson: <http://localhost:5173/sherpas-lens/?caso=daniel-emily-johnson&lang=en>

These `localhost` addresses only work on your own computer after you start the app; they are not a public demo.

The case data is read from [`cases/`](cases/), so the MCP is not needed.

### 4. Optional: pre-generate everything before a demo

Generating a summary takes a few seconds. This fills the cache for 4 cases x 5 moods x 2 lengths x 2 languages, so every screen opens instantly:

```bash
curl -X POST "http://localhost:8000/precalcular"
```

A few pre-generated summaries are already included in `backend/cache/`. If the AI is unavailable, the backend serves the nearest cached one, or a safe fallback screen.

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


---

## Data and credits

All data comes from the four synthetic households provided by Sherpas Wealth for the hackathon. No real client data is used. Amounts are in US dollars.

Built by NarratIA for the Sherpas x UPV Sigma Data Club hackathon.
