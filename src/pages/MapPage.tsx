import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CommuneServiceStat {
  commune: string;
  couleur: string;
  population: number;
  electricite_actifs: number;
  electricite_resolus: number;
  electricite_total: number;
  eau_actifs: number;
  eau_resolus: number;
  eau_total: number;
  electricite_verified: number;
  eau_verified: number;
  mairie_actifs: number;
  mairie_resolus: number;
  mairie_total: number;
  mairie_verified: number;
}

type ServiceFilter = "all" | "electricity" | "water" | "mairie";

const MapPage = () => {
  const [searchParams] = useSearchParams();
  const initialFilter = (searchParams.get("service") as ServiceFilter) || "all";

  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ServiceFilter>(initialFilter);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_commune_service_stats");
      if (!error && data) setStats(data as unknown as CommuneServiceStat[]);
      setLoading(false);
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current).setView([5.36, -4.01], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || loading) return;
    const map = mapInstance.current;
    map.eachLayer((layer) => { if (!(layer instanceof L.TileLayer)) map.removeLayer(layer); });

    COMMUNES.forEach((c) => {
      L.circle([c.centerLat, c.centerLon], {
        radius: c.rayonM, color: c.couleur, fillColor: c.couleur, fillOpacity: 0.10, weight: 2,
      }).addTo(map).bindPopup(`<strong>${c.nom}</strong><br/>${(c.population / 1000).toFixed(0)}k habitants`);

      const s = stats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
      
      let actifs = 0, resolus = 0, total = 0, verified = 0;
      if (s) {
        if (filter === "electricity") {
          actifs = s.electricite_actifs; resolus = s.electricite_resolus; total = s.electricite_total; verified = s.electricite_verified;
        } else if (filter === "water") {
          actifs = s.eau_actifs; resolus = s.eau_resolus; total = s.eau_total; verified = s.eau_verified;
        } else if (filter === "mairie") {
          actifs = s.mairie_actifs; resolus = s.mairie_resolus; total = s.mairie_total; verified = s.mairie_verified;
        } else {
          actifs = s.electricite_actifs + s.eau_actifs + s.mairie_actifs;
          resolus = s.electricite_resolus + s.eau_resolus + s.mairie_resolus;
          total = s.electricite_total + s.eau_total + s.mairie_total;
          verified = s.electricite_verified + s.eau_verified + s.mairie_verified;
        }
      }

      const hasVerified = verified > 0;
      const verifiedPercent = actifs > 0 ? Math.round((verified / actifs) * 100) : 0;

      // Build marker HTML based on filter
      let markerHtml = '';
      const markerSize = actifs > 0 ? 52 : 36;

      if (filter === "all" && s && (s.electricite_actifs > 0 || s.eau_actifs > 0)) {
        // Split marker showing both service types
        const elecActive = s.electricite_actifs;
        const eauActive = s.eau_actifs;
        markerHtml = `<div style="
          position:relative;display:flex;align-items:center;gap:2px;
        ">
          <div style="
            background:#f59e0b;color:white;
            width:${markerSize / 2 + 2}px;height:${markerSize}px;
            border-radius:${markerSize / 2}px 0 0 ${markerSize / 2}px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            border:${hasVerified ? '2px solid #22c55e' : '2px solid white'};border-right:1px solid rgba(255,255,255,0.3);
            font-size:11px;font-weight:bold;
            box-shadow:${hasVerified ? '0 0 10px rgba(34,197,94,0.5)' : '0 2px 8px rgba(0,0,0,.3)'};
          "><span style="font-size:10px">⚡</span>${elecActive}</div>
          <div style="
            background:#3b82f6;color:white;
            width:${markerSize / 2 + 2}px;height:${markerSize}px;
            border-radius:0 ${markerSize / 2}px ${markerSize / 2}px 0;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            border:${hasVerified ? '2px solid #22c55e' : '2px solid white'};border-left:none;
            font-size:11px;font-weight:bold;
            box-shadow:${hasVerified ? '0 0 10px rgba(34,197,94,0.5)' : '0 2px 8px rgba(0,0,0,.3)'};
          "><span style="font-size:10px">💧</span>${eauActive}</div>
          ${hasVerified ? `<span style="
            position:absolute;top:-6px;right:-6px;
            background:linear-gradient(135deg,#22c55e,#16a34a);color:white;
            width:18px;height:18px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:9px;border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,.3);
          ">✓</span>` : ''}
        </div>`;
      } else {
        // Single service marker
        const filterEmoji = filter === "electricity" ? "⚡" : filter === "water" ? "💧" : filter === "mairie" ? "🏗️" : "";
        const bgColor = filter === "electricity" ? "#f59e0b" : filter === "water" ? "#3b82f6" : filter === "mairie" ? "#10b981" : c.couleur;
        markerHtml = `<div style="
          position:relative;
          background:${bgColor};color:white;
          width:${markerSize}px;height:${markerSize}px;
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          border:${hasVerified ? '3px solid #22c55e' : '3px solid white'};
          box-shadow:${hasVerified ? '0 0 12px rgba(34,197,94,0.6), 0 2px 10px rgba(0,0,0,.35)' : '0 2px 10px rgba(0,0,0,.35)'};
          font-size:${actifs > 0 ? 15 : 13}px;font-weight:bold;
        ">${filterEmoji}${actifs > 0 ? actifs : '·'}${hasVerified ? `<span style="
          position:absolute;top:-6px;right:-6px;
          background:linear-gradient(135deg,#22c55e,#16a34a);color:white;
          width:20px;height:20px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:10px;border:2px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,.3);
        ">✓</span>` : ''}</div>`;
      }

      const countIcon = L.divIcon({
        className: "",
        html: markerHtml,
        iconSize: [filter === "all" && s && (s.electricite_actifs > 0 || s.eau_actifs > 0) ? markerSize + 6 : markerSize, markerSize],
        iconAnchor: [filter === "all" && s && (s.electricite_actifs > 0 || s.eau_actifs > 0) ? (markerSize + 6) / 2 : markerSize / 2, markerSize / 2],
      });

      const serviceLabel = filter === "electricity" ? "Électricité" : filter === "water" ? "Eau" : filter === "mairie" ? "Mairie" : "Tous services";
      // Build verified HTML per service
      let verifiedHtml = '';
      if (filter === "all" && s) {
        const elecPercent = s.electricite_actifs > 0 ? Math.round((s.electricite_verified / s.electricite_actifs) * 100) : 0;
        const eauPercent = s.eau_actifs > 0 ? Math.round((s.eau_verified / s.eau_actifs) * 100) : 0;
        const mairiePercent = s.mairie_actifs > 0 ? Math.round((s.mairie_verified / s.mairie_actifs) * 100) : 0;
        if (s.electricite_verified > 0 || s.eau_verified > 0 || s.mairie_verified > 0) {
          verifiedHtml = `<div style="margin-top:6px;padding:5px 8px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:8px;text-align:center">
            <span style="font-size:11px;color:#16a34a;font-weight:700">✓ Confirmé par les voisins</span>
            <div style="display:flex;gap:6px;margin-top:4px;justify-content:center;flex-wrap:wrap;">
              ${s.electricite_verified > 0 ? `<span style="padding:2px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:11px;font-weight:600;color:#d97706">⚡ ${elecPercent}%</span>` : ''}
              ${s.eau_verified > 0 ? `<span style="padding:2px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:11px;font-weight:600;color:#2563eb">💧 ${eauPercent}%</span>` : ''}
              ${s.mairie_verified > 0 ? `<span style="padding:2px 8px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;font-size:11px;font-weight:600;color:#059669">🏗️ ${mairiePercent}%</span>` : ''}
            </div>
          </div>`;
        }
      } else if (hasVerified) {
        verifiedHtml = `<div style="margin-top:6px;padding:5px 10px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:8px;text-align:center">
          <span style="font-size:13px;color:#16a34a;font-weight:700">✓ Confirmé à ${verifiedPercent}%</span>
          <br/><span style="font-size:10px;color:#15803d">par les voisins de la zone</span>
        </div>`;
      }

      // Build service breakdown for "all" filter popup
      const serviceBreakdownHtml = filter === "all" && s
        ? `<div style="margin-top:6px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
            <div style="flex:1;min-width:30%;padding:4px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;text-align:center">
              <span style="font-size:12px">⚡</span><br/>
              <span style="font-size:13px;font-weight:bold;color:#d97706">${s.electricite_actifs}</span>
            </div>
            <div style="flex:1;min-width:30%;padding:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;text-align:center">
              <span style="font-size:12px">💧</span><br/>
              <span style="font-size:13px;font-weight:bold;color:#2563eb">${s.eau_actifs}</span>
            </div>
            <div style="flex:1;min-width:30%;padding:4px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;text-align:center">
              <span style="font-size:12px">🏗️</span><br/>
              <span style="font-size:13px;font-weight:bold;color:#059669">${s.mairie_actifs}</span>
            </div>
          </div>`
        : '';

      L.marker([c.centerLat, c.centerLon], { icon: countIcon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:180px;text-align:center">
            <strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/>
            <span style="font-size:11px;color:#666">${serviceLabel}</span><br/>
            <span style="font-size:22px;font-weight:bold">${total}</span>
            <span style="font-size:11px;color:#666"> signalement${total > 1 ? "s" : ""}</span><br/>
            <span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? "s" : ""} · ✅ ${resolus} résolu${resolus > 1 ? "s" : ""}</span>
            ${serviceBreakdownHtml}
            ${verifiedHtml}
          </div>`
        );
    });
  }, [stats, loading, filter]);

  const getFilteredTotals = () => {
    const elecActifs = stats.reduce((s, c) => s + c.electricite_actifs, 0);
    const eauActifs = stats.reduce((s, c) => s + c.eau_actifs, 0);
    const mairieActifs = stats.reduce((s, c) => s + c.mairie_actifs, 0);
    const elecVerified = stats.reduce((s, c) => s + c.electricite_verified, 0);
    const eauVerified = stats.reduce((s, c) => s + c.eau_verified, 0);
    const mairieVerified = stats.reduce((s, c) => s + c.mairie_verified, 0);

    if (filter === "electricity") {
      return { total: stats.reduce((s, c) => s + c.electricite_total, 0), actifs: elecActifs, verified: elecVerified, elecActifs, eauActifs, mairieActifs, elecVerified, eauVerified, mairieVerified };
    } else if (filter === "water") {
      return { total: stats.reduce((s, c) => s + c.eau_total, 0), actifs: eauActifs, verified: eauVerified, elecActifs, eauActifs, mairieActifs, elecVerified, eauVerified, mairieVerified };
    } else if (filter === "mairie") {
      return { total: stats.reduce((s, c) => s + c.mairie_total, 0), actifs: mairieActifs, verified: mairieVerified, elecActifs, eauActifs, mairieActifs, elecVerified, eauVerified, mairieVerified };
    }
    return {
      total: stats.reduce((s, c) => s + c.electricite_total + c.eau_total + c.mairie_total, 0),
      actifs: elecActifs + eauActifs + mairieActifs,
      verified: elecVerified + eauVerified + mairieVerified,
      elecActifs, eauActifs, mairieActifs, elecVerified, eauVerified, mairieVerified,
    };
  };
  const { total: totalSignalements, actifs: totalActifs, verified: totalVerified, elecActifs: totalElecActifs, eauActifs: totalEauActifs, mairieActifs: totalMairieActifs, elecVerified: totalElecVerified, eauVerified: totalEauVerified, mairieVerified: totalMairieVerified } = getFilteredTotals();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground uppercase tracking-tight">Cartographie en live des coupures d'eau et d'électricité dans Abidjan</h1>
            <p className="text-xs text-muted-foreground mt-0.5">05 communes pilotes disponibles</p>
            <p className="mt-1 text-muted-foreground">
              {loading ? "Chargement..." : (
                <>
                  <strong className={totalActifs > 0 ? "text-destructive" : "text-success"}>{totalActifs} coupure{totalActifs > 1 ? "s" : ""} active{totalActifs > 1 ? "s" : ""}</strong> en ce moment
                  {filter === "all" && (
                    <span className="ml-2 inline-flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        ⚡ {totalElecActifs}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        💧 {totalEauActifs}
                      </span>
                    </span>
                  )}
                </>
              )}
            </p>
            {!loading && totalVerified > 0 && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-success">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-xs">✓</span>
                {totalVerified} confirmé{totalVerified > 1 ? 's' : ''} par la communauté
              </p>
            )}
          </div>
          <ShareButton
            title="Carte SignalÉnergie"
            text={`${totalActifs} coupures actives sur les 5 communes pilotes d'Abidjan 📊`}
          />
        </motion.div>

        {/* Service filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "all" as ServiceFilter, label: "Tous", icon: "🔌💧" },
            { key: "electricity" as ServiceFilter, label: "Électricité", icon: "⚡" },
            { key: "water" as ServiceFilter, label: "Eau", icon: "💧" },
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
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {COMMUNES.map((c) => {
            const s = stats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
            let count = 0;
            if (s) {
              count = filter === "electricity" ? s.electricite_actifs : filter === "water" ? s.eau_actifs : s.electricite_actifs + s.eau_actifs;
            }
            return (
              <span key={c.nom} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: c.couleur }}>
                {c.nom} ({count})
              </span>
            );
          })}
        </div>

        {/* Légende vérification */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-success bg-success/10 text-[10px] font-bold text-success">✓</span>
            {!loading && filter === "all" ? (
              <span className="flex flex-wrap items-center gap-2">
                <span>Coupure signalée et confirmée par les voisins :</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  ⚡ {totalElecActifs > 0 ? `${Math.round((totalElecVerified / totalElecActifs) * 100)}%` : '0%'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  💧 {totalEauActifs > 0 ? `${Math.round((totalEauVerified / totalEauActifs) * 100)}%` : '0%'}
                </span>
              </span>
            ) : (
              <span>Coupure signalée et confirmée par {!loading && totalActifs > 0 ? <strong className="text-success">{Math.round((totalVerified / totalActifs) * 100)}%</strong> : '…'} des voisins</span>
            )}
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: '#888' }} />
            <span><strong className="text-foreground">En attente</strong> — en cours de vérification</span>
          </span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="overflow-hidden rounded-xl border border-border shadow-card">
          <div ref={mapRef} className="h-[500px] w-full" />
        </motion.div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          🔒 Les positions exactes des signalements ne sont pas affichées pour protéger la vie privée des utilisateurs.
        </p>
      </main>
    </div>
  );
};

export default MapPage;
