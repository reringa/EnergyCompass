-- Energie Beslis App — databaseschema
-- PostgreSQL 16+

-- Extensies
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Gebruikersprofielen ─────────────────────────────────────────────────────

CREATE TABLE gebruikers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  wachtwoord_hash TEXT,                    -- NULL bij OAuth-accounts
  aangemaakt_op   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bijgewerkt_op   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profielen (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gebruiker_id              UUID REFERENCES gebruikers(id) ON DELETE CASCADE,
  aangemaakt_op             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bijgewerkt_op             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Locatie
  postcode                  TEXT NOT NULL,
  huisnummer                TEXT NOT NULL,

  -- Verbruik
  jaar_verbruik_kwh         INTEGER NOT NULL,
  jaar_verbruik_gas_m3      INTEGER,
  meter_type                TEXT NOT NULL DEFAULT 'enkeltarief'
                              CHECK (meter_type IN ('enkeltarief', 'dubbeltarief')),

  -- Zonnepanelen
  heeft_zonnepanelen        BOOLEAN NOT NULL DEFAULT FALSE,
  jaar_opwek_kwh            INTEGER,
  jaar_teruglevering_kwh    INTEGER,

  -- Voorkeur
  voorkeur                  TEXT NOT NULL DEFAULT 'neutraal'
                              CHECK (voorkeur IN ('zekerheid', 'flexibiliteit', 'neutraal')),
  interesse_batterij        BOOLEAN NOT NULL DEFAULT FALSE,
  interesse_ev              BOOLEAN NOT NULL DEFAULT FALSE,
  interesse_warmtepomp      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE contracten (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profiel_id                UUID REFERENCES profielen(id) ON DELETE CASCADE,
  is_huidig                 BOOLEAN NOT NULL DEFAULT TRUE,
  aangemaakt_op             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  leverancier_slug          TEXT NOT NULL,
  product_naam              TEXT NOT NULL,
  type                      TEXT NOT NULL CHECK (type IN ('vast', 'variabel', 'dynamisch')),
  einddatum                 DATE,

  stroom_tarief             NUMERIC(6,4),
  gas_tarief                NUMERIC(6,4),
  vaste_kosten              NUMERIC(8,2),
  terugleverkosten          NUMERIC(6,4),
  terugleververgoeding      NUMERIC(6,4)
);

-- ─── Leveranciersdata ────────────────────────────────────────────────────────

CREATE TABLE leveranciers (
  slug                      TEXT PRIMARY KEY,
  naam                      TEXT NOT NULL,
  website                   TEXT NOT NULL,
  geschikt_voor_zonnepanelen BOOLEAN NOT NULL DEFAULT TRUE,
  data_kwaliteit            TEXT NOT NULL DEFAULT 'laag'
                              CHECK (data_kwaliteit IN ('hoog', 'middel', 'laag')),
  actief                    BOOLEAN NOT NULL DEFAULT TRUE,
  aangemaakt_op             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tarievenbladen (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leverancier_slug          TEXT REFERENCES leveranciers(slug),
  product_naam              TEXT NOT NULL,
  type                      TEXT NOT NULL CHECK (type IN ('vast', 'variabel', 'dynamisch')),
  aangemaakt_op             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geldig_vanaf              DATE NOT NULL,
  geldig_tot                DATE,

  -- Stroom tarieven (€/kWh)
  stroom_tarief_enkel       NUMERIC(6,4),
  stroom_tarief_normaal     NUMERIC(6,4),
  stroom_tarief_dal         NUMERIC(6,4),
  terugleverkosten          NUMERIC(6,4),
  terugleververgoeding      NUMERIC(6,4),

  -- Gas tarief (€/m3)
  gas_tarief                NUMERIC(6,4),

  -- Vaste kosten
  vaste_kosten_per_jaar     NUMERIC(8,2) NOT NULL,
  vast_recht_elektra        NUMERIC(6,4) NOT NULL,
  vast_recht_gas            NUMERIC(6,4),

  -- Contract condities
  contractduur_maanden      INTEGER,
  opzegtermijn_dagen        INTEGER NOT NULL DEFAULT 30,

  -- Data kwaliteit
  bron_url                  TEXT,
  extractie_betrouwbaarheid NUMERIC(3,2) NOT NULL DEFAULT 0.5
                              CHECK (extractie_betrouwbaarheid BETWEEN 0 AND 1),
  handmatig_gevalideerd     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index voor snelle marktquery's
CREATE INDEX idx_tarievenbladen_leverancier ON tarievenbladen(leverancier_slug);
CREATE INDEX idx_tarievenbladen_geldig ON tarievenbladen(geldig_vanaf, geldig_tot);

-- ─── Adviezen ────────────────────────────────────────────────────────────────

CREATE TABLE adviezen (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profiel_id                UUID REFERENCES profielen(id) ON DELETE CASCADE,
  gegenereerd_op            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  type                      TEXT NOT NULL CHECK (type IN
                              ('blijven', 'overstappen', 'wachten', 'opletten', 'niet_rendabel')),
  urgentie                  TEXT NOT NULL CHECK (urgentie IN ('laag', 'middel', 'hoog')),

  samenvatting              TEXT NOT NULL,
  uitleg                    TEXT NOT NULL,
  aannames                  TEXT[] NOT NULL DEFAULT '{}',

  besparing_min_euro        NUMERIC(8,2),
  besparing_max_euro        NUMERIC(8,2),

  aanbevolen_leverancier    TEXT,
  aanbevolen_product        TEXT,

  volgende_check_datum      DATE NOT NULL
);

-- ─── Seed data: MVP leveranciers ─────────────────────────────────────────────

INSERT INTO leveranciers (slug, naam, website, geschikt_voor_zonnepanelen, data_kwaliteit) VALUES
  ('vattenfall',    'Vattenfall',      'https://www.vattenfall.nl',    TRUE, 'laag'),
  ('eneco',         'Eneco',           'https://www.eneco.nl',         TRUE, 'laag'),
  ('eon',           'E.ON',            'https://www.eon.nl',           TRUE, 'laag'),
  ('essent',        'Essent',          'https://www.essent.nl',        TRUE, 'laag'),
  ('greenchoice',   'Greenchoice',     'https://www.greenchoice.nl',  TRUE, 'laag'),
  ('budget-energie','Budget Energie',  'https://www.budgetenergie.nl', TRUE, 'laag'),
  ('pure-energie',  'Pure Energie',    'https://www.pure-energie.nl',  TRUE, 'laag'),
  ('vandebron',     'Vandebron',       'https://www.vandebron.nl',     TRUE, 'laag'),
  ('energie-direct','Energie Direct',  'https://www.energiedirect.nl', TRUE, 'laag'),
  ('oxxio',         'Oxxio',           'https://www.oxxio.nl',         TRUE, 'laag');
