# Energie Beslis App

Profielgestuurde energie-beslis-app voor Nederlandse huishoudens met zonnepanelen.

> "Wij kennen jouw energieprofiel en waarschuwen je alleen als er echt iets te winnen valt."

## Wat doet de app?

De app onthoudt je energieprofiel, volgt de markt, en geeft alleen een melding als er voor jouw specifieke situatie iets te winnen valt. Geen eindeloze vergelijkingslijsten, maar een concreet advies met uitleg.

**MVP focus:** contractintelligentie voor huishoudens met zonnepanelen.

## Snel starten (lokale ontwikkeling)

```bash
# 1. Omgevingsvariabelen instellen
cp .env.example .env
# Vul je ANTHROPIC_API_KEY in

# 2. Database en services starten
docker-compose up -d postgres redis

# 3. Backend starten
cd backend
npm install
npm run dev
# → http://localhost:3001

# 4. Frontend starten (nieuw terminal venster)
cd frontend
npm install
npm run dev
# → http://localhost:3000

# 5. Data pipeline (optioneel, voor tariefdata)
cd data-pipeline
pip install -r requirements.txt
python src/extractors/tarief_extractor.py
```

## Projectstructuur

```
energie-app/
├── CLAUDE.md              ← Context voor Claude Code
├── README.md
├── docker-compose.yml
├── .env.example
│
├── backend/               ← Node.js + TypeScript API
│   └── src/
│       ├── api/           ← REST endpoints
│       ├── services/      ← Bedrijfslogica (adviesService.ts)
│       ├── data/          ← Database (schema.sql)
│       └── models/        ← TypeScript types
│
├── frontend/              ← Next.js + Tailwind
│   └── src/
│       ├── components/    ← UI componenten
│       ├── pages/         ← App pagina's
│       └── hooks/         ← React hooks
│
├── data-pipeline/         ← Python scraper + AI extractie
│   └── src/
│       ├── scrapers/      ← Leverancier scrapers
│       ├── extractors/    ← Claude-gebaseerde data extractie
│       └── validators/    ← Data kwaliteitscontrole
│
└── docs/
    ├── ondernemersplan.md
    └── data-strategie.md
```

## Architectuur

```
[Databronnen]
  Leveranciers (tarieven, voorwaarden)
  Energiemarkt (dynamische prijzen)
  Slimme meter (P1/DSMR verbruik)
  Regelgeving (salderingsregeling, etc.)
        ↓
[Verwerkingslaag]
  Data pipeline (scraping + AI extractie + validatie)
  Profielengine (gebruikersprofiel + contractbewaking)
  Beslislogica (scenario's + Claude adviesgeneratie)
        ↓
[App]
  Profiel invoer (eenmalige onboarding)
  Advies dashboard (aanbeveling + uitleg)
  Alerts (push notificaties, contracteinde alerts)
```

## MVP scope

Fase 1 — **Contract intelligence** (dit is de huidige MVP):
- Profielopslag
- Contractbewaking (alert 3 maanden voor einde)
- Marktmonitoring (10–15 leveranciers)
- Persoonlijk advies via Claude

Fase 2 — Zonnepanelen intelligence (na validatie MVP)

Fase 3 — Batterij- en flexibiliteitsadvies

## Technologie

| Component | Stack |
|-----------|-------|
| Backend API | Node.js, TypeScript, Express |
| Database | PostgreSQL 16 |
| Cache | Redis |
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Data pipeline | Python |
| AI/LLM | Anthropic Claude (advies + extractie) |
| Infra (dev) | Docker Compose |

## Omgevingsvariabelen

Zie `.env.example`. Verplicht:
- `ANTHROPIC_API_KEY` — voor adviesgeneratie en tariefextractie

## Licentie

Privé project — alle rechten voorbehouden.
