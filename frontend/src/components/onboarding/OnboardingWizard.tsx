'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { slaProfielOp, LEVERANCIERS } from '@/lib/api';

// ─── Validatieschema per stap ─────────────────────────────────────────────────

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

type StapLocatieData = z.infer<typeof stapLocatieSchema>;
type StapVerbruikData = z.infer<typeof stapVerbruikSchema>;
type StapZonnepanelenData = z.infer<typeof stapZonnepanelenSchema>;
type StapContractData = z.infer<typeof stapContractSchema>;
type StapVoorkeurenData = z.infer<typeof stapVoorkeurenSchema>;

type FormState = StapLocatieData &
  StapVerbruikData &
  StapZonnepanelenData &
  StapContractData &
  StapVoorkeurenData;

// ─── Hulpcomponenten ──────────────────────────────────────────────────────────

function StapVoortgang({ huidig, totaal }: { huidig: number; totaal: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: totaal }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < huidig ? 'bg-blue-600' : i === huidig ? 'bg-blue-300' : 'bg-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">
        {huidig + 1} / {totaal}
      </span>
    </div>
  );
}

function StapKoptekst({ titel, omschrijving }: { titel: string; omschrijving: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900">{titel}</h2>
      <p className="text-gray-500 text-sm mt-1">{omschrijving}</p>
    </div>
  );
}

function NavigatieKnoppen({
  isEerste,
  isLaatste,
  laden,
  onTerug,
}: {
  isEerste: boolean;
  isLaatste: boolean;
  laden: boolean;
  onTerug: () => void;
}) {
  return (
    <div className="flex gap-3 mt-6">
      {!isEerste && (
        <button type="button" onClick={onTerug} className="btn-secondary flex-1">
          Terug
        </button>
      )}
      <button type="submit" disabled={laden} className="btn-primary flex-1">
        {laden ? 'Opslaan...' : isLaatste ? 'Profiel opslaan' : 'Volgende'}
      </button>
    </div>
  );
}

// ─── Stap 1: Locatie ──────────────────────────────────────────────────────────

