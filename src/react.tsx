import { useCallback, useMemo, useState, useEffect } from 'react';

type UseJwtOpts = {
  serverUrl: string;
  email: string;
  tokenPath?: string;
  withCredentials?: boolean;
  refreshThreshold?: number;
};

function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function useJwtToken(opts: UseJwtOpts) {
  const { serverUrl, email } = opts;
  const tokenPath = opts.tokenPath ?? '/.well-known/token';
  const refreshThreshold = opts.refreshThreshold ?? 60;
  const cred = opts.withCredentials ?? true;

  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => new URL(tokenPath, serverUrl).toString(), [serverUrl, tokenPath]);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: cred ? 'include' : 'omit',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.token) throw new Error('no token in response');
      setToken(data.token);
      return data.token as string;
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch token');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [url, email, cred]);

  useEffect(() => {
    if (!token) return;
    const exp = decodeExp(token);
    if (!exp) return;

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = exp - now;
    if (timeLeft <= 0) return;

    const refreshIn = Math.max(timeLeft - refreshThreshold, 0) * 1000;
    const id = setTimeout(() => {
      fetchToken().catch(() => {});
    }, refreshIn);

    return () => clearTimeout(id);
  }, [token, fetchToken, refreshThreshold]);

  return { token, loading, error, fetchToken };
}

type BtnProps = {
  serverUrl: string;
  email: string;
  onToken?: (t: string) => void;
  children?: React.ReactNode;
};

export function JwtTokenButton({ serverUrl, email, onToken, children }: BtnProps) {
  const { token, loading, error, fetchToken } = useJwtToken({ serverUrl, email });

  useEffect(() => {
    if (token && onToken) onToken(token);
  }, [token, onToken]);

  return (
    <div>
      <button disabled={loading} onClick={() => fetchToken()}>
        {children ?? (loading ? 'Fetching…' : 'Get Token')}
      </button>
      {token && <small style={{ display: 'block', wordBreak: 'break-all' }}>{token}</small>}
      {error && <small style={{ color: 'red', display: 'block' }}>{error}</small>}
    </div>
  );
}
