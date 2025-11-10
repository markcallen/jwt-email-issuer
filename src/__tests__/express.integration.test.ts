import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { createJwtRouter } from '../express.js';

async function createTempSecretPath(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'jwt-email-issuer-integration-'));
  return path.join(dir, 'secret.key');
}

describe('createJwtRouter integration', () => {
  it('issues a token via HTTP using the real jsonwebtoken module', async () => {
    const secretPath = await createTempSecretPath();
    const secretDir = path.dirname(secretPath);

    try {
      const app = express();
      app.use(express.json());
      app.use(createJwtRouter({ secretPath }));

      const res = await request(app)
        .post('/.well-known/token')
        .set('Content-Type', 'application/json')
        .send({ email: 'integration@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));

      const secret = await fs.readFile(secretPath, 'utf8');
      const payload = jwt.verify(res.body.token, secret, {
        algorithms: ['HS256'],
        issuer: 'jwt-email-issuer',
      }) as jwt.JwtPayload;

      expect(payload.email).toBe('integration@example.com');
    } finally {
      await fs.rm(secretDir, { recursive: true, force: true });
    }
  });
});
