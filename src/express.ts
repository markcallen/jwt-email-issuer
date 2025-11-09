import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { serialize as serializeCookie } from "cookie";
import { ensureSecret, issueToken, verifyToken, issuerMetadata } from "./index.js";
import type { JwtIssuerOptions } from "./types.js";

export function createJwtRouter(opts: JwtIssuerOptions = {}): Router {
  const r = Router();

  ensureSecret(opts.secretPath).catch((e) => {
    console.error("[jwt-email-issuer] failed to ensure secret:", e);
  });

  r.get("/.well-known/healthz", (_req, res) => res.status(200).send("ok"));

  r.get("/.well-known/jwt-issuer", (_req, res) => {
    res.json(issuerMetadata(opts));
  });

  r.post("/.well-known/token", expressJsonGuard, async (req, res) => {
    try {
      const email: string | undefined = req.body?.email;
      if (!email) return res.status(400).json({ error: "email required" });

      const token = await issueToken(email, opts);

      const set = serializeCookie("auth_token", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd()
      });
      res.setHeader("Set-Cookie", set);
      res.json({ token });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "failed to issue token" });
    }
  });

  r.post("/.well-known/validate", expressJsonGuard, async (req, res) => {
    try {
      const token: string | undefined = req.body?.token;
      if (!token) return res.status(400).json({ error: "token required" });
      const payload = await verifyToken(token, opts);
      res.json({ valid: true, payload });
    } catch (e: any) {
      res.status(401).json({ valid: false, error: e?.message ?? "invalid token" });
    }
  });

  // Simple echo route for demo header X-Email-Token (no auth/verify)
  r.get("/api/echo-token", (req, res) => {
    const token = req.headers["x-email-token"];
    res.json({ message: "Server received X-Email-Token successfully!", receivedToken: token });
  });

  return r;
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

function expressJsonGuard(req: Request, _res: Response, next: NextFunction) {
  if ((req as any)._bodyParsed) return next();
  if (req.body !== undefined) return next();
  const ct = req.headers["content-type"] ?? "";
  if (/application\/json/i.test(ct) && typeof (req as any).rawBody === "string") {
    try { req.body = JSON.parse((req as any).rawBody); } catch {}
  }
  return next();
}
