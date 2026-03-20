import express from 'express';
import { profielenRouter } from './api/profielen';
import { authRouter } from './api/auth';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/profielen', profielenRouter);

// Foutafhandeling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Interne serverfout' });
});

app.listen(PORT, () => {
  console.log(`Backend draait op http://localhost:${PORT}`);
});
