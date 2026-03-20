const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ProfielResponse = {
  id: string;
  gebruikerId: string;
  email: string;
  postcode: string;
  huisnummer: string;
  jaarVerbruikKwh: number;
  jaarVerbruikGasM3: number | null;
  meterType: 'enkeltarief' | 'dubbeltarief';
  heeftZonnepanelen: boolean;
  jaarOpwekKwh: number | null;
  jaarTerugleveringKwh: number | null;
  voorkeur: 'zekerheid' | 'flexibiliteit' | 'neutraal';
  interesseInBatterij: boolean;
  interesseInEV: boolean;
  interesseInWarmtepomp: boolean;
  contract: {
    id: string;
    leverancierSlug: string;
    productNaam: string;
    type: 'vast' | 'variabel' | 'dynamisch';
    einddatum: string | null;
    stroomTarief: number | null;
    gasTarief: number | null;
    vasteKosten: number | null;
    terugleverkosten: number | null;
    terugleververgoeding: number | null;
  } | null;
};

export type ProfielInput = {
  email: string;
  postcode: string;
  huisnummer: string;
  jaarVerbruikKwh: number;
  jaarVerbruikGasM3?: number | null;
  meterType: 'enkeltarief' | 'dubbeltarief';
  heeftZonnepanelen: boolean;
  jaarOpwekKwh?: number | null;
  jaarTerugleveringKwh?: number | null;
  voorkeur: 'zekerheid' | 'flexibiliteit' | 'neutraal';
  interesseInBatterij: boolean;
  interesseInEV: boolean;
  interesseInWarmtepomp: boolean;
  contract: {
    leverancierSlug: string;
    productNaam: string;
    type: 'vast' | 'variabel' | 'dynamisch';
    einddatum?: string | null;
    stroomTarief?: number | null;
    gasTarief?: number | null;
    vasteKosten?: number | null;
  };
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `API fout ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function haalProfielOpViaGebruiker(
  gebruikerId: string,
): Promise<ProfielResponse | null> {
  try {
    return await apiRequest<ProfielResponse>(`/api/profielen/gebruiker/${gebruikerId}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null;
    // 404 geeft ook een fout via apiRequest — vang alle "niet gevonden" gevallen op
    return null;
  }
}

export async function slaProfielOp(data: ProfielInput): Promise<ProfielResponse> {
  return apiRequest<ProfielResponse>('/api/profielen', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProfiel(
  id: string,
  data: Partial<ProfielInput>,
): Promise<ProfielResponse> {
  return apiRequest<ProfielResponse>(`/api/profielen/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function wijzigWachtwoord(
  gebruikerId: string,
  huidigWachtwoord: string,
  nieuwWachtwoord: string,
): Promise<void> {
  return apiRequest<void>(`/api/auth/wachtwoord/${gebruikerId}`, {
    method: 'PUT',
    body: JSON.stringify({ huidigWachtwoord, nieuwWachtwoord }),
  });
}

export async function verwijderAccount(gebruikerId: string): Promise<void> {
  return apiRequest<void>(`/api/auth/account/${gebruikerId}`, { method: 'DELETE' });
}

export const LEVERANCIERS = [
  { slug: 'vattenfall', naam: 'Vattenfall' },
  { slug: 'eneco', naam: 'Eneco' },
  { slug: 'eon', naam: 'E.ON' },
  { slug: 'essent', naam: 'Essent' },
  { slug: 'greenchoice', naam: 'Greenchoice' },
  { slug: 'budget-energie', naam: 'Budget Energie' },
  { slug: 'pure-energie', naam: 'Pure Energie' },
  { slug: 'vandebron', naam: 'Vandebron' },
  { slug: 'energie-direct', naam: 'Energie Direct' },
  { slug: 'oxxio', naam: 'Oxxio' },
];
