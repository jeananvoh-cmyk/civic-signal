import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { motion } from "framer-motion";
import {
  Zap, Plus, ArrowLeft, Gauge, History,
  RefreshCw, Trash2, Building2, CheckCircle2, XCircle, AlertCircle, Hash,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useElectricity } from "@/hooks/useElectricity";
import EstimationCard from "@/components/electricity/EstimationCard";
import ConsumptionChart from "@/components/electricity/ConsumptionChart";
import AddRechargeSheet from "@/components/electricity/AddRechargeSheet";
import AddReadingSheet from "@/components/electricity/AddReadingSheet";

// ─── Setup compteur (premier lancement) ──────────────────────────────────────

function SetupMeter({ onCreate }: { onCreate: (label: string, meterNumber?: string) => void }) {
  const { user } = useAuth();
  const [label, setLabel] = useState("Mon compteur");
  const [meterNumber, setMeterNumber] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Pré-remplir depuis profiles.electricity_meter_number si disponible
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("electricity_meter_number, electricity_client_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.electricity_meter_number) {
          setMeterNumber(data.electricity_meter_number);
          setPrefilled(true);
        }
      });
  }, [user]);
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-yellow-500/10 flex items-center justify-center">
            <Zap className="h-8 w-8 text-yellow-500" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">Suivi d'électricité</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enregistrez vos recharges et suivez votre consommation pour ne jamais être pris au dépourvu.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Nom de votre installation
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ex: Maison principale, Bureau…"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                N° de compteur <span className="font-normal text-muted-foreground">(optionnel)</span>
              </label>
              {prefilled && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Récupéré depuis votre profil
                </span>
              )}
            </div>
            <input
              type="text"
              value={meterNumber}
              onChange={e => { setMeterNumber(e.target.value); setPrefilled(false); }}
              placeholder="ex: 42057649321"
              className={`w-full rounded-xl border px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                prefilled
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-background"
              }`}
            />
            <p className="text-[11px] text-muted-foreground">
              {prefilled
                ? "Ce numéro provient du scan de votre facture CIE. Vous pouvez le modifier."
                : "Visible dans vos SMS de recharge (Ctr: …)"}
            </p>
          </div>
          <button
            onClick={() => label.trim() && onCreate(label.trim(), meterNumber || undefined)}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white active:scale-95 transition-transform"
          >
            Commencer le suivi
          </button>
        </div>
        <button onClick={goBack} className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CompteurPage() {
  const goBack = useGoBack("/");
  const { user } = useAuth();
  const {
    activeMeter, recharges, readings, estimate,
    isLoading, hasData,
    createMeter, addRecharge, addReading, deleteRecharge, updateMeter,
  } = useElectricity();

  const [showRechargeSheet, setShowRechargeSheet] = useState(false);
  const [showReadingSheet, setShowReadingSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPostRechargeBanner, setShowPostRechargeBanner] = useState(false);
  const [pendingMeterNumber, setPendingMeterNumber] = useState<string | null>(null);
  // Référence CIE (Ref:) détectée dans un SMS — attend confirmation pour maj profil
  const [pendingCieRef, setPendingCieRef] = useState<string | null>(null);
  const [savingCieRef, setSavingCieRef] = useState(false);

  // ── Écran de chargement ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Premier lancement : pas de compteur ───────────────────────────
  if (!hasData) {
    return (
      <SetupMeter
        onCreate={async (label, meterNumber) => {
          await createMeter.mutateAsync({ label, meter_number: meterNumber });
          toast.success("Compteur créé ! Enregistrez votre première recharge.");
        }}
      />
    );
  }

  // ── Vue principale ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="font-bold text-foreground text-sm leading-tight">{activeMeter?.label}</p>
              {activeMeter?.meter_number && (
                <p className="text-[10px] text-muted-foreground font-mono">Ctr: {activeMeter.meter_number}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="max-w-lg mx-auto px-4 flex gap-1 border-t border-border">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === "dashboard"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <Gauge className="h-3.5 w-3.5" />
            Tableau de bord
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Historique
            {recharges.length > 0 && (
              <span className="ml-1 rounded-full bg-muted text-muted-foreground text-[9px] font-bold px-1.5 py-0.5">
                {recharges.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ── DASHBOARD ─────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Boutons d'action */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRechargeSheet(true)}
                className="flex items-center gap-2 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm font-semibold text-yellow-700 dark:text-yellow-400 active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4" />
                + Recharge
              </button>
              <button
                onClick={() => setShowReadingSheet(true)}
                className="flex items-center gap-2 rounded-2xl bg-sky-500/10 border border-sky-500/30 px-4 py-3 text-sm font-semibold text-sky-700 dark:text-sky-400 active:scale-95 transition-transform"
              >
                <Gauge className="h-4 w-4" />
                Mettre à jour
              </button>
            </div>

            {/* ── Banner post-recharge ── */}
            {showPostRechargeBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-sky-500/40 bg-sky-500/8 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Recharge enregistrée ✓</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Pour affiner l'estimation, regardez votre compteur et indiquez
                      combien de kWh sont affichés maintenant.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPostRechargeBanner(false)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setShowPostRechargeBanner(false); setShowReadingSheet(true); }}
                    className="rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white active:scale-95 transition-transform"
                  >
                    Indiquer mes kWh maintenant
                  </button>
                  <button
                    onClick={() => setShowPostRechargeBanner(false)}
                    className="rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Plus tard
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Confirmation numéro de compteur détecté ── */}
            {pendingMeterNumber && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-emerald-500/40 bg-emerald-500/8 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Hash className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Numéro de compteur détecté</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Votre SMS contient la référence{" "}
                      <span className="font-mono font-semibold text-foreground">{pendingMeterNumber}</span>.
                      Souhaitez-vous l'enregistrer sur ce compteur ?
                    </p>
                  </div>
                  <button
                    onClick={() => setPendingMeterNumber(null)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      if (!activeMeter) return;
                      await updateMeter.mutateAsync({ id: activeMeter.id, meter_number: pendingMeterNumber });
                      setPendingMeterNumber(null);
                      toast.success("Numéro de compteur enregistré");
                    }}
                    disabled={updateMeter.isPending}
                    className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {updateMeter.isPending ? "Enregistrement…" : "Oui, enregistrer"}
                  </button>
                  <button
                    onClick={() => setPendingMeterNumber(null)}
                    className="rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Non merci
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Confirmation référence CIE (Ref:) détectée ── */}
            {pendingCieRef && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Référence CIE détectée</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Votre SMS contient la référence{" "}
                      <span className="font-mono font-semibold text-foreground">{pendingCieRef}</span>.
                      Enregistrer comme référence de votre compteur CIE ?
                    </p>
                  </div>
                  <button
                    onClick={() => setPendingCieRef(null)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setSavingCieRef(true);
                      try {
                        const { error } = await supabase
                          .from("profiles")
                          .update({ electricity_meter_ref: pendingCieRef })
                          .eq("user_id", user.id);
                        if (error) throw error;
                        setPendingCieRef(null);
                        toast.success("Référence CIE enregistrée");
                      } catch {
                        toast.error("Erreur lors de l'enregistrement");
                      } finally {
                        setSavingCieRef(false);
                      }
                    }}
                    disabled={savingCieRef}
                    className="rounded-xl bg-primary py-2.5 text-xs font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {savingCieRef ? "Enregistrement…" : "Oui, enregistrer"}
                  </button>
                  <button
                    onClick={() => setPendingCieRef(null)}
                    className="rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Non merci
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Rappel si recharges sans aucune lecture ── */}
            {!showPostRechargeBanner && recharges.length > 0 && readings.length === 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Première mise à jour recommandée
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Regardez l'écran de votre compteur et saisissez les kWh affichés.
                    L'estimation démarrera automatiquement.
                  </p>
                </div>
                <button
                  onClick={() => setShowReadingSheet(true)}
                  className="shrink-0 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap"
                >
                  Saisir
                </button>
              </div>
            )}

            {/* Carte estimation */}
            <EstimationCard
              estimate={estimate}
              onAddReading={() => setShowReadingSheet(true)}
            />

            {/* Graphique */}
            {(recharges.length > 0 || readings.length > 0) && (
              <ConsumptionChart
                recharges={recharges}
                readings={readings}
                estimate={estimate}
              />
            )}

            {/* État débutant si peu de données */}
            {recharges.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Enregistrez votre première recharge</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Collez le SMS reçu de la CIE ou saisissez les informations manuellement.
                    Plus vous ajoutez de données, plus l'estimation sera précise.
                  </p>
                </div>
                <button
                  onClick={() => setShowRechargeSheet(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Première recharge
                </button>
              </div>
            )}

            {/* Dernières lectures */}
            {readings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Dernières mises à jour
                </p>
                {readings.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-foreground">{r.kwh_remaining} kWh restants</p>
                      {r.note && <p className="text-[11px] text-muted-foreground">{r.note}</p>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(r.read_at), "d MMM · HH:mm", { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Lien retour signalement */}
            <Link
              to="/signaler"
              className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Signaler une coupure ou un problème
            </Link>
          </motion.div>
        )}

        {/* ── HISTORIQUE ────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {recharges.length} recharge{recharges.length > 1 ? "s" : ""} enregistrée{recharges.length > 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setShowRechargeSheet(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>

            {recharges.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune recharge enregistrée</p>
              </div>
            )}

            {recharges.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-foreground">{r.kwh_purchased} kWh</p>
                        {r.amount_fcfa && (
                          <span className="text-[11px] text-muted-foreground">
                            {r.amount_fcfa.toLocaleString("fr-FR")} FCFA
                          </span>
                        )}
                        <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                          r.source === "sms"
                            ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {r.source === "sms" ? "SMS" : "Manuel"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(r.recharged_at), "d MMMM yyyy · HH:mm", { locale: fr })}
                      </p>
                      {r.token_code && (
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          🔑 {r.token_code}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setDeleting(r.id);
                      await deleteRecharge.mutateAsync(r.id);
                      setDeleting(null);
                      toast.success("Recharge supprimée");
                    }}
                    disabled={deleting === r.id}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className={`h-4 w-4 ${deleting === r.id ? "animate-pulse" : ""}`} />
                  </button>
                </div>

                {/* Détails montants si disponibles */}
                {(r.energy_fcfa || r.taxes_fcfa) && (
                  <div className="px-4 pb-3 flex gap-4 text-[11px] text-muted-foreground">
                    {r.energy_fcfa && <span>Énergie : {r.energy_fcfa.toLocaleString("fr-FR")} F</span>}
                    {r.taxes_fcfa && <span>Taxes : {r.taxes_fcfa.toLocaleString("fr-FR")} F</span>}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Sheets */}
      {showRechargeSheet && activeMeter && (
        <AddRechargeSheet
          meterId={activeMeter.id}
          onSave={async (data) => {
            await addRecharge.mutateAsync(data);
            toast.success(`${data.kwh_purchased} kWh enregistrés`);
            setShowPostRechargeBanner(true);
            setActiveTab("dashboard");
            if (data.meter_number && data.meter_number !== activeMeter.meter_number) {
              setPendingMeterNumber(data.meter_number);
            }
            if (data.cie_ref) {
              setPendingCieRef(data.cie_ref);
            }
          }}
          onClose={() => setShowRechargeSheet(false)}
        />
      )}
      {showReadingSheet && activeMeter && (
        <AddReadingSheet
          meterId={activeMeter.id}
          currentEstimate={estimate.current_kwh}
          onSave={async (data) => {
            await addReading.mutateAsync(data);
            toast.success("Mise à jour enregistrée");
          }}
          onClose={() => setShowReadingSheet(false)}
        />
      )}
    </div>
  );
}
