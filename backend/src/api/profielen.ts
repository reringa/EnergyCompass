import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../data/db';

export const profielenRouter = Router();

// ─── Validatieschema's ────────────────────────────────────────────────────────

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

// Gedeeltelijk schema voor PUT (alle velden optioneel)
const ProfielUpdateSchema = ProfielBodySchema.partial().omit({ email: true });

// ─── Helper: rij → response object ───────────────────────────────────────────

function mapRijNaarResponse(rij: Record<string, unknown>) {
  return {
    id: rij.profiel_id,
    gebruikerId: rij.gebruiker_id,
    email: rij.email,
    aangemaaktop: rij.profiel_aangemaakt_op,
    bijgewerktOp: rij.profiel_bijgewerkt_op,
    postcode: rij.postcode,
    huisnummer: rij.huisnummer,
    jaarVerbruikKwh: rij.jaar_verbruik_kwh,
    jaarVerbruikGasM3: rij.jaar_verbruik_gas_m3,
    meterType: rij.meter_type,
    heeftZonnepanelen: rij.heeft_zonnepanelen,
    jaarOpwekKwh: rij.jaar_opwek_kwh,
    jaarTerugleveringKwh: rij.jaar_teruglevering_kwh,
    voorkeur: rij.voorkeur,
    interesseInBatterij: rij.interesse_batterij,
    interesseInEV: rij.interesse_ev,
    interesseInWarmtepomp: rij.interesse_warmtepomp,
    contract: rij.contract_id
      ? {
          id: rij.contract_id,
          leverancierSlug: rij.leverancier_slug,
          productNaam: rij.product_naam,
          type: rij.contract_type,
          einddatum: rij.einddatum,
          stroomTarief: rij.stroom_tarief,
          gasTarief: rij.gas_tarief,
          vasteKosten: rij.vaste_kosten,
          terugleverkosten: rij.terugleverkosten,
          terugleververgoeding: rij.terugleververgoeding,
        }
      : null,
  };
}

// ─── Query helper ─────────────────────────────────────────────────────────────

const PROFIEL_SELECT = `
  SELECT
    p.id              AS profiel_id,
    g.id              AS gebruiker_id,
    g.email,
    p.aangemaakt_op   AS profiel_aangemaakt_op,
    p.bijgewerkt_op   AS profiel_bijgewerkt_op,
    p.postcode,
    p.huisnummer,
    p.jaar_verbruik_kwh,
    p.jaar_verbruik_gas_m3,
    p.meter_type,
    p.heeft_zonnepanelen,
    p.jaar_opwek_kwh,
    p.jaar_teruglevering_kwh,
    p.voorkeur,
    p.interesse_batterij,
    p.interesse_ev,
    p.interesse_warmtepomp,
    c.id              AS contract_id,
    c.leverancier_slug,
    c.product_naam,
    c.type            AS contract_type,
    c.einddatum,
    c.stroom_tarief,
    c.gas_tarief,
    c.vaste_kosten,
    c.terugleverkosten,
    c.terugleververgoeding
  FROM profielen p
  JOIN gebruikers g ON g.id = p.gebruiker_id
  LEFT JOIN contracten c ON c.profiel_id = p.id AND c.is_huidig = TRUE
`;

// ─── POST /api/profielen ──────────────────────────────────────────────────────

profielenRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = ProfielBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ongeldige invoer', details: parsed.error.flatten() });
    return;
  }

  const d = parsed.data;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Gebruiker aanmaken of ophalen op basis van e-mail
    const gebruikerResult = await client.query<{ id: string }>(
      `INSERT INTO gebruikers (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET bijgewerkt_op = NOW()
       RETURNING id`,
      [d.email],
    );
    const gebruikerId = gebruikerResult.rows[0].id;

    // Profiel aanmaken
    const profielResult = await client.query<{ id: string }>(
      `INSERT INTO profielen (
         gebruiker_id, postcode, huisnummer,
         jaar_verbruik_kwh, jaar_verbruik_gas_m3, meter_type,
         heeft_zonnepanelen, jaar_opwek_kwh, jaar_teruglevering_kwh,
         voorkeur, interesse_batterij, interesse_ev, interesse_warmtepomp
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        gebruikerId,
        d.postcode.toUpperCase(),
        d.huisnummer,
        d.jaarVerbruikKwh,
        d.jaarVerbruikGasM3 ?? null,
        d.meterType,
        d.heeftZonnepanelen,
        d.jaarOpwekKwh ?? null,
        d.jaarTerugleveringKwh ?? null,
        d.voorkeur,
        d.interesseInBatterij,
        d.interesseInEV,
        d.interesseInWarmtepomp,
      ],
    );
    const profielId = profielResult.rows[0].id;

    // Contract opslaan
    await client.query(
      `INSERT INTO contracten (
         profiel_id, leverancier_slug, product_naam, type, einddatum,
         stroom_tarief, gas_tarief, vaste_kosten, terugleverkosten, terugleververgoeding
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        profielId,
        d.contract.leverancierSlug,
        d.contract.productNaam,
        d.contract.type,
        d.contract.einddatum ?? null,
        d.contract.stroomTarief,
        d.contract.gasTarief ?? null,
        d.contract.vasteKosten,
        d.contract.terugleverkosten ?? null,
        d.contract.terugleververgoeding ?? null,
      ],
    );

    await client.query('COMMIT');

    // Volledige rij teruggeven
    const rij = await db.query(`${PROFIEL_SELECT} WHERE p.id = $1`, [profielId]);
    res.status(201).json(mapRijNaarResponse(rij.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─── GET /api/profielen/gebruiker/:gebruikerId ────────────────────────────────

profielenRouter.get('/gebruiker/:gebruikerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(`${PROFIEL_SELECT} WHERE g.id = $1`, [req.params.gebruikerId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Geen profiel gevonden voor deze gebruiker' });
      return;
    }

    res.json(mapRijNaarResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/profielen/:id ───────────────────────────────────────────────────

profielenRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(`${PROFIEL_SELECT} WHERE p.id = $1`, [req.params.id]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Profiel niet gevonden' });
      return;
    }

    res.json(mapRijNaarResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/profielen/:id ───────────────────────────────────────────────────

profielenRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = ProfielUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ongeldige invoer', details: parsed.error.flatten() });
    return;
  }

  const d = parsed.data;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Controleer of profiel bestaat
    const check = await client.query('SELECT id FROM profielen WHERE id = $1', [req.params.id]);
    if (check.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Profiel niet gevonden' });
      return;
    }

    // Profielvelden dynamisch bijwerken
    const profielVelden: string[] = [];
    const profielWaarden: unknown[] = [];
    let teller = 1;

    const profielMapping: Record<string, unknown> = {
      postcode: d.postcode ? d.postcode.toUpperCase() : undefined,
      huisnummer: d.huisnummer,
      jaar_verbruik_kwh: d.jaarVerbruikKwh,
      jaar_verbruik_gas_m3: d.jaarVerbruikGasM3,
      meter_type: d.meterType,
      heeft_zonnepanelen: d.heeftZonnepanelen,
      jaar_opwek_kwh: d.jaarOpwekKwh,
      jaar_teruglevering_kwh: d.jaarTerugleveringKwh,
      voorkeur: d.voorkeur,
      interesse_batterij: d.interesseInBatterij,
      interesse_ev: d.interesseInEV,
      interesse_warmtepomp: d.interesseInWarmtepomp,
    };

    for (const [kolom, waarde] of Object.entries(profielMapping)) {
      if (waarde !== undefined) {
        profielVelden.push(`${kolom} = $${teller++}`);
        profielWaarden.push(waarde);
      }
    }

    if (profielVelden.length > 0) {
      profielVelden.push(`bijgewerkt_op = NOW()`);
      profielWaarden.push(req.params.id);
      await client.query(
        `UPDATE profielen SET ${profielVelden.join(', ')} WHERE id = $${teller}`,
        profielWaarden,
      );
    }

    // Contract bijwerken als meegegeven
    if (d.contract) {
      const c = d.contract;

      // Huidig contract archiveren
      await client.query(
        'UPDATE contracten SET is_huidig = FALSE WHERE profiel_id = $1 AND is_huidig = TRUE',
        [req.params.id],
      );

      // Huidig contract ophalen als basis voor ontbrekende velden
      const huidig = await client.query(
        `SELECT * FROM contracten WHERE profiel_id = $1 ORDER BY aangemaakt_op DESC LIMIT 1`,
        [req.params.id],
      );
      const basis = huidig.rows[0] ?? {};

      await client.query(
        `INSERT INTO contracten (
           profiel_id, leverancier_slug, product_naam, type, einddatum,
           stroom_tarief, gas_tarief, vaste_kosten, terugleverkosten, terugleververgoeding
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          req.params.id,
          c.leverancierSlug ?? basis.leverancier_slug,
          c.productNaam ?? basis.product_naam,
          c.type ?? basis.type,
          c.einddatum !== undefined ? c.einddatum : basis.einddatum,
          c.stroomTarief ?? basis.stroom_tarief,
          c.gasTarief !== undefined ? c.gasTarief : basis.gas_tarief,
          c.vasteKosten ?? basis.vaste_kosten,
          c.terugleverkosten !== undefined ? c.terugleverkosten : basis.terugleverkosten,
          c.terugleververgoeding !== undefined ? c.terugleververgoeding : basis.terugleververgoeding,
        ],
      );
    }

    await client.query('COMMIT');

    const rij = await db.query(`${PROFIEL_SELECT} WHERE p.id = $1`, [req.params.id]);
    res.json(mapRijNaarResponse(rij.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});
