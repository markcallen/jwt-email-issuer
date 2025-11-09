import { promises as fs } from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import jwt from "jsonwebtoken";

import { ensureSecret, issueToken, verifyToken, issuerMetadata } from "../index.js";

async function createTempDir(prefix: string) {
  return fs.mkdtemp(path.join(tmpdir(), `jwt-email-issuer-${prefix}-`));
}

async function createSecretFile(secret: string) {
  const dir = await createTempDir("secret");
  const secretPath = path.join(dir, "secret.key");
  await fs.writeFile(secretPath, secret, { mode: 0o600 });
  return secretPath;
}

describe("ensureSecret", () => {
  it("creates a new secret when the file does not exist and reuses it afterwards", async () => {
    const dir = await createTempDir("ensure");
    const secretPath = path.join(dir, "secret.key");

    const secret = await ensureSecret(secretPath);
    expect(typeof secret).toBe("string");
    expect(secret.length).toBeGreaterThan(10);

    const storedSecret = await fs.readFile(secretPath, "utf8");
    expect(storedSecret).toBe(secret);

    const secondRead = await ensureSecret(secretPath);
    expect(secondRead).toBe(secret);
  });
});

describe("issueToken", () => {
  it("throws when email is missing", async () => {
    const secretPath = await createSecretFile("static-secret");
    await expect(issueToken("", { secretPath })).rejects.toThrow("email is required");
  });

  it("issues a token with the provided claims", async () => {
    const email = "user@example.com";
    const issuer = "custom-issuer";
    const audience = "custom-audience";
    const secret = "very-secret-value";
    const secretPath = await createSecretFile(secret);

    const token = await issueToken(email, { secretPath, issuer, audience, expiresIn: "30m" });
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer,
      audience
    }) as jwt.JwtPayload;

    expect(decoded.sub).toBe(email);
    expect(decoded.email).toBe(email);
    expect(decoded.iss).toBe(issuer);
    expect(decoded.aud).toBe(audience);
    expect(typeof decoded.exp).toBe("number");
  });
});

describe("verifyToken", () => {
  it("verifies a valid token and returns the payload fields", async () => {
    const secret = "verify-secret";
    const secretPath = await createSecretFile(secret);
    const email = "verify@example.com";
    const issuer = "verify-issuer";
    const audience = "verify-audience";

    const token = jwt.sign(
      { sub: email, email, iss: issuer, aud: audience },
      secret,
      { algorithm: "HS256", expiresIn: "1h" }
    );

    const payload = await verifyToken(token, { secretPath, issuer, audience });

    expect(payload.sub).toBe(email);
    expect(payload.email).toBe(email);
    expect(payload.iss).toBe(issuer);
    expect(payload.aud).toBe(audience);
    expect(typeof payload.exp).toBe("number");
    expect(typeof payload.iat).toBe("number");
  });

  it("rejects invalid tokens", async () => {
    const secretPath = await createSecretFile("another-secret");
    await expect(verifyToken("not-a-token", { secretPath })).rejects.toThrow();
  });

  it("can ignore expiration when requested", async () => {
    const secret = "expired-secret";
    const secretPath = await createSecretFile(secret);
    const email = "expired@example.com";
    const issuer = "expired-issuer";

    const expiredToken = jwt.sign(
      { sub: email, email, iss: issuer },
      secret,
      { algorithm: "HS256", expiresIn: -10 }
    );

    await expect(verifyToken(expiredToken, { secretPath, issuer })).rejects.toThrow();

    const payload = await verifyToken(expiredToken, { secretPath, issuer, ignoreExpiration: true });
    expect(payload.sub).toBe(email);
  });
});

describe("issuerMetadata", () => {
  it("returns default metadata when no options are provided", () => {
    expect(issuerMetadata()).toEqual({
      issuer: "jwt-email-issuer",
      algorithm: "HS256",
      token_endpoint: "/.well-known/token",
      validation_endpoint: "/.well-known/validate",
      health_endpoint: "/.well-known/healthz"
    });
  });

  it("allows overriding issuer and algorithm", () => {
    const metadata = issuerMetadata({ issuer: "custom-issuer", algorithm: "HS512" });
    expect(metadata.issuer).toBe("custom-issuer");
    expect(metadata.algorithm).toBe("HS512");
  });
});

