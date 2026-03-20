import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3001';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        wachtwoord: { label: 'Wachtwoord', type: 'password' },
        actie: { label: 'Actie', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.wachtwoord) return null;

        const endpoint =
          credentials.actie === 'registreer'
            ? `${BACKEND}/api/auth/register`
            : `${BACKEND}/api/auth/login`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            wachtwoord: credentials.wachtwoord,
          }),
        });

        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? 'Authenticatie mislukt');
        }

        const gebruiker = (await res.json()) as { id: string; email: string };
        return { id: gebruiker.id, email: gebruiker.email, name: gebruiker.email };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth: gebruiker aanmaken of ophalen in onze eigen DB
      if (account?.provider === 'google' && user.email) {
        try {
          const res = await fetch(`${BACKEND}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
          });
          if (res.ok) {
            const data = (await res.json()) as { id: string };
            user.id = data.id;
          }
        } catch {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? token.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};
