'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  haalProfielOpViaGebruiker,
  updateProfiel,
  wijzigWachtwoord,
  verwijderAccount,
  LEVERANCIERS,
  type ProfielResponse,
} from '@/lib/api';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';

// ─── Validatieschema's ────────────────────────────────────────────────────────

const profielSchema = z.object({
  postcode: z.string().regex(/^\d{4}\s?[A-Za-z]{2}$/, 'Ongeldige postcode'),
  huisnummer: z.string().min(1),
  jaarVerbruikKwh: z.number({ invalid_type_error: 'Voer een getal in' }).int().positive(),
  jaarVerbruikGasM3: z.number().int().min(0).nullable().optional(),
  meterType: z.enum(['enkeltarief', 'dubbeltarief']),
  heeftZonnepanelen: z.boolean(),
  jaarOpwekKwh: z.number().int().min(0).nullable().optional(),
  jaarTerugleveringKwh: z.number().int().min(0).nullable().optional(),
  voorkeur: z.enum(['zekerheid', 'flexibiliteit', 'neutraal']),
  interesseInBatterij: z.boolean(),
  interesseInEV: z.boolean(),
  interesseInWarmtepomp: z.boolean(),
  leverancierSlug: z.string().min(1),
  contractType: z.enum(['vast', 'variabel', 'dynamisch']),
  einddatum: z.string().optional(),
  stroomTarief: z.number().positive().nullable().optional(),
  gasTarief: z.number().positive().nullable().optional(),
});
type ProfielFormData = z.infer<typeof profielSchema>;

const wachtwoordSchema = z
  .object({
    huidig: z.string().min(1, 'Vul uw huidige wachtwoord in'),
    nieuw: z.string().min(8, 'Minimaal 8 tekens'),
    bevestig: z.string(),
  })
  .refine((d) => d.nieuw === d.bevestig, {
    message: 'Wachtwoorden komen niet overeen',
    path: ['bevestig'],
  });
type WachtwoordFormData = z.infer<typeof wachtwoordSchema>;

// ─── Hulpcomponenten ──────────────────────────────────────────────────────────

function SectieKoptekst({ titel, omschrijving }: { titel: string; omschrijving?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{titel}</h2>
      {omschrijving && <p className="text-sm text-gray-500">{omschrijving}</p>}
    </div>
  );
}

function SuccesMelding({ bericht }: { bericht: string }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <p className="text-green-700 text-sm">{bericht}</p>
    </div>
  );
}

function FoutMelding({ bericht }: { bericht: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
      <p className="text-red-700 text-sm">{bericht}</p>
    </div>
  );
}

// ─── Instellingen pagina ──────────────────────────────────────────────────────

