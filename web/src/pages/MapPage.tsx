import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Droplets, Landmark, AlertTriangle, Flame, RefreshCw,
  CheckCircle2, MapPin, Search, ArrowLeft, Compass, ExternalLink,
  Shield, List, Map as MapIcon, X as XIcon, Plus, ChevronRight,
  Clock, Users, Radio, Info
} from "lucide-react";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS, Commune } from "@/lib/communes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ActiveReport {
  id: string;
  latitude: number;
  longitude: number;
  service_type: string;
  report_category?: string;
  description?: string;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  verifications: number;
  commune: string;
  quartier?: string;
  created_at: string;
  start_time: string | null;
  status?: string;
}

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

interface DurationStat {
  commune: string;
  service_type: string;
  avg_duration_minutes: number;
  total_active: number;
  longest_duration_minutes: number;
}

interface ActiveDurationStat {
  commune: string;
  service_type: string;
  oldest_start: string;
  longest_hours: number;
  active_count: number;
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}h${mm > 0 ? ` ${mm}m` : ""}`;
  }
  const d = Math.floor(h / 24);
  const rh = Math.round(h % 24);
  return `${d}j${rh > 0 ? ` ${rh}h` : ""}`;
}

function formatElapsed(startIso: string | null, createdIso: string): string {
  const ref = startIso ?? createdIso;
  if (!ref) return "";
  const diffMs = Date.now() - new Date(ref).getTime();
  if (diffMs < 0) return "";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return "< 2 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `${h}h${m > 0 ? `${m}m` : ""}`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `${d}j${rh > 0 ? ` ${rh}h` : ""}`;
}

type CoupureFilter = "all" | "electricity" | "water";
type PeriodFilter = "all" | "today" | "7d" | "30d";

const computeCentroid = (feature: any): [number, number] | null => {
  try {
    const coords: number[][] = [];
    const extractCoords = (rings: any) => {
      if (typeof rings[0] === "number") { coords.push(rings); return; }
      rings.forEach((r: any) => extractCoords(r));
    };
    extractCoords(feature.geometry.coordinates);
    if (coords.length === 0) return null;
    const sumLat = coords.reduce((s, c) => s + c[1], 0);
    const sumLon = coords.reduce((s, c) => s + c[0], 0);
    return [sumLat / coords.length, sumLon / coords.length];
  } catch { return null; }
};

const MapPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCoupureFilter = (searchParams.get("service") as CoupureFilter) || "all";

  const [coupureFilter, setCoupureFilter] = useState<CoupureFilter>(initialCoupureFilter);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [focusedCommune, setFocusedCommune] = useState<string | null>(searchParams.get("commune") || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [mobileBottomSheetOpen, setMobileBottomSheetOpen] = useState(false);

  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [durationStats, setDurationStats] = useState<DurationStat[]>([]);
  const [activeDurations, setActiveDurations] = useState<ActiveDurationStat[]>([]);
  const [boundaries, setBoundaries] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeReports, setActiveReports] = useState<ActiveReport[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  // Synchroniser le paramètre d'URL service
  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (serviceParam === "electricity" || serviceParam === "water" || serviceParam === "all") {
      setCoupureFilter(serviceParam as CoupureFilter);
    }
  }, [searchParams]);

  const fetchAll = async () => {
    setIsRefreshing(true);
    try {
      const [sRes, geoRes, dRes, adRes, rRes] = await Promise.all([
        supabase.rpc("get_commune_service_stats"),
        fetch("/data/communes-boundaries.geojson").then((r) => r.json()).catch(() => null),
        supabase.rpc("get_commune_duration_stats"),
        supabase.rpc("get_commune_active_durations" as any),
        supabase.rpc("get_public_reports"),
      ]);

      if (!adRes.error && adRes.data) setActiveDurations(adRes.data as unknown as ActiveDurationStat[]);
      if (!dRes.error && dRes.data) setDurationStats(dRes.data as unknown as DurationStat[]);
      if (!rRes.error && Array.isArray(rRes.data)) {
        setActiveReports(
          rRes.data.map((r: any) => ({
            id: r.id,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            service_type: r.service_type || "electricity",
            report_category: r.report_category,
            description: r.description,
            photo_url: r.photo_url,
            photo_urls: r.photo_urls,
            verifications: Number(r.verifications || 0),
            commune: r.commune || "",
            quartier: r.quartier,
            created_at: r.created_at,
            start_time: r.start_time,
            status: r.status,
          }))
        );
      }

      if (!sRes.error && sRes.data) {
        setStats(sRes.data as unknown as CommuneServiceStat[]);
      }

      if (geoRes) setBoundaries(geoRes);
      setLastUpdated(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Calcul des totaux réels
  const totals = useMemo(() => {
    const elecActifs = stats.reduce((acc, c) => acc + (c.electricite_actifs || 0), 0);
    const eauActifs = stats.reduce((acc, c) => acc + (c.eau_actifs || 0), 0);
    const elecVerified = stats.reduce((acc, c) => acc + (c.electricite_verified || 0), 0);
    const eauVerified = stats.reduce((acc, c) => acc + (c.eau_verified || 0), 0);
    const totalElec = stats.reduce((acc, c) => acc + (c.electricite_total || 0), 0);
    const totalEau = stats.reduce((acc, c) => acc + (c.eau_total || 0), 0);

    let actifs = elecActifs + eauActifs;
    let verified = elecVerified + eauVerified;
    let total = totalElec + totalEau;

    if (coupureFilter === "electricity") {
      actifs = elecActifs;
      verified = elecVerified;
      total = totalElec;
    } else if (coupureFilter === "water") {
      actifs = eauActifs;
      verified = eauVerified;
      total = totalEau;
    }

    return {
      actifs,
      verified,
      total,
      elec: elecActifs,
      eau: eauActifs,
      hasOutages: actifs > 0,
    };
  }, [stats, coupureFilter]);

  // Filtrage et tri des communes
  const filteredCommunes = useMemo(() => {
    let list = COMMUNES.map((c) => {
      const st = stats.find((s) => s.commune.toLowerCase().trim() === c.nom.toLowerCase().trim());
      const elecActifs = st?.electricite_actifs || 0;
      const eauActifs = st?.eau_actifs || 0;
      const elecVerified = st?.electricite_verified || 0;
      const eauVerified = st?.eau_verified || 0;
      const elecDuration = activeDurations.find(
        (d) => d.commune.toLowerCase().trim() === c.nom.toLowerCase().trim() && d.service_type === "electricity"
      );
      const eauDuration = activeDurations.find(
        (d) => d.commune.toLowerCase().trim() === c.nom.toLowerCase().trim() && d.service_type === "water"
      );

      let actifs = elecActifs + eauActifs;
      let verified = elecVerified + eauVerified;
      if (coupureFilter === "electricity") {
        actifs = elecActifs;
        verified = elecVerified;
      } else if (coupureFilter === "water") {
        actifs = eauActifs;
        verified = eauVerified;
      }

      const longestHours = Math.max(elecDuration?.longest_hours || 0, eauDuration?.longest_hours || 0);

      return {
        ...c,
        stat: st,
        elecActifs,
        eauActifs,
        actifs,
        verified,
        longestHours,
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => c.nom.toLowerCase().includes(q));
    }

    // Trier : Communes avec pannes actives en premier, puis ordre alphabétique
    return list.sort((a, b) => {
      if (b.actifs !== a.actifs) return b.actifs - a.actifs;
      return a.nom.localeCompare(b.nom);
    });
  }, [stats, activeDurations, coupureFilter, searchQuery]);

  // Rapports actifs pour la commune sélectionnée
  const focusedCommuneReports = useMemo(() => {
    if (!focusedCommune) return [];
    return activeReports.filter((r) => {
      const matchCommune = r.commune.toLowerCase().trim() === focusedCommune.toLowerCase().trim();
      if (!matchCommune) return false;
      if (coupureFilter === "electricity") return r.service_type === "electricity";
      if (coupureFilter === "water") return r.service_type === "water";
      return true;
    });
  }, [activeReports, focusedCommune, coupureFilter]);

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [5.36, -4.01],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Centrage sur la commune sélectionnée
  const handleSelectCommune = (communeNom: string) => {
    const c = COMMUNES.find((item) => item.nom.toLowerCase() === communeNom.toLowerCase());
    if (!c) return;

    setFocusedCommune(c.nom);
    setMobileBottomSheetOpen(true);

    if (mapInstance.current) {
      mapInstance.current.flyTo([c.centerLat, c.centerLon], 13.5, { duration: 1 });
    }
  };

  const handleResetCommune = () => {
    setFocusedCommune(null);
    setMobileBottomSheetOpen(false);
    if (mapInstance.current) {
      mapInstance.current.flyTo([5.36, -4.01], 12, { duration: 1 });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstance.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current?.flyTo([latitude, longitude], 14, { duration: 1.2 });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  // Rendu des polygones GeoJSON et des marqueurs sur Leaflet
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // 1. Mise à jour des contours GeoJSON
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    if (boundaries) {
      const geoLayer = L.geoJSON(boundaries, {
        style: (feature) => {
          const name = feature?.properties?.name || "";
          const isSelected = focusedCommune?.toLowerCase() === name.toLowerCase();
          const color = COMMUNE_COLORS[name] || "#10B981";

          return {
            color: isSelected ? "#000" : color,
            weight: isSelected ? 3.5 : 1.5,
            opacity: isSelected ? 1 : 0.8,
            fillColor: color,
            fillOpacity: isSelected ? 0.28 : 0.1,
            dashArray: isSelected ? undefined : "4",
          };
        },
        onEachFeature: (feature, layer) => {
          const name = feature?.properties?.name;
          if (!name) return;

          layer.on({
            click: () => handleSelectCommune(name),
            mouseover: () => {
              layer.setStyle({ fillOpacity: 0.35, weight: 2.5 });
            },
            mouseout: () => {
              const isSelected = focusedCommune?.toLowerCase() === name.toLowerCase();
              layer.setStyle({
                fillOpacity: isSelected ? 0.28 : 0.1,
                weight: isSelected ? 3.5 : 1.5,
              });
            },
          });
        },
      }).addTo(map);

      geojsonLayerRef.current = geoLayer;
    }

    // 2. Mise à jour des marqueurs
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    COMMUNES.forEach((c) => {
      const st = stats.find((s) => s.commune.toLowerCase().trim() === c.nom.toLowerCase().trim());
      const elecActifs = st?.electricite_actifs || 0;
      const eauActifs = st?.eau_actifs || 0;
      const verified = (st?.electricite_verified || 0) + (st?.eau_verified || 0);

      let actifs = elecActifs + eauActifs;
      if (coupureFilter === "electricity") actifs = elecActifs;
      if (coupureFilter === "water") actifs = eauActifs;

      const isSelected = focusedCommune?.toLowerCase() === c.nom.toLowerCase();
      const hasOutage = actifs > 0;
      const hasVerified = verified > 0;

      let markerHtml = "";

      if (hasOutage) {
        if (coupureFilter === "all" && elecActifs > 0 && eauActifs > 0) {
          // Double badge ⚡ & 💧
          markerHtml = `
            <div style="position:relative;display:flex;align-items:center;cursor:pointer;transform:${isSelected ? 'scale(1.15)' : 'scale(1)'};transition:transform .2s;">
              <div style="background:#f59e0b;color:white;padding:4px 7px;border-radius:12px 0 0 12px;font-size:11px;font-weight:900;display:flex;align-items:center;gap:2px;border:2px solid white;border-right:1px solid rgba(255,255,255,0.4);box-shadow:0 3px 10px rgba(0,0,0,.35);">
                <span>⚡</span>${elecActifs}
              </div>
              <div style="background:#3b82f6;color:white;padding:4px 7px;border-radius:0 12px 12px 0;font-size:11px;font-weight:900;display:flex;align-items:center;gap:2px;border:2px solid white;border-left:none;box-shadow:0 3px 10px rgba(0,0,0,.35);">
                <span>💧</span>${eauActifs}
              </div>
              ${hasVerified ? `<span style="position:absolute;top:-6px;right:-6px;background:#16a34a;color:white;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;border:2px solid white;">✓</span>` : ''}
            </div>
          `;
        } else {
          // Simple badge avec nombre
          const emoji = (coupureFilter === "electricity" || elecActifs > 0) ? "⚡" : "💧";
          const bg = (coupureFilter === "electricity" || elecActifs > 0) ? "#f59e0b" : "#3b82f6";

          markerHtml = `
            <div style="position:relative;background:${bg};color:white;min-width:38px;height:38px;border-radius:999px;padding:0 8px;display:flex;align-items:center;justify-content:center;gap:2px;font-size:12px;font-weight:900;border:2.5px solid white;box-shadow:0 4px 12px rgba(0,0,0,.4);cursor:pointer;transform:${isSelected ? 'scale(1.2)' : 'scale(1)'};transition:transform .2s;">
              <span>${emoji}</span>
              <span>${actifs}</span>
              ${hasVerified ? `<span style="position:absolute;top:-5px;right:-5px;background:#16a34a;color:white;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;border:2px solid white;">✓</span>` : ''}
            </div>
          `;
        }
      } else {
        // Discrète pastille verte normale
        markerHtml = `
          <div style="background:#10b981;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.25);cursor:pointer;opacity:0.85;transform:${isSelected ? 'scale(1.2)' : 'scale(1)'};transition:transform .2s;" title="${c.nom} : Réseau Stable">
            ✓
          </div>
        `;
      }

      const icon = L.divIcon({
        className: "custom-commune-marker",
        html: markerHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([c.centerLat, c.centerLon], { icon });
      marker.on("click", () => handleSelectCommune(c.nom));
      markersLayerRef.current?.addLayer(marker);
    });
  }, [boundaries, stats, coupureFilter, focusedCommune]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Header />

      <main className="flex-1 min-h-0 relative flex flex-col lg:flex-row overflow-hidden">
        {/* ═══════════════════════════════════════════════════════════════
            VOLET GAUCHE (38%) : DASHBOARD CITOYEN & FEED DES COUPURES
            ═══════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full lg:w-[40%] xl:w-[36%] flex flex-col h-full min-h-0 bg-background border-r border-border/80 z-10 transition-all ${
            mobileTab === "map" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* ── EN-TÊTE FIXE DU VOLET GAUCHE AVEC HERO CTA ── */}
          <div className="p-3.5 sm:p-4 border-b border-border/70 bg-card/70 backdrop-blur-md space-y-3 shrink-0">
            {/* Title & Pulse Indicator */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        totals.hasOutages ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        totals.hasOutages ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                  </span>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                    Météo des Coupures d'Énergie
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  14 communes du Grand Abidjan · Suivi temps réel
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchAll()}
                  disabled={isRefreshing}
                  className="h-8 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-all active:scale-95 shadow-2xs flex items-center gap-1"
                  title="Actualiser les données"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{isRefreshing ? "..." : "Actualiser"}</span>
                </button>
                <ShareButton
                  title="Météo Coupures Abidjan"
                  text={`${totals.actifs} coupure(s) active(s) sur le Grand Abidjan en ce moment 📊`}
                />
              </div>
            </div>

            {/* ⚡ BOUTON D'ACTION PRIMAIRE HÉRO : SIGNALER UNE COUPURE ⚡ */}
            <div className="flex items-center gap-2">
              <Button
                asChild
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-[0.98] gap-1.5"
              >
                <Link to="/?category=outage">
                  <Zap className="h-4 w-4 fill-slate-950" />
                  <span>Signaler une coupure en 30s</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-10 px-3 rounded-xl border-border/80 text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
                title="Voir le fil des pannes d'infrastructure"
              >
                <Link to="/infrastructures">
                  <span>Voirie &amp; Infra</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            {/* BARRE DE FILTRES UNIFIÉE : ÉNERGIE & RECHERCHE */}
            <div className="space-y-2 pt-1">
              {/* Sélecteur de service segmenté */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/70 rounded-xl border border-border/60 text-xs font-bold">
                <button
                  onClick={() => setCoupureFilter("all")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    coupureFilter === "all"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>⚡💧 Tous</span>
                  <span className="text-[10px] opacity-75 font-normal">({totals.elec + totals.eau})</span>
                </button>

                <button
                  onClick={() => setCoupureFilter("electricity")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    coupureFilter === "electricity"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>CIE</span>
                  <span className="text-[10px] opacity-75 font-normal">({totals.elec})</span>
                </button>

                <button
                  onClick={() => setCoupureFilter("water")}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    coupureFilter === "water"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 font-extrabold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Droplets className="h-3 w-3 text-blue-500 fill-blue-500" />
                  <span>SODECI</span>
                  <span className="text-[10px] opacity-75 font-normal">({totals.eau})</span>
                </button>
              </div>

              {/* Champ de recherche compact avec auto-clear */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Rechercher une commune (ex: Cocody, Yopougon...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-8 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-1.5 focus:ring-amber-500/80 shadow-2xs transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Tab Switcher */}
              <div className="lg:hidden flex items-center p-1 bg-muted/80 rounded-xl border border-border/70 gap-1">
                <button
                  onClick={() => setMobileTab("list")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    mobileTab === "list" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5 text-amber-500" />
                  <span>Communes ({filteredCommunes.length})</span>
                </button>
                <button
                  onClick={() => setMobileTab("map")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    mobileTab === "map" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>Carte</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── ZONE DE CONTENU SCROLLABLE : MASTER-DETAIL OU LISTE DES COMMUNES ── */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-3 sm:p-4 space-y-3 pb-28 lg:pb-6">
            {focusedCommune ? (
              /* ── VUE FOCUS SUR UNE COMMUNE SÉLECTIONNÉE ── */
              <div className="space-y-4">
                {/* Sticky Back Header */}
                <div className="flex items-center justify-between gap-2 pb-2">
                  <button
                    onClick={handleResetCommune}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95 shadow-2xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Toutes les 14 communes</span>
                  </button>

                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs font-bold gap-1 text-primary border-primary/30"
                  >
                    <Link to={`/commune/${encodeURIComponent(focusedCommune)}`}>
                      <span>Fiche {focusedCommune}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                {/* Commune Profile Card */}
                {(() => {
                  const targetCommune = filteredCommunes.find(
                    (c) => c.nom.toLowerCase() === focusedCommune.toLowerCase()
                  );
                  if (!targetCommune) return null;

                  return (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-3">
                      <div
                        className="h-2 w-full"
                        style={{ backgroundColor: targetCommune.couleur || "#10B981" }}
                      />

                      <div className="p-4 pt-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="text-lg font-black text-foreground">{targetCommune.nom}</h2>
                            <p className="text-xs text-muted-foreground">
                              {targetCommune.population.toLocaleString()} habitants
                            </p>
                          </div>

                          <Badge
                            className={`text-xs font-bold ${
                              targetCommune.actifs > 0
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {targetCommune.actifs > 0
                              ? `🔴 ${targetCommune.actifs} coupure${targetCommune.actifs > 1 ? "s" : ""} en cours`
                              : "🟢 Réseau 100% stable"}
                          </Badge>
                        </div>

                        {/* Breakdown Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                              <Zap className="h-3.5 w-3.5" />
                              <span>Électricité (CIE)</span>
                            </div>
                            <p className="text-base font-black text-foreground mt-1">
                              {targetCommune.elecActifs} active{targetCommune.elecActifs > 1 ? "s" : ""}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold">
                              <Droplets className="h-3.5 w-3.5" />
                              <span>Eau (SODECI)</span>
                            </div>
                            <p className="text-base font-black text-foreground mt-1">
                              {targetCommune.eauActifs} active{targetCommune.eauActifs > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {/* Bouton pour déclarer dans cette commune */}
                        <Button
                          asChild
                          className="w-full h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shadow-xs"
                        >
                          <Link to={`/?commune=${encodeURIComponent(targetCommune.nom)}&category=outage`}>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Signaler une panne à {targetCommune.nom}</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Liste des signalements individuels actifs de cette commune */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Signalements en cours ({focusedCommuneReports.length})
                  </h3>

                  {focusedCommuneReports.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="font-bold text-foreground">Aucune coupure active signalée</p>
                      <p className="text-[11px] mt-0.5">Le réseau est stable dans ce secteur.</p>
                    </div>
                  ) : (
                    focusedCommuneReports.map((r) => {
                      const isElec = r.service_type === "electricity";
                      const elapsed = formatElapsed(r.start_time, r.created_at);

                      return (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-2xl border border-border bg-card shadow-2xs space-y-2 hover:border-amber-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isElec
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              }`}
                            >
                              {isElec ? <Zap className="h-3 w-3" /> : <Droplets className="h-3 w-3" />}
                              <span>{isElec ? "CIE · Électricité" : "SODECI · Eau"}</span>
                            </span>

                            {elapsed && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{elapsed}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                            {r.description || "Coupure de réseau signalée"}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-emerald-600" />
                              <span>{r.quartier || r.commune}</span>
                            </span>

                            <Link
                              to={`/signalement/${r.id}`}
                              className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>Détails</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* ── VUE GLOBALE DES 14 COMMUNES DU GRAND ABIDJAN ── */
              <div className="space-y-3">
                {/* Bannière de Synthèse Globale (Option A Civique) */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    totals.hasOutages
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{totals.hasOutages ? "⚠️" : "🟢"}</span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold">
                        {totals.hasOutages
                          ? `${totals.actifs} coupure(s) en cours sur Abidjan`
                          : "Aucune coupure active signalée"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {totals.hasOutages
                          ? `⚡ ${totals.elec} secteur(s) CIE · 💧 ${totals.eau} secteur(s) SODECI`
                          : "0 incident rapporté par les citoyens ces dernières heures."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Liste synthétique des 14 communes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Commune ({filteredCommunes.length})</span>
                    <span>État du Réseau</span>
                  </div>

                  {filteredCommunes.map((c) => {
                    const hasOutage = c.actifs > 0;

                    return (
                      <div
                        key={c.nom}
                        onClick={() => handleSelectCommune(c.nom)}
                        className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs active:scale-[0.99] ${
                          hasOutage
                            ? "bg-card border-amber-500/40 hover:border-amber-500"
                            : "bg-card/70 border-border/70 hover:border-emerald-500/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Pastille de couleur de la commune */}
                          <div
                            className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-2xs"
                            style={{ backgroundColor: c.couleur }}
                          >
                            {c.nom.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {c.nom}
                            </h4>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {c.population.toLocaleString()} hab.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasOutage ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <span>⚡💧</span>
                              <span>{c.actifs}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <span>✓ Stable</span>
                            </span>
                          )}

                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Protection Vie Privée & Données GPS */}
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5 mt-4">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Protection &amp; Confidentialité GPS :</strong> Pour préserver la sécurité des foyers, les positions sont décalées d'environ 150m. Seuls les services agréés ont accès aux relevés précis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            VOLET DROIT (62%) : CARTE INTERACTIVE PLEIN ÉCRAN LEAFLET
            ═══════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full lg:w-[60%] xl:w-[64%] h-full min-h-0 relative bg-slate-100 dark:bg-slate-900 transition-all ${
            mobileTab === "list" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Canvas Leaflet */}
          <div
            ref={mapRef}
            className="absolute inset-0 w-full h-full"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
          />

          {/* Floating Controls Top-Right : GPS & Reset View */}
          <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
            <button
              onClick={handleLocateMe}
              className="h-10 w-10 rounded-xl bg-card border border-border/80 text-foreground flex items-center justify-center shadow-lg hover:bg-muted transition-all active:scale-95"
              title="Me géolocaliser"
            >
              <Compass className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </button>

            {focusedCommune && (
              <button
                onClick={handleResetCommune}
                className="h-10 w-10 rounded-xl bg-card border border-border/80 text-foreground flex items-center justify-center shadow-lg hover:bg-muted transition-all active:scale-95"
                title="Vue globale d'Abidjan"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Mobile Back-to-List Pill */}
          <div className="lg:hidden absolute top-4 left-4 z-[400]">
            <button
              onClick={() => setMobileTab("list")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-card/95 text-foreground font-bold text-xs shadow-lg backdrop-blur-md border border-border active:scale-95 transition-all"
            >
              <List className="h-4 w-4 text-amber-500" />
              <span>Voir les Communes ({filteredCommunes.length})</span>
            </button>
          </div>

          {/* Live Legend (Desktop) */}
          <div className="hidden sm:flex absolute bottom-4 left-4 z-[400] items-center gap-3 px-3.5 py-2 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-lg text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> ⚡ CIE
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> 💧 SODECI
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 border-l border-border pl-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> ✓ Réseau Stable
            </span>
          </div>

          {/* Mobile Bottom-Sheet quand une commune est sélectionnée sur la carte */}
          <AnimatePresence>
            {mobileTab === "map" && mobileBottomSheetOpen && focusedCommune && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="lg:hidden absolute bottom-24 left-3 right-3 z-[450] bg-card/98 backdrop-blur-xl rounded-2xl border border-border shadow-2xl p-3.5 space-y-3"
              >
                {(() => {
                  const target = filteredCommunes.find(
                    (c) => c.nom.toLowerCase() === focusedCommune.toLowerCase()
                  );
                  if (!target) return null;

                  return (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-foreground">{target.nom}</h4>
                          <p className="text-xs text-muted-foreground">
                            {target.actifs > 0
                              ? `🔴 ${target.actifs} coupure(s) en cours`
                              : "🟢 Réseau 100% stable"}
                          </p>
                        </div>

                        <button
                          onClick={() => setMobileBottomSheetOpen(false)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setMobileTab("list")}
                          size="sm"
                          className="flex-1 h-8.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                        >
                          Voir les signalements ({target.actifs})
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8.5 rounded-xl text-xs font-bold"
                        >
                          <Link to={`/commune/${encodeURIComponent(target.nom)}`}>
                            Fiche
                          </Link>
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default MapPage;
