import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../data/db';

export const authRouter = Router();

const CredentialsSchema = z.object({
  email: z.string().email(),
  wachtwoord: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens bevatten'),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ongeldige invoer', details: parsed.error.flatten() });
    return;
  }

  const { email, wachtwoord } = parsed.data;

  try {
    const bestaand = await db.query('SELECT id FROM gebruikers WHERE email = $1', [email]);
    if (bestaand.rowCount && bestaand.rowCount > 0) {
      res.status(409).json({ error: 'E-mailadres is al in gebruik' });
      return;
    }

    const hash = await bcrypt.hash(wachtwoord, 12);
    const result = await db.query<{ id: string }>(
      `INSERT INTO gebruikers (email, wachtwoord_hash) VALUES ($1, $2) RETURNING id`,
      [email, hash],
    );

    res.status(201).json({ id: result.rows[0].id, email });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ongeldige invoer' });
    return;
  }

  const { email, wachtwoord } = parsed.data;

  try {
    const result = await db.query<{ id: string; wachtwoord_hash: string | null }>(
      'SELECT id, wachtwoord_hash FROM gebruikers WHERE email = $1',
      [email],
    );

    if (result.rowCount === 0) {
      res.status(401).json({ error: 'Onjuist e-mailadres of wachtwoord' });
      return;
    }

    const gebruiker = result.rows[0];

    if (!gebruiker.wachtwoord_hash) {
      // Account aangemaakt via Google OAuth — geen wachtwoord ingesteld
      res.status(401).json({ error: 'Dit account gebruikt Google aanmelding' });
      return;
    }

    const geldig = await bcrypt.compare(wachtwoord, gebruiker.wachtwoord_hash);
    if (!geldig) {
      res.status(401).json({ error: 'Onjuist e-mailadres of wachtwoord' });
      return;
    }

    res.json({ id: gebruiker.id, email });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/google ────────────────────────────────────────────────────
// Aangemaakt of opgehaald vanuit NextAuth Google callback

authRouter.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: 'E-mail ontbreekt' });
    return;
  }

  try {
    const result = await db.query<{ id: string }>(
      `INSERT INTO gebruikers (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET bijgewerkt_op = NOW()
       RETURNING id`,
      [email],
    );

    res.json({ id: result.rows[0].id, email });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/auth/account ─────────────────────────────────────────────────

authRouter.delete('/account/:gebruikerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query('DELETE FROM gebruikers WHERE id = $1 RETURNING id', [
      req.params.gebruikerId,
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Gebruiker niet gevonden' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/auth/wachtwoord ─────────────────────────────────────────────────

authRouter.put('/wachtwoord/:gebruikerId', async (req: Request, res: Response, next: NextFunction) => {
  const { huidigWachtwoord, nieuwWachtwoord } = req.body as {
    huidigWachtwoord?: string;
    nieuwWachtwoord?: string;
  };

  if (!huidigWachtwoord || !nieuwWachtwoord) {
    res.status(400).json({ error: 'Huidig en nieuw wachtwoord zijn verplicht' });
    return;
  }

  if (nieuwWachtwoord.length < 8) {
    res.status(400).json({ error: 'Nieuw wachtwoord moet minimaal 8 tekens bevatten' });
    return;
  }

  try {
    const result = await db.query<{ wachtwoord_hash: string }>(
      'SELECT wachtwoord_hash FROM gebruikers WHERE id = $1',
      [req.params.gebruikerId],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Gebruiker niet gevonden' });
      return;
    }

    const geldig = await bcrypt.compare(huidigWachtwoord, result.rows[0].wachtwoord_hash);
    if (!geldig) {
      res.status(401).json({ error: 'Huidig wachtwoord is onjuist' });
      return;
    }

    const nieuweHash = await bcrypt.hash(nieuwWachtwoord, 12);
    await db.query('UPDATE gebruikers SET wachtwoord_hash = $1 WHERE id = $2', [
      nieuweHash,
      req.params.gebruikerId,
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