function StapLocatie({
  standaard,
  onVolgende,
}: {
  standaard: Partial<StapLocatieData>;
  onVolgende: (d: StapLocatieData) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<StapLocatieData>({
    resolver: zodResolver(stapLocatieSchema),
    defaultValues: standaard,
  });

  return (
    <form onSubmit={handleSubmit(onVolgende)}>
      <StapKoptekst
        titel="Waar woont u?"
        omschrijving="Uw locatie gebruiken we om regionale tarieven te vergelijken."
      />
      <div className="space-y-4">
        <div>
          <label className="label">Postcode</label>
          <input {...register('postcode')} className={`input-field uppercase ${errors.postcode ? 'input-error' : ''}`}
            placeholder="1234AB" maxLength={7} />
          {errors.postcode && <p className="error-msg">{errors.postcode.message}</p>}
        </div>
        <div>
          <label className="label">Huisnummer</label>
          <input {...register('huisnummer')} className={`input-field ${errors.huisnummer ? 'input-error' : ''}`}
            placeholder="10A" />
          {errors.huisnummer && <p className="error-msg">{errors.huisnummer.message}</p>}
        </div>
      </div>
      <NavigatieKnoppen isEerste isLaatste={false} laden={false} onTerug={() => {}} />
    </form>
  );
}

// ─── Stap 2: Verbruik ─────────────────────────────────────────────────────────

function StapVerbruik({
  standaard,
  onVolgende,
  onTerug,
}: {
  standaard: Partial<StapVerbruikData>;
  onVolgende: (d: StapVerbruikData) => void;
  onTerug: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<StapVerbruikData>({
    resolver: zodResolver(stapVerbruikSchema),
    defaultValues: { meterType: 'enkeltarief', ...standaard },
  });

  return (
    <form onSubmit={handleSubmit(onVolgende)}>
      <StapKoptekst
        titel="Uw energieverbruik"
        omschrijving="Kijk op uw energienota of jaarafrekening voor deze gegevens."
      />
      <div className="space-y-4">
        <div>
          <label className="label">Stroomverbruik (kWh/jaar)</label>
          <input
            {...register('jaarVerbruikKwh', { valueAsNumber: true })}
            type="number" inputMode="numeric"
            className={`input-field ${errors.jaarVerbruikKwh ? 'input-error' : ''}`}
            placeholder="3500"
          />
          {errors.jaarVerbruikKwh && <p className="error-msg">{errors.jaarVerbruikKwh.message}</p>}
          <p className="text-xs text-gray-400 mt-1">Gemiddeld Nederlands huishouden: ±2.900 kWh</p>
        </div>

        <div>
          <label className="label">Gasverbruik (m³/jaar) — optioneel</label>
          <input
            {...register('jaarVerbruikGasM3', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
            type="number" inputMode="numeric"
            className={`input-field ${errors.jaarVerbruikGasM3 ? 'input-error' : ''}`}
            placeholder="1500"
          />
          {errors.jaarVerbruikGasM3 && <p className="error-msg">{errors.jaarVerbruikGasM3.message}</p>}
        </div>

        <div>
          <label className="label">Type slimme meter</label>
          <select {...register('meterType')} className="input-field">
            <option value="enkeltarief">Enkeltarief</option>
            <option value="dubbeltarief">Dubbeltarief (normaal/dal)</option>
          </select>
        </div>
      </div>
      <NavigatieKnoppen isEerste={false} isLaatste={false} laden={false} onTerug={onTerug} />
    </form>
  );
}

// ─── Stap 3: Zonnepanelen ────────────────────────────────────────────────────

function StapZonnepanelen({
  standaard,
  onVolgende,
  onTerug,
}: {
  standaard: Partial<StapZonnepanelenData>;
  onVolgende: (d: StapZonnepanelenData) => void;
  onTerug: () => void;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<StapZonnepanelenData>({
    resolver: zodResolver(stapZonnepanelenSchema),
    defaultValues: { heeftZonnepanelen: false, ...standaard },
  });

  const heeft = watch('heeftZonnepanelen');

  return (
    <form onSubmit={handleSubmit(onVolgende)}>
      <StapKoptekst
        titel="Heeft u zonnepanelen?"
        omschrijving="We houden rekening met uw opwek en teruglevering bij het advies."
      />
      <div className="space-y-4">
        <div className="flex gap-3">
          {[{ waarde: false, label: 'Nee' }, { waarde: true, label: 'Ja' }].map(({ waarde, label }) => (
            <label key={label} className="flex-1 cursor-pointer">
              <input {...register('heeftZonnepanelen', { setValueAs: v => v === 'true' || v === true })}
                type="radio" value={String(waarde)} className="sr-only" />
              <div className={`text-center py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                heeft === waarde
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
                {label}
              </div>
            </label>
          ))}
        </div>

        {heeft && (
          <>
            <div>
              <label className="label">Jaarlijkse opwek (kWh/jaar)</label>
              <input
                {...register('jaarOpwekKwh', { valueAsNumber: true })}
                type="number" inputMode="numeric"
                className={`input-field ${errors.jaarOpwekKwh ? 'input-error' : ''}`}
                placeholder="4000"
              />
              {errors.jaarOpwekKwh && <p className="error-msg">{errors.jaarOpwekKwh.message}</p>}
            </div>
            <div>
              <label className="label">Jaarlijkse teruglevering (kWh/jaar) — optioneel</label>
              <input
                {...register('jaarTerugleveringKwh', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                type="number" inputMode="numeric"
                className="input-field"
                placeholder="1500"
              />
            </div>
          </>
        )}
      </div>
      <NavigatieKnoppen isEerste={false} isLaatste={false} laden={false} onTerug={onTerug} />
    </form>
  );
}

// ─── Stap 4: Huidig contract ─────────────────────────────────────────────────

function StapContract({
  standaard,
  onVolgende,
  onTerug,
}: {
  standaard: Partial<StapContractData>;
  onVolgende: (d: StapContractData) => void;
  onTerug: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<StapContractData>({
    resolver: zodResolver(stapContractSchema),
    defaultValues: { contractType: 'vast', ...standaard },
  });

  return (
    <form onSubmit={handleSubmit(onVolgende)}>
      <StapKoptekst
        titel="Uw huidige energiecontract"
        omschrijving="Kijk op uw contract of Mijn Omgeving bij uw leverancier."
      />
      <div className="space-y-4">
        <div>
          <label className="label">Energieleverancier</label>
          <select {...register('leverancierSlug')}
            className={`input-field ${errors.leverancierSlug ? 'input-error' : ''}`}>
            <option value="">-- Kies een leverancier --</option>
            {LEVERANCIERS.map((l) => (
              <option key={l.slug} value={l.slug}>{l.naam}</option>
            ))}
          </select>
          {errors.leverancierSlug && <p className="error-msg">{errors.leverancierSlug.message}</p>}
        </div>

        <div>
          <label className="label">Contracttype</label>
          <select {...register('contractType')} className="input-field">
            <option value="vast">Vast tarief</option>
            <option value="variabel">Variabel tarief</option>
            <option value="dynamisch">Dynamisch tarief (uurprijzen)</option>
          </select>
        </div>

        <div>
          <label className="label">Contracteinddatum — optioneel</label>
          <input {...register('einddatum')} type="date" className="input-field" />
          <p className="text-xs text-gray-400 mt-1">
            We sturen een herinnering 3 maanden voor afloop
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Stroomtarief (€/kWh) — optioneel</label>
            <input
              {...register('stroomTarief', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
              type="number" step="0.0001"
              className="input-field" placeholder="0,28"
            />
          </div>
          <div>
            <label className="label">Gastarief (€/m³) — optioneel</label>
            <input
              {...register('gasTarief', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
              type="number" step="0.0001"
              className="input-field" placeholder="1,05"
            />
          </div>
        </div>
      </div>
      <NavigatieKnoppen isEerste={false} isLaatste={false} laden={false} onTerug={onTerug} />
    </form>
  );
}

// ─── Stap 5: Voorkeuren ───────────────────────────────────────────────────────

function StapVoorkeuren({
  standaard,
  laden,
  onVolgende,
  onTerug,
}: {
  standaard: Partial<StapVoorkeurenData>;
  laden: boolean;
  onVolgende: (d: StapVoorkeurenData) => void;
  onTerug: () => void;
}) {
  const { register, handleSubmit, watch } = useForm<StapVoorkeurenData>({
    defaultValues: {
      voorkeur: 'neutraal',
      interesseInBatterij: false,
      interesseInEV: false,
      interesseInWarmtepomp: false,
      ...standaard,
    },
  });

  const voorkeur = watch('voorkeur');

  const voorkeurOpties = [
    { waarde: 'zekerheid', label: 'Zekerheid', omschrijving: 'Vaste tarieven, geen verrassingen' },
    { waarde: 'neutraal', label: 'Neutraal', omschrijving: 'Beste prijs-risicoverhouding' },
    { waarde: 'flexibiliteit', label: 'Flexibiliteit', omschrijving: 'Korte contracten, mee bewegen met markt' },
  ] as const;

  return (
    <form onSubmit={handleSubmit(onVolgende)}>
      <StapKoptekst
        titel="Uw voorkeuren"
        omschrijving="Hiermee stemmen we het advies af op wat bij u past."
      />
      <div className="space-y-6">
        <div>
          <label className="label mb-3">Voorkeur voor contractvorm</label>
          <div className="space-y-2">
            {voorkeurOpties.map(({ waarde, label, omschrijving }) => (
              <label key={waarde} className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                hover:border-blue-200" style={{ borderColor: voorkeur === waarde ? '#2563eb' : '#e5e7eb',
                  backgroundColor: voorkeur === waarde ? '#eff6ff' : 'white' }}>
                <input {...register('voorkeur')} type="radio" value={waarde} className="mt-0.5 accent-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{omschrijving}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label mb-3">Toekomstige interesse (optioneel)</label>
          <div className="space-y-2">
            {[
              { field: 'interesseInBatterij' as const, label: 'Thuisbatterij' },
              { field: 'interesseInEV' as const, label: 'Elektrische auto (laadadvies)' },
              { field: 'interesseInWarmtepomp' as const, label: 'Warmtepomp' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input {...register(field)} type="checkbox" className="accent-blue-600 w-4 h-4" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <NavigatieKnoppen isEerste={false} isLaatste laden={laden} onTerug={onTerug} />
    </form>
  );
}

// ─── Hoofd wizard component ───────────────────────────────────────────────────

export function OnboardingWizard({
  gebruikerId,
  email,
}: {
  gebruikerId: string;
  email: string;
}) {
  const router = useRouter();
  const [stap, setStap] = useState(0);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState('');
  const [formData, setFormData] = useState<Partial<FormState>>({});

  function volgende<T extends object>(data: T) {
    setFormData((huidig) => ({ ...huidig, ...data }));
    setStap((s) => s + 1);
  }

  function terug() {
    setStap((s) => s - 1);
  }

  async function afronden(voorkeurenData: StapVoorkeurenData) {
    const alles = { ...formData, ...voorkeurenData } as FormState;
    setLaden(true);
    setFout('');

    try {
      await slaProfielOp({
        email,
        postcode: alles.postcode.replace(/\s/g, '').toUpperCase(),
        huisnummer: alles.huisnummer,
        jaarVerbruikKwh: alles.jaarVerbruikKwh,
        jaarVerbruikGasM3: alles.jaarVerbruikGasM3 ?? null,
        meterType: alles.meterType,
        heeftZonnepanelen: alles.heeftZonnepanelen,
        jaarOpwekKwh: alles.jaarOpwekKwh ?? null,
        jaarTerugleveringKwh: alles.jaarTerugleveringKwh ?? null,
        voorkeur: alles.voorkeur,
        interesseInBatterij: alles.interesseInBatterij,
        interesseInEV: alles.interesseInEV,
        interesseInWarmtepomp: alles.interesseInWarmtepomp,
        contract: {
          leverancierSlug: alles.leverancierSlug,
          productNaam: `${LEVERANCIERS.find((l) => l.slug === alles.leverancierSlug)?.naam ?? alles.leverancierSlug} ${alles.contractType}`,
          type: alles.contractType,
          einddatum: alles.einddatum || null,
          stroomTarief: alles.stroomTarief ?? null,
          gasTarief: alles.gasTarief ?? null,
          vasteKosten: null,
        },
      });

      router.push('/dashboard');
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Er is iets misgegaan. Probeer het opnieuw.');
      setLaden(false);
    }
  }

  const stappen = [
    <StapLocatie key="locatie" standaard={formData} onVolgende={volgende} />,
    <StapVerbruik key="verbruik" standaard={formData} onVolgende={volgende} onTerug={terug} />,
    <StapZonnepanelen key="zonnepanelen" standaard={formData} onVolgende={volgende} onTerug={terug} />,
    <StapContract key="contract" standaard={formData} onVolgende={volgende} onTerug={terug} />,
    <StapVoorkeuren key="voorkeuren" standaard={formData} laden={laden} onVolgende={afronden} onTerug={terug} />,
  ];

  return (
    <div className="card">
      <StapVoortgang huidig={stap} totaal={stappen.length} />
      {stappen[stap]}
      {fout && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{fout}</p>
        </div>
      )}
    </div>
  );
}
