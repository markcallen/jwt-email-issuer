# jwt-email-issuer

Issue and validate JWTs by email with auto secret management, **Express router** exposing well-known endpoints, and a **React hook** that auto-refreshes tokens.

## Install

```bash
npm i jwt-email-issuer express
```

## Use (Express)

```ts
import express from 'express';
import { createJwtRouter } from 'jwt-email-issuer/express';

const app = express();
app.use(express.json());

app.use(
  createJwtRouter({
    issuer: 'com.example.issuer',
    audience: 'com.example.web',
    expiresIn: '10m',
  }),
);

app.listen(3000, () => console.log('Server on http://localhost:3000'));
```

### Workflow: issue, validate, and demo the token

1. Issue a token (replace the email address as needed):

```bash
curl -X POST http://localhost:3000/.well-known/token \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com"}' | jq -r .
```

2. Validate the token with the Express server:

```bash
curl -X POST http://localhost:3000/.well-known/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"ey...\"}" | jq
```

## React

```tsx
import { JwtTokenButton } from 'jwt-email-issuer/react';

<JwtTokenButton
  serverUrl="http://localhost:3000"
  email="dev@example.com"
  onToken={(token) => console.log('JWT token:', token)}
/>;
```

or

```tsx
import { useEffect } from 'react';
import { useJwtToken } from 'jwt-email-issuer/react';

function TokenLogger() {
  const { token, fetchToken } = useJwtToken({
    serverUrl: 'http://localhost:3000',
    email: 'dev@example.com',
  });

  useEffect(() => {
    fetchToken().catch(console.error);
  }, [fetchToken]);

  useEffect(() => {
    if (token) {
      console.log('Token updated:', token);
    }
  }, [token]);

  return (
    <button type="button" onClick={() => fetchToken()}>
      Refresh token
    </button>
  );
}
```

The hook auto-refreshes the token when < 60s remain before expiry.

## Endpoints

- `POST /.well-known/token` → `{ token }` (also sets `auth_token` httpOnly cookie)
- `POST /.well-known/validate` → `{ valid, payload }`
- `GET  /.well-known/jwt-issuer` → discovery JSON
- `GET  /.well-known/healthz` → `ok`

## Learn More

- 📖 **Article**: [Feature Flags Without an IdP: Email‑Scoped JWTs with OpenFeature + DevCycle](https://www.markcallen.com/feature-flags-without-an-idp-email-scoped-jwts-with-openfeature-devcycle/) - A complete guide on using this package with OpenFeature and DevCycle for progressive delivery
- 📦 **Example Repository**: [jwt-email-issuer-example](https://github.com/markcallen/jwt-email-issuer-example) - A full working example demonstrating feature flags with email-based targeting

## Publishing to npm

1. Create an npm token and add it as a GitHub secret named `NPM_TOKEN` in your repo settings.
2. Create a GitHub **Release** (or run the workflow manually). The workflow builds and publishes with provenance.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Mark C Allen ([@markcallen](https://github.com/markcallen))
