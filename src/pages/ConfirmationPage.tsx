import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Radio, Users, Share2, BarChart3, Zap, ArrowRight, MapPin, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import PushPromptBanner from "@/components/PushPromptBanner";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES } from "@/lib/communes";
import { useAuth } from "@/contexts/AuthContext";

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

  const communeData = COMMUNES.find((c) => c.nom === commune);
  const accentColor = communeData?.couleur || "#0ea5e9";

  useEffect(() => {
    if (!reportId) return;

    const fetchVerifications = async () => {
      const { data } = await supabase
        .from("reports")
        .select("verifications")
        .eq("id", reportId)
        .single();
      if (data !== null && data !== undefined) {
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
    };

    fetchVerifications();
    const interval = setInterval(fetchVerifications, POLL_INTERVAL);
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
  const shareLines = isOutage
    ? [
        `${typeEmoji} ALERTE COUPURE — ${locationLabel}`,
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
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-amber-200 p-8 text-center max-w-xs w-full shadow-2xl"
            >
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Award className="h-8 w-8 text-amber-500" />
                </div>
              </div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1">Badge d\u00e9bloqu\u00e9</p>
              <h2 className="font-display text-xl font-extrabold text-foreground mb-2">Premier Signalement !</h2>
              <p className="text-sm text-muted-foreground mb-6">
                F\u00e9licitations ! Vous venez de faire votre premier signalement citoyen. Continuez comme \u00e7a !
              </p>
              <Button onClick={() => setShowBadge(false)} className="w-full">
                Super !
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container max-w-md py-10 px-4">

        {/* Icône succès */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
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
          className="mb-8 text-center"
        >
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Signalement envoyé !
          </h1>
          <p className="mt-2 text-muted-foreground">
            {typeEmoji} <span className="font-semibold">{typeLabel}</span>
            {commune && (
              <> — <span className="font-semibold" style={{ color: accentColor }}>{commune}</span></>
            )}
          </p>
        </motion.div>

        {/* Voisins qui ont aussi signalé */}
        {neighborCount !== null && neighborCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/20"
          >
            <MapPin className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
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
            <Radio className={`h-3.5 w-3.5 ${pulse ? "animate-pulse" : ""}`} style={{ color: accentColor }} />
            Confirmations de vos voisins — Live
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={verifications}
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2, y: 10 }}
              transition={{ duration: 0.3 }}
              className="font-display text-6xl font-extrabold"
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
            <Button asChild className="w-full py-5 font-bold text-base gap-2" style={{ backgroundColor: accentColor }}>
              <Link to={`/signalement/${reportId}`}>
                📋 Consulter mon signalement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
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

        {/* Tip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          Le compteur se met à jour automatiquement toutes les 5 secondes.
        </motion.p>
      </main>
    </div>
  );
};

export default ConfirmationPage;
