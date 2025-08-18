"use client";
import { useEffect, useState } from "react";

type Call = { id: number; created_at: string; transcript: any };
type Customer = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  car_preferences: any | null;
  when_to_buy: string | null;
  trade_in: string | null;
  customer_notes: string | null;
  updated_at: string;
  calls: Call[];
};

export default function LeadsPage() {
  const [data, setData] = useState<Customer[]>([]);
  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then(setData);
  }, []);
  return (
    <main style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>Leads (organized profiles)</h1>
      {data.map((c) => (
        <div
          key={c.id}
          style={{ border: "1px solid #ddd", padding: 12, margin: "12px 0" }}
        >
          <b>#{c.id}</b> — {c.name || "Unnamed"} · {c.email || "no email"} ·{" "}
          {c.phone || "no phone"}
          <div style={{ fontSize: 14, marginTop: 6 }}>
            <div>
              <b>Prefs:</b> {JSON.stringify(c.car_preferences || {})}
            </div>
            <div>
              <b>When to buy:</b> {c.when_to_buy || "—"}
            </div>
            <div>
              <b>Trade-in:</b> {c.trade_in || "—"}
            </div>
            <div>
              <b>Notes:</b> {c.customer_notes || "—"}
            </div>
            <div style={{ opacity: 0.7 }}>
              Updated: {new Date(c.updated_at).toLocaleString()}
            </div>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary>Recent calls</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(c.calls, null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </main>
  );
}
