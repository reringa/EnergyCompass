import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { haalProfielOpViaGebruiker, type ProfielResponse } from '@/lib/api';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';

function ProfielKaart({ profiel }: { profiel: ProfielResponse }) {
  const leverancierNaam =
    profiel.contract?.leverancierSlug
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? '—';

  const contractEinddatum = profiel.contract?.einddatum
    ? new Date(profiel.contract.einddatum).toLocaleDateString('nl-NL', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const maandenTotEinde = profiel.contract?.einddatum
    ? Math.round(
        (new Date(profiel.contract.einddatum).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30),
      )
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Locatie */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-700 text-sm">Locatie</h3>
        </div>
        <p className="text-2xl font-semibold text-gray-900">{profiel.postcode}</p>
        <p className="text-gray-500 text-sm">Huisnummer {profiel.huisnummer}</p>
      </div>

      {/* Verbruik */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-700 text-sm">Stroomverbruik</h3>
        </div>
        <p className="text-2xl font-semibold text-gray-900">
          {profiel.jaarVerbruikKwh.toLocaleString('nl-NL')} kWh
        </p>
        {profiel.jaarVerbruikGasM3 && (
          <p className="text-gray-500 text-sm">{profiel.jaarVerbruikGasM3.toLocaleString('nl-NL')} m³ gas</p>
        )}
      </div>

      {/* Zonnepanelen */}
      {profiel.heeftZonnepanelen && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-700 text-sm">Zonnepanelen</h3>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {profiel.jaarOpwekKwh?.toLocaleString('nl-NL') ?? '—'} kWh
          </p>
          <p className="text-gray-500 text-sm">jaarlijkse opwek</p>
        </div>
      )}

      {/* Contract */}
      <div className={`card ${maandenTotEinde !== null && maandenTotEinde <= 3 ? 'border-orange-300 bg-orange-50' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-700 text-sm">Huidig contract</h3>
          {maandenTotEinde !== null && maandenTotEinde <= 3 && (
            <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              Loopt binnenkort af
            </span>
          )}
        </div>
        <p className="text-lg font-semibold text-gray-900">{leverancierNaam}</p>
        <p className="text-gray-500 text-sm capitalize">{profiel.contract?.type ?? '—'} tarief</p>
        {contractEinddatum && (
          <p className="text-gray-400 text-xs mt-1">Einddatum: {contractEinddatum}</p>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const profiel = await haalProfielOpViaGebruiker(session.user.id);
  if (!profiel) redirect('/onboarding');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigatiebalk */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">EnergyCompass</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/instellingen" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Instellingen
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welkomstbericht */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Goedendag, {session.user.email.split('@')[0]}
          </h1>
          <p className="text-gray-500 mt-1">
            Hier is uw energieoverzicht op basis van uw profiel.
          </p>
        </div>

        {/* Advies placeholder */}
        <div className="card mb-6 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-blue-900 mb-1">Advies wordt binnenkort beschikbaar</h2>
              <p className="text-blue-700 text-sm">
                We analyseren de markt en vergelijken uw profiel met actuele aanbiedingen.
                Zodra er iets interessants is, krijgt u hier een melding.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-xs text-blue-600">Marktdata wordt opgehaald...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profieloverzicht */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Uw profiel</h2>
          <Link href="/instellingen" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Bewerken →
          </Link>
        </div>
        <ProfielKaart profiel={profiel} />
      </main>
    </div>
  );
}
