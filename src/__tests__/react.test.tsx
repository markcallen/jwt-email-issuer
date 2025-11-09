import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { useJwtToken } from "../react";

type HookOptions = Parameters<typeof useJwtToken>[0];
type HookState = ReturnType<typeof useJwtToken>;

function HookHarness({ opts, onChange }: { opts: HookOptions; onChange: (state: HookState) => void }) {
  const state = useJwtToken(opts);

  useEffect(() => {
    onChange(state);
  }, [state, onChange]);

  return null;
}

function makeToken(exp: number) {
  const encode = (value: object) => globalThis.btoa(JSON.stringify(value));
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ exp })}.signature`;
}

function createFetchResponse(token: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ token })
  } as unknown as Response;
}

describe("useJwtToken", () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as any).fetch;
    }
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("fetchToken posts email to issuer and stores the token", async () => {
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue(createFetchResponse("header.payload.signature"));
    (globalThis.fetch as unknown) = mockFetch as typeof fetch;

    let latestState!: HookState;
    const snapshots: Array<Pick<HookState, "token" | "loading" | "error">> = [];

    const handleChange = (state: HookState) => {
      latestState = state;
      snapshots.push({
        token: state.token,
        loading: state.loading,
        error: state.error
      });
    };

    const opts: HookOptions = {
      serverUrl: "https://issuer.example",
      email: "user@example.com"
    };

    act(() => {
      root.render(<HookHarness opts={opts} onChange={handleChange} />);
    });

    await act(async () => {
      await latestState.fetchToken();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://issuer.example/.well-known/token",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" })
      })
    );

    const finalSnapshot = snapshots[snapshots.length - 1];
    expect(finalSnapshot?.token).toBe("header.payload.signature");
    expect(finalSnapshot?.error).toBeNull();
    expect(finalSnapshot?.loading).toBe(false);
  });

  test("schedules a refresh before token expiry", async () => {
    jest.useFakeTimers();
    const now = new Date("2024-01-01T00:00:00.000Z");
    jest.setSystemTime(now);

    const nowSeconds = Math.floor(now.getTime() / 1000);

    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createFetchResponse(makeToken(nowSeconds + 120)))
      .mockResolvedValueOnce(createFetchResponse(makeToken(nowSeconds + 240)));

    (globalThis.fetch as unknown) = mockFetch as typeof fetch;

    let latestState!: HookState;

    const handleChange = (state: HookState) => {
      latestState = state;
    };

    const opts: HookOptions = {
      serverUrl: "https://issuer.example",
      email: "user@example.com"
    };

    act(() => {
      root.render(<HookHarness opts={opts} onChange={handleChange} />);
    });

    await act(async () => {
      await latestState.fetchToken();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});


