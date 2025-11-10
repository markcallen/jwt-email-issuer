import { useState } from 'react';
import type { FormEvent } from 'react';
import { useJwtToken } from 'jwt-email-issuer/react';

export default function TokenDemo() {
  const serverUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  const [email, setEmail] = useState('');
  const { token, loading, error, fetchToken } = useJwtToken({
    serverUrl,
    email,
  });
  const [response, setResponse] = useState<string | null>(null);
  const [echoError, setEchoError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResponse(null);
    setEchoError(null);
    await fetchToken();
  };

  const sendToken = async () => {
    if (!token) {
      return;
    }

    try {
      setSending(true);
      setEchoError(null);
      const res = await fetch(`${serverUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : `Server responded with ${res.status}`,
        );
      }

      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error occurred';
      setResponse(null);
      setEchoError(message);
    } finally {
      setSending(false);
    }
  };

  const isEmailValid = email.trim().length > 0;

  return (
    <main className="relative w-full max-w-3xl">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-brand-500/30 blur-3xl"
        aria-hidden
      />
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-brand-500/20 backdrop-blur">
        <div className="pointer-events-none absolute -right-24 top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-16 h-52 w-52 rounded-full bg-brand-700/25 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-8">
          <header className="space-y-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand-100">
              JWT Email Issuer
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                Request and validate access tokens by email
              </h1>
              <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                Enter an email address to mint a short-lived JWT from your Everyday DevOps server,
                then validate it against the `/validate` endpoint. Great for quick demos, debugging,
                and showcasing the `jwt-email-issuer` package in action.
              </p>
            </div>
            <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              Connected to <code className="font-mono">{serverUrl}</code>
            </p>
          </header>

          <form
            className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-brand-900/30"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/60"
              />
            </label>

            <button
              type="submit"
              disabled={loading || !isEmailValid}
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
                  Generating token…
                </span>
              ) : (
                'Get Token'
              )}
            </button>
          </form>

          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Error: {error}
            </p>
          )}

          {token && (
            <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-brand-900/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Access token</h2>
                  <p className="text-sm text-slate-400">
                    Include this token in the `Authorization` header or in a custom `X-Email-Token`
                    header when talking to the server.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sendToken}
                  disabled={sending}
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-400 hover:bg-brand-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {sending ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
                      Validating…
                    </span>
                  ) : (
                    'Validate token'
                  )}
                </button>
              </div>
              <pre className="max-h-56 overflow-y-auto rounded-xl border border-white/5 bg-black/60 p-4 text-sm leading-relaxed text-brand-100">
                {token}
              </pre>
            </div>
          )}

          {echoError && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Validation failed: {echoError}
            </p>
          )}

          {response && (
            <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
              <h3 className="text-base font-semibold text-emerald-100">Server response</h3>
              <pre className="max-h-60 overflow-y-auto rounded-xl border border-emerald-500/40 bg-black/40 p-4 text-xs leading-relaxed text-emerald-100">
                {response}
              </pre>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
