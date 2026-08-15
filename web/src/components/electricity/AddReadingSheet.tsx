import { useState } from "react";
import { Gauge, AlertCircle } from "lucide-react";

interface Props {
  meterId: string;
  currentEstimate: number | null;
  onSave: (data: { meter_id: string; kwh_remaining: number; note?: string }) => Promise<void>;
  onClose: () => void;
}

const QUICK_VALUES = [5, 10, 20, 30, 50];

export default function AddReadingSheet({ meterId, currentEstimate, onSave, onClose }: Props) {
  const [kwh, setKwh] = useState(currentEstimate !== null ? String(Math.round(currentEstimate)) : "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const kwhVal = parseFloat(kwh);
    if (!kwh || isNaN(kwhVal) || kwhVal < 0) {
      setError("Veuillez indiquer vos kWh restants (0 si le compteur est épuisé).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ meter_id: meterId, kwh_remaining: kwhVal, note: note || undefined });
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Gauge className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Mettre à jour</p>
              <p className="text-[11px] text-muted-foreground">kWh restants sur votre compteur</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">
            Annuler
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Explication simple */}
          <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 px-4 py-3">
            <p className="text-sm text-sky-700 dark:text-sky-400">
              Regardez l'écran de votre compteur et notez le nombre de kWh affichés.
              Faites cela tous les 2–3 jours pour une meilleure estimation.
            </p>
          </div>

          {/* Saisie principale */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              kWh restants affichés sur le compteur
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={kwh}
                onChange={e => setKwh(e.target.value)}
                placeholder="ex: 32.4"
                className="w-full rounded-xl border border-border bg-background px-4 py-4 text-2xl font-bold pr-16 focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">kWh</span>
            </div>
          </div>

          {/* Raccourcis rapides */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Valeurs rapides</p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_VALUES.map(v => (
                <button
                  key={v}
                  onClick={() => setKwh(String(v))}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    kwh === String(v)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {v} kWh
                </button>
              ))}
              <button
                onClick={() => setKwh("0")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  kwh === "0"
                    ? "border-red-500 bg-red-500/10 text-red-600"
                    : "border-border text-muted-foreground hover:border-red-400"
                }`}
              >
                0 kWh (épuisé)
              </button>
            </div>
          </div>

          {/* Note optionnelle */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ex: avant coupure, après longue absence…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50 active:scale-[0.96] transition-transform"
          >
            {saving ? "Enregistrement…" : "Enregistrer la mise à jour"}
          </button>

          <p className="text-center text-[11px] text-muted-foreground">
            Cette information reste privée et ne quitte pas votre compte.
          </p>
        </div>
      </div>
    </div>
  );
}
