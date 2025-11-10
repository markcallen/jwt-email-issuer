import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import type * as IndexModule from '../index.js';
import type { Algorithm } from 'jsonwebtoken';

type MockOverrides = Partial<typeof IndexModule>;

function createMock<T extends (...args: any[]) => any>(impl: T): jest.MockedFunction<T> {
  return jest.fn(impl) as unknown as jest.MockedFunction<T>;
}

async function setupRouter(options = {}, overrides: MockOverrides = {}) {
  jest.resetModules();

  const ensureSecret = createMock<typeof IndexModule.ensureSecret>(async (secretPath) => {
    if (overrides.ensureSecret) {
      return overrides.ensureSecret(secretPath);
    }
    return 'secret';
  });

  const issueToken = createMock<typeof IndexModule.issueToken>(async (email, opts) => {
    if (overrides.issueToken) {
      return overrides.issueToken(email, opts);
    }
    return 'mock-token';
  });

  const verifyToken = createMock<typeof IndexModule.verifyToken>(async (token, opts) => {
    if (overrides.verifyToken) {
      return overrides.verifyToken(token, opts);
    }
    return { sub: 'user@example.com', email: 'user@example.com' };
  });

  const issuerMetadata = createMock<typeof IndexModule.issuerMetadata>((opts) => {
    if (overrides.issuerMetadata) {
      return overrides.issuerMetadata(opts);
    }
    return {
      issuer: 'jwt-email-issuer',
      algorithm: 'HS256',
      token_endpoint: '/.well-known/token',
      validation_endpoint: '/.well-known/validate',
      health_endpoint: '/.well-known/healthz',
    };
  });

  const mocks: MockOverrides = {
    ensureSecret,
    issueToken,
    verifyToken,
    issuerMetadata,
  };

  const mockModule = (jest as any).unstable_mockModule as (
    moduleName: string,
    factory: () => MockOverrides,
  ) => Promise<void>;

  if (!mockModule) {
    throw new Error('jest.unstable_mockModule is unavailable in this environment');
  }

  await mockModule('../index.js', () => ({ ...mocks }));
  const { createJwtRouter } = await import('../express.js');
  const router = createJwtRouter(options as any);

  const app = express();
  app.use(rawBodySaver);
  app.use(router);

  return { app, mocks };
}

function rawBodySaver(req: express.Request, _res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();

  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk: string) => {
    data += chunk;
  });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
  req.on('error', next);
}

describe('createJwtRouter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('kicks off ensureSecret on creation', async () => {
    const { mocks } = await setupRouter();
    await Promise.resolve();
    expect(mocks.ensureSecret).toHaveBeenCalledWith(undefined);
  });

  it('returns ok for the health endpoint', async () => {
    const { app } = await setupRouter();
    const res = await request(app).get('/.well-known/healthz');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('responds with issuer metadata', async () => {
    const customMetadata: ReturnType<typeof IndexModule.issuerMetadata> = {
      issuer: 'custom',
      algorithm: 'HS512' as Algorithm,
      token_endpoint: '/token',
      validation_endpoint: '/validate',
      health_endpoint: '/healthz',
    };
    const customIssuerMetadata = createMock<typeof IndexModule.issuerMetadata>(
      () => customMetadata,
    );
    const { app, mocks } = await setupRouter({}, { issuerMetadata: customIssuerMetadata });

    const res = await request(app).get('/.well-known/jwt-issuer');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(customMetadata);
    expect(mocks.issuerMetadata).toHaveBeenCalledWith({});
  });

  it('issues tokens and sets cookies', async () => {
    const issueTokenMock = createMock<typeof IndexModule.issueToken>(async () => 'token-123');
    const { app, mocks } = await setupRouter({}, { issueToken: issueTokenMock });
    const res = await request(app)
      .post('/.well-known/token')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'user@example.com' }));

    expect(mocks.issueToken).toHaveBeenCalledWith('user@example.com', {});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: 'token-123' });
    expect(res.headers['set-cookie']).toBeDefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toContain('auth_token=token-123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
  });

  it('marks cookies as secure in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const secureIssueToken = createMock<typeof IndexModule.issueToken>(
        async () => 'secure-token',
      );
      const { app } = await setupRouter({}, { issueToken: secureIssueToken });
      const res = await request(app)
        .post('/.well-known/token')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ email: 'secure@example.com' }));

      const cookie = res.headers['set-cookie'][0];
      expect(cookie).toContain('Secure');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('returns 400 when email is missing', async () => {
    const { app } = await setupRouter();
    const res = await request(app)
      .post('/.well-known/token')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({}));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'email required' });
  });

  it('handles token issuance failures', async () => {
    const error = new Error('issue failed');
    const failingIssueToken = createMock<typeof IndexModule.issueToken>(async () => {
      throw error;
    });
    const { app } = await setupRouter({}, { issueToken: failingIssueToken });
    const res = await request(app)
      .post('/.well-known/token')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'user@example.com' }));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'issue failed' });
  });

  it('validates tokens successfully', async () => {
    const payload = { sub: 'user@example.com', email: 'user@example.com' };
    const verifyTokenMock = createMock<typeof IndexModule.verifyToken>(async () => payload);
    const { app, mocks } = await setupRouter({}, { verifyToken: verifyTokenMock });
    const res = await request(app)
      .post('/.well-known/validate')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ token: 'abc' }));

    expect(mocks.verifyToken).toHaveBeenCalledWith('abc', {});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, payload });
  });

  it('returns 400 when token is missing', async () => {
    const { app } = await setupRouter();
    const res = await request(app)
      .post('/.well-known/validate')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({}));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'token required' });
  });

  it('rejects invalid tokens', async () => {
    const failingVerifyToken = createMock<typeof IndexModule.verifyToken>(async () => {
      throw new Error('bad token');
    });
    const { app } = await setupRouter({}, { verifyToken: failingVerifyToken });
    const res = await request(app)
      .post('/.well-known/validate')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ token: 'bad' }));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ valid: false, error: 'bad token' });
  });
});
