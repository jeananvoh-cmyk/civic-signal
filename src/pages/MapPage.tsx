import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Droplets, Construction, AlertTriangle, Flame } from "lucide-react";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import { INFRA_CATEGORY_ICONS } from "@/lib/infra-icons";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ActiveReport {
  id: string;
  latitude: number;
  longitude: number;
  service_type: string;
  verifications: number;
  commune: string;
  created_at: string;
  start_time: string | null;
}

/** Format elapsed time from a start date to now */
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
  if (h < 24) return `${h}h${m > 0 ? m + "min" : ""}`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `${d}j${rh > 0 ? " " + rh + "h" : ""}`;
}

/** Duration pill HTML for heatmap dot popups — with alert coloring */
function durationPillHtml(report: ActiveReport): string {
  const ref = report.start_time ?? report.created_at;
  if (!ref) return "";
  const diffMs = Date.now() - new Date(ref).getTime();
  if (diffMs < 0) return "";
  const hours = diffMs / 3600000;
  const elapsed = formatElapsed(report.start_time, report.created_at);
  if (!elapsed) return "";

  const level = alertLevel(hours);
  if (level === "critical") {
    return `<div style="margin-top:5px;display:inline-block;padding:2px 9px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:999px;font-size:10px;color:#dc2626;font-weight:700;">🔴 ${elapsed}</div>`;
  }
  if (level === "warning") {
    return `<div style="margin-top:5px;display:inline-block;padding:2px 9px;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:999px;font-size:10px;color:#ea580c;font-weight:700;">🟠 ${elapsed}</div>`;
  }
  const isElec = report.service_type === "electricity";
  const bg = isElec ? "#fffbeb" : "#eff6ff";
  const border = isElec ? "#fde68a" : "#bfdbfe";
  const color = isElec ? "#92400e" : "#1e40af";
  return `<div style="margin-top:5px;display:inline-block;padding:2px 9px;background:${bg};border:1px solid ${border};border-radius:999px;font-size:10px;color:${color};font-weight:600;">⏱ ${elapsed}</div>`;
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

interface InfraStats {
  commune: string;
  couleur: string;
  population: number;
  elec_infra_actifs: number;
  elec_infra_resolus: number;
  elec_infra_total: number;
  elec_infra_verified: number;
  eau_infra_actifs: number;
  eau_infra_resolus: number;
  eau_infra_total: number;
  eau_infra_verified: number;
  mairie_infra_actifs: number;
  mairie_infra_resolus: number;
  mairie_infra_total: number;
  mairie_infra_verified: number;
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

/** Format hours into human-readable string */
function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}h${mm > 0 ? mm + "m" : ""}`;
  }
  const d = Math.floor(h / 24);
  const rh = Math.round(h % 24);
  return `${d}j${rh > 0 ? " " + rh + "h" : ""}`;
}

/** Alert level based on hours (null = normal, "warning" = 10h+, "critical" = 24h+) */
function alertLevel(h: number): "normal" | "warning" | "critical" {
  if (h >= 24) return "critical";
  if (h >= 10) return "warning";
  return "normal";
}

/** Badge HTML for active outage duration in commune popup */
function activeDurationBadgeHtml(h: number, serviceType: string): string {
  const level = alertLevel(h);
  const label = formatHours(h);
  const isElec = serviceType === "electricity";
  const emoji = isElec ? "⚡" : "💧";

  if (level === "critical") {
    return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:999px;font-size:10px;font-weight:700;color:#dc2626;">🔴 ${emoji} ${label}</span>`;
  }
  if (level === "warning") {
    return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:999px;font-size:10px;font-weight:700;color:#ea580c;">🟠 ${emoji} ${label}</span>`;
  }
  return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;font-size:10px;font-weight:600;color:#16a34a;">🟢 ${emoji} ${label}</span>`;
}

type MapMode = "coupures" | "infrastructures";
type CoupureFilter = "all" | "electricity" | "water";
type InfraFilter = "all" | "cie" | "sodeci" | "mairie";
type PeriodFilter = "all" | "today" | "7d" | "30d";

