import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, Loader2, History, Calendar, ArrowLeft, ChevronRight, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNE_COLORS } from "@/lib/communes";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import PhotoGallery from "@/components/PhotoGallery";
import DurationBadge from "@/components/DurationBadge";
import { toast } from "sonner";
import CitizenScore from "@/components/CitizenScore";

const FEEDBACK_KEY = "report_resolution_feedback";

interface HistoryReport {
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
  photo_url: string | null;
  photo_urls: string[] | null;
  repair_verifications: number | null;
  verifications: number;
}




const HistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [feedbacks, setFeedbacks] = useState<Record<string, "confirmed" | "contested">>(() => {
    try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? "{}"); } catch { return {}; }
  });

  const saveFeedback = (reportId: string, value: "confirmed" | "contested") => {
    const next = { ...feedbacks, [reportId]: value };
    setFeedbacks(next);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, start_time, resolved_at, photo_url, photo_urls, repair_verifications, verifications")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setReports(data);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);
  const totalActive = reports.filter((r) => r.status === "active").length;
  const totalResolved = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/profil")} aria-label="Retour à Mon espace">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                  <History className="h-6 w-6" /> Mon historique
                </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {reports.length} signalement{reports.length !== 1 ? "s" : ""} au total
              </p>
              </div>
            </div>
            <ShareButton
              title="Mon impact SIGNA-CI"
              text={`J'ai fait ${reports.length} signalement(s) de coupures sur SIGNA-CI ! 🔌💧`}
              url={window.location.origin}
            />
          </div>
        </motion.div>

        {/* Score citoyen */}
        {!loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">
            <CitizenScore />
          </motion.div>
        )}

        {/* Stats rapides */}
        {!loading && reports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-2xl font-extrabold text-foreground">{reports.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 p-3 text-center">
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{totalActive}</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-0.5">En cours</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10 p-3 text-center">
              <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{totalResolved}</p>
              <p className="text-[10px] text-green-700 dark:text-green-500 mt-0.5">R\u00e9solus</p>
            </div>
          </motion.div>
        )}

        {/* Filter tabs */}
        <div className="mb-4 flex gap-2">
          {[
            { key: "all" as const, label: `Tous (${reports.length})` },
            { key: "active" as const, label: `Actifs (${totalActive})` },
            { key: "resolved" as const, label: `Résolus (${totalResolved})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <History className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucun signalement trouvé.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r, i) => {
              const color = COMMUNE_COLORS[r.commune] || "#888";
              const isElec = r.service_type === "electricity";
              const isInfra = r.report_category === "infrastructure";
              const isResolved = r.status === "resolved";
              const infraLabel = isInfra ? extractInfraLabel(r.description) : null;
              const serviceIcon = isInfra
                ? <span className="text-base leading-none">{infraEmoji(infraLabel)}</span>
                : isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />;
              const serviceLabel = isInfra ? (infraLabel ?? "Infrastructure") : isElec ? "Électricité" : "Eau";

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: color }}>
                    <div className="flex items-center gap-2 text-white">
                      {serviceIcon}
                      <span className="text-sm font-bold">{serviceLabel}</span>
                    </div>
                    <Badge variant="outline" className={`text-white border-white/30 ${isResolved ? "bg-white/20" : "bg-white/10"}`}>
                      {isResolved ? "✅ Résolu" : "🔴 Actif"}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground text-sm">{r.commune}</span>
                      {r.quartier && <span className="text-xs text-muted-foreground">· {r.quartier}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{cleanDescription(r.description)}</p>

                    <PhotoGallery
                      photos={
                        (r.photo_urls && r.photo_urls.length > 0)
                          ? r.photo_urls
                          : r.photo_url ? [r.photo_url] : []
                      }
                      className="mb-3"
                      thumbHeight="h-32"
                    />

                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      <DurationBadge
                        status={r.status}
                        resolved_at={r.resolved_at}
                        start_time={r.start_time}
                        created_at={r.created_at}
                        repair_verifications={r.repair_verifications}
                        verifications={r.verifications}
                      />
                      {r.status === "active" && r.verifications === 0 && (Date.now() - new Date(r.created_at).getTime()) > 7 * 86400000 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                          ⚠ Non pris en charge
                        </span>
                      )}
                    </div>

                    {/* Feedback résolution */}
                    {isResolved && (() => {
                      const fb = feedbacks[r.id];
                      if (fb === "confirmed") return (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Résolution confirmée — merci !
                        </div>
                      );
                      if (fb === "contested") return (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Signalé comme toujours actif
                        </div>
                      );
                      return (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Le problème est-il vraiment résolu ?</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-green-500/40 text-green-700 hover:bg-green-500/10"
                              onClick={() => {
                                saveFeedback(r.id, "confirmed");
                                toast.success("Merci pour votre retour !");
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Oui, résolu
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-orange-500/40 text-orange-700 hover:bg-orange-500/10"
                              onClick={() => {
                                saveFeedback(r.id, "contested");
                                toast("Compris. Vous pouvez créer un nouveau signalement.", {
                                  action: {
                                    label: "Signaler",
                                    onClick: () => navigate(`/signaler?type=${r.service_type === "electricity" ? "electricity_outage" : "water_outage"}`),
                                  },
                                });
                              }}
                            >
                              <AlertTriangle className="h-3 w-3" /> Non, toujours actif
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Lien vers le détail */}
                    <Link
                      to={`/signalement/${r.id}`}
                      className="mt-2 flex items-center justify-end gap-1 text-xs text-primary hover:underline"
                    >
                      Voir le détail <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
