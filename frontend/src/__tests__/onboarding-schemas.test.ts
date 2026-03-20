/**
 * Unit tests for the Zod validation schemas defined in
 * src/components/onboarding/OnboardingWizard.tsx.
 *
 * The schemas are not exported from the component, so they are mirrored here.
 * Any change to the schemas in OnboardingWizard.tsx must be reflected here.
 */

import { z } from 'zod';

// ─── Schema definitions (mirror of OnboardingWizard.tsx) ─────────────────────

const stapLocatieSchema = z.object({
  postcode: z
    .string()
    .regex(/^\d{4}\s?[A-Za-z]{2}$/, 'Voer een geldige postcode in, bijv. 1234AB'),
  huisnummer: z.string().min(1, 'Huisnummer is verplicht'),
});

const stapVerbruikSchema = z.object({
  jaarVerbruikKwh: z
    .number({ invalid_type_error: 'Voer een getal in' })
    .int()
    .min(100, 'Minimaal 100 kWh')
    .max(50000, 'Maximaal 50.000 kWh'),
  jaarVerbruikGasM3: z
    .number({ invalid_type_error: 'Voer een getal in' })
    .int()
    .min(0)
    .max(10000)
    .nullable()
    .optional(),
  meterType: z.enum(['enkeltarief', 'dubbeltarief']),
});

const stapZonnepanelenSchema = z
  .object({
    heeftZonnepanelen: z.boolean(),
    jaarOpwekKwh: z.number({ invalid_type_error: 'Voer een getal in' }).int().min(0).nullable().optional(),
    jaarTerugleveringKwh: z
      .number({ invalid_type_error: 'Voer een getal in' })
      .int()
      .min(0)
      .nullable()
      .optional(),
  })
  .refine(
    (d) => !d.heeftZonnepanelen || (d.jaarOpwekKwh != null && d.jaarOpwekKwh > 0),
    { message: 'Voer de jaarlijkse opwek in', path: ['jaarOpwekKwh'] },
  );

const stapContractSchema = z.object({
  leverancierSlug: z.string().min(1, 'Kies een leverancier'),
  contractType: z.enum(['vast', 'variabel', 'dynamisch']),
  einddatum: z.string().optional(),
  stroomTarief: z
    .number({ invalid_type_error: 'Voer een getal in' })
    .positive()
    .nullable()
    .optional(),
  stroomTariefNormaal: z
    .number({ invalid_type_error: 'Voer een getal in' })
    .positive()
    .nullable()
    .optional(),
  stroomTariefDal: z
    .number({ invalid_type_error: 'Voer een getal in' })
    .positive()
    .nullable()
    .optional(),
  gasTarief: z
    .number({ invalid_type_error: 'Voer een getal in' })
    .positive()
    .nullable()
    .optional(),
});

const stapVoorkeurenSchema = z.object({
  voorkeur: z.enum(['zekerheid', 'flexibiliteit', 'neutraal']),
  interesseInBatterij: z.boolean(),
  interesseInEV: z.boolean(),
  interesseInWarmtepomp: z.boolean(),
});

// ─── Stap 1: Locatie ──────────────────────────────────────────────────────────

describe('stapLocatieSchema', () => {
  it('accepteert een geldige postcode en huisnummer', () => {
    expect(stapLocatieSchema.safeParse({ postcode: '1234AB', huisnummer: '10' }).success).toBe(true);
  });

  it('accepteert een postcode met een spatie', () => {
    expect(stapLocatieSchema.safeParse({ postcode: '1234 AB', huisnummer: '1' }).success).toBe(true);
  });

  it('accepteert een postcode in kleine letters', () => {
    expect(stapLocatieSchema.safeParse({ postcode: '1234ab', huisnummer: '1' }).success).toBe(true);
  });

  it('weigert een postcode die te kort is', () => {
    const result = stapLocatieSchema.safeParse({ postcode: '123', huisnummer: '1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.postcode).toContain(
        'Voer een geldige postcode in, bijv. 1234AB',
      );
    }
  });

  it('weigert een postcode zonder letters', () => {
    const result = stapLocatieSchema.safeParse({ postcode: '12345678', huisnummer: '1' });
    expect(result.success).toBe(false);
  });

  it('weigert een leeg huisnummer', () => {
    const result = stapLocatieSchema.safeParse({ postcode: '1234AB', huisnummer: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.huisnummer).toContain('Huisnummer is verplicht');
    }
  });

  it('accepteert alfanumerieke huisnummers', () => {
    expect(stapLocatieSchema.safeParse({ postcode: '1234AB', huisnummer: '10a' }).success).toBe(true);
  });
});

// ─── Stap 2: Verbruik ─────────────────────────────────────────────────────────

describe('stapVerbruikSchema', () => {
  it('accepteert een volledig geldig verbruiksprofiel', () => {
    expect(
      stapVerbruikSchema.safeParse({
        jaarVerbruikKwh: 3500,
        jaarVerbruikGasM3: 1500,
        meterType: 'enkeltarief',
      }).success,
    ).toBe(true);
  });

  it('weigert jaarVerbruikKwh onder 100', () => {
    const result = stapVerbruikSchema.safeParse({
      jaarVerbruikKwh: 99,
      meterType: 'enkeltarief',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.jaarVerbruikKwh).toContain('Minimaal 100 kWh');
    }
  });

  it('weigert jaarVerbruikKwh boven 50000', () => {
    const result = stapVerbruikSchema.safeParse({
      jaarVerbruikKwh: 50001,
      meterType: 'enkeltarief',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.jaarVerbruikKwh).toContain('Maximaal 50.000 kWh');
    }
  });

  it('weigert een decimaal verbruik', () => {
    const result = stapVerbruikSchema.safeParse({
      jaarVerbruikKwh: 3500.5,
      meterType: 'enkeltarief',
    });
    expect(result.success).toBe(false);
  });

  it('accepteert gasverbruik van 0 (geen gas)', () => {
    expect(
      stapVerbruikSchema.safeParse({
        jaarVerbruikKwh: 2000,
        jaarVerbruikGasM3: 0,
        meterType: 'enkeltarief',
      }).success,
    ).toBe(true);
  });

  it('weigert een ongeldig meterType', () => {
    const result = stapVerbruikSchema.safeParse({
      jaarVerbruikKwh: 3000,
      meterType: 'drietarief',
    });
    expect(result.success).toBe(false);
  });

  it('accepteert dubbeltarief', () => {
    expect(
      stapVerbruikSchema.safeParse({
        jaarVerbruikKwh: 3000,
        meterType: 'dubbeltarief',
      }).success,
    ).toBe(true);
  });
});

