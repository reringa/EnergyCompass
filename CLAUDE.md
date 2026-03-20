# Energie Beslis App — Claude Code Context

## Wat is dit project?

Een profielgestuurde energie-beslis-app voor Nederlandse huishoudens met zonnepanelen.
De app onthoudt het energieprofiel van de gebruiker, volgt de markt, en geeft alleen een melding
als er voor dat specifieke profiel iets te winnen valt.

**Kernpropositie:** "Wij kennen jouw energieprofiel en waarschuwen je alleen als er echt iets te winnen valt."

## Architectuur (3 lagen)

```
[Databronnen]     → leveranciers, energiemarkt, slimme meter, regelgeving
      ↓
[Verwerkingslaag] → data pipeline, profielengine, beslislogica
      ↓
[App (frontend)]  → profiel invoer, advies dashboard, alerts
```

## Tech stack

- **Backend:** Node.js + Express (of Fastify), TypeScript
- **Database:** PostgreSQL (profielen, contractdata) + Redis (caching)
- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Data pipeline:** Python scripts voor scraping en AI-extractie
- **AI/LLM:** Anthropic Claude API voor adviesgeneratie en data-extractie
- **Infra:** Docker Compose voor local dev

## MVP scope (fase 1 — contract intelligence)

Alleen deze functionaliteit bouwen:

1. **Gebruikersprofiel opslaan**
   - Postcode, verbruik, gasverbruik, zonnepanelen, opwek, teruglevering
   - Contracttype, einddatum, leverancier
   - Voorkeur (zekerheid vs flexibiliteit)

2. **Contractbewaking**
   - Alert 3 maanden voor contracteinde
   - Alert bij significant prijsverschil (>10% besparing mogelijk)

3. **Marktdata ophalen**
   - Scraper voor 10–15 leveranciers (tarieven, vaste kosten, terugleverkosten)
   - AI-extractie uit PDF-tariefbladen

4. **Adviesgeneratie**
   - Vergelijk huidige situatie met markt
   - Genereer uitlegbaar advies via Claude API
   - Output: beste keuze + waarom + besparing bandbreedte

## Nog NIET in MVP

- Batterijadvies
- EV-laad optimalisatie
- Dynamische prijssturing
- Warmtepomp integratie

## Bestandsstructuur

```
energie-app/
├── CLAUDE.md              ← dit bestand
├── README.md
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── api/           ← REST endpoints
│   │   ├── services/      ← bedrijfslogica
│   │   ├── data/          ← database queries
│   │   └── models/        ← TypeScript types
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/    ← herbruikbare UI componenten
│       ├── pages/         ← Next.js pagina's
│       ├── hooks/         ← custom React hooks
│       └── lib/           ← utilities
├── data-pipeline/
│   └── src/
│       ├── scrapers/      ← leverancier scrapers
│       ├── extractors/    ← AI PDF-extractie
│       └── validators/    ← data kwaliteitscontrole
└── docs/
    ├── ondernemersplan.md
    ├── api-spec.md
    └── data-strategie.md
```

## Kritische regels

1. **Data kwaliteit > snelheid** — liever minder leveranciers met goede data dan veel met slechte
2. **Advies altijd uitlegbaar** — geen black box, altijd "waarom" tonen
3. **Nooit te stellig** — gebruik bandbreedtes en aannames, geen garanties
4. **Scope bewaken** — MVP = contracten voor zonnepaneelhuishoudens, niets meer

## Omgevingsvariabelen

Zie `.env.example` voor alle benodigde keys:
- `ANTHROPIC_API_KEY` — voor adviesgeneratie en data-extractie
- `DATABASE_URL` — PostgreSQL connectie
- `REDIS_URL` — voor caching van marktdata

## Starten

```bash
cp .env.example .env
docker-compose up -d
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```
