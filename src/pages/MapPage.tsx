import { useEffect, useState, useRef } from "react";
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
}

type ServiceFilter = "all" | "electricity" | "water";

const MapPage = () => {
  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ServiceFilter>("all");
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
      
      let actifs = 0, resolus = 0, total = 0;
      if (s) {
        if (filter === "electricity") {
          actifs = s.electricite_actifs; resolus = s.electricite_resolus; total = s.electricite_total;
        } else if (filter === "water") {
          actifs = s.eau_actifs; resolus = s.eau_resolus; total = s.eau_total;
        } else {
          actifs = s.electricite_actifs + s.eau_actifs;
          resolus = s.electricite_resolus + s.eau_resolus;
          total = s.electricite_total + s.eau_total;
        }
      }

      const filterEmoji = filter === "electricity" ? "⚡" : filter === "water" ? "💧" : "";
      const countIcon = L.divIcon({
        className: "",
        html: `<div style="
          background:${c.couleur};color:white;
          width:${total > 0 ? 48 : 36}px;height:${total > 0 ? 48 : 36}px;
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35);
          font-size:${total > 0 ? 16 : 13}px;font-weight:bold;
        ">${filterEmoji}${total}</div>`,
        iconSize: [total > 0 ? 48 : 36, total > 0 ? 48 : 36],
        iconAnchor: [total > 0 ? 24 : 18, total > 0 ? 24 : 18],
      });

      const serviceLabel = filter === "electricity" ? "Électricité" : filter === "water" ? "Eau" : "Tous services";
      L.marker([c.centerLat, c.centerLon], { icon: countIcon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:160px;text-align:center">
            <strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/>
            <span style="font-size:11px;color:#666">${serviceLabel}</span><br/>
            <span style="font-size:22px;font-weight:bold">${total}</span>
            <span style="font-size:11px;color:#666"> signalement${total > 1 ? "s" : ""}</span><br/>
            <span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? "s" : ""} · ✅ ${resolus} résolu${resolus > 1 ? "s" : ""}</span>
          </div>`
        );
    });
  }, [stats, loading, filter]);

  const getFilteredTotals = () => {
    if (filter === "electricity") {
      return { total: stats.reduce((s, c) => s + c.electricite_total, 0), actifs: stats.reduce((s, c) => s + c.electricite_actifs, 0) };
    } else if (filter === "water") {
      return { total: stats.reduce((s, c) => s + c.eau_total, 0), actifs: stats.reduce((s, c) => s + c.eau_actifs, 0) };
    }
    return {
      total: stats.reduce((s, c) => s + c.electricite_total + c.eau_total, 0),
      actifs: stats.reduce((s, c) => s + c.electricite_actifs + c.eau_actifs, 0),
    };
  };
  const { total: totalSignalements, actifs: totalActifs } = getFilteredTotals();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Carte des 5 communes</h1>
            <p className="mt-1 text-muted-foreground">
              {loading ? "Chargement..." : `${totalSignalements} signalement(s) dont ${totalActifs} actif(s)`}
            </p>
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
              count = filter === "electricity" ? s.electricite_total : filter === "water" ? s.eau_total : s.electricite_total + s.eau_total;
            }
            return (
              <span key={c.nom} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: c.couleur }}>
                {c.nom} ({count})
              </span>
            );
          })}
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
