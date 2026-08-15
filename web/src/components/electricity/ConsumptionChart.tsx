import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { ElectricityRecharge, ElectricityReading } from "@/hooks/useElectricity";
import { ConsumptionEstimate } from "@/lib/consumptionEngine";

interface Props {
  recharges: ElectricityRecharge[];
  readings: ElectricityReading[];
  estimate: ConsumptionEstimate;
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

interface ChartPoint {
  date: string;
  label: string;
  kwh: number | null;
  type: "reading" | "recharge" | "projection";
}

export default function ConsumptionChart({ recharges, readings, estimate }: Props) {
  if (recharges.length === 0 && readings.length === 0) return null;

  // ── Construction des points ──────────────────────────────────────
  const points: ChartPoint[] = [];

  // Points réels : lectures
  for (const r of readings) {
    points.push({
      date: r.read_at,
      label: formatDay(r.read_at),
      kwh: r.kwh_remaining,
      type: "reading",
    });
  }

  // Si pas de lectures mais des recharges, on crée des points estimés
  if (readings.length === 0 && recharges.length > 0 && estimate.avg_kwh_per_day) {
    const sorted = [...recharges].sort(
      (a, b) => new Date(a.recharged_at).getTime() - new Date(b.recharged_at).getTime()
    );
    let kwh = sorted[0].kwh_purchased;
    for (const r of sorted) {
      points.push({ date: r.recharged_at, label: formatDay(r.recharged_at), kwh, type: "recharge" });
    }
  }

  // Projection : 14 jours dans le futur
  if (estimate.avg_kwh_per_day && estimate.current_kwh !== null) {
    const now = new Date();
    for (let i = 0; i <= 14; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const projectedKwh = Math.max(0, estimate.current_kwh - estimate.avg_kwh_per_day * i);
      points.push({
        date: d.toISOString(),
        label: formatDay(d.toISOString()),
        kwh: projectedKwh,
        type: "projection",
      });
    }
  }

  // Trier chronologiquement et dédupliquer les labels
  points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (points.length < 2) return null;

  // Séparer données réelles vs projections pour styling différent
  const realPoints = points.filter(p => p.type !== "projection");
  const projPoints = points.filter(p => p.type === "projection");
  const allPoints = [...realPoints, ...projPoints];

  // Trouver la date "maintenant" pour la ligne de référence
  const nowLabel = formatDay(new Date().toISOString());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Courbe de consommation</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded bg-primary" />
            Réel
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded bg-primary/30 border border-dashed border-primary/50" />
            Projection
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-3">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={allPoints} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="kwhGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="kwhProjGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.10} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              unit=" kWh"
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
              formatter={(v: number, _: string, entry: any) => [
                `${v.toFixed(1)} kWh`,
                entry.payload.type === "projection" ? "Projection" : "Relevé",
              ]}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            {/* Ligne "Maintenant" */}
            <ReferenceLine
              x={nowLabel}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 2"
              label={{ value: "Auj.", position: "top", fontSize: 9, fill: "hsl(var(--primary))" }}
            />
            {/* Zone réelle */}
            <Area
              type="monotone"
              dataKey="kwh"
              data={allPoints.filter(p => p.type !== "projection")}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#kwhGradient)"
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              connectNulls
            />
            {/* Zone projection */}
            <Area
              type="monotone"
              dataKey="kwh"
              data={allPoints.filter(p => p.type === "projection")}
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="url(#kwhProjGradient)"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {estimate.confidence === "insufficient" && (
        <p className="text-center text-[11px] text-muted-foreground">
          La courbe s'affichera après vos premières mises à jour
        </p>
      )}
    </div>
  );
}
