/**
 * E2E test — volledige onboarding flow
 *
 * Flow: /login → registreer → /onboarding (5 stappen) → /dashboard
 *
 * Vereisten om deze test te draaien:
 *   1. Backend draait op http://localhost:3001  (cd backend && npm run dev)
 *   2. Frontend draait op http://localhost:3000 (cd frontend && npm run dev)
 *   3. PostgreSQL en Redis draaien             (docker compose up -d)
 *   4. energie_app schema is toegepast         (psql energie_app < schema.sql)
 *
 * Gebruik een uniek e-mailadres per test-run zodat de registratie niet faalt
 * als het account al bestaat.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Klik de "Registreren"-tab, vul e-mail + wachtwoord in en klik "Account aanmaken". */
async function registreerEnLogin(page: Page, email: string, wachtwoord: string) {
  await page.goto('/login');

  // Klik op de "Registreren" tab
  await page.getByRole('button', { name: 'Registreren' }).click();

  await page.getByLabel('E-mailadres').fill(email);
  await page.getByLabel('Wachtwoord').fill(wachtwoord);

  await page.getByRole('button', { name: 'Account aanmaken' }).click();
}

// ─── Test ──────────────────────────────────────────────────────────────────────

test.describe('Volledige onboarding flow', () => {
  /**
   * Gebruik een tijdstempel zodat elke test-run een uniek e-mailadres gebruikt
   * en niet botst met een eerder aangemaakte testgebruiker.
   */
  const email = `e2e-test-${Date.now()}@example.com`;
  const wachtwoord = 'Welkom123!';

  test('registreren → wizard (5 stappen) → dashboard', async ({ page }) => {
    // ── 0. Registreer en log in ────────────────────────────────────────────
    await registreerEnLogin(page, email, wachtwoord);

    // Na succesvolle registratie wordt doorgestuurd naar / → /onboarding
    // (het profiel bestaat nog niet, dus de root stuurt door naar onboarding)
    await page.waitForURL('**/onboarding', { timeout: 15_000 });
    await expect(page).toHaveTitle(/EnergyCompass/i);

    // ── 1. Stap 1 — Locatie ───────────────────────────────────────────────
    await expect(page.getByText('Waar woont u?')).toBeVisible();

    // Controleer voortgangsindicator: "1 / 5"
    await expect(page.getByText('1 / 5')).toBeVisible();

    await page.getByPlaceholder('1234AB').fill('2500GH');
    await page.getByPlaceholder('10A').fill('42');
    await page.getByRole('button', { name: 'Volgende' }).click();

    // ── 2. Stap 2 — Verbruik ─────────────────────────────────────────────
    await expect(page.getByText('Uw energieverbruik')).toBeVisible();
    await expect(page.getByText('2 / 5')).toBeVisible();

    await page.getByPlaceholder('3500').fill('3200');
    // Gasverbruik optioneel — laten we een waarde invullen
    await page.getByPlaceholder('1500').fill('1400');
    // Metertype staat standaard op enkeltarief — laten we het zo
    await page.getByRole('button', { name: 'Volgende' }).click();

    // ── 3. Stap 3 — Zonnepanelen ─────────────────────────────────────────
    await expect(page.getByText('Heeft u zonnepanelen?')).toBeVisible();
    await expect(page.getByText('3 / 5')).toBeVisible();

    // Klik "Ja" om zonnepaneel-velden te tonen
    await page.getByRole('button', { name: 'Ja' }).click();

    // Wacht op het opwek-invoerveld
    await expect(page.getByPlaceholder('4000')).toBeVisible();
    await page.getByPlaceholder('4000').fill('4200');
    await page.getByPlaceholder('1500').fill('1800');

    await page.getByRole('button', { name: 'Volgende' }).click();

    // ── 4. Stap 4 — Contract ─────────────────────────────────────────────
    await expect(page.getByText('Uw huidige energiecontract')).toBeVisible();
    await expect(page.getByText('4 / 5')).toBeVisible();

    // Kies een leverancier uit de dropdown
    await page.selectOption('select', { value: 'vattenfall' });

    // Contracttype staat standaard op "Vast" — laat zo
    // Vul een einddatum in (verschijnt bij vast contract)
    const einddatumVeld = page.locator('input[type="date"]');
    await einddatumVeld.fill('2026-12-31');

    await page.getByRole('button', { name: 'Volgende' }).click();

    // ── 5. Stap 5 — Voorkeuren ────────────────────────────────────────────
    await expect(page.getByText('Uw voorkeuren')).toBeVisible();
    await expect(page.getByText('5 / 5')).toBeVisible();

    // Kies voorkeur: "Zekerheid"
    await page.getByLabel('Zekerheid').check();

    // Vink "Thuisbatterij" aan als toekomstige interesse
    await page.getByLabel('Thuisbatterij').check();

    // Profiel opslaan (laatste stap — knop heet "Profiel opslaan")
    await page.getByRole('button', { name: 'Profiel opslaan' }).click();

    // ── 6. Verwachte uitkomst: doorsturen naar /dashboard ─────────────────
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Controleer dat het dashboard geladen is met gebruikersinformatie
    // (de exacte tekst hangt af van de dashboard component maar er
    // moet in ieder geval geen foutmelding zichtbaar zijn)
    await expect(page.getByText('Geen profiel gevonden')).not.toBeVisible();
  });

  test('toont validatiefouten op stap 1 bij lege invoer', async ({ page }) => {
    await registreerEnLogin(page, `val-test-${Date.now()}@example.com`, wachtwoord);
    await page.waitForURL('**/onboarding', { timeout: 15_000 });

    // Klik "Volgende" zonder iets in te vullen
    await page.getByRole('button', { name: 'Volgende' }).click();

    // Zod-validatie moet een foutmelding tonen voor postcode
    await expect(page.getByText('Voer een geldige postcode in, bijv. 1234AB')).toBeVisible();
  });

  test('terug-knop navigeert terug naar de vorige stap', async ({ page }) => {
    await registreerEnLogin(page, `back-test-${Date.now()}@example.com`, wachtwoord);
    await page.waitForURL('**/onboarding', { timeout: 15_000 });

    // Stap 1 invullen en doorgaan
    await page.getByPlaceholder('1234AB').fill('1234AB');
    await page.getByPlaceholder('10A').fill('5');
    await page.getByRole('button', { name: 'Volgende' }).click();

    // Nu op stap 2
    await expect(page.getByText('Uw energieverbruik')).toBeVisible();
    await expect(page.getByText('2 / 5')).toBeVisible();

    // Klik terug
    await page.getByRole('button', { name: 'Terug' }).click();

    // Weer op stap 1
    await expect(page.getByText('Waar woont u?')).toBeVisible();
    await expect(page.getByText('1 / 5')).toBeVisible();
  });
});
