import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Radio, Users, BarChart3, Zap, ArrowRight, MapPin, Award, MessageCircle, Copy, Check, Ticket, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import PushPromptBanner from "@/components/PushPromptBanner";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES } from "@/lib/communes";
import { useAuth } from "@/contexts/AuthContext";
import { getDisplayTicketCode, getCommunePadaCode, formatPadaAddress } from "@/lib/pada";

const FIRST_BADGE_KEY = "signa_first_report_badge";

const POLL_INTERVAL = 5000;

const ConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const reportId = searchParams.get("id");
  const [showBadge, setShowBadge] = useState(false);
  const commune = searchParams.get("commune") || "";
  const typeLabel = searchParams.get("type") || "Signalement";
  const typeEmoji = searchParams.get("emoji") || "⚡";
  const quartier = searchParams.get("quartier") || "";
  const serviceType = searchParams.get("service") || "";

  const [verifications, setVerifications] = useState(0);
  const [prevVerifications, setPrevVerifications] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [neighborCount, setNeighborCount] = useState<number | null>(null);
  const [pollError, setPollError] = useState(false);

  const communeData = COMMUNES.find((c) => c.nom === commune);
  const accentColor = communeData?.couleur || "#0ea5e9";

  const [reportDetails, setReportDetails] = useState<{
    ticket_code?: string | null;
    pada_commune_code?: string | null;
    pada_street_name?: string | null;
    pada_formatted_address?: string | null;
  } | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        const { data, error } = await supabase
          .from("reports")
          .select("verifications, ticket_code, pada_commune_code, pada_street_name, pada_formatted_address")
          .eq("id", reportId)
          .single();
        if (error) throw error;
        setPollError(false);
        if (data) {
          setReportDetails(data as any);
          const newCount = (data as any).verifications ?? 0;
          setVerifications((prev) => {
            if (newCount > prev) {
              setPulse(true);
              setPrevVerifications(prev);
              setTimeout(() => setPulse(false), 1200);
            }
            return newCount;
          });
        }
      } catch {
        setPollError(true);
      }
    };

    fetchReport();
    const interval = setInterval(fetchReport, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [reportId]);

  // Badge "Premier signalement"
  useEffect(() => {
    if (!user || localStorage.getItem(FIRST_BADGE_KEY)) return;
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (count === 1) {
          localStorage.setItem(FIRST_BADGE_KEY, "1");
          setTimeout(() => setShowBadge(true), 1200);
        }
      });
  }, [user]);

  // Fetch count of other active reports in same area
  useEffect(() => {
    if (!commune || !serviceType) return;

    const fetchNeighbors = async () => {
      const { data, error } = await supabase.rpc("find_similar_reports", {
        p_commune: commune,
        p_quartier: quartier || "",
        p_service_type: serviceType,
        p_report_category: "outage",
      });
      if (!error && data) {
        const others = (data as any[]).filter((r) => r.id !== reportId);
        setNeighborCount(others.length);
      }
    };

    fetchNeighbors();
  }, [commune, quartier, serviceType, reportId]);

  const isOutage = searchParams.get("category") === "outage";
  const operatorName = serviceType === "electricity" ? "CIE" : serviceType === "water" ? "SODECI" : null;
  const locationLabel = [quartier, commune].filter(Boolean).join(", ");
  const displayTicket = getDisplayTicketCode({
    ticket_code: reportDetails?.ticket_code,
    commune,
    id: reportId || undefined,
  });
  const padaCode = getCommunePadaCode(commune);

  const shareLines = isOutage
    ? [
        `${typeEmoji} ALERTE COUPURE — ${locationLabel}`,
        `🎫 Ticket : ${displayTicket}`,
        ``,
        `${typeLabel} en cours. Toujours sans intervention.`,
        ``,
        neighborCount && neighborCount > 0
          ? `👥 ${neighborCount + 1} signalement${neighborCount > 0 ? "s" : ""} dans le secteur.`
          : ``,
        operatorName
          ? `📢 Rejoignez-nous sur SIGNA-CI pour faire pression sur ${operatorName}.`
          : `📢 Signalez sur SIGNA-CI pour être plus forts ensemble.`,
        `Plus on est nombreux, plus vite ils interviennent !`,
      ].filter(Boolean).join("\n")
    : [
        `🚧 INFRASTRUCTURE — ${locationLabel}`,
        `🎫 Ticket : ${displayTicket}`,
        ``,
        `${typeLabel} signalé dans votre quartier.`,
        ``,
        `✊ Rejoignez SIGNA-CI pour signaler les problèmes de votre quartier`,
        `et suivre leur résolution en temps réel.`,
      ].filter(Boolean).join("\n");

  const shareText = shareLines;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Modal badge premier signalement */}
      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setShowBadge(false)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Award className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                Premier signalement !
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Merci pour votre engagement citoyen. Chaque signalement aide votre communauté à être entendue.
              </p>
              <Button
                className="mt-6 w-full font-bold"
                onClick={() => setShowBadge(false)}
              >
                Continuer
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container max-w-md py-8 px-4">

        {/* Icône de succès */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="mb-6 flex justify-center"
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor + "20", border: `3px solid ${accentColor}40` }}
          >
            <CheckCircle2 className="h-10 w-10" style={{ color: accentColor }} />
          </div>
        </motion.div>

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-5 text-center"
        >
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Signalement envoyé !
          </h1>
          <p className="mt-1 text-muted-foreground">
            {typeEmoji} <span className="font-semibold">{typeLabel}</span>
            {commune && (
              <> — <span className="font-semibold" style={{ color: accentColor }}>{commune}</span></>
            )}
          </p>
        </motion.div>

        {/* 🎫 Ticket de Suivi & Référence Unique */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-5 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ticket de Suivi Officiel</p>
                <p className="font-mono text-base font-black text-foreground tracking-tight">
                  {displayTicket}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-bold shrink-0 border-emerald-500/30 hover:bg-emerald-500/10"
              onClick={() => {
                navigator.clipboard.writeText(displayTicket);
                setCopiedTicket(true);
                setTimeout(() => setCopiedTicket(false), 2000);
              }}
            >
              {copiedTicket ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedTicket ? "Copié !" : "Copier"}</span>
            </Button>
          </div>

          {/* Adresse Officielle PADA (MCLU) */}
          <div className="flex items-start gap-2.5 text-xs">
            <Building2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                <span>Nomenclature Nationale (PADA / MCLU)</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                  {padaCode}
                </span>
              </p>
              <p className="text-muted-foreground leading-relaxed truncate">
                {reportDetails?.pada_formatted_address || formatPadaAddress({
                  commune,
                  quartier,
                  streetName: reportDetails?.pada_street_name || quartier,
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Voisins qui ont aussi signalé */}
        {neighborCount !== null && neighborCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 dark:border-warning/25 dark:bg-warning/10"
          >
            <MapPin className="h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm text-warning-foreground dark:text-warning">
              <span className="font-bold">{neighborCount} voisin{neighborCount > 1 ? "s" : ""}</span> ont aussi signalé {typeEmoji} dans{" "}
              <span className="font-semibold">{quartier || commune}</span>
            </p>
          </motion.div>
        )}

        {/* Live counter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6 overflow-hidden rounded-2xl border-2 bg-card p-6 text-center shadow-card"
          style={{ borderColor: accentColor + "40" }}
        >
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            {pollError ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/20 px-2 py-0.5 text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                En attente de connexion…
              </span>
            ) : (
              <>
                <Radio className={cn("h-3.5 w-3.5", pulse && "animate-pulse")} style={{ color: accentColor }} />
                Confirmations de vos voisins — Live
              </>
            )}
          </div>

          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {verifications} voisin{verifications !== 1 ? "s" : ""} confirm{verifications !== 1 ? "ent" : "e"}
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={verifications}
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2, y: 10 }}
              transition={{ duration: 0.3 }}
              className="font-display text-6xl font-extrabold tabular-nums"
              aria-hidden="true"
              style={{ color: verifications > 0 ? accentColor : undefined }}
            >
              {verifications}
            </motion.div>
          </AnimatePresence>

          <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            voisin{verifications !== 1 ? "s" : ""} confirm{verifications !== 1 ? "ent" : "e"}
          </div>

          {verifications === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Les voisins dans un rayon de 200 m seront notifiés.
            </p>
          )}
          {verifications >= 1 && verifications < 3 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              Votre signalement gagne en crédibilité !
            </motion.p>
          )}
          {verifications >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3"
            >
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                🎯 Signalement fortement confirmé !
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                Il sera traité en priorité par les autorités.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Push notifications prompt */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mb-4"
        >
          <PushPromptBanner />
        </motion.div>

        {/* ── Bloc SIGNA relais CIE/SODECI ── */}
        {isOutage && operatorName && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.29 }}
            className="rounded-2xl border-2 border-amber-400/40 bg-amber-50/60 dark:bg-amber-900/10 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <MessageCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight">
                  SIGNA-CI contacte la {operatorName} pour vous
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Dès que votre signalement est confirmé par vos voisins, notre équipe le transmet directement à la {operatorName} via WhatsApp en votre nom. Vous n'avez rien d'autre à faire.
                </p>
                {neighborCount !== null && neighborCount > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-1.5">
                    ✓ {neighborCount + 1} signalement{neighborCount > 0 ? "s" : ""} déjà dans ce secteur — transmission prioritaire
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Partage incitatif */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border-2 border-green-500/30 bg-green-500/5 p-4 space-y-3"
        >
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-foreground">
              📣 Alertez vos voisins — renforcez votre signalement
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Plus votre signalement est confirmé, plus vite il sera traité.
              Partagez-le maintenant sur WhatsApp pour que vos voisins le corroborent !
            </p>
          </div>
          <ShareButton
            title="SIGNA-CI — Signalement citoyen"
            text={shareText}
            url={reportId ? `${window.location.origin}/signalement/${reportId}` : window.location.origin}
            className="w-full justify-center py-4 text-sm font-bold bg-green-600 hover:bg-green-700 text-white border-0"
          />
        </motion.div>

        {/* CTA principal — accès direct au signalement */}
        {reportId && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="mb-3"
          >
            <Button asChild className="w-full py-5 font-bold text-base gap-2 hover:opacity-90 active:opacity-80 transition-opacity" style={{ backgroundColor: accentColor }}>
              <Link to={`/signalement/${reportId}`}>
                📋 Consulter mon signalement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              Retrouvez cette page à tout moment depuis <strong>Mon espace → Historique</strong>
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-3"
        >

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="py-4 font-semibold">
              <Link to="/tableau-de-bord">
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="py-4 font-semibold">
              <Link to="/signaler">
                <Zap className="mr-2 h-4 w-4" />
                Nouveau
              </Link>
            </Button>
          </div>

          <Button asChild variant="ghost" className="w-full py-4 font-semibold text-muted-foreground">
            <Link to="/">
              Retour à l'accueil
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Statut polling */}
        {reportId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-xs text-muted-foreground/60"
          >
            {pollError ? "Reconnexion en cours…" : "Mise à jour automatique"}
          </motion.p>
        )}
      </main>
    </div>
  );
};

export default ConfirmationPage;
