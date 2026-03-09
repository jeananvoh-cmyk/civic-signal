import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Droplets, Construction, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import { INFRA_CATEGORY_ICONS } from "@/lib/infra-icons";
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

type MapMode = "coupures" | "infrastructures";
type CoupureFilter = "all" | "electricity" | "water";
type InfraFilter = "all" | "cie" | "sodeci" | "mairie";

const MapPage = () => {
  const [searchParams] = useSearchParams();
  const initialMode: MapMode = searchParams.get("mode") === "infrastructures" ? "infrastructures" : "coupures";
  const initialCoupureFilter = (searchParams.get("service") as CoupureFilter) || "all";

  const [mode, setMode] = useState<MapMode>(initialMode);
  const [coupureFilter, setCoupureFilter] = useState<CoupureFilter>(initialCoupureFilter);
  const [infraFilter, setInfraFilter] = useState<InfraFilter>("all");

  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [infraStats, setInfraStats] = useState<InfraStats[]>([]);
  const [boundaries, setBoundaries] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [sRes, iRes, geoRes] = await Promise.all([
        supabase.rpc("get_commune_service_stats"),
        supabase.rpc("get_commune_infrastructure_stats" as any),
        fetch("/data/communes-boundaries.geojson").then(r => r.json()).catch(() => null),
      ]);
      if (!sRes.error && sRes.data) setStats(sRes.data as unknown as CommuneServiceStat[]);
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

    // Add markers
    COMMUNES.forEach((c) => {
      if (mode === "coupures") {
        renderCoupureMarker(map, c);
      } else {
        renderInfraMarker(map, c);
      }
    });
  }, [stats, infraStats, loading, mode, coupureFilter, infraFilter, boundaries]);

  const renderCoupureMarker = (map: L.Map, c: typeof COMMUNES[0]) => {
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
    let verifiedHtml = '';
    if (hasVerified) {
      verifiedHtml = `<div style="margin-top:6px;padding:5px 10px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:8px;text-align:center"><span style="font-size:13px;color:#16a34a;font-weight:700">✓ Confirmé à ${verifiedPercent}%</span><br/><span style="font-size:10px;color:#15803d">par les voisins</span></div>`;
    }
    const breakdownHtml = coupureFilter === "all" && s
      ? `<div style="margin-top:6px;display:flex;gap:4px;justify-content:center">
          <div style="flex:1;padding:4px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;text-align:center"><span style="font-size:12px">⚡</span><br/><span style="font-size:13px;font-weight:bold;color:#d97706">${s.electricite_actifs}</span></div>
          <div style="flex:1;padding:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;text-align:center"><span style="font-size:12px">💧</span><br/><span style="font-size:13px;font-weight:bold;color:#2563eb">${s.eau_actifs}</span></div>
        </div>` : '';

    L.marker([c.centerLat, c.centerLon], { icon })
      .addTo(map)
      .bindPopup(`<div style="min-width:180px;text-align:center"><strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/><span style="font-size:11px;color:#666">${serviceLabel} — Coupures</span><br/><span style="font-size:22px;font-weight:bold">${total}</span> <span style="font-size:11px;color:#666">signalement${total > 1 ? 's' : ''}</span><br/><span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? 's' : ''} · ✅ ${resolus} résolu${resolus > 1 ? 's' : ''}</span>${breakdownHtml}${verifiedHtml}</div>`);
  };

  const renderInfraMarker = (map: L.Map, c: typeof COMMUNES[0]) => {
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

      L.marker([c.centerLat, c.centerLon], { icon })
        .addTo(map)
        .bindPopup(`<div style="min-width:200px;text-align:center"><strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/><span style="font-size:11px;color:#666">Infrastructures</span><br/><span style="font-size:22px;font-weight:bold">${total}</span> <span style="font-size:11px;color:#666">signalement${total > 1 ? 's' : ''}</span><br/><span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? 's' : ''} · ✅ ${resolus} résolu${resolus > 1 ? 's' : ''}</span>${breakdownHtml}</div>`);
    } else {
      const infraIcon = infraFilter === "cie" ? INFRA_CATEGORY_ICONS.cie : infraFilter === "sodeci" ? INFRA_CATEGORY_ICONS.sodeci : infraFilter === "mairie" ? INFRA_CATEGORY_ICONS.mairie : "";
      const bg = infraFilter === "cie" ? "#f59e0b" : infraFilter === "sodeci" ? "#3b82f6" : infraFilter === "mairie" ? "#10b981" : "#6b7280";
      const iconImg = infraIcon ? `<img src="${infraIcon}" style="width:20px;height:20px;object-fit:contain;border-radius:3px;" />` : "🔧";
      const markerHtml = `<div style="position:relative;background:${bg};color:white;width:${markerSize}px;height:${markerSize}px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35);font-size:${actifs > 0 ? 13 : 11}px;font-weight:bold;gap:1px;">${iconImg}<span>${actifs > 0 ? actifs : '·'}</span>${hasVerified ? `<span style="position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid white;">✓</span>` : ''}</div>`;

      const icon = L.divIcon({ className: "", html: markerHtml, iconSize: [markerSize, markerSize], iconAnchor: [markerSize / 2, markerSize / 2] });
      const label = infraFilter === "cie" ? "Infra. CIE" : infraFilter === "sodeci" ? "Infra. SODECI" : infraFilter === "mairie" ? "Infra. Mairie" : "Toutes infrastructures";

      L.marker([c.centerLat, c.centerLon], { icon })
        .addTo(map)
        .bindPopup(`<div style="min-width:180px;text-align:center"><strong style="color:${c.couleur};font-size:14px">${c.nom}</strong><br/><span style="font-size:11px;color:#666">${label}</span><br/><span style="font-size:22px;font-weight:bold">${total}</span> <span style="font-size:11px;color:#666">signalement${total > 1 ? 's' : ''}</span><br/><span style="font-size:12px">🔴 ${actifs} actif${actifs > 1 ? 's' : ''} · ✅ ${resolus} résolu${resolus > 1 ? 's' : ''}</span></div>`);
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
                ? "Cartographie live des coupures d'eau et d'électricité"
                : "Cartographie live des infrastructures défaillantes"}
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
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">🔌 {it.cie}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">🚰 {it.sod}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">🏗️ {it.mai}</span>
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
            title="Carte SignalÉnergie"
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
                { key: "all" as InfraFilter, label: "Tous", icon: "🔧" },
                { key: "cie" as InfraFilter, label: "CIE (Lampadaires)", icon: "🔌" },
                { key: "sodeci" as InfraFilter, label: "SODECI (Fuites)", icon: "🚰" },
                { key: "mairie" as InfraFilter, label: "Mairie (Voirie)", icon: "🏗️" },
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
                  {f.icon} {f.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {COMMUNES.map((c) => {
            let count = 0;
            if (mode === "coupures") {
              const s = stats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
              if (s) count = coupureFilter === "electricity" ? s.electricite_actifs : coupureFilter === "water" ? s.eau_actifs : s.electricite_actifs + s.eau_actifs;
            } else {
              const s = infraStats.find((st) => st.commune.toLowerCase() === c.nom.toLowerCase());
              if (s) count = infraFilter === "cie" ? s.elec_infra_actifs : infraFilter === "sodeci" ? s.eau_infra_actifs : infraFilter === "mairie" ? s.mairie_infra_actifs : s.elec_infra_actifs + s.eau_infra_actifs + s.mairie_infra_actifs;
            }
            return (
              <span key={c.nom} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: c.couleur }}>
                {c.nom} ({count})
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
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#f59e0b' }} />
              <span><strong className="text-foreground">CIE</strong> — Lampadaires, poteaux</span>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#3b82f6' }} />
              <span><strong className="text-foreground">SODECI</strong> — Fuites, canalisations</span>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#10b981' }} />
              <span><strong className="text-foreground">Mairie</strong> — Voirie, caniveaux</span>
            </span>
          </div>
        )}

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
