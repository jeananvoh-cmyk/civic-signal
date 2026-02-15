import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, Droplets, Loader2, History, Calendar, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COMMUNE_COLORS } from "@/lib/communes";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SignedImage from "@/components/SignedImage";

interface HistoryReport {
  id: string;
  service_type: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  start_time: string;
  resolved_at: string | null;
  photo_url: string | null;
}

function formatDuration(startStr: string, endStr: string): string {
  const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `${hours}h${remMins > 0 ? `${remMins}min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days}j ${hours % 24}h`;
}

const HistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, service_type, description, commune, quartier, status, urgency, created_at, start_time, resolved_at, photo_url")
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
              title="Mon impact SignalÉnergie"
              text={`J'ai fait ${reports.length} signalement(s) de coupures sur SignalÉnergie ! 🔌💧`}
              url={window.location.origin}
            />
          </div>
        </motion.div>

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
              const isResolved = r.status === "resolved";

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
                      {isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                      <span className="text-sm font-bold">{isElec ? "Électricité" : "Eau"}</span>
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
                    <p className="text-xs text-muted-foreground mb-3">{r.description}</p>

                    {r.photo_url && (
                      <SignedImage storagePath={r.photo_url} alt="Photo" className="w-full h-32 object-cover rounded-lg mb-3" />
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      {isResolved && r.resolved_at && (
                        <span className="flex items-center gap-1 text-success font-semibold">
                          <Clock className="h-3 w-3" />
                          Durée : {formatDuration(r.start_time, r.resolved_at)}
                        </span>
                      )}
                    </div>
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
