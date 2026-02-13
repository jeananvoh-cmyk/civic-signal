import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CommuneStat {
  commune: string;
  couleur: string;
  actifs: number;
  resolus: number;
  total: number;
  population: number;
}

const MapPage = () => {
  const [stats, setStats] = useState<CommuneStat[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_commune_stats");
      if (!error && data) setStats(data as unknown as CommuneStat[]);
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

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Draw commune circles + aggregated counts
  useEffect(() => {
    if (!mapInstance.current || loading) return;
    const map = mapInstance.current;

    // Clear non-tile layers
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    COMMUNES.forEach((c) => {
      // Draw circle for the commune zone
      L.circle([c.centerLat, c.centerLon], {
        radius: c.rayonM,
        color: c.couleur,
        fillColor: c.couleur,
        fillOpacity: 0.10,
        weight: 2,
      }).addTo(map).bindPopup(
        `<strong>${c.nom}</strong><br/>${(c.population / 1000).toFixed(0)}k habitants`
      );

      // Find stats for this commune
      const communeStat = stats.find(
        (s) => s.commune.toLowerCase() === c.nom.toLowerCase()
      );
      const actifs = communeStat?.actifs || 0;
      const resolus = communeStat?.resolus || 0;
      const total = communeStat?.total || 0;

      // Add a count marker at the center
      const countIcon = L.divIcon({
        className: "",
        html: `<div style="
          background:${c.couleur};
          color:white;
          width:${total > 0 ? 48 : 36}px;
          height:${total > 0 ? 48 : 36}px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          border:3px solid white;
          box-shadow:0 2px 10px rgba(0,0,0,.35);
          font-size:${total > 0 ? 18 : 13}px;
          font-weight:bold;
          flex-direction:column;
          line-height:1.1;
        ">${total > 0 ? total : "0"}</div>`,
        iconSize: [total > 0 ? 48 : 36, total > 0 ? 48 : 36],
        iconAnchor: [total > 0 ? 24 : 18, total > 0 ? 24 : 18],
      });

      L.marker([c.centerLat, c.centerLon], { icon: countIcon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:140px;text-align:center">
            <strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/>
            <span style="font-size:22px;font-weight:bold">${total}</span>
            <span style="font-size:11px;color:#666"> signalement${total > 1 ? "s" : ""}</span><br/>
            <span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? "s" : ""} · ✅ ${resolus} résolu${resolus > 1 ? "s" : ""}</span>
          </div>`
        );
    });
  }, [stats, loading]);

  const totalSignalements = stats.reduce((sum, s) => sum + s.total, 0);
  const totalActifs = stats.reduce((sum, s) => sum + s.actifs, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h1 className="font-display text-3xl font-bold text-foreground">Carte des 5 communes</h1>
          <p className="mt-1 text-muted-foreground">
            {loading
              ? "Chargement..."
              : `${totalSignalements} signalement(s) dont ${totalActifs} actif(s) — Données agrégées par commune`}
          </p>
        </motion.div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {COMMUNES.map((c) => {
            const s = stats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
            return (
              <span
                key={c.nom}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: c.couleur }}
              >
                {c.nom} ({s?.total || 0})
              </span>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-xl border border-border shadow-card"
        >
          <div ref={mapRef} className="h-[500px] w-full" />
        </motion.div>

        {/* Privacy notice */}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          🔒 Les positions exactes des signalements ne sont pas affichées pour protéger la vie privée des utilisateurs.
        </p>
      </main>
    </div>
  );
};

export default MapPage;
