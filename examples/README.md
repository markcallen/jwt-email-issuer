# JWT Email Issuer Examples

Follow these steps to run the end-to-end demo (Express API + React client) locally.

## Prerequisites

- Node.js 20 or newer
- npm (commands below) or another compatible package manager

## 1. Bootstrap the library

Run these commands once from the repository root to install dependencies and compile the package that the examples consume:

```bash
pnpm install
pnpm build
```

## 2. Start the Express API

```bash
cd examples/server
pnpm install
pnpm dev
```

The API listens on `http://localhost:3000` and exposes `.well-known` endpoints for issuing and validating JWTs. Leave this process running.

If you want to interact with the API directly (for example, while developing against the JWT endpoints), you can issue and validate a token from the command line once the server from step 2 is running.

Request a token

```bash
curl http://localhost:3000/.well-known/token \
    -H "content-type: application/json" \
    -d '{"email":"demo@example.com"}'
```

Validate the token

```bash
curl http://localhost:3000/validate \
    -H "content-type: application/json" \
    -d "{\"token\":\"ey...\"}"
```

## 3. Start the React client

In a new terminal:

```bash
cd examples/web
npm install
npm run dev
```

Vite serves the demo UI on `http://localhost:5173`. It expects the API from step 2 to be running.

## 4. Try the demo

1. Visit `http://localhost:5173`.
2. Enter an email address and request a token.
3. Observe the issued token, automatic validation calls, and payload display.

## Troubleshooting

- Need a clean install? Remove `examples/**/node_modules` and rerun `pnpm install`.
- Want production builds? Use `pnpm build && pnpm start` in `examples/server` and `pnpm build && pnpm preview` in `examples/web`.
