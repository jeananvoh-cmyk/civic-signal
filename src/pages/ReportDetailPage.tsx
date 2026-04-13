import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, Droplets, MapPin, Calendar, CheckCircle2,
  Clock, Users, AlertTriangle, ExternalLink, Loader2, Shield, ThumbsUp,
  LogIn, UserPlus, Wrench, PartyPopper, Radio,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PhotoGallery from "@/components/PhotoGallery";
import DurationBadge from "@/components/DurationBadge";
import ShareButton from "@/components/ShareButton";
import ReportComments from "@/components/ReportComments";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";
import { usePageMeta } from "@/hooks/usePageMeta";

interface ReportDetail {
  id: string;
  user_id: string;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  start_time: string;
  resolved_at: string | null;
  validated: boolean;
  validated_at: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  verifications: number;
  repair_verifications: number | null;
  impacted_people: number;
  babies: number;
  pregnant: number;
  elderly: number;
  latitude: number | null;
  longitude: number | null;
}

const SERVICE_LABELS: Record<string, string> = {
  electricity: "Électricité",
  water: "Eau",
  infrastructure: "Infrastructure",
};

const URGENCY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Modérée",
  high: "Élevée",
  critical: "Critique",
};

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-green-500/10 text-green-700 border-green-500/30",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  high: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  critical: "bg-red-500/10 text-red-700 border-red-500/30",
};

