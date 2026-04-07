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

## Harness infrastructure

This project's CI/CD was set up by the
[harness-engineering](https://github.com/mistervortex/harness-engineering)
harness. Read `.claude/HARNESS.md` for details on which files are
harness-managed (don't edit; they get overwritten on upgrade), how to
extend the setup, and available upgrade paths to add PostgreSQL or S3 storage.

## Writing rules

- Never use em dashes (U+2014). Use commas, colons, semicolons, or parentheses instead. A PreToolUse hook will block any write containing an em dash

## Feature development workflow

The full lifecycle from idea to merged feature is automated. Railway
environments are created automatically by GitHub Actions so the feature
is deployable from the first push.

### Railway preview URL

A PostToolUse hook (`.claude/hooks/post-push-railway-url.sh`) tries to
fetch the Railway preview URL after every `git push`. However, hook output
is not always visible in your context. **After your final push, always
manually fetch and include the Railway URL in your summary:**

```
git fetch origin feature/<name> && git show origin/feature/<name>:.railway-url
```

### 1. Starting a new feature

Every new chat on a `claude/` branch is automatically treated as a new
feature, no `/feature` prefix needed. Just describe what you want to build.

On session start, the harness automatically:
1. Pushes an init commit to trigger the GitHub Action
2. The Action derives the feature name (strip `claude/` prefix and
   `-<sessionId>` suffix), creates `feature/<name>` from dev, and creates a
   Railway environment duplicated from dev
3. The Railway preview URL appears automatically after each push

You can still use `/feature <description>` explicitly if you prefer, but
it's no longer required.

### 2. Pushing code

Push to the `claude/` branch. The GitHub Action merges it into the feature
branch and deletes the source claude/ branch.

### 3. Merging to dev

Use `/mergedev` or say "merge to dev". This writes `.pr-description.md`,
commits, and pushes. The GitHub Action creates a PR and auto-merges it.

### 3b. Submitting for review (instead of auto-merge)

Use `/review` to create a PR without auto-merge. The PR stays open for
team review, with the Railway preview URL included for live testing.
Reviewers are assigned from `.harness-version` if configured.

### 4. Automatic cleanup

When auto-merge succeeds, `claude-to-feature-branch.yml` deletes the source
`claude/` branch. The PR merge then triggers `feature-merge-cleanup.yml`,
which deletes the Railway environment and feature branch. The separate
`feature-branch-cleanup.yml` workflow serves as a fallback if a feature branch
is deleted manually (e.g., without going through a PR).

**Gotcha:** Don't push to a merged branch. After `/mergedev`, both branches
are deleted remotely. Pushing again re-creates everything from scratch.

## Releasing to production

Use `/release` (with optional `major`, `minor`, or `patch` argument) to ship
dev to production. This creates a release PR from `dev` to `main`, tags the
version, and generates a GitHub Release with notes. The production Railway
environment deploys automatically from main. For emergencies, use `/hotfix`
to go directly from main with a fast-track patch release.

## CI checks

Configure CI checks by adding a `check:` field to `.harness-version`:

```
check: cd backend && npm test
```

When set, PRs to dev (and main) run the check command, and merges wait for
checks to pass. See `.claude/HARNESS.md` for prerequisites.

## Team configuration

Optional `.harness-version` fields:

```
reviewers: teammate1, teammate2
check: cd backend && npm test
```

## Available skills

Run `/getting-started` to see all skills, or use these directly:
- `/feature`: start a new feature (optional; auto-initializes on session start)
- `/mergedev`: merge to dev (auto-merge)
- `/review`: submit PR for team review
- `/release`: ship dev to production
- `/hotfix`: emergency production fix
- `/status`: team dashboard (with Railway preview URLs)
- `/changelog`: generate changelog
- `/deps`: handle Dependabot PRs
- `/continue`: resume in-progress feature
- `/rollback`: revert bad deploy

## Dependency management

Dependabot is configured in `.github/dependabot.yml` to automatically check
for outdated dependencies and open PRs to update them. When you add a new
package ecosystem to the project (e.g., npm, pip, Docker), add a
corresponding entry to `.github/dependabot.yml` so Dependabot monitors it.
