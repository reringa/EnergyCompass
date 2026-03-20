'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Voer een geldig e-mailadres in'),
  wachtwoord: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens bevatten'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [tabblad, setTabblad] = useState<'login' | 'registreer'>('login');
  const [serverFout, setServerFout] = useState('');
  const [laden, setLaden] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLaden(true);
    setServerFout('');

    const result = await signIn('credentials', {
      email: data.email,
      wachtwoord: data.wachtwoord,
      actie: tabblad,
      redirect: false,
    });

    setLaden(false);

    if (result?.error) {
      setServerFout(result.error);
    } else {
      router.push('/');
    }
  }

  async function googleAanmelden() {
    await signIn('google', { callbackUrl: '/' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + koptekst */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EnergyCompass</h1>
          <p className="text-gray-500 text-sm mt-1">Slimme energiekeuzes voor uw huishouden</p>
        </div>

        <div className="card">
          {/* Tabbladen */}
          <div className="flex border-b border-gray-200 mb-6">
            {(['login', 'registreer'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setTabblad(tab); setServerFout(''); }}
                className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tabblad === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'login' ? 'Inloggen' : 'Registreren'}
              </button>
            ))}
          </div>

          {/* Google knop */}
          <button
            onClick={googleAanmelden}
            className="w-full flex items-center justify-center gap-3 btn-secondary mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Doorgaan met Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">
              of met e-mail
            </div>
          </div>

          {/* Formulier */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">E-mailadres</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="naam@bedrijf.nl"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && <p className="error-msg">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Wachtwoord</label>
              <input
                {...register('wachtwoord')}
                type="password"
                autoComplete={tabblad === 'login' ? 'current-password' : 'new-password'}
                placeholder="Minimaal 8 tekens"
                className={`input-field ${errors.wachtwoord ? 'input-error' : ''}`}
              />
              {errors.wachtwoord && <p className="error-msg">{errors.wachtwoord.message}</p>}
            </div>

            {serverFout && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{serverFout}</p>
              </div>
            )}

            <button type="submit" disabled={laden} className="btn-primary w-full">
              {laden ? 'Even geduld...' : tabblad === 'login' ? 'Inloggen' : 'Account aanmaken'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Door in te loggen gaat u akkoord met onze voorwaarden en het privacybeleid.
        </p>
      </div>
    </div>
  );
}
