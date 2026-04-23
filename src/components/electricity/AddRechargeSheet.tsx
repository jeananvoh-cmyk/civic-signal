import { useState } from "react";
import { parseCieSms, ParsedRecharge } from "@/lib/smsParser";
import { Zap, ClipboardPaste, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  meterId: string;
  onSave: (data: {
    meter_id: string;
    recharged_at: string;
    kwh_purchased: number;
    amount_fcfa?: number;
    energy_fcfa?: number;
    taxes_fcfa?: number;
    token_code?: string;
    reference?: string;
    raw_sms?: string;
    source: "sms" | "manual";
  }) => Promise<void>;
  onClose: () => void;
}

export default function AddRechargeSheet({ meterId, onSave, onClose }: Props) {
  const [mode, setMode] = useState<"sms" | "manual">("sms");
  const [smsText, setSmsText] = useState("");
  const [parsed, setParsed] = useState<ParsedRecharge | null>(null);
  const [kwh, setKwh] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Parsing automatique ───────────────────────────────────────────
  function handleSmsChange(text: string) {
    setSmsText(text);
    if (text.trim().length > 20) {
      const result = parseCieSms(text);
      setParsed(result);
      if (result.kwh_purchased) setKwh(String(result.kwh_purchased));
      if (result.amount_fcfa) setAmount(String(result.amount_fcfa));
      if (result.recharged_at) setDate(result.recharged_at.toISOString().slice(0, 16));
    } else {
      setParsed(null);
    }
  }

  // ── Coller depuis presse-papiers ──────────────────────────────────
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      handleSmsChange(text);
    } catch {
      setError("Impossible d'accéder au presse-papiers. Collez le texte manuellement.");
    }
  }

  // ── Sauvegarde ────────────────────────────────────────────────────
  async function handleSave() {
    const kwhVal = parseFloat(kwh);
    if (!kwh || isNaN(kwhVal) || kwhVal <= 0) {
      setError("Veuillez indiquer le nombre de kWh reçus.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        meter_id: meterId,
        recharged_at: new Date(date).toISOString(),
        kwh_purchased: kwhVal,
        amount_fcfa: amount ? parseFloat(amount) : undefined,
        energy_fcfa: parsed?.energy_fcfa ?? undefined,
        taxes_fcfa: parsed?.taxes_fcfa ?? undefined,
        token_code: parsed?.token_code ?? undefined,
        reference: parsed?.reference ?? undefined,
        raw_sms: smsText || undefined,
        source: mode,
      });
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const confidenceColors: Record<string, string> = {
    high:   "text-emerald-600",
    medium: "text-amber-600",
    low:    "text-orange-600",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl max-h-[90dvh] flex flex-col">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="font-semibold text-foreground">Enregistrer une recharge</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">
            Annuler
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Sélecteur de mode */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setMode("sms")}
              className={`rounded-lg py-2 text-sm font-medium transition-all ${
                mode === "sms" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Importer un SMS
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`rounded-lg py-2 text-sm font-medium transition-all ${
                mode === "manual" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Saisie manuelle
            </button>
          </div>

          {/* Mode SMS */}
          {mode === "sms" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Texte du SMS de recharge
                </label>
                <textarea
                  value={smsText}
                  onChange={e => handleSmsChange(e.target.value)}
                  placeholder="Collez ici le SMS reçu de la CIE après votre recharge…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none h-28 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={handlePaste}
                  className="flex items-center gap-2 text-sm text-primary font-medium"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Coller depuis le presse-papiers
                </button>
              </div>

              {/* Résultat du parsing */}
              {parsed && (
                <div className={`rounded-xl border p-3 space-y-2 ${
                  parsed.confidence === "high"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}>
                  <div className="flex items-center gap-1.5">
                    {parsed.confidence === "high"
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <AlertCircle className="h-4 w-4 text-amber-600" />
                    }
                    <p className={`text-xs font-semibold ${confidenceColors[parsed.confidence]}`}>
                      {parsed.confidence === "high" ? "Informations détectées" : "Détection partielle — vérifiez"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {parsed.kwh_purchased && <span>⚡ <b>{parsed.kwh_purchased} kWh</b></span>}
                    {parsed.amount_fcfa && <span>💰 <b>{parsed.amount_fcfa.toLocaleString("fr-FR")} FCFA</b></span>}
                    {parsed.token_code && (
                      <span className="col-span-2">🔑 Code : <b className="font-mono text-[11px]">{parsed.token_code}</b></span>
                    )}
                    {parsed.meter_number && <span>📟 Ctr : <b>{parsed.meter_number}</b></span>}
                    {parsed.recharged_at && <span>📅 <b>{parsed.recharged_at.toLocaleDateString("fr-FR")}</b></span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Champ kWh — toujours visible et modifiable */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              kWh reçus <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={kwh}
                onChange={e => setKwh(e.target.value)}
                placeholder="ex: 75.62"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-bold pr-16 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">kWh</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ce chiffre est indiqué sur votre SMS ou votre reçu de recharge.
            </p>
          </div>

          {/* Détails optionnels */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"
            >
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showDetails ? "Masquer les détails" : "Ajouter montant et date (optionnel)"}
            </button>
            {showDetails && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Montant payé (FCFA)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date de recharge</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Bouton Enregistrer */}
        <div className="p-4 border-t border-border safe-area-pb">
          <button
            onClick={handleSave}
            disabled={saving || !kwh}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-transform"
          >
            {saving ? "Enregistrement…" : "Enregistrer la recharge"}
          </button>
        </div>
      </div>
    </div>
  );
}
