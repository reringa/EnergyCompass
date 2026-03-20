# Data strategie — Energie Beslis App

## Het kernprobleem

Er bestaat geen publieke, uniforme realtime API voor Nederlandse energietarieven.
Elk leverancier publiceert data op een andere manier: sommige via tariefpagina's,
andere via PDF-tariefbladen, enkele via modelcontracten.

Dit is het grootste uitvoeringsrisico van het product.

## Aanpak: dataverzamel-pipeline met AI als extractielaag

We bouwen geen losse AI-agent die "het internet afstruint".
We bouwen een **onderhoudbare datamachine**.

### Per leverancier: een bronregister

Voor elke leverancier leggen we vast:

| Bron | Beschrijving |
|------|-------------|
| `productpagina` | Hoofdpagina met tarieven |
| `tarievenblad` | PDF of HTML tarievenblad |
| `modelcontract` | PDF modelcontract |
| `voorwaarden` | Teruglevervoorwaarden |
| `wijzigingspagina` | Pagina met tariefwijzigingen |

### Verwerkingsstappen

```
1. Scrapen (HTML/PDF ophalen)
        ↓
2. Deterministische parsing (tabelstructuren, vaste patronen)
        ↓
3. AI extractie (Claude, voor moeilijke PDF's en afwijkende formuleringen)
        ↓
4. Validatie (sanity checks: tarieven binnen realistisch bereik)
        ↓
5. Confidence scoring (0–1, per veld)
        ↓
6. Versiebeheer (elke update opslaan, nooit overschrijven)
        ↓
7. Handmatige review (bij confidence < 0.7 of validatiefout)
```

## MVP: 10–15 leveranciers

Startset voor zonnepaneelhuishoudens:

| Prioriteit | Leverancier | Reden |
|-----------|-------------|-------|
| 1 | Vattenfall | Groot marktaandeel |
| 1 | Eneco | Groot marktaandeel |
| 1 | Essent | Groot marktaandeel |
| 1 | E.ON | Groot marktaandeel |
| 2 | Greenchoice | Populair bij zonnepaneelbezitters |
| 2 | Vandebron | Populair bij zonnepaneelbezitters |
| 2 | Budget Energie | Prijsgericht segment |
| 2 | Energie Direct | Prijsgericht segment |
| 3 | Pure Energie | Groeiend |
| 3 | Oxxio | Groeiend |

## Kritische datavelden per leverancier

Voor elk product moeten we minimaal hebben:

**Verplicht (zonder dit geen advies):**
- Stroomtarief (€/kWh)
- Vaste leveringskosten (€/jaar of €/dag)
- Contracttype (vast/variabel/dynamisch)

**Belangrijk voor zonnepaneelhuishoudens:**
- Terugleverkosten (€/kWh) — steeds vaker van toepassing
- Terugleververgoeding (€/kWh)
- Opzegtermijn (dagen)

**Handig maar niet blokkerend:**
- Contractduur (maanden)
- Gastarieven
- Dubbeltarief (normaal/dal)

## Datakwaliteit bewaken

### Confidence scoring

Elk geëxtraheerd veld krijgt een confidence score (0–1):
- **1.0** — geëxtraheerd via deterministische parsing (tabel, duidelijk patroon)
- **0.7–0.9** — AI-extractie met hoge zekerheid
- **0.4–0.7** — AI-extractie met matige zekerheid, review aanbevolen
- **< 0.4** — handmatige review verplicht

### Validatieregels

```python
# Stroomtarief
assert 0.05 < stroom_tarief_enkel < 1.50  # €/kWh

# Gastarieven
assert 0.50 < gas_tarief < 5.00  # €/m3

# Vaste kosten
assert 50 < vaste_kosten_per_jaar < 1000  # €/jaar

# Terugleververgoeding
assert 0.00 <= terugleververgoeding < stroom_tarief_enkel  # nooit meer dan inkoop
```

### Versiebeheer

Nooit bestaande tarieven overschrijven. Elke update:
- krijgt een nieuwe rij in de database
- met `geldig_vanaf` = vandaag
- en `geldig_tot` op de vorige rij

Zo kunnen we altijd terugkijken en trendanalyses maken.

## Updatefrequentie

| Type | Frequentie |
|------|-----------|
| Variabele tarieven | Dagelijks |
| Vaste tarieven | Wekelijks |
| Voorwaarden en condities | Maandelijks |
| Handmatige controle | Maandelijks |

## Aansprakelijkheid en disclaimers

- Adviezen zijn gebaseerd op de best beschikbare data, maar kunnen afwijken van actuele leveranciersprijzen
- Gebruikers worden altijd doorverwezen naar de leverancier voor definitieve tarieven
- We geven bandbreedtes, geen exacte garanties
- Bij lage confidence scores tonen we een waarschuwing in de app
