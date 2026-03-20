import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { haalProfielOpViaGebruiker } from '@/lib/api';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const profiel = await haalProfielOpViaGebruiker(session.user.id);

  if (!profiel) {
    redirect('/onboarding');
  }

  redirect('/dashboard');
}
