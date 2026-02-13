import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Droplets } from "lucide-react";
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
      const { data, error } = await supabase
        .from("reports_public" as any)
        .select("id, service_type, description, location, latitude, longitude, urgency, status, start_time, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) setReports(data as unknown as ReportRow[]);
      setLoading(false);
    };
    fetchReports();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView([6.5, -1.5], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    mapInstance.current = map;

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
      const color = r.service_type === "electricity" ? "#F59E0B" : "#3B82F6";
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:14px;">${r.service_type === "electricity" ? "⚡" : "💧"}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([r.latitude!, r.longitude!], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:180px">
            <strong>${r.service_type === "electricity" ? "⚡ Électricité" : "💧 Eau"}</strong><br/>
            <span style="font-size:12px">${r.location}</span><br/>
            <span style="font-size:12px;color:#666">${r.description.slice(0, 80)}${r.description.length > 80 ? "..." : ""}</span><br/>
            <span style="font-size:11px;color:#999">${new Date(r.start_time).toLocaleString("fr-FR")}</span>
          </div>`
        );
    });

    if (geoReports.length > 0) {
      const bounds = L.latLngBounds(geoReports.map((r) => [r.latitude!, r.longitude!]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [reports, loading]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Carte des signalements</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Chargement..." : `${reports.length} signalement(s) récent(s)`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-xl border border-border shadow-card"
        >
          <div ref={mapRef} className="h-[500px] w-full" />
        </motion.div>

        {/* Recent reports list */}
        {!loading && reports.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground">Signalements récents</h2>
            {reports.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                <div className={`mt-0.5 rounded-lg p-2 ${r.service_type === "electricity" ? "bg-electricity-light" : "bg-water-light"}`}>
                  {r.service_type === "electricity" ? (
                    <Zap className="h-4 w-4 text-electricity" />
                  ) : (
                    <Droplets className="h-4 w-4 text-water" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.location}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Début : {new Date(r.start_time).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === "active" ? "bg-destructive/10 text-destructive" :
                  r.status === "resolved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>
                  {r.status === "active" ? "Actif" : r.status === "resolved" ? "Résolu" : "Vérification"}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="mt-8 text-center text-muted-foreground">
            Aucun signalement pour le moment. Soyez le premier à signaler !
          </div>
        )}
      </main>
    </div>
  );
};

export default MapPage;
