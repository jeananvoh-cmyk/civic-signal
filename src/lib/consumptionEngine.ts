// ═══════════════════════════════════════════════════════════════════
// MOTEUR D'ESTIMATION DE CONSOMMATION ÉLECTRIQUE — SIGNA-CI
// Utilise les recharges + lectures pour estimer la consommation/jour
// ═══════════════════════════════════════════════════════════════════

export interface Recharge {
  id: string;
  recharged_at: string; // ISO
  kwh_purchased: number;
}

export interface Reading {
  id: string;
  read_at: string; // ISO
  kwh_remaining: number;
}

export interface ConsumptionEstimate {
  avg_kwh_per_day: number | null;     // consommation moyenne /jour
  days_remaining: number | null;      // jours restants estimés
  end_date: Date | null;              // date approximative de fin
  current_kwh: number | null;         // kWh restants estimés à maintenant
  confidence: "high" | "medium" | "low" | "insufficient"; // niveau de confiance
  confidence_label: string;           // label français
  data_points: number;                // nb de points utilisés pour le calcul
  trend: "stable" | "increasing" | "decreasing" | "unknown"; // tendance
  trend_label: string;
  last_updated: Date | null;
  warning: string | null;             // message si données insuffisantes
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Calcule l'écart en jours entre deux dates ISO */
function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY;
}

/**
 * Algorithme principal :
 * 1. Si au moins 2 lectures → calcul direct par régression sur les lectures
 * 2. Si 1 lecture + 1 recharge → calcul depuis la recharge initiale
 * 3. Si seulement des recharges → estimation heuristique depuis le début
 * 4. Sinon → données insuffisantes
 */
