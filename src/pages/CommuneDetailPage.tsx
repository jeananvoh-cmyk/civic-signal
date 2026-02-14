import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Droplets, MapPin } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";

interface QuartierStat {
  quartier: string;
  electricite_actifs: number;
  electricite_resolus: number;
  electricite_total: number;
  eau_actifs: number;
  eau_resolus: number;
  eau_total: number;
}

const CommuneDetailPage = () => {
  const { communeName } = useParams<{ communeName: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuartierStat[]>([]);
  const [loading, setLoading] = useState(true);

  const decodedName = decodeURIComponent(communeName || "");
  const communeInfo = COMMUNES.find((c) => c.nom.toLowerCase() === decodedName.toLowerCase());
  const couleur = communeInfo?.couleur || "#888";
  const logo = COMMUNE_LOGOS[decodedName] || COMMUNE_LOGOS[communeInfo?.nom || ""];

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.rpc("get_commune_quartier_stats", {
        p_commune: decodedName,
      });
      if (!error && data) {
        setStats(data as unknown as QuartierStat[]);
      }
      setLoading(false);
    };
    fetch();
  }, [decodedName]);

  const totalElecActifs = stats.reduce((s, q) => s + q.electricite_actifs, 0);
  const totalEauActifs = stats.reduce((s, q) => s + q.eau_actifs, 0);
  const totalElecTotal = stats.reduce((s, q) => s + q.electricite_total, 0);
  const totalEauTotal = stats.reduce((s, q) => s + q.eau_total, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-3xl">
        {/* Back + Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tableau-de-bord")} className="mb-3 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour au dashboard
          </Button>

          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl overflow-hidden shadow-md"
              style={{ backgroundColor: couleur }}
            >
              {logo ? (
                <img src={logo} alt={decodedName} className="h-full w-full object-cover" />
              ) : (
                <MapPin className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{decodedName}</h1>
              {communeInfo && (
                <p className="text-sm text-muted-foreground">
                  {(communeInfo.population / 1000).toFixed(0)}k habitants
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Summary pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-2 gap-3"
        >
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-display text-xl font-extrabold text-amber-500">{loading ? "..." : totalElecActifs}</p>
              <p className="text-xs text-muted-foreground">
                coupure{totalElecActifs !== 1 ? "s" : ""} élec. active{totalElecActifs !== 1 ? "s" : ""} · {totalElecTotal} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
              <Droplets className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-display text-xl font-extrabold text-blue-500">{loading ? "..." : totalEauActifs}</p>
              <p className="text-xs text-muted-foreground">
                coupure{totalEauActifs !== 1 ? "s" : ""} eau active{totalEauActifs !== 1 ? "s" : ""} · {totalEauTotal} total
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quartier list */}
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Coupures par quartier</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : stats.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucun signalement enregistré pour cette commune.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {stats.map((q, i) => {
              const totalActifs = q.electricite_actifs + q.eau_actifs;
              return (
                <motion.div
                  key={q.quartier}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: totalActifs > 0 ? couleur : "hsl(var(--muted-foreground))" }} />
                      <span className="font-semibold text-foreground">{q.quartier}</span>
                    </div>
                    {totalActifs > 0 && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: couleur }}
                      >
                        {totalActifs} active{totalActifs !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Electricity */}
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 px-3 py-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-amber-500 text-sm">{q.electricite_actifs}</span>
                        <span className="text-[10px] text-muted-foreground">actif{q.electricite_actifs !== 1 ? "s" : ""}</span>
                        <span className="text-muted-foreground/40 text-[10px]">·</span>
                        <span className="font-semibold text-emerald-500 text-xs">{q.electricite_resolus}</span>
                        <span className="text-[10px] text-muted-foreground">résolu{q.electricite_resolus !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    {/* Water */}
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 px-3 py-2">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-blue-500 text-sm">{q.eau_actifs}</span>
                        <span className="text-[10px] text-muted-foreground">actif{q.eau_actifs !== 1 ? "s" : ""}</span>
                        <span className="text-muted-foreground/40 text-[10px]">·</span>
                        <span className="font-semibold text-emerald-500 text-xs">{q.eau_resolus}</span>
                        <span className="text-[10px] text-muted-foreground">résolu{q.eau_resolus !== 1 ? "s" : ""}</span>
                      </div>
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

export default CommuneDetailPage;
