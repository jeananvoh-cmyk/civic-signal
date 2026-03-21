import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Zap, Droplets, MapPin, Calendar, CheckCircle2,
  Clock, Users, AlertTriangle, ExternalLink, Loader2, Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import SignedImage from "@/components/SignedImage";
import DurationBadge from "@/components/DurationBadge";
import ShareButton from "@/components/ShareButton";
import ReportComments from "@/components/ReportComments";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";
import { usePageMeta } from "@/hooks/usePageMeta";

interface ReportDetail {
  id: string;
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
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageMeta({
    title: report
      ? `${report.report_category} — ${report.commune}`
      : "Signalement",
    description: report
      ? `Coupure de ${report.service_type === "electricity" ? "courant" : "eau"} signalée à ${report.quartier}, ${report.commune}. Urgence : ${report.urgency}.`
      : "Détail d'un signalement citoyen sur SIGNA-CI.",
  });

  useEffect(() => {
    if (!id) return;
    supabase
      .from("reports")
      .select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, start_time, resolved_at, validated, validated_at, photo_url, verifications, repair_verifications, impacted_people, babies, pregnant, elderly, latitude, longitude")
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
  const hasVulnerable = report.babies > 0 || report.pregnant > 0 || report.elderly > 0;

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

            {/* Photo */}
            {report.photo_url && (
              <SignedImage
                storagePath={report.photo_url}
                alt="Photo du signalement"
                className="w-full h-48 object-cover rounded-xl"
              />
            )}

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

        {/* Actions + Partage */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
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
            text={`${isElec ? "⚡" : "💧"} ${report.description} — ${report.commune}, ${report.quartier}`}
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