export function computeEstimate(
  recharges: Recharge[],
  readings: Reading[],
): ConsumptionEstimate {
  const empty: ConsumptionEstimate = {
    avg_kwh_per_day: null,
    days_remaining: null,
    end_date: null,
    current_kwh: null,
    confidence: "insufficient",
    confidence_label: "Données insuffisantes",
    data_points: 0,
    trend: "unknown",
    trend_label: "Inconnue",
    last_updated: null,
    warning: "Ajoutez au moins une recharge et une mise à jour pour voir vos estimations.",
  };

  if (recharges.length === 0) return empty;

  // Trier chronologiquement
  const sortedRecharges = [...recharges].sort(
    (a, b) => new Date(a.recharged_at).getTime() - new Date(b.recharged_at).getTime()
  );
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.read_at).getTime() - new Date(b.read_at).getTime()
  );

  const now = new Date();
  let avgPerDay: number | null = null;
  let confidence: ConsumptionEstimate["confidence"] = "insufficient";
  let dataPoints = 0;
  let trend: ConsumptionEstimate["trend"] = "unknown";

  // ── MÉTHODE A : 2+ lectures → régression linéaire ─────────────────
  if (sortedReadings.length >= 2) {
    // Calcul des taux de consommation entre chaque paire de lectures
    const rates: number[] = [];
    for (let i = 1; i < sortedReadings.length; i++) {
      const days = daysBetween(sortedReadings[i - 1].read_at, sortedReadings[i].read_at);
      if (days <= 0) continue;
      const consumed = sortedReadings[i - 1].kwh_remaining - sortedReadings[i].kwh_remaining;
      if (consumed < 0) continue; // recharge entre-temps, ignorer ce segment
      rates.push(consumed / days);
    }

    if (rates.length > 0) {
      // Moyenne pondérée : les taux récents comptent plus
      const weights = rates.map((_, i) => i + 1);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      avgPerDay = rates.reduce((sum, r, i) => sum + r * weights[i], 0) / totalWeight;
      dataPoints = sortedReadings.length;

      // Tendance : compare première moitié vs deuxième moitié des taux
      if (rates.length >= 4) {
        const half = Math.floor(rates.length / 2);
        const firstAvg = rates.slice(0, half).reduce((a, b) => a + b, 0) / half;
        const lastAvg = rates.slice(half).reduce((a, b) => a + b, 0) / (rates.length - half);
        const delta = (lastAvg - firstAvg) / firstAvg;
        if (delta > 0.15) trend = "increasing";
        else if (delta < -0.15) trend = "decreasing";
        else trend = "stable";
      }

      confidence = sortedReadings.length >= 5 ? "high"
                 : sortedReadings.length >= 3 ? "medium"
                 : "low";
    }
  }

  // ── MÉTHODE B : 1 lecture + recharge connue ────────────────────────
  if (!avgPerDay && sortedReadings.length === 1 && sortedRecharges.length >= 1) {
    const reading = sortedReadings[0];
    // Trouver la recharge la plus récente AVANT la lecture
    const lastRecharge = [...sortedRecharges]
      .reverse()
      .find(r => new Date(r.recharged_at) <= new Date(reading.read_at));

    if (lastRecharge) {
      const days = daysBetween(lastRecharge.recharged_at, reading.read_at);
      if (days > 0) {
        const consumed = lastRecharge.kwh_purchased - reading.kwh_remaining;
        if (consumed > 0) {
          avgPerDay = consumed / days;
          dataPoints = 2;
          confidence = "low";
        }
      }
    }
  }

  // ── MÉTHODE C : heuristique sur la durée inter-recharges ───────────
  if (!avgPerDay && sortedRecharges.length >= 2) {
    // Hypothèse : la recharge suivante arrive quand la précédente est épuisée
    const intervals: number[] = [];
    const kwhPerInterval: number[] = [];
    for (let i = 1; i < sortedRecharges.length; i++) {
      const days = daysBetween(sortedRecharges[i - 1].recharged_at, sortedRecharges[i].recharged_at);
      if (days > 0 && days < 90) { // filtre les trop grands écarts
        intervals.push(days);
        kwhPerInterval.push(sortedRecharges[i - 1].kwh_purchased / days);
      }
    }
    if (kwhPerInterval.length > 0) {
      avgPerDay = kwhPerInterval.reduce((a, b) => a + b, 0) / kwhPerInterval.length;
      dataPoints = sortedRecharges.length;
      confidence = "low";
    }
  }

  if (!avgPerDay || avgPerDay <= 0) return empty;

  // ── Calcul des kWh restants actuels ───────────────────────────────
  let currentKwh: number | null = null;

  if (sortedReadings.length > 0) {
    // Partir de la dernière lecture + recharges postérieures - consommation depuis
    const lastReading = sortedReadings[sortedReadings.length - 1];
    const daysSinceReading = daysBetween(lastReading.read_at, now.toISOString());

    // Recharges après la dernière lecture
    const rechargesAfter = sortedRecharges.filter(
      r => new Date(r.recharged_at) > new Date(lastReading.read_at)
    );
    const extraKwh = rechargesAfter.reduce((s, r) => s + r.kwh_purchased, 0);

    currentKwh = Math.max(0, lastReading.kwh_remaining + extraKwh - avgPerDay * daysSinceReading);
  } else {
    // Pas de lecture : partir de la dernière recharge
    const lastRecharge = sortedRecharges[sortedRecharges.length - 1];
    const daysSinceRecharge = daysBetween(lastRecharge.recharged_at, now.toISOString());
    // Additionner toutes les recharges depuis la première
    const totalKwh = sortedRecharges.reduce((s, r) => s + r.kwh_purchased, 0);
    currentKwh = Math.max(0, totalKwh - avgPerDay * daysSinceRecharge);
  }

  const daysRemaining = avgPerDay > 0 ? Math.round(currentKwh / avgPerDay) : null;
  const endDate = daysRemaining !== null
    ? new Date(now.getTime() + daysRemaining * MS_PER_DAY)
    : null;

  // Labels français
  const confidenceLabels: Record<ConsumptionEstimate["confidence"], string> = {
    high: "Estimation fiable",
    medium: "Estimation correcte",
    low: "Estimation approximative",
    insufficient: "Données insuffisantes",
  };

  const trendLabels: Record<ConsumptionEstimate["trend"], string> = {
    stable: "Stable",
    increasing: "En hausse",
    decreasing: "En baisse",
    unknown: "Inconnue",
  };

  // Avertissement si données vieilles (dernière lecture > 14 jours)
  let warning: string | null = null;
  if (sortedReadings.length > 0) {
    const lastRead = sortedReadings[sortedReadings.length - 1];
    const daysSince = daysBetween(lastRead.read_at, now.toISOString());
    if (daysSince > 14) {
      warning = `Dernière mise à jour il y a ${Math.round(daysSince)} jours — pensez à actualiser pour une estimation précise.`;
    }
  } else {
    warning = "Ajoutez une mise à jour de consommation pour affiner l'estimation.";
  }

  return {
    avg_kwh_per_day: Math.round(avgPerDay * 100) / 100,
    days_remaining: daysRemaining,
    end_date: endDate,
    current_kwh: Math.round((currentKwh ?? 0) * 10) / 10,
    confidence,
    confidence_label: confidenceLabels[confidence],
    data_points: dataPoints,
    trend,
    trend_label: trendLabels[trend],
    last_updated: sortedReadings.length > 0
      ? new Date(sortedReadings[sortedReadings.length - 1].read_at)
      : sortedRecharges.length > 0
      ? new Date(sortedRecharges[sortedRecharges.length - 1].recharged_at)
      : null,
    warning,
  };
}

/** Formate les jours restants en texte lisible */
export function formatDaysRemaining(days: number | null): string {
  if (days === null) return "—";
  if (days <= 0) return "Épuisé";
  if (days === 1) return "Demain";
  if (days < 7) return `${days} jours`;
  if (days < 14) return "Environ 1 semaine";
  if (days < 30) return `${Math.round(days / 7)} semaines`;
  return `Environ ${Math.round(days / 30)} mois`;
}

/** Formate une date en français */
export function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
