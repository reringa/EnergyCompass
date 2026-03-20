---
name: Testing strategie
description: Na elke feature unit, integration en E2E tests schrijven en committen
type: feedback
---

Na elke afgeronde feature tests schrijven: unit, integration én E2E.

**Why:** Ron wil volledige testdekking over alle lagen van de applicatie.

**How to apply:**
- Unit tests: losse functies, validatieschema's, beslislogica (Jest)
- Integration tests: API endpoints tegen echte testdatabase (Jest + Supertest)
- E2E tests: volledige gebruikersstromen in de browser (Playwright)
- Tests committen samen met de feature in dezelfde commit.
