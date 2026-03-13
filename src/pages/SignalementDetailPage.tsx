import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Users, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import SignedImage from "@/components/SignedImage";
import PriorityBadge from "@/components/PriorityBadge";
import { calculatePriority, getNormReference } from "@/lib/priority-score";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

const NEGLECTED_DAYS = 7;

interface ReportDetail {
  id: string;
  status: string;
  urgency: string;
  service_type: string;
  report_category: string | null;
  description: string;
  commune: string | null;
  quartier: string | null;
  location: string | null;
  created_at: string;
  start_time: string | null;
  resolved_at: string | null;
  verifications: number;
  validated: boolean | null;
  impacted_people: number | null;
  photo_url: string | null;
}

type ComputedStatus = "nouveau" | "en_cours" | "resolu" | "non_pris";

function getComputedStatus(report: ReportDetail): ComputedStatus {
  if (report.status === "resolved") return "resolu";
  const ageDays = (Date.now() - new Date(report.created_at).getTime()) / 86400000;
  if ((report.verifications ?? 0) > 0) return "en_cours";
  if (ageDays > NEGLECTED_DAYS) return "non_pris";
  return "nouveau";
}

const STATUS_META: Record<ComputedStatus, { label: string; emoji: string; pill: string }> = {
  nouveau: {
    label: "Nouveau",
    emoji: "🔴",
    pill: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800",
  },
  en_cours: {
    label: "En cours",
    emoji: "🟡",
    pill: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
  },
  resolu: {
    label: "Résolu",
    emoji: "🟢",
    pill: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800",
  },
  non_pris: {
    label: "Non pris en charge",
    emoji: "⚫",
    pill: "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700",
  },
};

function getTypeEmoji(serviceType: string, reportCategory: string | null): string {
  if (serviceType === "electricity") return reportCategory === "infrastructure" ? "💡" : "⚡";
  if (serviceType === "water") return reportCategory === "infrastructure" ? "🚧" : "💧";
  return "📍";
}

function getTypeLabel(serviceType: string, reportCategory: string | null): string {
  if (serviceType === "electricity") {
    return reportCategory === "infrastructure" ? "Infrastructure électrique" : "Coupure d'électricité";
  }
  if (serviceType === "water") {
    return reportCategory === "infrastructure" ? "Problème d'infrastructure" : "Coupure d'eau";
  }
  return "Signalement";
}

const SignalementDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["signalement-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, status, urgency, service_type, report_category, description, commune, quartier, location, created_at, start_time, resolved_at, verifications, validated, impacted_people, photo_url")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as ReportDetail;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-lg py-12 px-4 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="font-display text-xl font-bold mb-2">Signalement introuvable</h1>
          <p className="text-muted-foreground mb-6">Ce signalement n'existe pas ou a été supprimé.</p>
          <Button asChild variant="outline">
            <Link to="/suivi">← Voir tous les signalements</Link>
          </Button>
        </main>
      </div>
    );
  }

  const computedStatus = getComputedStatus(report);
  const meta = STATUS_META[computedStatus];
  const daysSince = Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000);
  const communeLabel = report.commune || report.location || "Inconnu";
  const locationLabel = `${communeLabel}${report.quartier ? `, ${report.quartier}` : ""}`;
  const typeEmoji = getTypeEmoji(report.service_type, report.report_category);
  const typeLabel = getTypeLabel(report.service_type, report.report_category);

  const shareUrl = `${window.location.origin}/signalement/${report.id}`;
  const daysText = report.status !== "resolved" && daysSince > 0
    ? `, signalé il y a ${daysSince} jour${daysSince > 1 ? "s" : ""} sans intervention !`
    : "";
  const verifText = (report.verifications ?? 0) > 0
    ? `\n👥 ${report.verifications} voisin${report.verifications > 1 ? "s" : ""} ont confirmé.`
    : "";
  const shareText = `${typeEmoji} ${report.description} — ${locationLabel}${daysText}${verifText}\n\nAidez à faire bouger les choses sur CivicSignal :`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg py-8 px-4">
        {/* Retour */}
        <Link
          to="/suivi"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au suivi
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* En-tête type */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{typeEmoji}</span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{typeLabel}</p>
              <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 mt-1 ${meta.pill}`}>
                {meta.emoji} {meta.label}
              </span>
            </div>
          </div>

          {/* Compteur jours — critique */}
          {report.status !== "resolved" && daysSince >= 7 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Sans intervention depuis</p>
                <p className="font-display text-3xl font-extrabold text-destructive leading-none mt-0.5">
                  {daysSince} jours
                </p>
              </div>
              <span className="text-4xl opacity-50">⏰</span>
            </motion.div>
          )}

          {/* Compteur jours — avertissement */}
          {report.status !== "resolved" && daysSince >= 3 && daysSince < 7 && (
            <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{daysSince} jours sans réponse</p>
            </div>
          )}

          {/* Détails */}
          <Card className="mb-4">
            <CardContent className="p-5 space-y-4">
              <p className="text-base font-semibold text-foreground leading-snug">{report.description}</p>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground border-t border-border pt-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {locationLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 shrink-0" />
                  Signalé le{" "}
                  {new Date(report.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {(report.verifications ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="font-semibold text-foreground">{report.verifications} voisin{report.verifications > 1 ? "s" : ""}</span>
                    {" "}ont confirmé ce problème
                  </span>
                )}
                {report.impacted_people && report.impacted_people > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span>👥</span>
                    <span className="font-semibold text-foreground">{report.impacted_people} personne{report.impacted_people > 1 ? "s" : ""}</span>
                    {" "}impactée{report.impacted_people > 1 ? "s" : ""}
                  </span>
                )}
                {report.status === "resolved" && report.resolved_at && (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Résolu le{" "}
                    {new Date(report.resolved_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photo */}
          {report.photo_url && (
            <Card className="mb-4 overflow-hidden">
              <SignedImage
                storagePath={report.photo_url}
                alt="Photo du signalement"
                className="w-full max-h-72 object-cover"
              />
            </Card>
          )}

          {/* Partage */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Partagez pour faire pression sur les autorités
            </p>
            <ShareButton
              title={`${typeEmoji} Signalement — ${locationLabel}`}
              text={shareText}
              url={shareUrl}
              className="w-full justify-center"
              variant="default"
              size="default"
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default SignalementDetailPage;
