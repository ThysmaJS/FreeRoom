// Next.js calls register() in every runtime (nodejs + edge, e.g. proxy.ts's
// middleware) — the OTel/Postgres imports below only work in Node.js, so
// they're dynamically imported behind this guard to keep them out of the
// edge bundle entirely. See node_modules/next/dist/docs/01-app/02-guides/
// instrumentation.md "Importing runtime-specific code".
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { MeterProvider } = await import("@opentelemetry/sdk-metrics");
  const { PrometheusExporter } = await import(
    "@opentelemetry/exporter-prometheus"
  );
  const { resourceFromAttributes } = await import("@opentelemetry/resources");
  const { sql } = await import("@/lib/db");

  const port = Number(process.env.OTEL_METRICS_PORT ?? 9464);
  const exporter = new PrometheusExporter({ port });
  const meterProvider = new MeterProvider({
    resource: resourceFromAttributes({ "service.name": "freeroom" }),
    readers: [exporter],
  });
  const meter = meterProvider.getMeter("freeroom");

  // Current totals, read fresh on every Prometheus scrape — not counters
  // incremented in application code, so no existing route/action needed
  // touching just to get a number on a dashboard.
  async function observeCount(
    result: { observe: (value: number, attributes?: Record<string, string>) => void },
    query: Promise<{ count: string }[]>
  ) {
    try {
      const rows = await query;
      const count = rows[0]?.count ?? "0";
      result.observe(Number(count));
    } catch {
      // The database may be unreachable (e.g. during the incident drill) —
      // skip this scrape rather than crash the metrics server over it.
    }
  }

  meter
    .createObservableGauge("freeroom_users_total", {
      description: "Nombre de comptes utilisateurs, par rôle",
    })
    .addCallback(async (result) => {
      try {
        const rows = await sql<{ role: string; count: string }[]>`
          SELECT role, count(*)::text AS count FROM users GROUP BY role
        `;
        for (const row of rows) {
          result.observe(Number(row.count), { role: row.role });
        }
      } catch {
        // Same rationale as observeCount above.
      }
    });

  meter
    .createObservableGauge("freeroom_bookings_total", {
      description: "Nombre total de réservations, toutes dates confondues",
    })
    .addCallback((result) =>
      observeCount(result, sql`SELECT count(*)::text AS count FROM bookings`)
    );

  meter
    .createObservableGauge("freeroom_bookings_upcoming_total", {
      description: "Nombre de réservations à venir (date >= aujourd'hui)",
    })
    .addCallback((result) =>
      observeCount(
        result,
        sql`SELECT count(*)::text AS count FROM bookings WHERE date >= CURRENT_DATE`
      )
    );

  meter
    .createObservableGauge("freeroom_rooms_total", {
      description: "Nombre de salles configurées",
    })
    .addCallback((result) =>
      observeCount(result, sql`SELECT count(*)::text AS count FROM rooms`)
    );

  console.log(`[otel] Métriques Prometheus exposées sur :${port}/metrics`);
}
