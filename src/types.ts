import type { Algorithm, SignOptions } from "jsonwebtoken";

export type JwtIssuerOptions = {
  secretPath?: string;
  issuer?: string;
  audience?: string;
  expiresIn?: SignOptions["expiresIn"];
  algorithm?: Algorithm;
};

export type TokenPayload = {
  sub: string;
  email: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
};
