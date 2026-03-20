/**
 * Integration tests for POST /api/profielen and GET /api/profielen/gebruiker/:id.
 *
 * These tests run against the real test database (energie_app_test).
 * The DATABASE_URL is pointed at the test DB by jest.setup.ts (globalSetup).
 *
 * Prerequisites:
 *   createdb energie_app_test
 *   psql energie_app_test < schema.sql
 */

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { Pool } from 'pg';
import { profielenRouter } from '../../src/api/profielen';

// ─── App setup ────────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/profielen', profielenRouter);

  // Generic error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Interne serverfout' });
  });

  return app;
}

// ─── Database helpers ─────────────────────────────────────────────────────────

let pool: Pool;

beforeAll(() => {
  // DATABASE_URL is set by jest.setup.ts (globalSetup) to the test DB
  const url =
    process.env.DATABASE_URL ?? 'postgresql://energie_user:localdev_secret@localhost:5432/energie_app_test';
  pool = new Pool({ connectionString: url });
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clean all tables before each test for isolation
  await pool.query('TRUNCATE contracten, profielen, gebruikers RESTART IDENTITY CASCADE');
});

// ─── Test data ────────────────────────────────────────────────────────────────

const geldigProfielPayload = {
  email: 'integratie@example.com',
  postcode: '1234AB',
  huisnummer: '10',
  jaarVerbruikKwh: 3500,
  meterType: 'enkeltarief',
  heeftZonnepanelen: true,
  jaarOpwekKwh: 4200,
  jaarTerugleveringKwh: 1800,
  voorkeur: 'neutraal',
  interesseInBatterij: false,
  interesseInEV: false,
  interesseInWarmtepomp: false,
  contract: {
    leverancierSlug: 'vattenfall',
    productNaam: 'Vattenfall Stroom & Gas Vast 1 jaar',
    type: 'vast',
    einddatum: '2026-12-31',
    stroomTarief: 0.23,
    gasTarief: 1.12,
    vasteKosten: 18.5,
    terugleverkosten: 0.05,
    terugleververgoeding: 0.18,
  },
};

// ─── POST /api/profielen ──────────────────────────────────────────────────────

describe('POST /api/profielen', () => {
  const app = buildApp();

  it('slaat een nieuw profiel op en geeft 201 terug', async () => {
    const res = await request(app)
      .post('/api/profielen')
      .send(geldigProfielPayload)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(res.body).toMatchObject({
      email: 'integratie@example.com',
      postcode: '1234AB',
      huisnummer: '10',
      jaarVerbruikKwh: 3500,
      heeftZonnepanelen: true,
      voorkeur: 'neutraal',
    });

    expect(res.body.id).toBeDefined();
    expect(res.body.gebruikerId).toBeDefined();
    expect(res.body.contract).toMatchObject({
      leverancierSlug: 'vattenfall',
      productNaam: 'Vattenfall Stroom & Gas Vast 1 jaar',
      type: 'vast',
    });
  });

  it('normaliseert de postcode naar hoofdletters', async () => {
    const res = await request(app)
      .post('/api/profielen')
      .send({ ...geldigProfielPayload, email: 'klein@example.com', postcode: '1234ab' })
      .expect(201);

    expect(res.body.postcode).toBe('1234AB');
  });

  it('overschrijft het profiel bij een tweede aanroep met hetzelfde e-mailadres (upsert)', async () => {
    // Eerste aanroep
    await request(app).post('/api/profielen').send(geldigProfielPayload).expect(201);

    // Tweede aanroep met andere gegevens
    const res = await request(app)
      .post('/api/profielen')
      .send({ ...geldigProfielPayload, jaarVerbruikKwh: 5000 })
      .expect(201);

    expect(res.body.jaarVerbruikKwh).toBe(5000);
  });

  it('geeft 400 terug bij een ontbrekend veld (e-mail)', async () => {
    const { email: _e, ...zonderEmail } = geldigProfielPayload;
    const res = await request(app).post('/api/profielen').send(zonderEmail).expect(400);

    expect(res.body.error).toBe('Ongeldige invoer');
    expect(res.body.details).toBeDefined();
  });

  it('geeft 400 terug bij een ongeldig contracttype', async () => {
    const res = await request(app)
      .post('/api/profielen')
      .send({
        ...geldigProfielPayload,
        contract: { ...geldigProfielPayload.contract, type: 'onbekend' },
      })
      .expect(400);

    expect(res.body.error).toBe('Ongeldige invoer');
  });

  it('geeft 400 terug bij een ongeldige postcode', async () => {
    const res = await request(app)
      .post('/api/profielen')
      .send({ ...geldigProfielPayload, postcode: '000' })
      .expect(400);

    expect(res.body.error).toBe('Ongeldige invoer');
  });

  it('slaat een profiel op zonder gas- en zonnepaneelgegevens', async () => {
    const payload = {
      email: 'minimaal@example.com',
      postcode: '9876ZX',
      huisnummer: '1a',
      jaarVerbruikKwh: 2500,
      meterType: 'enkeltarief',
      heeftZonnepanelen: false,
      voorkeur: 'zekerheid',
      interesseInBatterij: false,
      interesseInEV: false,
      interesseInWarmtepomp: false,
      contract: {
        leverancierSlug: 'eneco',
        productNaam: 'Eneco Basis',
        type: 'variabel',
      },
    };

    const res = await request(app).post('/api/profielen').send(payload).expect(201);

    expect(res.body.heeftZonnepanelen).toBe(false);
    expect(res.body.jaarVerbruikGasM3).toBeNull();
  });
});

// ─── GET /api/profielen/gebruiker/:id ────────────────────────────────────────

describe('GET /api/profielen/gebruiker/:id', () => {
  const app = buildApp();

  it('geeft het profiel van een bestaande gebruiker terug', async () => {
    // Profiel aanmaken
    const maakRes = await request(app).post('/api/profielen').send(geldigProfielPayload).expect(201);
    const gebruikerId = maakRes.body.gebruikerId as string;

    const res = await request(app)
      .get(`/api/profielen/gebruiker/${gebruikerId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.gebruikerId).toBe(gebruikerId);
    expect(res.body.email).toBe('integratie@example.com');
    expect(res.body.contract).not.toBeNull();
  });

  it('geeft 404 terug voor een onbekende gebruikerId', async () => {
    const res = await request(app)
      .get('/api/profielen/gebruiker/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(res.body.error).toBeDefined();
  });

  it('geeft het meest recente profiel terug na een upsert', async () => {
    // Eerste aanroep
    await request(app).post('/api/profielen').send(geldigProfielPayload).expect(201);

    // Tweede aanroep — jaarVerbruikKwh bijgewerkt
    const update = await request(app)
      .post('/api/profielen')
      .send({ ...geldigProfielPayload, jaarVerbruikKwh: 6000 })
      .expect(201);

    const gebruikerId = update.body.gebruikerId as string;

    const res = await request(app)
      .get(`/api/profielen/gebruiker/${gebruikerId}`)
      .expect(200);

    expect(res.body.jaarVerbruikKwh).toBe(6000);
  });

  it('bevat contractgegevens in de response', async () => {
    const maakRes = await request(app).post('/api/profielen').send(geldigProfielPayload).expect(201);
    const gebruikerId = maakRes.body.gebruikerId as string;

    const res = await request(app)
      .get(`/api/profielen/gebruiker/${gebruikerId}`)
      .expect(200);

    expect(res.body.contract).toMatchObject({
      leverancierSlug: 'vattenfall',
      type: 'vast',
      stroomTarief: 0.23,
    });
  });
});