/** Compute centroid of a GeoJSON feature (Polygon / MultiPolygon) */
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
  const [searchParams] = useSearchParams();
  const initialMode: MapMode = searchParams.get("mode") === "infrastructures" ? "infrastructures" : "coupures";
  const initialCoupureFilter = (searchParams.get("service") as CoupureFilter) || "all";

  const [mode, setMode] = useState<MapMode>(initialMode);
  const [coupureFilter, setCoupureFilter] = useState<CoupureFilter>(initialCoupureFilter);
  const [infraFilter, setInfraFilter] = useState<InfraFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [focusedCommune, setFocusedCommune] = useState<string | null>(null);

  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [infraStats, setInfraStats] = useState<InfraStats[]>([]);
  const [durationStats, setDurationStats] = useState<DurationStat[]>([]);
  const [activeDurations, setActiveDurations] = useState<ActiveDurationStat[]>([]);
  const [boundaries, setBoundaries] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeReports, setActiveReports] = useState<ActiveReport[]>([]);
  const heatmapLayerGroup = useRef<L.LayerGroup | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [sRes, iRes, geoRes, dRes, adRes] = await Promise.all([
        supabase.rpc("get_commune_service_stats"),
        supabase.rpc("get_commune_infrastructure_stats" as any),
        fetch("/data/communes-boundaries.geojson").then(r => r.json()).catch(() => null),
        supabase.rpc("get_commune_duration_stats"),
        supabase.rpc("get_commune_active_durations" as any),
      ]);
      if (!sRes.error && sRes.data) setStats(sRes.data as unknown as CommuneServiceStat[]);
      if (!dRes.error && dRes.data) setDurationStats(dRes.data as unknown as DurationStat[]);
      if (!adRes.error && adRes.data) setActiveDurations(adRes.data as unknown as ActiveDurationStat[]);
      if (!iRes.error && iRes.data) setInfraStats(iRes.data as unknown as InfraStats[]);
      if (geoRes) setBoundaries(geoRes);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current).setView([5.36, -4.01], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Fetch active reports for heat-map when toggle is on (respects period + commune focus)
  useEffect(() => {
    if (!showHeatmap) {
      setActiveReports([]);
      return;
    }
    let query = supabase
      .from("reports")
      .select("id, latitude, longitude, service_type, verifications, commune, created_at, start_time, status")
      .in("status", ["active", "chronic"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(500);

    if (periodFilter !== "all") {
      const now = new Date();
      if (periodFilter === "today") now.setHours(0, 0, 0, 0);
      else if (periodFilter === "7d") now.setDate(now.getDate() - 7);
      else if (periodFilter === "30d") now.setDate(now.getDate() - 30);
      query = query.gte("created_at", now.toISOString());
    }
    if (focusedCommune) {
      query = query.eq("commune", focusedCommune);
    }

    query.then(({ data }) => {
      if (data) setActiveReports(data as ActiveReport[]);
    });
  }, [showHeatmap, periodFilter, focusedCommune]);

  // Pan + zoom to focused commune
  useEffect(() => {
    if (!mapInstance.current || !focusedCommune) return;
    const commune = COMMUNES.find((c) => c.nom === focusedCommune);
    if (commune) {
      mapInstance.current.flyTo([commune.centerLat, commune.centerLon], 14, { duration: 1 });
    }
  }, [focusedCommune]);

  // Render / clear heat-map layer
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Remove existing heat-map layer
    if (heatmapLayerGroup.current) {
      heatmapLayerGroup.current.clearLayers();
      map.removeLayer(heatmapLayerGroup.current);
      heatmapLayerGroup.current = null;
    }

    if (!showHeatmap || activeReports.length === 0) return;

    const group = L.layerGroup().addTo(map);
    heatmapLayerGroup.current = group;

    // Tiny fuzz (~150m) to protect exact user positions
    const fuzz = () => (Math.random() - 0.5) * 0.003;

    // Group nearby dots (simple spatial cluster: ~300m grid)
    const GRID = 0.003; // ~300m
    const clusterMap = new Map<string, ActiveReport[]>();
    activeReports.forEach((r) => {
      const gx = Math.round(r.latitude / GRID);
      const gy = Math.round(r.longitude / GRID);
      const key = `${r.service_type}_${gx}_${gy}`;
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(r);
    });

    clusterMap.forEach((cluster) => {
      const r0 = cluster[0];
      const isElec = r0.service_type === "electricity";
      const baseColor = isElec ? "#f59e0b" : "#3b82f6";

      // Oldest start in cluster
      const oldestMs = Math.min(...cluster.map(r => new Date(r.start_time ?? r.created_at).getTime()));
      const hoursOldest = (Date.now() - oldestMs) / 3600000;
      const level = alertLevel(hoursOldest);

      // Chronic if any report in cluster is chronic
      const isChronic = cluster.some((r: any) => r.status === "chronic");

      // Color override for alert level and chronic
      const fillColor = isChronic ? "#7c3aed"
        : level === "critical" ? "#dc2626"
        : level === "warning" ? "#ea580c"
        : baseColor;
      const borderColor = isChronic ? "#ddd6fe"
        : level === "critical" ? "#fca5a5"
        : level === "warning" ? "#fed7aa"
        : "#fff";
      const borderWeight = isChronic ? 3 : level !== "normal" ? 2.5 : 1.5;

      const totalVerifs = cluster.reduce((s, r) => s + r.verifications, 0);
      const radius = Math.min(6 + Math.min(totalVerifs * 2, 18) + (cluster.length > 1 ? 4 : 0), 28);

      // Centroid of cluster
      const lat = cluster.reduce((s, r) => s + r.latitude, 0) / cluster.length + fuzz();
      const lon = cluster.reduce((s, r) => s + r.longitude, 0) / cluster.length + fuzz();

      const countBadge = cluster.length > 1
        ? `<span style="display:inline-block;background:#1e293b;color:#fff;border-radius:999px;font-size:9px;font-weight:700;padding:1px 6px;margin-left:3px">${cluster.length}</span>`
        : '';

      const chronicBadge = isChronic
        ? `<span style="display:inline-block;background:#7c3aed;color:#fff;border-radius:999px;font-size:9px;font-weight:700;padding:1px 6px;margin-top:2px">🔴 Chronique +14j</span>`
        : '';

      L.circleMarker([lat, lon], {
        radius,
        fillColor,
        color: borderColor,
        weight: borderWeight,
        opacity: 1,
        fillOpacity: isChronic ? 0.9 : level !== "normal" ? 0.85 : 0.65,
      })
        .addTo(group)
        .bindPopup(
          `<div style="text-align:center;min-width:150px">
            <span style="font-size:18px">${isElec ? "⚡" : "💧"}</span>${countBadge}<br/>
            <strong style="color:${fillColor}">${r0.commune}</strong><br/>
            <span style="font-size:11px;color:#666">${totalVerifs} confirmation${totalVerifs !== 1 ? "s" : ""}${cluster.length > 1 ? ` · ${cluster.length} signalements` : ""}</span>
            ${chronicBadge}
            ${durationPillHtml({ ...r0, start_time: new Date(oldestMs).toISOString() })}
          </div>`
        );
    });
  }, [showHeatmap, activeReports]);

  // Update markers
  useEffect(() => {
    if (!mapInstance.current || loading) return;
    const map = mapInstance.current;
    map.eachLayer((layer) => { if (!(layer instanceof L.TileLayer)) map.removeLayer(layer); });

    // Draw commune boundaries from GeoJSON
    if (boundaries && boundaries.features) {
      boundaries.features.forEach((feature: any) => {
        const name = feature.properties?.name;
        const communeColor = COMMUNE_COLORS[name] || COMMUNE_COLORS[
          Object.keys(COMMUNE_COLORS).find(k => k.toLowerCase() === name?.toLowerCase()) || ""
        ] || "#888";

        L.geoJSON(feature, {
          style: {
            color: communeColor,
            fillColor: communeColor,
            fillOpacity: 0.12,
            weight: 2.5,
            opacity: 0.8,
            dashArray: undefined,
          },
        }).addTo(map).bindPopup(`<strong>${name}</strong><br/>${(COMMUNES.find(c => c.nom.toLowerCase() === name?.toLowerCase())?.population || 0) / 1000 | 0}k habitants`);
      });
    } else {
      // Fallback to circles if GeoJSON unavailable
      COMMUNES.forEach((c) => {
        L.circle([c.centerLat, c.centerLon], {
          radius: c.rayonM, color: c.couleur, fillColor: c.couleur, fillOpacity: 0.10, weight: 2,
        }).addTo(map).bindPopup(`<strong>${c.nom}</strong><br/>${(c.population / 1000).toFixed(0)}k habitants`);
      });
    }

    // Build centroid lookup from GeoJSON boundaries
    const centroids: Record<string, [number, number]> = {};
    if (boundaries?.features) {
      boundaries.features.forEach((f: any) => {
        const name = f.properties?.name;
        if (!name) return;
        const centroid = computeCentroid(f);
        if (centroid) {
          // Match by case-insensitive name
          const matched = COMMUNES.find(c => c.nom.toLowerCase() === name.toLowerCase());
          if (matched) centroids[matched.nom] = centroid;
        }
      });
    }

    /** Get marker position: centroid from GeoJSON if available, else static center */
    const getMarkerPos = (c: typeof COMMUNES[0]): [number, number] =>
      centroids[c.nom] || [c.centerLat, c.centerLon];

    // Add markers
    COMMUNES.forEach((c) => {
      if (mode === "coupures") {
        renderCoupureMarker(map, c, getMarkerPos(c));
      } else {
        renderInfraMarker(map, c, getMarkerPos(c));
      }
    });
  }, [stats, infraStats, durationStats, activeDurations, loading, mode, coupureFilter, infraFilter, boundaries]);

  const renderCoupureMarker = (map: L.Map, c: typeof COMMUNES[0], pos: [number, number]) => {
    const s = stats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
    let actifs = 0, resolus = 0, total = 0, verified = 0;
    if (s) {
      if (coupureFilter === "electricity") {
        actifs = s.electricite_actifs; resolus = s.electricite_resolus; total = s.electricite_total; verified = s.electricite_verified;
      } else if (coupureFilter === "water") {
        actifs = s.eau_actifs; resolus = s.eau_resolus; total = s.eau_total; verified = s.eau_verified;
      } else {
        actifs = s.electricite_actifs + s.eau_actifs;
        resolus = s.electricite_resolus + s.eau_resolus;
        total = s.electricite_total + s.eau_total;
        verified = s.electricite_verified + s.eau_verified;
      }
    }

    const hasVerified = verified > 0;
    const verifiedPercent = actifs > 0 ? Math.round((verified / actifs) * 100) : 0;
    const markerSize = actifs > 0 ? 52 : 36;
    let markerHtml = '';

    if (coupureFilter === "all" && s && (s.electricite_actifs > 0 || s.eau_actifs > 0)) {
      markerHtml = `<div style="position:relative;display:flex;align-items:center;gap:2px;">
        <div style="background:#f59e0b;color:white;width:${markerSize / 2 + 2}px;height:${markerSize}px;border-radius:${markerSize / 2}px 0 0 ${markerSize / 2}px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:${hasVerified ? '2px solid #22c55e' : '2px solid white'};border-right:1px solid rgba(255,255,255,0.3);font-size:11px;font-weight:bold;box-shadow:${hasVerified ? '0 0 10px rgba(34,197,94,0.5)' : '0 2px 8px rgba(0,0,0,.3)'};"><span style="font-size:10px">⚡</span>${s.electricite_actifs}</div>
        <div style="background:#3b82f6;color:white;width:${markerSize / 2 + 2}px;height:${markerSize}px;border-radius:0 ${markerSize / 2}px ${markerSize / 2}px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;border:${hasVerified ? '2px solid #22c55e' : '2px solid white'};border-left:none;font-size:11px;font-weight:bold;box-shadow:${hasVerified ? '0 0 10px rgba(34,197,94,0.5)' : '0 2px 8px rgba(0,0,0,.3)'};"><span style="font-size:10px">💧</span>${s.eau_actifs}</div>
        ${hasVerified ? `<span style="position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);">✓</span>` : ''}
      </div>`;
    } else {
      const emoji = coupureFilter === "electricity" ? "⚡" : coupureFilter === "water" ? "💧" : "";
      const bg = coupureFilter === "electricity" ? "#f59e0b" : coupureFilter === "water" ? "#3b82f6" : c.couleur;
      markerHtml = `<div style="position:relative;background:${bg};color:white;width:${markerSize}px;height:${markerSize}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:${hasVerified ? '3px solid #22c55e' : '3px solid white'};box-shadow:${hasVerified ? '0 0 12px rgba(34,197,94,0.6), 0 2px 10px rgba(0,0,0,.35)' : '0 2px 10px rgba(0,0,0,.35)'};font-size:${actifs > 0 ? 15 : 13}px;font-weight:bold;">${emoji}${actifs > 0 ? actifs : '·'}${hasVerified ? `<span style="position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);">✓</span>` : ''}</div>`;
    }

    const isSplit = coupureFilter === "all" && s && (s.electricite_actifs > 0 || s.eau_actifs > 0);
    const icon = L.divIcon({
      className: "",
      html: markerHtml,
      iconSize: [isSplit ? markerSize + 6 : markerSize, markerSize],
      iconAnchor: [isSplit ? (markerSize + 6) / 2 : markerSize / 2, markerSize / 2],
    });

    const serviceLabel = coupureFilter === "electricity" ? "Électricité" : coupureFilter === "water" ? "Eau" : "Eau & Électricité";

    // Confirmation status HTML
    let confirmHtml = '';
    if (actifs > 0) {
      if (hasVerified) {
        confirmHtml = `<div style="margin-top:6px;padding:5px 10px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:8px;text-align:center"><span style="font-size:13px;color:#16a34a;font-weight:700">✓ ${verified} confirmé${verified > 1 ? 's' : ''} (${verifiedPercent}%)</span><br/><span style="font-size:10px;color:#15803d">${verified} sur ${actifs} signalement${actifs > 1 ? 's' : ''} vérifié${verified > 1 ? 's' : ''} par les voisins</span></div>`;
      } else {
        confirmHtml = `<div style="margin-top:6px;padding:5px 10px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;text-align:center"><span style="font-size:11px;color:#92400e">⏳ En attente de confirmation des voisins</span></div>`;
      }
    }

    const breakdownHtml = coupureFilter === "all" && s
      ? `<div style="margin-top:6px;display:flex;gap:4px;justify-content:center">
          <div style="flex:1;padding:4px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;text-align:center"><span style="font-size:12px">⚡</span><br/><span style="font-size:13px;font-weight:bold;color:#d97706">${s.electricite_actifs}</span>${s.electricite_verified > 0 ? `<br/><span style="font-size:9px;color:#16a34a">✓ ${s.electricite_verified}</span>` : ''}</div>
          <div style="flex:1;padding:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;text-align:center"><span style="font-size:12px">💧</span><br/><span style="font-size:13px;font-weight:bold;color:#2563eb">${s.eau_actifs}</span>${s.eau_verified > 0 ? `<br/><span style="font-size:9px;color:#16a34a">✓ ${s.eau_verified}</span>` : ''}</div>
        </div>` : '';

    // Active duration stats for this commune (coupure en cours depuis...)
    const communeName = c.nom.toLowerCase();
    const elecActive = activeDurations.find(d => d.commune.toLowerCase() === communeName && d.service_type === 'electricity');
    const eauActive  = activeDurations.find(d => d.commune.toLowerCase() === communeName && d.service_type === 'water');
    const showElecActive = coupureFilter !== "water" && elecActive && elecActive.longest_hours > 0;
    const showEauActive  = coupureFilter !== "electricity" && eauActive && eauActive.longest_hours > 0;

    // Build duration section: active outage duration with alert badges
    const activeBadges = [
      showElecActive ? activeDurationBadgeHtml(elecActive!.longest_hours, 'electricity') : '',
      showEauActive  ? activeDurationBadgeHtml(eauActive!.longest_hours,  'water')       : '',
    ].filter(Boolean).join(' ');

    const durationHtml = activeBadges
      ? `<div style="margin-top:6px;padding:4px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">En cours depuis</div>
          <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">${activeBadges}</div>
        </div>`
      : '';

    L.marker(pos, { icon })
      .addTo(map)
      .bindPopup(`<div style="min-width:180px;text-align:center"><strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/><span style="font-size:11px;color:#666">${serviceLabel} — Coupures</span><br/><span style="font-size:22px;font-weight:bold">${total}</span> <span style="font-size:11px;color:#666">signalement${total > 1 ? 's' : ''}</span><br/><span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? 's' : ''} · ✅ ${resolus} résolu${resolus > 1 ? 's' : ''}</span>${breakdownHtml}${confirmHtml}${durationHtml}<div style="margin-top:10px"><a href="/commune/${encodeURIComponent(c.nom)}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;font-size:12px;font-weight:700;padding:7px 16px;border-radius:8px;box-shadow:0 2px 6px rgba(14,165,233,0.3);">Voir les signalements →</a></div></div>`);
  };

  const renderInfraMarker = (map: L.Map, c: typeof COMMUNES[0], pos: [number, number]) => {
    const s = infraStats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
    let actifs = 0, resolus = 0, total = 0, verified = 0;
    if (s) {
      if (infraFilter === "cie") {
        actifs = s.elec_infra_actifs; resolus = s.elec_infra_resolus; total = s.elec_infra_total; verified = s.elec_infra_verified;
      } else if (infraFilter === "sodeci") {
        actifs = s.eau_infra_actifs; resolus = s.eau_infra_resolus; total = s.eau_infra_total; verified = s.eau_infra_verified;
      } else if (infraFilter === "mairie") {
        actifs = s.mairie_infra_actifs; resolus = s.mairie_infra_resolus; total = s.mairie_infra_total; verified = s.mairie_infra_verified;
      } else {
        actifs = s.elec_infra_actifs + s.eau_infra_actifs + s.mairie_infra_actifs;
        resolus = s.elec_infra_resolus + s.eau_infra_resolus + s.mairie_infra_resolus;
        total = s.elec_infra_total + s.eau_infra_total + s.mairie_infra_total;
        verified = s.elec_infra_verified + s.eau_infra_verified + s.mairie_infra_verified;
      }
    }

    const hasVerified = verified > 0;
    const markerSize = actifs > 0 ? 52 : 36;

    if (infraFilter === "all" && s && (s.elec_infra_actifs > 0 || s.eau_infra_actifs > 0 || s.mairie_infra_actifs > 0)) {
      // Triple split marker with icons
      const segW = Math.round(markerSize / 3) + 2;
      const imgSize = 16;
      const markerHtml = `<div style="position:relative;display:flex;align-items:center;gap:1px;">
        <div style="background:#f59e0b;color:white;width:${segW}px;height:${markerSize}px;border-radius:${markerSize / 2}px 0 0 ${markerSize / 2}px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid white;border-right:none;font-size:10px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.3);"><img src="${INFRA_CATEGORY_ICONS.cie}" style="width:${imgSize}px;height:${imgSize}px;object-fit:contain;border-radius:2px;" />${s.elec_infra_actifs}</div>
        <div style="background:#3b82f6;color:white;width:${segW}px;height:${markerSize}px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-top:2px solid white;border-bottom:2px solid white;font-size:10px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.3);"><img src="${INFRA_CATEGORY_ICONS.sodeci}" style="width:${imgSize}px;height:${imgSize}px;object-fit:contain;border-radius:2px;" />${s.eau_infra_actifs}</div>
        <div style="background:#10b981;color:white;width:${segW}px;height:${markerSize}px;border-radius:0 ${markerSize / 2}px ${markerSize / 2}px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid white;border-left:none;font-size:10px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.3);"><img src="${INFRA_CATEGORY_ICONS.mairie}" style="width:${imgSize}px;height:${imgSize}px;object-fit:contain;border-radius:2px;" />${s.mairie_infra_actifs}</div>
        ${hasVerified ? `<span style="position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;border:2px solid white;">✓</span>` : ''}
      </div>`;

      const icon = L.divIcon({ className: "", html: markerHtml, iconSize: [segW * 3 + 4, markerSize], iconAnchor: [(segW * 3 + 4) / 2, markerSize / 2] });

      const imgS = 20;
      const breakdownHtml = `<div style="margin-top:6px;display:flex;gap:4px;justify-content:center">
        <div style="flex:1;padding:4px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;text-align:center"><img src="${INFRA_CATEGORY_ICONS.cie}" style="width:${imgS}px;height:${imgS}px;object-fit:contain;margin:0 auto 2px;" /><br/><span style="font-size:10px;color:#92400e">CIE</span><br/><span style="font-size:13px;font-weight:bold;color:#d97706">${s.elec_infra_actifs}</span></div>
        <div style="flex:1;padding:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;text-align:center"><img src="${INFRA_CATEGORY_ICONS.sodeci}" style="width:${imgS}px;height:${imgS}px;object-fit:contain;margin:0 auto 2px;" /><br/><span style="font-size:10px;color:#1e40af">SODECI</span><br/><span style="font-size:13px;font-weight:bold;color:#2563eb">${s.eau_infra_actifs}</span></div>
        <div style="flex:1;padding:4px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;text-align:center"><img src="${INFRA_CATEGORY_ICONS.mairie}" style="width:${imgS}px;height:${imgS}px;object-fit:contain;margin:0 auto 2px;" /><br/><span style="font-size:10px;color:#065f46">Mairie</span><br/><span style="font-size:13px;font-weight:bold;color:#059669">${s.mairie_infra_actifs}</span></div>
      </div>`;

      const verifiedPercent = actifs > 0 ? Math.round((verified / actifs) * 100) : 0;
      let infraConfirmHtml = '';
      if (actifs > 0) {
        if (hasVerified) {
          infraConfirmHtml = `<div style="margin-top:6px;padding:5px 10px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:8px;text-align:center"><span style="font-size:13px;color:#16a34a;font-weight:700">✓ ${verified} soutenu${verified > 1 ? 's' : ''} (${verifiedPercent}%)</span><br/><span style="font-size:10px;color:#15803d">soutenu${verified > 1 ? 's' : ''} pour réparation</span></div>`;
        } else {
          infraConfirmHtml = `<div style="margin-top:6px;padding:5px 10px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;text-align:center"><span style="font-size:11px;color:#92400e">⏳ En attente de confirmation</span></div>`;
        }
      }

      L.marker(pos, { icon })
        .addTo(map)
        .bindPopup(`<div style="min-width:200px;text-align:center"><strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/><span style="font-size:11px;color:#666">Infrastructures</span><br/><span style="font-size:22px;font-weight:bold">${total}</span> <span style="font-size:11px;color:#666">signalement${total > 1 ? 's' : ''}</span><br/><span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? 's' : ''} · ✅ ${resolus} résolu${resolus > 1 ? 's' : ''}</span>${breakdownHtml}${infraConfirmHtml}<div style="margin-top:10px"><a href="/commune/${encodeURIComponent(c.nom)}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;font-size:12px;font-weight:700;padding:7px 16px;border-radius:8px;box-shadow:0 2px 6px rgba(14,165,233,0.3);">Voir les signalements →</a></div></div>`);
    } else {
      const infraIcon = infraFilter === "cie" ? INFRA_CATEGORY_ICONS.cie : infraFilter === "sodeci" ? INFRA_CATEGORY_ICONS.sodeci : infraFilter === "mairie" ? INFRA_CATEGORY_ICONS.mairie : "";
      const bg = infraFilter === "cie" ? "#f59e0b" : infraFilter === "sodeci" ? "#3b82f6" : infraFilter === "mairie" ? "#10b981" : "#6b7280";
      const iconImg = infraIcon ? `<img src="${infraIcon}" style="width:20px;height:20px;object-fit:contain;border-radius:3px;" />` : "🔧";
      const markerHtml = `<div style="position:relative;background:${bg};color:white;width:${markerSize}px;height:${markerSize}px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35);font-size:${actifs > 0 ? 13 : 11}px;font-weight:bold;gap:1px;">${iconImg}<span>${actifs > 0 ? actifs : '·'}</span>${hasVerified ? `<span style="position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid white;">✓</span>` : ''}</div>`;

      const icon = L.divIcon({ className: "", html: markerHtml, iconSize: [markerSize, markerSize], iconAnchor: [markerSize / 2, markerSize / 2] });
      const label = infraFilter === "cie" ? "Infra. CIE" : infraFilter === "sodeci" ? "Infra. SODECI" : infraFilter === "mairie" ? "Infra. Mairie" : "Toutes infrastructures";

      const singleVerifiedPercent = actifs > 0 ? Math.round((verified / actifs) * 100) : 0;
      let singleConfirmHtml = '';
      if (actifs > 0) {
        if (hasVerified) {
          singleConfirmHtml = `<div style="margin-top:6px;padding:5px 10px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:8px;text-align:center"><span style="font-size:13px;color:#16a34a;font-weight:700">✓ ${verified} soutenu${verified > 1 ? 's' : ''} (${singleVerifiedPercent}%)</span><br/><span style="font-size:10px;color:#15803d">soutenu${verified > 1 ? 's' : ''} pour réparation</span></div>`;
        } else {
          singleConfirmHtml = `<div style="margin-top:6px;padding:5px 10px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;text-align:center"><span style="font-size:11px;color:#92400e">⏳ En attente de confirmation</span></div>`;
        }
      }

      L.marker(pos, { icon })
        .addTo(map)
        .bindPopup(`<div style="min-width:180px;text-align:center"><strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/><span style="font-size:11px;color:#666">${label}</span><br/><span style="font-size:22px;font-weight:bold">${total}</span> <span style="font-size:11px;color:#666">signalement${total > 1 ? 's' : ''}</span><br/><span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? 's' : ''} · ✅ ${resolus} résolu${resolus > 1 ? 's' : ''}</span>${singleConfirmHtml}<div style="margin-top:10px"><a href="/commune/${encodeURIComponent(c.nom)}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;text-decoration:none;font-size:12px;font-weight:700;padding:7px 16px;border-radius:8px;box-shadow:0 2px 6px rgba(14,165,233,0.3);">Voir les signalements →</a></div></div>`);
    }
  };

  // Compute totals for display
  const getCoupureTotals = () => {
    const e = stats.reduce((a, c) => a + c.electricite_actifs, 0);
    const w = stats.reduce((a, c) => a + c.eau_actifs, 0);
    const ev = stats.reduce((a, c) => a + c.electricite_verified, 0);
    const wv = stats.reduce((a, c) => a + c.eau_verified, 0);
    if (coupureFilter === "electricity") return { actifs: e, verified: ev, total: stats.reduce((a, c) => a + c.electricite_total, 0), elec: e, eau: w };
    if (coupureFilter === "water") return { actifs: w, verified: wv, total: stats.reduce((a, c) => a + c.eau_total, 0), elec: e, eau: w };
    return { actifs: e + w, verified: ev + wv, total: stats.reduce((a, c) => a + c.electricite_total + c.eau_total, 0), elec: e, eau: w };
  };

  const getInfraTotals = () => {
    const cie = infraStats.reduce((a, c) => a + c.elec_infra_actifs, 0);
    const sod = infraStats.reduce((a, c) => a + c.eau_infra_actifs, 0);
    const mai = infraStats.reduce((a, c) => a + c.mairie_infra_actifs, 0);
    if (infraFilter === "cie") return { actifs: cie, total: infraStats.reduce((a, c) => a + c.elec_infra_total, 0), cie, sod, mai };
    if (infraFilter === "sodeci") return { actifs: sod, total: infraStats.reduce((a, c) => a + c.eau_infra_total, 0), cie, sod, mai };
    if (infraFilter === "mairie") return { actifs: mai, total: infraStats.reduce((a, c) => a + c.mairie_infra_total, 0), cie, sod, mai };
    return { actifs: cie + sod + mai, total: infraStats.reduce((a, c) => a + c.elec_infra_total + c.eau_infra_total + c.mairie_infra_total, 0), cie, sod, mai };
  };

  const ct = getCoupureTotals();
  const it = getInfraTotals();
  const currentActifs = mode === "coupures" ? ct.actifs : it.actifs;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground uppercase tracking-tight">
              {mode === "coupures"
                ? "Coupures d'eau & d'électricité — en temps réel"
                : "Infrastructures publiques — signalements citoyens"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">07 communes pilotes disponibles</p>
            <p className="mt-1 text-muted-foreground">
              {loading ? "Chargement..." : (
                <>
                  <strong className={currentActifs > 0 ? "text-destructive" : "text-success"}>
                    {currentActifs} signalement{currentActifs > 1 ? "s" : ""} actif{currentActifs > 1 ? "s" : ""}
                  </strong> en ce moment
                  {mode === "coupures" && coupureFilter === "all" && (
                    <span className="ml-2 inline-flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">⚡ {ct.elec}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">💧 {ct.eau}</span>
                    </span>
                  )}
                  {mode === "infrastructures" && infraFilter === "all" && (
                    <span className="ml-2 inline-flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><img src={INFRA_CATEGORY_ICONS.cie} className="h-3.5 w-3.5 object-contain inline" /> {it.cie}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><img src={INFRA_CATEGORY_ICONS.sodeci} className="h-3.5 w-3.5 object-contain inline" /> {it.sod}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><img src={INFRA_CATEGORY_ICONS.mairie} className="h-3.5 w-3.5 object-contain inline" /> {it.mai}</span>
                    </span>
                  )}
                </>
              )}
            </p>
            {!loading && mode === "coupures" && ct.verified > 0 && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-success">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-xs">✓</span>
                {ct.verified} confirmé{ct.verified > 1 ? 's' : ''} par la communauté
              </p>
            )}
          </div>
          <ShareButton
            title="Carte SIGNA-CI"
            text={`${currentActifs} signalements actifs sur les 7 communes pilotes d'Abidjan 📊`}
          />
        </motion.div>

        {/* Mode Toggle */}
        <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm w-fit">
          <button
            onClick={() => setMode("coupures")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              mode === "coupures"
                ? "bg-destructive text-destructive-foreground shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Coupures
          </button>
          <button
            onClick={() => setMode("infrastructures")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              mode === "infrastructures"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Construction className="h-4 w-4" />
            Infrastructures
          </button>
        </div>

        {/* Heat-map toggle */}
        <button
          onClick={() => setShowHeatmap((v) => !v)}
          className={`mb-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all border ${
            showHeatmap
              ? "bg-orange-500 text-white border-orange-500 shadow-md"
              : "bg-card text-muted-foreground border-border hover:bg-accent"
          }`}
        >
          <Flame className="h-4 w-4" />
          {showHeatmap ? "Heat-map ON" : "Heat-map signalements"}
        </button>

        {/* Filtre période */}
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Période :</span>
          {([
            { key: "all" as PeriodFilter,   label: "Tout" },
            { key: "today" as PeriodFilter,  label: "Aujourd'hui" },
            { key: "7d" as PeriodFilter,     label: "7 jours" },
            { key: "30d" as PeriodFilter,    label: "30 jours" },
          ]).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodFilter(p.key)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                periodFilter === p.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtre commune */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Commune :</span>
          <button
            onClick={() => { setFocusedCommune(null); mapInstance.current?.setView([5.36, -4.01], 12); }}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              focusedCommune === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            Toutes
          </button>
          {COMMUNES.map((c) => (
            <button
              key={c.nom}
              onClick={() => setFocusedCommune(focusedCommune === c.nom ? null : c.nom)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors border ${
                focusedCommune === c.nom
                  ? "text-white border-transparent"
                  : "bg-secondary text-secondary-foreground border-transparent hover:bg-accent"
              }`}
              style={focusedCommune === c.nom ? { backgroundColor: c.couleur, borderColor: c.couleur } : {}}
            >
              {c.nom}
            </button>
          ))}
        </div>

        {/* Sub-filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {mode === "coupures" ? (
            <>
              {([
                { key: "all" as CoupureFilter, label: "Tous", icon: <span>⚡💧</span> },
                { key: "electricity" as CoupureFilter, label: "Électricité", icon: <Zap className="h-3.5 w-3.5" /> },
                { key: "water" as CoupureFilter, label: "Eau", icon: <Droplets className="h-3.5 w-3.5" /> },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setCoupureFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    coupureFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {([
                { key: "all" as InfraFilter, label: "Tous", iconSrc: null },
                { key: "cie" as InfraFilter, label: "CIE (Lampadaires)", iconSrc: INFRA_CATEGORY_ICONS.cie },
                { key: "sodeci" as InfraFilter, label: "SODECI (Fuites)", iconSrc: INFRA_CATEGORY_ICONS.sodeci },
                { key: "mairie" as InfraFilter, label: "Mairie (Voirie)", iconSrc: INFRA_CATEGORY_ICONS.mairie },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setInfraFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    infraFilter === f.key
                      ? "bg-emerald-600 text-white"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {f.iconSrc ? <img src={f.iconSrc} className="h-4 w-4 object-contain rounded-sm" alt="" /> : <Construction className="h-3.5 w-3.5" />} {f.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Commune active counts (compact) */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {COMMUNES.map((c) => {
            let count = 0;
            if (mode === "coupures") {
              const s = stats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
              if (s) count = coupureFilter === "electricity" ? s.electricite_actifs : coupureFilter === "water" ? s.eau_actifs : s.electricite_actifs + s.eau_actifs;
            } else {
              const s = infraStats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
              if (s) count = infraFilter === "cie" ? s.elec_infra_actifs : infraFilter === "sodeci" ? s.eau_infra_actifs : infraFilter === "mairie" ? s.mairie_infra_actifs : s.elec_infra_actifs + s.eau_infra_actifs + s.mairie_infra_actifs;
            }
            if (count === 0) return null;
            return (
              <span key={c.nom} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white opacity-80" style={{ backgroundColor: c.couleur }}>
                {c.nom} · {count}
              </span>
            );
          })}
        </div>

        {/* Verification legend (coupures only) */}
        {mode === "coupures" && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-success bg-success/10 text-[10px] font-bold text-success">✓</span>
              <span>Coupure confirmée par les voisins</span>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: '#888' }} />
              <span><strong className="text-foreground">En attente</strong> — en cours de vérification</span>
            </span>
          </div>
        )}

        {mode === "infrastructures" && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <img src={INFRA_CATEGORY_ICONS.cie} className="h-5 w-5 object-contain rounded" alt="CIE" />
              <span><strong className="text-foreground">CIE</strong> — Lampadaires, poteaux</span>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <img src={INFRA_CATEGORY_ICONS.sodeci} className="h-5 w-5 object-contain rounded" alt="SODECI" />
              <span><strong className="text-foreground">SODECI</strong> — Fuites, canalisations</span>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <img src={INFRA_CATEGORY_ICONS.mairie} className="h-5 w-5 object-contain rounded" alt="Mairie" />
              <span><strong className="text-foreground">Mairie</strong> — Voirie, caniveaux</span>
            </span>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="overflow-hidden rounded-xl border border-border shadow-card">
          <div ref={mapRef} className="h-[500px] w-full" />
        </motion.div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          🔒 Les positions affichées sont légèrement décalées (~150 m) pour protéger la vie privée des utilisateurs.
        </p>
      </main>
    </div>
  );
};

export default MapPage;
