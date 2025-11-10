import express from 'express';
import cors from 'cors';
import { createJwtRouter } from 'jwt-email-issuer/express';
import { verifyToken } from 'jwt-email-issuer';

const app = express();
app.use(express.json());

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

const jwtOptions = {
  issuer: 'com.example.issuer',
  audience: 'com.example.web',
  expiresIn: '10m',
} satisfies Parameters<typeof createJwtRouter>[0];

app.post('/validate', async (req, res) => {
  try {
    const token: string | undefined = req.body?.token;
    if (!token) return res.status(400).json({ error: 'token required' });
    const payload = await verifyToken(token, jwtOptions);
    res.json(payload);
  } catch (err: any) {
    res.status(401).json({ error: err?.message ?? 'invalid token' });
  }
});

app.use(createJwtRouter(jwtOptions));

app.listen(3000, () => console.log('Server on http://localhost:3000'));
