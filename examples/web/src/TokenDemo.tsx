import { useState } from "react";
import { useJwtToken } from "jwt-email-issuer/react";

export default function TokenDemo() {
  const serverUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const [email, setEmail] = useState("");
  const { token, loading, error, fetchToken } = useJwtToken({
    serverUrl,
    email,
  });
  const [response, setResponse] = useState<string | null>(null);

  const sendToken = async () => {
    if (!token) {
      alert("No token yet!");
      return;
    }

    const res = await fetch(`${serverUrl}/api/echo-token`, {
      headers: { "X-Email-Token": token },
    });
    const data = await res.json();
    setResponse(JSON.stringify(data, null, 2));
  };

  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>X-Email-Token Demo</h1>
      <label style={{ display: "block", marginBottom: 8 }}>
        Email:
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          style={{ marginLeft: 8, padding: 4, minWidth: 240 }}
        />
      </label>
      <button disabled={loading || email.trim() === ""} onClick={fetchToken}>
        {loading ? "Getting token…" : "Get Token"}
      </button>
      {token && (
        <>
          <p>
            <strong>Token:</strong>
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              background: "#f6f8fa",
              padding: 10,
            }}
          >
            {token}
          </pre>
          <button onClick={sendToken}>Send Token to Server</button>
        </>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {response && (
        <>
          <h3>Server Response:</h3>
          <pre style={{ background: "#f0f0f0", padding: 10 }}>{response}</pre>
        </>
      )}
    </main>
  );
}
