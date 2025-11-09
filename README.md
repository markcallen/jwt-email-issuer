# jwt-email-issuer

Issue and validate JWTs by email with auto secret management, **Express router** exposing well-known endpoints, and a **React hook** that auto-refreshes tokens. Includes a minimal demo route that echoes a token passed via `X-Email-Token` header.

## Install

```bash
npm i jwt-email-issuer express
```

## Use (Express)

```ts
import express from "express";
import { createJwtRouter } from "jwt-email-issuer/express";

const app = express();
app.use(express.json());

app.use(createJwtRouter({
  issuer: "com.example.issuer",
  audience: "com.example.web",
  expiresIn: "10m",
}));

app.listen(3000);
```

### Demo endpoint (no auth): send token in header

```
GET /api/echo-token
Header: X-Email-Token: <jwt>
```

## React

```tsx
import { JwtTokenButton, useJwtToken } from "jwt-email-issuer/react";

<JwtTokenButton serverUrl="http://localhost:3000" email="dev@example.com" />
```

The hook auto-refreshes the token when < 60s remain before expiry.

## Endpoints

- `POST /.well-known/token` → `{ token }` (also sets `auth_token` httpOnly cookie)
- `POST /.well-known/validate` → `{ valid, payload }`
- `GET  /.well-known/jwt-issuer` → discovery JSON
- `GET  /.well-known/healthz` → `ok`
- `GET  /api/echo-token` → echoes `X-Email-Token` header back

## Publishing to npm

1. Create an npm token and add it as a GitHub secret named `NPM_TOKEN` in your repo settings.
2. Create a GitHub **Release** (or run the workflow manually). The workflow builds and publishes with provenance.

## License

MIT
