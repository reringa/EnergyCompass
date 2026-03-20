// Energie App — centrale TypeScript types

// ─── Gebruikersprofiel ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Locatie
  postcode: string;
  huisnummer: string;

  // Verbruik
  jaarVerbruikKwh: number;
  jaarVerbruikGasM3: number | null;
  meterType: 'enkeltarief' | 'dubbeltarief';

  // Zonnepanelen
  heeftZonnepanelen: boolean;
  jaarOpwekKwh: number | null;
  jaarTerugleveringKwh: number | null;

  // Huidig contract
  huidigContract: Contract;

  // Voorkeuren
  voorkeur: 'zekerheid' | 'flexibiliteit' | 'neutraal';
  interesseInBatterij: boolean;
  interesseInEV: boolean;
  interesseInWarmtepomp: boolean;
}

export interface Contract {
  leverancierSlug: string;   // bijv. 'vattenfall', 'eneco', 'eon'
  productNaam: string;
  type: 'vast' | 'variabel' | 'dynamisch';
  einddatum: Date | null;
  stroomTarief: number;       // €/kWh
  gasTarief: number | null;   // €/m3
  vasteKosten: number;        // €/jaar
  terugleverkosten: number | null;  // €/kWh (negatief = gebruiker betaalt)
  terugleververgoeding: number | null;  // €/kWh
}

// ─── Leveranciersdata ─────────────────────────────────────────────────────────

export interface Leverancier {
  slug: string;
  naam: string;
  website: string;
  geschiktVoorZonnepanelen: boolean;
  dataKwaliteit: 'hoog' | 'middel' | 'laag';
  laatstBijgewerkt: Date;
}

export interface Tarievenblad {
  leverancierSlug: string;
  productNaam: string;
  type: 'vast' | 'variabel' | 'dynamisch';
  geldigVanaf: Date;
  geldigTot: Date | null;

  // Elektriciteit
  stroomTariefEnkel: number | null;     // €/kWh
  stroomTariefNormaal: number | null;   // €/kWh
  stroomTariefDal: number | null;       // €/kWh
  terugleverkosten: number | null;      // €/kWh
  terugleververgoeding: number | null;  // €/kWh

  // Gas
  gasTarief: number | null;             // €/m3

  // Vaste kosten
  vasteKostenPerJaar: number;
  vastRechtElektra: number;             // €/dag
  vastRechtGas: number | null;          // €/dag

  // Meta
  contractduurMaanden: number | null;
  opzegtermijnDagen: number;
  bronUrl: string;
  extractieBetrouwbaarheid: number;     // 0–1 confidence score
}

// ─── Advies ───────────────────────────────────────────────────────────────────

export type AdviesType =
  | 'blijven'          // huidige contract is optimaal
  | 'overstappen'      // beter alternatief beschikbaar
  | 'wachten'          // markt beweegt, nog niet handelen
  | 'opletten'         // contract loopt binnenkort af
  | 'niet_rendabel';   // investering nog niet rendabel

export interface Advies {
  id: string;
  profielId: string;
  gegenereerd: Date;

  type: AdviesType;
  urgentie: 'laag' | 'middel' | 'hoog';

  // Hoofdboodschap (max 2 zinnen, taal: Nederlands)
  samenvatting: string;

  // Uitleg
  uitleg: string;
  aannames: string[];

  // Financieel (optioneel)
  besparingMinKwh: number | null;
  besparingMaxKwh: number | null;
  besparingMinEuro: number | null;
  besparingMaxEuro: number | null;

  // Aanbevolen product (bij overstappen)
  aanbevolenLeverancier: string | null;
  aanbevolenProduct: string | null;

  // Wanneer opnieuw berekenen
  volgendCheckDatum: Date;
}

// ─── Data pipeline ────────────────────────────────────────────────────────────

export interface ScraperResultaat {
  leverancierSlug: string;
  succesvol: boolean;
  timestamp: Date;
  aantalProducten: number;
  fouten: string[];
  ruweData: unknown;
}

export interface ExtractieResultaat {
  leverancierSlug: string;
  productNaam: string;
  tarief: Partial<Tarievenblad>;
  betrouwbaarheid: number;   // 0–1
  handmatigReviewNodig: boolean;
  reden: string | null;
}