// ─── Stap 3: Zonnepanelen ─────────────────────────────────────────────────────

describe('stapZonnepanelenSchema', () => {
  it('accepteert false zonder opwekgegevens', () => {
    expect(
      stapZonnepanelenSchema.safeParse({ heeftZonnepanelen: false }).success,
    ).toBe(true);
  });

  it('accepteert true met geldige opwek', () => {
    expect(
      stapZonnepanelenSchema.safeParse({
        heeftZonnepanelen: true,
        jaarOpwekKwh: 4200,
        jaarTerugleveringKwh: 1800,
      }).success,
    ).toBe(true);
  });

  it('weigert true zonder opwekgegevens (refine)', () => {
    const result = stapZonnepanelenSchema.safeParse({
      heeftZonnepanelen: true,
      jaarOpwekKwh: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.message === 'Voer de jaarlijkse opwek in')).toBe(true);
    }
  });

  it('weigert true met opwek van 0 (refine vereist > 0)', () => {
    const result = stapZonnepanelenSchema.safeParse({
      heeftZonnepanelen: true,
      jaarOpwekKwh: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepteert true met alleen opwek (teruglevering optioneel)', () => {
    expect(
      stapZonnepanelenSchema.safeParse({
        heeftZonnepanelen: true,
        jaarOpwekKwh: 3500,
      }).success,
    ).toBe(true);
  });
});

// ─── Stap 4: Contract ─────────────────────────────────────────────────────────

describe('stapContractSchema', () => {
  it('accepteert een volledig geldig contract', () => {
    expect(
      stapContractSchema.safeParse({
        leverancierSlug: 'vattenfall',
        contractType: 'vast',
        einddatum: '2026-12-31',
        stroomTarief: 0.23,
        gasTarief: 1.12,
      }).success,
    ).toBe(true);
  });

  it('weigert een lege leverancierSlug', () => {
    const result = stapContractSchema.safeParse({
      leverancierSlug: '',
      contractType: 'vast',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.leverancierSlug).toContain('Kies een leverancier');
    }
  });

  it('weigert een ongeldig contractType', () => {
    const result = stapContractSchema.safeParse({
      leverancierSlug: 'eneco',
      contractType: 'onbekend',
    });
    expect(result.success).toBe(false);
  });

  it('staat alle drie contracttypes toe', () => {
    for (const type of ['vast', 'variabel', 'dynamisch'] as const) {
      expect(
        stapContractSchema.safeParse({
          leverancierSlug: 'test',
          contractType: type,
        }).success,
      ).toBe(true);
    }
  });

  it('accepteert een negatief stroomTarief niet', () => {
    const result = stapContractSchema.safeParse({
      leverancierSlug: 'vattenfall',
      contractType: 'vast',
      stroomTarief: -0.10,
    });
    expect(result.success).toBe(false);
  });

  it('accepteert dubbeltarief-velden naast enkeltarief', () => {
    expect(
      stapContractSchema.safeParse({
        leverancierSlug: 'vattenfall',
        contractType: 'vast',
        stroomTariefNormaal: 0.25,
        stroomTariefDal: 0.18,
      }).success,
    ).toBe(true);
  });

  it('accepteert een contract zonder optionele tariefvelden', () => {
    expect(
      stapContractSchema.safeParse({
        leverancierSlug: 'nuon',
        contractType: 'variabel',
      }).success,
    ).toBe(true);
  });
});

// ─── Stap 5: Voorkeuren ───────────────────────────────────────────────────────

describe('stapVoorkeurenSchema', () => {
  it('accepteert geldige voorkeuren', () => {
    expect(
      stapVoorkeurenSchema.safeParse({
        voorkeur: 'zekerheid',
        interesseInBatterij: true,
        interesseInEV: false,
        interesseInWarmtepomp: false,
      }).success,
    ).toBe(true);
  });

  it('staat alle drie voorkeur-opties toe', () => {
    for (const voorkeur of ['zekerheid', 'flexibiliteit', 'neutraal'] as const) {
      expect(
        stapVoorkeurenSchema.safeParse({
          voorkeur,
          interesseInBatterij: false,
          interesseInEV: false,
          interesseInWarmtepomp: false,
        }).success,
      ).toBe(true);
    }
  });

  it('weigert een ongeldige voorkeur', () => {
    const result = stapVoorkeurenSchema.safeParse({
      voorkeur: 'goedkoopste',
      interesseInBatterij: false,
      interesseInEV: false,
      interesseInWarmtepomp: false,
    });
    expect(result.success).toBe(false);
  });

  it('weigert ontbrekende boolean velden', () => {
    const result = stapVoorkeurenSchema.safeParse({
      voorkeur: 'neutraal',
    });
    expect(result.success).toBe(false);
  });
});
