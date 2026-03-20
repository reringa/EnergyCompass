import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { haalProfielOpViaGebruiker } from '@/lib/api';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Als profiel al bestaat → direct naar dashboard
  const profiel = await haalProfielOpViaGebruiker(session.user.id);
  if (profiel) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welkom bij EnergyCompass</h1>
          <p className="text-gray-500 text-sm mt-1">
            Vul uw energieprofiel in — dit duurt ongeveer 3 minuten
          </p>
        </div>
        <OnboardingWizard gebruikerId={session.user.id} email={session.user.email} />
      </div>
    </div>
  );
}
