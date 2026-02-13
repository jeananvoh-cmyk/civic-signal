import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ReportRow {
  id: string;
  service_type: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  urgency: string;
  status: string;
  start_time: string;
  created_at: string;
}

const MapPage = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase.rpc("get_public_reports");
      if (!error && data) setReports(data as unknown as ReportRow[]);
      setLoading(false);
    };
    fetchReports();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Center on Abidjan
    const map = L.map(mapRef.current).setView([5.38, -4.01], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    mapInstance.current = map;

    // Draw commune circles
    COMMUNES.forEach((c) => {
      L.circle([c.centerLat, c.centerLon], {
        radius: c.rayonM,
        color: c.couleur,
        fillColor: c.couleur,
        fillOpacity: 0.08,
        weight: 2,
      }).addTo(map).bindPopup(`<strong>${c.nom}</strong><br/>${(c.population / 1000).toFixed(0)}k habitants`);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || loading) return;
    const map = mapInstance.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const geoReports = reports.filter((r) => r.latitude && r.longitude);

    geoReports.forEach((r) => {
      // Find commune color
      const communeName = r.location?.split(",")[0]?.trim() || "";
      const color = COMMUNE_COLORS[communeName] || (r.service_type === "electricity" ? "#F59E0B" : "#3B82F6");
      const emoji = r.service_type === "electricity" ? "⚡" : "💧";

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:14px;">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      L.marker([r.latitude!, r.longitude!], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:160px">
            <strong>${emoji} ${communeName || r.location}</strong><br/>
            <span style="font-size:12px">${r.description?.slice(0, 80) || ""}</span><br/>
            <span style="font-size:11px;color:#999">${new Date(r.start_time).toLocaleString("fr-FR")}</span>
          </div>`
        );
    });
  }, [reports, loading]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h1 className="font-display text-3xl font-bold text-foreground">Carte des 5 communes</h1>
          <p className="mt-1 text-muted-foreground">
            {loading ? "Chargement..." : `${reports.length} signalement(s) — Clusters 5 couleurs`}
          </p>
        </motion.div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {COMMUNES.map((c) => (
            <span key={c.nom} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: c.couleur }}>
              {c.nom}
            </span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-xl border border-border shadow-card"
        >
          <div ref={mapRef} className="h-[500px] w-full" />
        </motion.div>
      </main>
    </div>
  );
};

export default MapPage;
