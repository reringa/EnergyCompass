// services/adviesService.ts
// Kern beslislogica: vergelijkt profiel met markt en genereert advies via Claude

import Anthropic from '@anthropic-ai/sdk';
import type { UserProfile, Tarievenblad, Advies, AdviesType } from '../models/types';

const client = new Anthropic();

// ─── Jaarkosten berekening ────────────────────────────────────────────────────

export function berekenJaarkosten(
  profiel: UserProfile,
  tarief: Tarievenblad
): number {
  const verbruik = profiel.jaarVerbruikKwh;
  const teruglevering = profiel.jaarTerugleveringKwh ?? 0;

  // Stroomkosten
  const stroomTarief = tarief.stroomTariefEnkel ?? tarief.stroomTariefNormaal ?? 0;
  const stroomKosten = verbruik * stroomTarief;

  // Terugleverkosten (negatief = opbrengst voor gebruiker)
  const terugleverKosten = teruglevering * (tarief.terugleverkosten ?? 0);
  const terugleverOpbrengst = teruglevering * (tarief.terugleververgoeding ?? 0);

  // Gaskosten
  const gasKosten = profiel.jaarVerbruikGasM3
    ? profiel.jaarVerbruikGasM3 * (tarief.gasTarief ?? 0)
    : 0;

  return (
    stroomKosten +
    terugleverKosten -
    terugleverOpbrengst +
    gasKosten +
    tarief.vasteKostenPerJaar
  );
}

// ─── Advies type bepalen ──────────────────────────────────────────────────────

export function bepaalAdviesType(
  huidigeTarief: Tarievenblad,
  besteAlternatief: Tarievenblad | null,
  profiel: UserProfile,
  maandenTotEinde: number | null
): AdviesType {
  // Contract loopt bijna af
  if (maandenTotEinde !== null && maandenTotEinde <= 3) {
    return 'opletten';
  }

  if (!besteAlternatief) return 'blijven';

  const huidigeKosten = berekenJaarkosten(profiel, huidigeTarief);
  const alternatiefKosten = berekenJaarkosten(profiel, besteAlternatief);
  const besparingPct = (huidigeKosten - alternatiefKosten) / huidigeKosten;

  // Meer dan 10% besparing mogelijk → overstappen
  if (besparingPct > 0.10) return 'overstappen';

  // Kleine besparing maar contract loopt nog lang → wachten
  if (besparingPct > 0.03 && maandenTotEinde !== null && maandenTotEinde > 3) {
    return 'wachten';
  }

  return 'blijven';
}

// ─── Claude adviesgeneratie ───────────────────────────────────────────────────

export async function genereerAdviesTekst(
  profiel: UserProfile,
  adviesType: AdviesType,
  huidigeKosten: number,
  besteKosten: number | null,
  besteAlternatief: Tarievenblad | null
): Promise<{ samenvatting: string; uitleg: string; aannames: string[] }> {

  const besparingEuro = besteKosten ? huidigeKosten - besteKosten : null;
  const heeftZonnepanelen = profiel.heeftZonnepanelen;

  const prompt = `Je bent een persoonlijke energie-adviseur voor een Nederlands huishouden.
Geef een helder, eerlijk advies op basis van onderstaande situatie.

PROFIEL:
- Jaarverbruik stroom: ${profiel.jaarVerbruikKwh} kWh
- Jaarverbruik gas: ${profiel.jaarVerbruikGasM3 ?? 'onbekend'} m3
- Zonnepanelen: ${heeftZonnepanelen ? `ja (${profiel.jaarOpwekKwh} kWh opwek, ${profiel.jaarTerugleveringKwh} kWh teruglevering)` : 'nee'}
- Huidig contract: ${profiel.huidigContract.leverancierSlug} ${profiel.huidigContract.type}
- Voorkeur: ${profiel.voorkeur}

ADVIESTYPE: ${adviesType}
HUIDIGE JAARKOSTEN: €${huidigeKosten.toFixed(0)}
${besteAlternatief ? `BESTE ALTERNATIEF: ${besteAlternatief.leverancierSlug} - ${besteAlternatief.productNaam}` : ''}
${besparingEuro ? `POTENTIËLE BESPARING: €${besparingEuro.toFixed(0)} per jaar` : ''}

Geef je antwoord in dit JSON-formaat (geen markdown, alleen JSON):
{
  "samenvatting": "max 2 zinnen, directe boodschap",
  "uitleg": "3-5 zinnen uitleg, eerlijk en begrijpelijk",
  "aannames": ["aanname 1", "aanname 2", "aanname 3"]
}

Regels:
- Schrijf in gewoon Nederlands
- Wees eerlijk over onzekerheid
- Gebruik geen verkooptaal
- Noem altijd de aannames
- Bij zonnepanelen: benoem impact terugleverkosten/vergoeding`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Onverwacht antwoordformaat van Claude');

  try {
    return JSON.parse(content.text);
  } catch {
    // Fallback als JSON parsing mislukt
    return {
      samenvatting: content.text.slice(0, 200),
      uitleg: content.text,
      aannames: ['Tarieven op basis van actuele marktdata', 'Verbruik op basis van ingevoerd profiel'],
    };
  }
}

// ─── Hoofd advies functie ─────────────────────────────────────────────────────

export async function genereerAdvies(
  profiel: UserProfile,
  huidigeTarief: Tarievenblad,
  marktTarieven: Tarievenblad[]
): Promise<Omit<Advies, 'id' | 'profielId' | 'gegenereerd'>> {

  const huidigeKosten = berekenJaarkosten(profiel, huidigeTarief);

  // Sorteer alternatieven op kosten, goedkoopste eerst
  const gesorteerd = marktTarieven
    .filter(t => t.leverancierSlug !== profiel.huidigContract.leverancierSlug)
    .sort((a, b) => berekenJaarkosten(profiel, a) - berekenJaarkosten(profiel, b));

  const besteAlternatief = gesorteerd[0] ?? null;
  const besteKosten = besteAlternatief ? berekenJaarkosten(profiel, besteAlternatief) : null;

  // Maanden tot contracteinde
  const maandenTotEinde = profiel.huidigContract.einddatum
    ? Math.round(
        (new Date(profiel.huidigContract.einddatum).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24 * 30)
      )
    : null;

  const adviesType = bepaalAdviesType(huidigeTarief, besteAlternatief, profiel, maandenTotEinde);

  const { samenvatting, uitleg, aannames } = await genereerAdviesTekst(
    profiel, adviesType, huidigeKosten, besteKosten, besteAlternatief
  );

  const besparingEuro = besteKosten ? huidigeKosten - besteKosten : null;

  return {
    type: adviesType,
    urgentie: adviesType === 'opletten' || adviesType === 'overstappen' ? 'hoog' : 'laag',
    samenvatting,
    uitleg,
    aannames,
    besparingMinKwh: null,
    besparingMaxKwh: null,
    besparingMinEuro: besparingEuro ? besparingEuro * 0.8 : null,
    besparingMaxEuro: besparingEuro ? besparingEuro * 1.2 : null,
    aanbevolenLeverancier: besteAlternatief?.leverancierSlug ?? null,
    aanbevolenProduct: besteAlternatief?.productNaam ?? null,
    volgendCheckDatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dagen
  };
}
