"""
data-pipeline/src/extractors/tarief_extractor.py

Extractie van tariefdata uit leverancierwebsites en PDF's.
Gebruikt Claude voor intelligente extractie uit ongestructureerde bronnen.
"""

import anthropic
import json
from dataclasses import dataclass, asdict
from typing import Optional
from datetime import date


@dataclass
class GeextraheerTarief:
    leverancier_slug: str
    product_naam: str
    type: str  # 'vast' | 'variabel' | 'dynamisch'

    stroom_tarief_enkel: Optional[float] = None
    stroom_tarief_normaal: Optional[float] = None
    stroom_tarief_dal: Optional[float] = None
    terugleverkosten: Optional[float] = None
    terugleververgoeding: Optional[float] = None

    gas_tarief: Optional[float] = None

    vaste_kosten_per_jaar: Optional[float] = None
    vast_recht_elektra: Optional[float] = None
    vast_recht_gas: Optional[float] = None

    contractduur_maanden: Optional[int] = None
    opzegtermijn_dagen: int = 30

    bron_url: Optional[str] = None
    betrouwbaarheid: float = 0.0  # 0–1
    handmatig_review_nodig: bool = False
    reden_review: Optional[str] = None


def extraheer_tarief_uit_tekst(
    leverancier_slug: str,
    bron_tekst: str,
    bron_url: str
) -> list[GeextraheerTarief]:
    """
    Gebruik Claude om tariefdata te extraheren uit ongestructureerde tekst
    (website HTML of PDF-inhoud).
    """
    client = anthropic.Anthropic()

    prompt = f"""Je bent een data-extractie specialist voor Nederlandse energietarieven.
Extraheer alle energieproducten en tarieven uit onderstaande tekst.

LEVERANCIER: {leverancier_slug}
BRON: {bron_url}

TEKST:
{bron_tekst[:8000]}  # Limiteer voor context window

Geef je antwoord als JSON array. Elk product is een object met deze velden:
{{
  "product_naam": "string",
  "type": "vast|variabel|dynamisch",
  "stroom_tarief_enkel": null of float (€/kWh, bijv. 0.2450),
  "stroom_tarief_normaal": null of float,
  "stroom_tarief_dal": null of float,
  "terugleverkosten": null of float (negatief als gebruiker betaalt),
  "terugleververgoeding": null of float,
  "gas_tarief": null of float (€/m3),
  "vaste_kosten_per_jaar": null of float (€/jaar totaal),
  "vast_recht_elektra": null of float (€/dag),
  "contractduur_maanden": null of integer,
  "betrouwbaarheid": float 0.0-1.0,
  "handmatig_review_nodig": boolean,
  "reden_review": null of string
}}

Regels:
- Alle bedragen zijn exclusief BTW tenzij anders vermeld
- Als iets niet duidelijk is: zet betrouwbaarheid laag en handmatig_review_nodig op true
- Geef alleen JSON, geen toelichting"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    tekst = message.content[0].text

    # Verwijder eventuele markdown code blocks
    if "```json" in tekst:
        tekst = tekst.split("```json")[1].split("```")[0]
    elif "```" in tekst:
        tekst = tekst.split("```")[1].split("```")[0]

    try:
        producten = json.loads(tekst.strip())
        resultaten = []
        for p in producten:
            tarief = GeextraheerTarief(
                leverancier_slug=leverancier_slug,
                bron_url=bron_url,
                **{k: v for k, v in p.items() if k in GeextraheerTarief.__dataclass_fields__}
            )
            resultaten.append(tarief)
        return resultaten
    except json.JSONDecodeError as e:
        print(f"JSON parse fout voor {leverancier_slug}: {e}")
        return [GeextraheerTarief(
            leverancier_slug=leverancier_slug,
            product_naam="PARSE_FOUT",
            type="onbekend",
            bron_url=bron_url,
            betrouwbaarheid=0.0,
            handmatig_review_nodig=True,
            reden_review=f"JSON parse fout: {e}"
        )]


def valideer_tarief(tarief: GeextraheerTarief) -> tuple[bool, list[str]]:
    """
    Basisvalidatie van geëxtraheerde tarieven.
    Geeft (geldig, lijst_van_fouten) terug.
    """
    fouten = []

    # Stroom tarief moet aanwezig zijn
    if not any([tarief.stroom_tarief_enkel, tarief.stroom_tarief_normaal]):
        fouten.append("Geen stroomtarief gevonden")

    # Sanity check: tarieven binnen reëel bereik
    for veld, waarde in [
        ("stroom_tarief_enkel", tarief.stroom_tarief_enkel),
        ("stroom_tarief_normaal", tarief.stroom_tarief_normaal),
    ]:
        if waarde and not (0.05 < waarde < 1.50):
            fouten.append(f"{veld} ({waarde}) buiten realistisch bereik 0.05–1.50 €/kWh")

    if tarief.gas_tarief and not (0.50 < tarief.gas_tarief < 5.00):
        fouten.append(f"gas_tarief ({tarief.gas_tarief}) buiten realistisch bereik 0.50–5.00 €/m3")

    # Vaste kosten check
    if tarief.vaste_kosten_per_jaar and not (50 < tarief.vaste_kosten_per_jaar < 1000):
        fouten.append(f"vaste_kosten_per_jaar ({tarief.vaste_kosten_per_jaar}) buiten bereik")

    return len(fouten) == 0, fouten


if __name__ == "__main__":
    # Test met voorbeeldtekst
    test_tekst = """
    Vattenfall Vaste Prijs 1 jaar
    Stroomtarief: € 0,2485 per kWh
    Gastartief: € 1,1250 per m3
    Vaste kosten: € 18,50 per maand
    Terugleververgoeding: € 0,0940 per kWh
    Contractduur: 12 maanden
    """

    resultaten = extraheer_tarief_uit_tekst(
        "vattenfall",
        test_tekst,
        "https://www.vattenfall.nl/stroom-gas/tarieven/"
    )

    for r in resultaten:
        geldig, fouten = valideer_tarief(r)
        print(f"\nProduct: {r.product_naam}")
        print(f"Betrouwbaarheid: {r.betrouwbaarheid}")
        print(f"Geldig: {geldig}")
        if fouten:
            print(f"Fouten: {fouten}")
        print(json.dumps(asdict(r), indent=2, default=str))
