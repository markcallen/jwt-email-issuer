import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import * as path from "node:path";
import jwt from "jsonwebtoken";

import type { JwtIssuerOptions, TokenPayload } from "./types.js";

const DEFAULTS: Required<Omit<JwtIssuerOptions, "audience">> = {
  secretPath: path.join(process.cwd(), ".jwt-secret"),
  issuer: "jwt-email-issuer",
  expiresIn: "15m",
  algorithm: "HS256"
};

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function ensureSecret(secretPath?: string): Promise<string> {
  const p = secretPath ?? DEFAULTS.secretPath;
  if (!(await fileExists(p))) {
    const secret = randomBytes(64).toString("base64url");
    await fs.writeFile(p, secret, { mode: 0o600 });
    return secret;
  }
  return fs.readFile(p, "utf8");
}

async function loadSecret(p?: string): Promise<string> {
  return ensureSecret(p);
}

export type IssueTokenOptions = JwtIssuerOptions;

export async function issueToken(email: string, opts: IssueTokenOptions = {}): Promise<string> {
  if (!email) throw new Error("email is required");
  const secret = await loadSecret(opts.secretPath);
  const issuer = opts.issuer ?? DEFAULTS.issuer;
  const expiresIn: jwt.SignOptions["expiresIn"] = opts.expiresIn ?? DEFAULTS.expiresIn;
  const algorithm = opts.algorithm ?? DEFAULTS.algorithm;

  const payload: TokenPayload = {
    sub: email,
    email,
    iss: issuer,
    aud: opts.audience
  };

  const signOptions: jwt.SignOptions = { algorithm, expiresIn };
  return jwt.sign(payload, secret, signOptions);
}

export type VerifyOptions = JwtIssuerOptions & { ignoreExpiration?: boolean };

export async function verifyToken(token: string, opts: VerifyOptions = {}): Promise<TokenPayload> {
  const secret = await loadSecret(opts.secretPath);
  const algorithm = opts.algorithm ?? DEFAULTS.algorithm;

  const decoded = jwt.verify(token, secret, {
    algorithms: [algorithm],
    issuer: opts.issuer ?? DEFAULTS.issuer,
    audience: opts.audience,
    ignoreExpiration: opts.ignoreExpiration
  });

  if (typeof decoded === "string") throw new Error("Unexpected token format");
  const { sub, email, iss, aud, iat, exp } = decoded as any;
  return { sub, email, iss, aud, iat, exp };
}

export function issuerMetadata(opts: JwtIssuerOptions = {}) {
  return {
    issuer: opts.issuer ?? DEFAULTS.issuer,
    algorithm: opts.algorithm ?? DEFAULTS.algorithm,
    token_endpoint: "/.well-known/token",
    validation_endpoint: "/.well-known/validate",
    health_endpoint: "/.well-known/healthz"
  };
}
