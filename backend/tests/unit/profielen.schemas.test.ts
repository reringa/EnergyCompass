/**
 * Unit tests for the Zod validation schemas defined in src/api/profielen.ts.
 *
 * The schemas are not exported from the router module (to keep the API surface
 * minimal), so they are mirrored here for isolated testing.  Any change to the
 * schemas in profielen.ts must be reflected here.
 */

import { z } from 'zod';

// ─── Schema definitions (mirror of src/api/profielen.ts) ────────────────────

const ContractSchema = z.object({
  leverancierSlug: z.string().min(1),
  productNaam: z.string().min(1),
  type: z.enum(['vast', 'variabel', 'dynamisch']),
  einddatum: z.string().date().nullable().optional(),
  stroomTarief: z.number().positive().nullable().optional(),
  gasTarief: z.number().positive().nullable().optional(),
  vasteKosten: z.number().nonnegative().nullable().optional(),
  terugleverkosten: z.number().nullable().optional(),
  terugleververgoeding: z.number().nullable().optional(),
});

const ProfielBodySchema = z.object({
  email: z.string().email(),
  postcode: z.string().regex(/^\d{4}[A-Z]{2}$/i),
  huisnummer: z.string().min(1),
  jaarVerbruikKwh: z.number().int().positive(),
  jaarVerbruikGasM3: z.number().int().positive().nullable().optional(),
  meterType: z.enum(['enkeltarief', 'dubbeltarief']).default('enkeltarief'),
  heeftZonnepanelen: z.boolean().default(false),
  jaarOpwekKwh: z.number().int().positive().nullable().optional(),
  jaarTerugleveringKwh: z.number().int().positive().nullable().optional(),
  voorkeur: z.enum(['zekerheid', 'flexibiliteit', 'neutraal']).default('neutraal'),
  interesseInBatterij: z.boolean().default(false),
  interesseInEV: z.boolean().default(false),
  interesseInWarmtepomp: z.boolean().default(false),
  contract: ContractSchema,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function geldigProfiel() {
  return {
    email: 'test@example.com',
    postcode: '1234AB',
    huisnummer: '10',
    jaarVerbruikKwh: 3500,
    meterType: 'enkeltarief' as const,
    heeftZonnepanelen: false,
    voorkeur: 'neutraal' as const,
    interesseInBatterij: false,
    interesseInEV: false,
    interesseInWarmtepomp: false,
    contract: {
      leverancierSlug: 'vattenfall',
      productNaam: 'Vattenfall Stroom & Gas Vast',
      type: 'vast' as const,
      stroomTarief: 0.23,
      vasteKosten: 18.5,
    },
  };
}

// ─── ContractSchema tests ─────────────────────────────────────────────────────

describe('ContractSchema', () => {
  it('accepteert een volledig geldig contract', () => {
    const result = ContractSchema.safeParse({
      leverancierSlug: 'vattenfall',
      productNaam: 'Vattenfall Stroom Vast',
      type: 'vast',
      einddatum: '2026-01-31',
      stroomTarief: 0.23,
      gasTarief: 1.12,
      vasteKosten: 18.5,
      terugleverkosten: 0.05,
      terugleververgoeding: 0.18,
    });
    expect(result.success).toBe(true);
  });

  it('accepteert een minimaal contract zonder optionele velden', () => {
    const result = ContractSchema.safeParse({
      leverancierSlug: 'eneco',
      productNaam: 'Eneco Stroom Variabel',
      type: 'variabel',
    });
    expect(result.success).toBe(true);
  });

  it('weigert een ongeldig contracttype', () => {
    const result = ContractSchema.safeParse({
      leverancierSlug: 'eneco',
      productNaam: 'Eneco Basis',
      type: 'onbekend', // niet in enum
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const velden = result.error.flatten().fieldErrors;
      expect(velden.type).toBeDefined();
    }
  });

  it('weigert een lege leverancierSlug', () => {
    const result = ContractSchema.safeParse({
      leverancierSlug: '',
      productNaam: 'Product',
      type: 'vast',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.leverancierSlug).toBeDefined();
    }
  });

  it('weigert een negatief stroomTarief', () => {
    const result = ContractSchema.safeParse({
      leverancierSlug: 'vattenfall',
      productNaam: 'Product',
      type: 'vast',
      stroomTarief: -0.05,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.stroomTarief).toBeDefined();
    }
  });

  it('weigert een ongeldige einddatum', () => {
    const result = ContractSchema.safeParse({
      leverancierSlug: 'vattenfall',
      productNaam: 'Product',
      type: 'vast',
      einddatum: 'geen-datum',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.einddatum).toBeDefined();
    }
  });

  it('accepteert null voor optionele numerieke velden', () => {
    const result = ContractSchema.safeParse({
      leverancierSlug: 'vattenfall',
      productNaam: 'Product',
      type: 'vast',
      stroomTarief: null,
      gasTarief: null,
      terugleverkosten: null,
    });
    expect(result.success).toBe(true);
  });

  it('staat alle drie contracttypes toe', () => {
    for (const type of ['vast', 'variabel', 'dynamisch'] as const) {
      const result = ContractSchema.safeParse({
        leverancierSlug: 'test',
        productNaam: 'Test product',
        type,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── ProfielBodySchema tests ──────────────────────────────────────────────────

describe('ProfielBodySchema', () => {
  it('accepteert een volledig geldig profiel', () => {
    const result = ProfielBodySchema.safeParse(geldigProfiel());
    expect(result.success).toBe(true);
  });

  it('weigert een ongeldig e-mailadres', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      email: 'geen-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it('weigert een ongeldige postcode (te kort)', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      postcode: '123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.postcode).toBeDefined();
    }
  });

  it('weigert een postcode met cijfers aan het einde', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      postcode: '12341234',
    });
    expect(result.success).toBe(false);
  });

  it('accepteert een postcode in kleine letters', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      postcode: '1234ab',
    });
    expect(result.success).toBe(true);
  });

  it('weigert een jaarVerbruikKwh van nul', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      jaarVerbruikKwh: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.jaarVerbruikKwh).toBeDefined();
    }
  });

  it('weigert een decimaal jaarVerbruikKwh', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      jaarVerbruikKwh: 3500.5,
    });
    expect(result.success).toBe(false);
  });

  it('past standaardwaarden toe voor optionele velden', () => {
    const invoer = {
      email: 'test@example.com',
      postcode: '1234AB',
      huisnummer: '1',
      jaarVerbruikKwh: 2000,
      contract: {
        leverancierSlug: 'nuon',
        productNaam: 'Nuon Basis',
        type: 'variabel',
      },
    };
    const result = ProfielBodySchema.safeParse(invoer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.meterType).toBe('enkeltarief');
      expect(result.data.heeftZonnepanelen).toBe(false);
      expect(result.data.voorkeur).toBe('neutraal');
      expect(result.data.interesseInBatterij).toBe(false);
      expect(result.data.interesseInEV).toBe(false);
      expect(result.data.interesseInWarmtepomp).toBe(false);
    }
  });

  it('weigert een ongeldig voorkeur-enum', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      voorkeur: 'goedkoopste', // niet geldig
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.voorkeur).toBeDefined();
    }
  });

  it('weigert wanneer het contract ontbreekt', () => {
    const { contract: _c, ...zonderContract } = geldigProfiel();
    const result = ProfielBodySchema.safeParse(zonderContract);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.contract).toBeDefined();
    }
  });

  it('accepteert zonnepaneeldata als heeftZonnepanelen true is', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      heeftZonnepanelen: true,
      jaarOpwekKwh: 4200,
      jaarTerugleveringKwh: 1800,
    });
    expect(result.success).toBe(true);
  });

  it('accepteert dubbeltarief meterType', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      meterType: 'dubbeltarief',
    });
    expect(result.success).toBe(true);
  });

  it('weigert een ongeldig meterType', () => {
    const result = ProfielBodySchema.safeParse({
      ...geldigProfiel(),
      meterType: 'drietarief',
    });
    expect(result.success).toBe(false);
  });
});