export default function InstellingenPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profiel, setProfiel] = useState<ProfielResponse | null>(null);
  const [laden, setLaden] = useState(true);
  const [profielSucces, setProfielSucces] = useState('');
  const [profielFout, setProfielFout] = useState('');
  const [wachtwoordSucces, setWachtwoordSucces] = useState('');
  const [wachtwoordFout, setWachtwoordFout] = useState('');
  const [verwijderBevestiging, setVerwijderBevestiging] = useState(false);
  const [verwijderLaden, setVerwijderLaden] = useState(false);

  const {
    register: regProfiel,
    handleSubmit: handleProfielSubmit,
    reset: resetProfiel,
    watch,
    formState: { errors: profielErrors, isSubmitting: profielLaden },
  } = useForm<ProfielFormData>({ resolver: zodResolver(profielSchema) });

  const {
    register: regWachtwoord,
    handleSubmit: handleWachtwoordSubmit,
    reset: resetWachtwoord,
    formState: { errors: wachtwoordErrors, isSubmitting: wachtwoordLaden },
  } = useForm<WachtwoordFormData>({ resolver: zodResolver(wachtwoordSchema) });

  const heeftZonnepanelen = watch('heeftZonnepanelen');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    haalProfielOpViaGebruiker(session.user.id).then((p) => {
      if (!p) { router.push('/onboarding'); return; }
      setProfiel(p);
      resetProfiel({
        postcode: p.postcode,
        huisnummer: p.huisnummer,
        jaarVerbruikKwh: p.jaarVerbruikKwh,
        jaarVerbruikGasM3: p.jaarVerbruikGasM3 ?? undefined,
        meterType: p.meterType,
        heeftZonnepanelen: p.heeftZonnepanelen,
        jaarOpwekKwh: p.jaarOpwekKwh ?? undefined,
        jaarTerugleveringKwh: p.jaarTerugleveringKwh ?? undefined,
        voorkeur: p.voorkeur,
        interesseInBatterij: p.interesseInBatterij,
        interesseInEV: p.interesseInEV,
        interesseInWarmtepomp: p.interesseInWarmtepomp,
        leverancierSlug: p.contract?.leverancierSlug ?? '',
        contractType: p.contract?.type ?? 'vast',
        einddatum: p.contract?.einddatum ?? undefined,
        stroomTarief: p.contract?.stroomTarief ?? undefined,
        gasTarief: p.contract?.gasTarief ?? undefined,
      });
      setLaden(false);
    });
  }, [session, resetProfiel, router]);

  async function slaProfielOp(data: ProfielFormData) {
    if (!profiel) return;
    setProfielFout('');
    setProfielSucces('');
    try {
      await updateProfiel(profiel.id, {
        postcode: data.postcode,
        huisnummer: data.huisnummer,
        jaarVerbruikKwh: data.jaarVerbruikKwh,
        jaarVerbruikGasM3: data.jaarVerbruikGasM3 ?? null,
        meterType: data.meterType,
        heeftZonnepanelen: data.heeftZonnepanelen,
        jaarOpwekKwh: data.jaarOpwekKwh ?? null,
        jaarTerugleveringKwh: data.jaarTerugleveringKwh ?? null,
        voorkeur: data.voorkeur,
        interesseInBatterij: data.interesseInBatterij,
        interesseInEV: data.interesseInEV,
        interesseInWarmtepomp: data.interesseInWarmtepomp,
        contract: {
          leverancierSlug: data.leverancierSlug,
          productNaam: `${LEVERANCIERS.find((l) => l.slug === data.leverancierSlug)?.naam ?? data.leverancierSlug} ${data.contractType}`,
          type: data.contractType,
          einddatum: data.einddatum || null,
          stroomTarief: data.stroomTarief ?? null,
          gasTarief: data.gasTarief ?? null,
        },
      });
      setProfielSucces('Profiel succesvol opgeslagen.');
    } catch (err) {
      setProfielFout(err instanceof Error ? err.message : 'Opslaan mislukt.');
    }
  }

  async function wijzigWachtwoordHandler(data: WachtwoordFormData) {
    if (!session?.user?.id) return;
    setWachtwoordFout('');
    setWachtwoordSucces('');
    try {
      await wijzigWachtwoord(session.user.id, data.huidig, data.nieuw);
      setWachtwoordSucces('Wachtwoord succesvol gewijzigd.');
      resetWachtwoord();
    } catch (err) {
      setWachtwoordFout(err instanceof Error ? err.message : 'Wijzigen mislukt.');
    }
  }

  async function verwijderAccountHandler() {
    if (!session?.user?.id) return;
    setVerwijderLaden(true);
    try {
      await verwijderAccount(session.user.id);
      await signOut({ callbackUrl: '/login' });
    } catch {
      setVerwijderLaden(false);
      setVerwijderBevestiging(false);
    }
  }

  if (status === 'loading' || laden) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigatiebalk */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="font-semibold text-gray-900">Instellingen</span>
          </div>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Profiel bewerken */}
        <div className="card">
          <SectieKoptekst
            titel="Energieprofiel"
            omschrijving="Wijzigingen worden direct verwerkt in uw advies."
          />
          {profielSucces && <SuccesMelding bericht={profielSucces} />}
          {profielFout && <FoutMelding bericht={profielFout} />}

          <form onSubmit={handleProfielSubmit(slaProfielOp)} className="space-y-5">
            {/* Locatie */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Locatie</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Postcode</label>
                  <input {...regProfiel('postcode')}
                    className={`input-field uppercase ${profielErrors.postcode ? 'input-error' : ''}`} />
                  {profielErrors.postcode && <p className="error-msg">{profielErrors.postcode.message}</p>}
                </div>
                <div>
                  <label className="label">Huisnummer</label>
                  <input {...regProfiel('huisnummer')}
                    className={`input-field ${profielErrors.huisnummer ? 'input-error' : ''}`} />
                </div>
              </div>
            </div>

            {/* Verbruik */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Verbruik</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Stroomverbruik (kWh/jaar)</label>
                  <input {...regProfiel('jaarVerbruikKwh', { valueAsNumber: true })} type="number"
                    className={`input-field ${profielErrors.jaarVerbruikKwh ? 'input-error' : ''}`} />
                </div>
                <div>
                  <label className="label">Gasverbruik (m³/jaar)</label>
                  <input {...regProfiel('jaarVerbruikGasM3', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                    type="number" className="input-field" />
                </div>
                <div>
                  <label className="label">Metertype</label>
                  <select {...regProfiel('meterType')} className="input-field">
                    <option value="enkeltarief">Enkeltarief</option>
                    <option value="dubbeltarief">Dubbeltarief</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Zonnepanelen */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Zonnepanelen</h3>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input {...regProfiel('heeftZonnepanelen')} type="checkbox" className="accent-blue-600 w-4 h-4" />
                <span className="text-sm text-gray-700">Ik heb zonnepanelen</span>
              </label>
              {heeftZonnepanelen && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Opwek (kWh/jaar)</label>
                    <input {...regProfiel('jaarOpwekKwh', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                      type="number" className="input-field" />
                  </div>
                  <div>
                    <label className="label">Teruglevering (kWh/jaar)</label>
                    <input {...regProfiel('jaarTerugleveringKwh', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                      type="number" className="input-field" />
                  </div>
                </div>
              )}
            </div>

            {/* Contract */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Contract</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Leverancier</label>
                  <select {...regProfiel('leverancierSlug')}
                    className={`input-field ${profielErrors.leverancierSlug ? 'input-error' : ''}`}>
                    <option value="">-- Kies --</option>
                    {LEVERANCIERS.map((l) => (
                      <option key={l.slug} value={l.slug}>{l.naam}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Contracttype</label>
                  <select {...regProfiel('contractType')} className="input-field">
                    <option value="vast">Vast</option>
                    <option value="variabel">Variabel</option>
                    <option value="dynamisch">Dynamisch</option>
                  </select>
                </div>
                <div>
                  <label className="label">Einddatum</label>
                  <input {...regProfiel('einddatum')} type="date" className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Stroomtarief (€/kWh)</label>
                    <input {...regProfiel('stroomTarief', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                      type="number" step="0.0001" className="input-field" />
                  </div>
                  <div>
                    <label className="label">Gastarief (€/m³)</label>
                    <input {...regProfiel('gasTarief', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                      type="number" step="0.0001" className="input-field" />
                  </div>
                </div>
              </div>
            </div>

            {/* Voorkeuren */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Voorkeuren</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Contractvoorkeur</label>
                  <select {...regProfiel('voorkeur')} className="input-field">
                    <option value="zekerheid">Zekerheid (vast tarief)</option>
                    <option value="neutraal">Neutraal</option>
                    <option value="flexibiliteit">Flexibiliteit (variabel)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {[
                    { field: 'interesseInBatterij' as const, label: 'Interesse in thuisbatterij' },
                    { field: 'interesseInEV' as const, label: 'Interesse in EV-laadadvies' },
                    { field: 'interesseInWarmtepomp' as const, label: 'Interesse in warmtepomp' },
                  ].map(({ field, label }) => (
                    <label key={field} className="flex items-center gap-2 cursor-pointer">
                      <input {...regProfiel(field)} type="checkbox" className="accent-blue-600 w-4 h-4" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={profielLaden} className="btn-primary w-full">
              {profielLaden ? 'Opslaan...' : 'Wijzigingen opslaan'}
            </button>
          </form>
        </div>

        {/* Wachtwoord wijzigen */}
        <div className="card">
          <SectieKoptekst titel="Wachtwoord wijzigen" />
          {wachtwoordSucces && <SuccesMelding bericht={wachtwoordSucces} />}
          {wachtwoordFout && <FoutMelding bericht={wachtwoordFout} />}

          <form onSubmit={handleWachtwoordSubmit(wijzigWachtwoordHandler)} className="space-y-4">
            <div>
              <label className="label">Huidig wachtwoord</label>
              <input {...regWachtwoord('huidig')} type="password" autoComplete="current-password"
                className={`input-field ${wachtwoordErrors.huidig ? 'input-error' : ''}`} />
              {wachtwoordErrors.huidig && <p className="error-msg">{wachtwoordErrors.huidig.message}</p>}
            </div>
            <div>
              <label className="label">Nieuw wachtwoord</label>
              <input {...regWachtwoord('nieuw')} type="password" autoComplete="new-password"
                className={`input-field ${wachtwoordErrors.nieuw ? 'input-error' : ''}`} />
              {wachtwoordErrors.nieuw && <p className="error-msg">{wachtwoordErrors.nieuw.message}</p>}
            </div>
            <div>
              <label className="label">Bevestig nieuw wachtwoord</label>
              <input {...regWachtwoord('bevestig')} type="password" autoComplete="new-password"
                className={`input-field ${wachtwoordErrors.bevestig ? 'input-error' : ''}`} />
              {wachtwoordErrors.bevestig && <p className="error-msg">{wachtwoordErrors.bevestig.message}</p>}
            </div>
            <button type="submit" disabled={wachtwoordLaden} className="btn-primary">
              {wachtwoordLaden ? 'Wijzigen...' : 'Wachtwoord wijzigen'}
            </button>
          </form>
        </div>

        {/* Account verwijderen */}
        <div className="card border-red-200">
          <SectieKoptekst
            titel="Account verwijderen"
            omschrijving="Uw account en alle bijbehorende gegevens worden permanent verwijderd. Dit kan niet ongedaan worden gemaakt."
          />
          {!verwijderBevestiging ? (
            <button
              onClick={() => setVerwijderBevestiging(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Account verwijderen
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-3">
                Weet u het zeker? Alle gegevens worden permanent verwijderd.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={verwijderAccountHandler}
                  disabled={verwijderLaden}
                  className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {verwijderLaden ? 'Verwijderen...' : 'Ja, verwijder mijn account'}
                </button>
                <button
                  onClick={() => setVerwijderBevestiging(false)}
                  className="btn-secondary text-sm"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