const TimelineStep = ({
  done, label, date, icon,
}: {
  done: boolean; label: string; date?: string | null; icon: React.ReactNode;
}) => (
  <div className={`flex items-start gap-3 ${done ? "opacity-100" : "opacity-30"}`}>
    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
      done ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground"
    }`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {date && <p className="text-xs text-muted-foreground">{new Date(date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>}
      {!date && done && <p className="text-xs text-muted-foreground">–</p>}
    </div>
  </div>
);

const ReportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [corroborating, setCorroborating] = useState(false);
  const [corroborated, setCorroborated] = useState(false);

  const isElecMeta = report?.service_type === "electricity";
  const isInfraMeta = report?.report_category === "infrastructure";
  const metaDesc = report
    ? isInfraMeta
      ? `Problème d'infrastructure signalé à ${report.quartier || report.commune} — ${report.description.slice(0, 100)}`
      : `Coupure de ${isElecMeta ? "courant" : "eau"} signalée à ${report.quartier || ""} ${report.commune}. ${report.verifications} confirmation(s).`
    : "Détail d'un signalement citoyen sur SIGNA-CI.";

  usePageMeta({
    title: report
      ? isInfraMeta
        ? `Infrastructure — ${report.commune}`
        : `Coupure ${isElecMeta ? "électricité" : "eau"} — ${report.commune}`
      : "Signalement SIGNA-CI",
    description: metaDesc,
  });

  useEffect(() => {
    if (!id) return;
    supabase
      .from("reports")
      .select("id, user_id, service_type, report_category, description, commune, quartier, status, urgency, created_at, start_time, resolved_at, validated, validated_at, photo_url, photo_urls, verifications, repair_verifications, impacted_people, babies, pregnant, elderly, latitude, longitude")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setReport(data as ReportDetail);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-4">Signalement introuvable.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>
    );
  }

  const color = COMMUNE_COLORS[report.commune] || "#888";
  const isElec = report.service_type === "electricity";
  const isResolved = report.status === "resolved";
  const isInfra = report.report_category === "infrastructure";
  const hasVulnerable = report.babies > 0 || report.pregnant > 0 || report.elderly > 0;
  const isAuthor = user?.id === report.user_id;
  const canCorroborate = user && !isAuthor && !isResolved;

  // Durée de résolution lisible
  const resolutionDuration = (() => {
    if (!isResolved || !report.resolved_at) return null;
    const from = new Date(report.start_time || report.created_at);
    const to = new Date(report.resolved_at);
    const diffH = Math.round((to.getTime() - from.getTime()) / 3600000);
    if (diffH < 1) return "moins d'1 heure";
    if (diffH < 24) return `${diffH}h`;
    return `${Math.round(diffH / 24)} jour${Math.round(diffH / 24) > 1 ? "s" : ""}`;
  })();

  // Textes adaptés outage vs infrastructure
  const corroborateLabel = isInfra
    ? "Je soutiens cette demande"
    : "Je confirme cette coupure";
  const corroboratedLabel = isInfra ? "Soutien enregistré ✓" : "Confirmation enregistrée ✓";
  const shareText = isInfra
    ? `🚧 INFRASTRUCTURE — ${report.quartier ? `${report.quartier}, ` : ""}${report.commune}\n\n${report.description}\n\n✊ Soutenez cette demande sur SIGNA-CI :`
    : `${isElec ? "⚡" : "💧"} ALERTE COUPURE — ${report.quartier ? `${report.quartier}, ` : ""}${report.commune}\n\nCoupure ${isElec ? "d'électricité" : "d'eau"} en cours. Toujours sans intervention.\n📢 Rejoignez-nous sur SIGNA-CI pour faire pression sur ${isElec ? "CIE" : "SODECI"}.\nPlus on est nombreux, plus vite ils interviennent !`;

  const handleCorroborate = async () => {
    if (!user) { toast.error("Connectez-vous pour confirmer ce signalement"); return; }
    setCorroborating(true);
    try {
      const { error } = await supabase.rpc("corroborate_report", { p_report_id: report.id });
      if (error) throw error;
      setCorroborated(true);
      setReport((prev) => prev ? { ...prev, verifications: prev.verifications + 1 } : prev);
      toast.success("✅ Confirmation enregistrée — merci !");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("déjà confirmé")) toast.info("Vous avez déjà confirmé ce signalement.");
      else toast.error("Impossible de confirmer pour le moment.");
    } finally {
      setCorroborating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Colour bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <main className="container max-w-lg py-6 space-y-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        {/* ── Bannière RÉSOLU ── */}
        <AnimatePresence>
          {isResolved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/8 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <PartyPopper className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">
                    {isInfra ? "Problème résolu !" : "Coupure terminée !"}
                  </p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                    {isInfra
                      ? "Ce problème d'infrastructure a été pris en charge."
                      : `Le service ${isElec ? "électrique" : "en eau"} a été rétabli${resolutionDuration ? ` en ${resolutionDuration}` : ""}.`}
                  </p>
                  {report.verifications > 0 && (
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-1">
                      Merci aux <strong>{report.verifications} voisin{report.verifications > 1 ? "s" : ""}</strong> qui ont confirmé ce signalement.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-500/20">
                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60 mb-2">
                  {isInfra ? "Un autre problème dans votre quartier ?" : "Un nouveau problème dans votre quartier ?"}
                </p>
                <Button asChild size="sm" variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5">
                  <Link to="/signaler">
                    {isInfra ? <Wrench className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                    {isInfra ? "Signaler un problème" : "Signaler une coupure"}
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bannière ACTIF — rappel live ── */}
        {!isResolved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5"
          >
            <Radio className="h-4 w-4 text-red-500 animate-pulse shrink-0" />
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              {isInfra
                ? "Problème toujours présent · En attente d'intervention"
                : `Coupure de ${isElec ? "courant" : "d'eau"} en cours · Toujours sans intervention`}
            </p>
          </motion.div>
        )}

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
        >
          {/* Commune banner */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: color }}>
            <div className="flex items-center gap-2 text-white">
              {isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
              <span className="text-sm font-bold">{SERVICE_LABELS[report.service_type] ?? report.service_type}</span>
            </div>
            <Badge variant="outline" className={`text-white border-white/30 ${isResolved ? "bg-white/20" : "bg-white/10"}`}>
              {isResolved ? "✅ Résolu" : "🔴 Actif"}
            </Badge>
          </div>

          <div className="p-4 space-y-3">
            {/* Commune + quartier */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground">{report.commune}</span>
              {report.quartier && <span className="text-sm text-muted-foreground">· {report.quartier}</span>}
            </div>

            {/* Description */}
            <p className="text-sm text-foreground leading-relaxed">{report.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={URGENCY_COLORS[report.urgency] ?? ""}>
                Urgence {URGENCY_LABELS[report.urgency] ?? report.urgency}
              </Badge>
              {report.validated && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <Shield className="h-3 w-3 mr-1" /> Validé
                </Badge>
              )}
            </div>

            {/* Galerie photos */}
            <PhotoGallery
              photos={
                (report.photo_urls && report.photo_urls.length > 0)
                  ? report.photo_urls
                  : report.photo_url ? [report.photo_url] : []
              }
              thumbHeight="h-48"
            />

            {/* Stats row */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-3">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(report.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {report.verifications} confirmation{report.verifications !== 1 ? "s" : ""}
              </span>
              {report.impacted_people > 1 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  ~{report.impacted_people} personnes
                </span>
              )}
              <DurationBadge
                status={report.status}
                resolved_at={report.resolved_at}
                start_time={report.start_time}
                created_at={report.created_at}
                repair_verifications={report.repair_verifications}
                verifications={report.verifications}
              />
            </div>

            {/* Personnes vulnérables */}
            {hasVulnerable && (
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2 text-xs text-orange-700 dark:text-orange-300 space-y-0.5">
                <p className="font-semibold">Personnes vulnérables signalées</p>
                <div className="flex gap-3 flex-wrap">
                  {report.babies > 0 && <span>👶 {report.babies} bébé{report.babies > 1 ? "s" : ""}</span>}
                  {report.pregnant > 0 && <span>🤰 {report.pregnant} femme{report.pregnant > 1 ? "s" : ""} enceinte{report.pregnant > 1 ? "s" : ""}</span>}
                  {report.elderly > 0 && <span>👴 {report.elderly} personne{report.elderly > 1 ? "s" : ""} âgée{report.elderly > 1 ? "s" : ""}</span>}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card shadow-card p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Suivi du signalement</h3>
          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
            <TimelineStep
              done
              label="Signalement créé"
              date={report.created_at}
              icon={<Clock className="h-3.5 w-3.5" />}
            />
            <TimelineStep
              done={report.validated}
              label={report.validated ? "Validé par les modérateurs" : "En attente de validation"}
              date={report.validated_at}
              icon={<Shield className="h-3.5 w-3.5" />}
            />
            <TimelineStep
              done={report.verifications >= 3}
              label={`${report.verifications} voisin${report.verifications !== 1 ? "s" : ""} ont confirmé`}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <TimelineStep
              done={isResolved}
              label={isResolved ? "Problème résolu" : "En cours de traitement"}
              date={report.resolved_at}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            />
          </div>
        </motion.div>

        {/* ── Bouton corroborer — utilisateur connecté non-auteur ── */}
        {canCorroborate && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
            <Button
              onClick={handleCorroborate}
              disabled={corroborating || corroborated}
              className="w-full gap-2 py-5 text-sm font-bold"
            >
              {corroborating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              {corroborated ? corroboratedLabel : corroborateLabel}
            </Button>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              {isInfra
                ? "Votre soutien renforce la demande auprès des autorités"
                : "Votre confirmation augmente la priorité de traitement"}
            </p>
          </motion.div>
        )}

        {/* ── CTA conversion — visiteur non connecté ── */}
        {!user && !isResolved && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4"
          >
            <div className="text-center space-y-1">
              <p className="text-lg font-extrabold text-foreground">
                {isInfra ? "🚧 Vous voyez aussi ce problème ?" : `${isElec ? "⚡" : "💧"} Vous subissez aussi cette coupure ?`}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isInfra
                  ? "Rejoignez SIGNA-CI et soutenez cette demande. Plus on est nombreux, plus les autorités agissent vite."
                  : `Rejoignez SIGNA-CI et confirmez cette coupure. Ensemble, on oblige ${isElec ? "CIE" : "SODECI"} à intervenir plus vite.`}
              </p>
            </div>

            {/* Bénéfices rapides */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: "✅", text: isInfra ? "Soutenir" : "Confirmer" },
                { icon: "🔔", text: "Être alerté" },
                { icon: "📊", text: "Suivre" },
              ].map((b) => (
                <div key={b.text} className="rounded-xl bg-background/60 border border-border px-2 py-2">
                  <p className="text-xl">{b.icon}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{b.text}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Button asChild className="w-full gap-2 font-bold py-4">
                <Link to={`/auth?redirect=/signalement/${report.id}&action=signup`}>
                  <UserPlus className="h-4 w-4" />
                  Créer mon compte — c'est gratuit
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full gap-2 text-sm">
                <Link to={`/auth?redirect=/signalement/${report.id}&action=login`}>
                  <LogIn className="h-4 w-4" />
                  J'ai déjà un compte — Se connecter
                </Link>
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              Inscription en 30 secondes · Aucune publicité · Données protégées
            </p>
          </motion.div>
        )}

        {/* ── CTA visiteur — signalement résolu ── */}
        {!user && isResolved && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card p-5 text-center space-y-3"
          >
            <p className="text-sm font-semibold text-foreground">
              {isInfra
                ? "Un autre problème dans votre quartier ?"
                : "Un autre problème chez vous ?"}
            </p>
            <p className="text-xs text-muted-foreground">
              Rejoignez SIGNA-CI pour signaler, suivre et être alerté des coupures et problèmes d'infrastructure à Abidjan.
            </p>
            <div className="flex gap-2">
              <Button asChild className="flex-1 gap-1.5 text-sm font-bold">
                <Link to={`/auth?redirect=/signaler&action=signup`}>
                  <UserPlus className="h-4 w-4" /> S'inscrire
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 gap-1.5 text-sm">
                <Link to={`/auth?action=login`}>
                  <LogIn className="h-4 w-4" /> Se connecter
                </Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── CTA auteur — son propre signalement ── */}
        {user && isAuthor && !isResolved && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="rounded-xl border border-border bg-secondary/40 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">C'est votre signalement</p>
              <p className="text-[10px] text-muted-foreground">Partagez-le pour obtenir plus de confirmations</p>
            </div>
            <Link to="/verification">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Mettre à jour
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Actions + Partage */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex gap-2 flex-wrap"
        >
          <Button asChild variant="outline" className="flex-1 gap-2 min-w-[120px]">
            <Link to={`/commune/${encodeURIComponent(report.commune)}`}>
              <ExternalLink className="h-4 w-4" />
              {report.commune}
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 gap-2 min-w-[120px]">
            <Link to="/carte">
              <MapPin className="h-4 w-4" />
              Carte
            </Link>
          </Button>
          <ShareButton
            title={`Signalement SIGNA-CI — ${report.commune}`}
            text={shareText}
            url={`${window.location.origin}/signalement/${report.id}`}
            variant="outline"
            size="sm"
            className="flex-1 min-w-[120px]"
          />
        </motion.div>

        {/* Commentaires */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          <ReportComments reportId={report.id} />
        </motion.div>
      </main>
    </div>
  );
};

export default ReportDetailPage;
