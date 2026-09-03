import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PhotoGallery from "@/components/PhotoGallery";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Droplets, MapPin, Clock, ThumbsUp, CheckCircle,
  Filter, TrendingUp, AlertCircle, AlertTriangle, ChevronDown, Lightbulb,
  Landmark, ExternalLink, X as XIcon, Pencil, Map as MapIcon,
  Camera, MessageSquare, Share2, Globe, Sparkles, CheckCircle2,
  Flame, ShieldAlert, Navigation, Plus, PhoneCall, ChevronRight, ChevronLeft,
  SlidersHorizontal, Search, ArrowLeft, Send, CheckCheck, List, Layers, Compass,
  Copy, Check, Maximize2
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { extractInfraLabel, infraEmoji, cleanDescription, INFRA_CIE, INFRA_SODECI } from "@/lib/report-display";
import { getInfraIllustration } from "@/lib/infra-icons";
import { getDisplayTicketCode, formatPadaAddress } from "@/lib/pada";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Image plein écran dans le lightbox
function LightboxImage({ path }: { path: string }) {
  const url = useSignedUrl(path);
  return url ? (
    <img
      src={url}
      alt="Photo agrandie du signalement"
      className="w-full max-h-[82vh] object-contain rounded-xl"
    />
  ) : null;
}

// Vignette photo agrandie avec résolution de signature Supabase et prévisualisation au clic
function ReportThumbnail({
  path,
  alt = "Photo",
  count = 1,
  fallbackImage,
  onOpen,
}: {
  path?: string | null;
  alt?: string;
  count?: number;
  fallbackImage?: string;
  onOpen?: () => void;
}) {
  const signedUrl = useSignedUrl(path ?? null);
  const displayUrl = signedUrl || fallbackImage;
  const isRealPhoto = Boolean(signedUrl);

  if (!displayUrl) return null;

  return (
    <div
      onClick={(e) => {
        if (isRealPhoto && onOpen) {
          e.stopPropagation();
          onOpen();
        }
      }}
      className={cn(
        "group relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl overflow-hidden border-2 border-border/80 bg-muted shadow-xs transition-all duration-200",
        isRealPhoto
          ? "hover:border-emerald-500/60 hover:shadow-md cursor-pointer"
          : "opacity-90 hover:opacity-100"
      )}
      title={isRealPhoto ? "Cliquer pour agrandir la photo" : "Illustration indicative"}
    >
      <img
        src={displayUrl}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      {isRealPhoto ? (
        <>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
              <Maximize2 className="h-3.5 w-3.5" />
            </div>
          </div>
          {count > 1 && (
            <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
              +{count - 1}
            </span>
          )}
        </>
      ) : (
        <span className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-2xs text-white text-[8px] font-bold text-center py-0.5 tracking-tight">
          Illustration
        </span>
      )}
    </div>
  );
}

export interface InfraReport {
  id: string;
  user_id?: string;
  service_type: string;
  report_category?: string;
  description: string;
  location: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  resolved_at?: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  verifications: number;
  repair_verifications: number;
  support_count: number;
  latitude?: number | null;
  longitude?: number | null;
  ticket_code?: string | null;
  operator_name?: string | null;
  operator_reference?: string | null;
  operator_last_note?: string | null;
  estimated_resolution_time?: string | null;
}

export interface StatusHistoryItem {
  id: string;
  old_status?: string | null;
  new_status: string;
  operator_name?: string | null;
  operator_reference?: string | null;
  public_note?: string | null;
  estimated_resolution_time?: string | null;
  created_at: string;
}

type OperatorFilter = "all" | "cie" | "sodeci" | "mairie";
type StatusFilter = "all" | "active" | "resolved";
type SortFilter = "newest" | "supported";

const PAGE_SIZE = 40;

const OPERATOR_FILTERS: { key: OperatorFilter; label: string; icon: string; color: string }[] = [
  { key: "all", label: "Tous les opérateurs", icon: "🌐", color: "bg-slate-900 text-white dark:bg-white dark:text-slate-900" },
  { key: "cie", label: "⚡ CIE (Lampadaires & Réseau)", icon: "💡", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { key: "sodeci", label: "💧 SODECI (Fuites & Tuyaux)", icon: "💧", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { key: "mairie", label: "🏛️ Mairie (Nids-de-poule & Voirie)", icon: "🚧", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
];

/** Escape HTML special chars to prevent XSS in Leaflet popup strings */
function escHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function InfrastructurePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [reports, setReports] = useState<InfraReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<InfraReport | null>(null);
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<{ photos: string[]; index: number } | null>(null);

  // Filters state
  const [operatorFilter, setOperatorFilter] = useState<OperatorFilter>(
    (searchParams.get("operator") as OperatorFilter) || "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all"
  );
  const [communeFilter, setCommuneFilter] = useState<string>(
    searchParams.get("commune") || "all"
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("search") || ""
  );
  const [sortBy, setSortBy] = useState<SortFilter>("newest");

  // Mobile View Toggle: "list" | "map"
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [mobileBottomSheetOpen, setMobileBottomSheetOpen] = useState(false);

  // User interactions
  const [supported, setSupported] = useState<Set<string>>(new Set());
  const [repaired, setRepaired] = useState<Set<string>>(new Set());

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Fetch all infrastructure reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try public RPC first
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        "get_public_infrastructure_reports",
        { p_limit: 150, p_offset: 0 }
      );

      let list: InfraReport[] = [];
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        list = rpcData.map((item: any) => ({
          ...item,
          support_count: Number(item.support_count || item.verifications || 0),
          repair_verifications: Number(item.repair_verifications || 0),
          latitude: item.latitude ? Number(item.latitude) : null,
          longitude: item.longitude ? Number(item.longitude) : null,
        }));
      } else {
        // Fallback direct query
        const { data: directData } = await supabase
          .from("reports")
          .select("id, user_id, service_type, report_category, description, location, commune, quartier, status, urgency, created_at, resolved_at, photo_url, photo_urls, verifications, repair_verifications, support_count, latitude, longitude, ticket_code, operator_name, operator_reference, operator_last_note, estimated_resolution_time")
          .or("report_category.eq.infrastructure,service_type.eq.infrastructure,service_type.eq.mairie,service_type.eq.voirie,description.ilike.%lampadaire%,description.ilike.%éclairage%,description.ilike.%eclairage%,description.ilike.%poteau%,description.ilike.%caniveau%,description.ilike.%nid de poule%,description.ilike.%fuite%")
          .order("created_at", { ascending: false })
          .limit(150);

        list = (directData ?? []).map((item: any) => ({
          ...item,
          support_count: Number(item.support_count || item.verifications || 0),
          repair_verifications: Number(item.repair_verifications || 0),
          latitude: item.latitude ? Number(item.latitude) : null,
          longitude: item.longitude ? Number(item.longitude) : null,
        }));
      }

      // If user logged in, fetch user support votes and repair confirmations
      if (user) {
        const [{ data: myVotes }, { data: myRepairs }] = await Promise.all([
          supabase.from("report_support_votes").select("report_id").eq("user_id", user.id),
          supabase.from("repair_confirmations").select("report_id").eq("user_id", user.id),
        ]);
        if (myVotes) setSupported(new Set(myVotes.map((v: any) => v.report_id)));
        if (myRepairs) setRepaired(new Set(myRepairs.map((v: any) => v.report_id)));
      }

      setReports(list);

      // Check if URL specifies a report ID to select
      const reportIdParam = searchParams.get("id");
      if (reportIdParam) {
        const target = list.find((r) => r.id === reportIdParam);
        if (target) {
          setSelectedReport(target);
          if (window.innerWidth < 1024) setMobileBottomSheetOpen(true);
        }
      }
    } catch (e) {
      console.warn("Error fetching infrastructure reports:", e);
    } finally {
      setLoading(false);
    }
  }, [user, searchParams]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Load Status History for selected report
  useEffect(() => {
    if (!selectedReport) {
      setStatusHistory([]);
      return;
    }
    setLoadingHistory(true);
    supabase
      .from("report_status_history")
      .select("id, old_status, new_status, operator_name, operator_reference, public_note, estimated_resolution_time, created_at")
      .eq("report_id", selectedReport.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setStatusHistory(data as StatusHistoryItem[]);
        } else {
          setStatusHistory([]);
        }
        setLoadingHistory(false);
      });
  }, [selectedReport]);

  // Filtered & Sorted Reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // 1. Status Filter
      if (statusFilter === "active" && r.status === "resolved") return false;
      if (statusFilter === "resolved" && r.status !== "resolved") return false;

      // 2. Operator Filter
      const desc = (r.description || "").toLowerCase();
      if (operatorFilter === "cie") {
        const isCie = r.service_type === "electricity" || desc.includes("lampadaire") || desc.includes("éclairage") || desc.includes("eclairage") || desc.includes("poteau") || desc.includes("cie");
        if (!isCie) return false;
      } else if (operatorFilter === "sodeci") {
        const isSodeci = r.service_type === "water" || desc.includes("fuite") || desc.includes("canalisation") || desc.includes("sodeci") || desc.includes("tuyau");
        if (!isSodeci) return false;
      } else if (operatorFilter === "mairie") {
        const isMairie = r.service_type === "mairie" || r.service_type === "voirie" || desc.includes("nid de poule") || desc.includes("caniveau") || desc.includes("ordure") || desc.includes("voirie") || desc.includes("chaussée");
        if (!isMairie) return false;
      }

      // 3. Commune Filter
      if (communeFilter !== "all" && r.commune?.toLowerCase() !== communeFilter.toLowerCase()) {
        return false;
      }

      // 4. Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = desc.includes(q);
        const matchesLoc = (r.location || "").toLowerCase().includes(q);
        const matchesQuartier = (r.quartier || "").toLowerCase().includes(q);
        const matchesCommune = (r.commune || "").toLowerCase().includes(q);
        const matchesTicket = (r.ticket_code || "").toLowerCase().includes(q);
        if (!matchesDesc && !matchesLoc && !matchesQuartier && !matchesCommune && !matchesTicket) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "supported") {
        return (b.support_count || 0) - (a.support_count || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reports, statusFilter, operatorFilter, communeFilter, searchQuery, sortBy]);

  // Init Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;

    const container = mapContainerRef.current;
    const map = L.map(container, {
      zoomControl: false,
    }).setView([5.35, -4.01], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstance.current = map;

    // Invalidation de taille immédiate + progressive pour garantir l'affichage des tuiles
    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update Markers on Map
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    filteredReports.forEach((r) => {
      // Use exact coordinates or fallback approximate coordinates by commune
      let lat = r.latitude;
      let lon = r.longitude;

      if (!lat || !lon) {
        const rCommune = (r.commune || "").trim().toLowerCase();
        const commObj = COMMUNES.find((c) => c.nom.toLowerCase() === rCommune || rCommune.includes(c.nom.toLowerCase()));
        const baseLat = commObj ? commObj.centerLat : 5.3600;
        const baseLon = commObj ? commObj.centerLon : -3.9670;
        
        // slight random jitter to prevent exact overlap
        const hash = r.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterLat = ((hash % 100) - 50) * 0.0004;
        const jitterLon = (((hash * 13) % 100) - 50) * 0.0004;
        lat = baseLat + jitterLat;
        lon = baseLon + jitterLon;
      }

      const isResolved = r.status === "resolved";
      const descLower = (r.description || "").toLowerCase();
      const isCie = r.service_type === "electricity" || descLower.includes("lampadaire") || descLower.includes("éclairage") || descLower.includes("eclairage") || descLower.includes("poteau");
      const isSodeci = r.service_type === "water" || descLower.includes("fuite") || descLower.includes("canalisation");

      const iconEmoji = isCie ? "💡" : isSodeci ? "💧" : "🚧";
      const bgColor = isResolved ? "#10b981" : isCie ? "#f59e0b" : isSodeci ? "#3b82f6" : "#059669";
      const isSelected = selectedReport?.id === r.id;

      const markerHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? 44 : 36}px;
          height: ${isSelected ? 44 : 36}px;
          background: ${bgColor};
          border: ${isSelected ? "3px solid #000" : "2.5px solid #fff"};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? 20 : 16}px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: ${isSelected ? "scale(1.15)" : "scale(1)"};
        ">
          <span>${iconEmoji}</span>
          ${isResolved ? `<span style="position: absolute; top: -4px; right: -4px; background: #16a34a; color: white; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; border: 1.5px solid white;">✓</span>` : ""}
          ${r.support_count > 0 && !isResolved ? `<span style="position: absolute; bottom: -4px; right: -4px; background: #dc2626; color: white; padding: 0 4px; height: 16px; border-radius: 999px; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 1.5px solid white;">${r.support_count}</span>` : ""}
        </div>
      `;

      const customIcon = L.divIcon({
        className: "",
        html: markerHtml,
        iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
        iconAnchor: [isSelected ? 22 : 18, isSelected ? 22 : 18],
      });

      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

      // Popup Content
      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; max-width: 260px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 16px;">${iconEmoji}</span>
            <div>
              <div style="font-weight: 800; font-size: 12px; color: #0f172a; line-height: 1.2;">${escHtml(r.quartier || r.commune)}</div>
              <div style="font-size: 10px; color: #64748b;">${escHtml(r.commune)} · ${isResolved ? "✅ Réparé" : "⏳ En attente"}</div>
            </div>
          </div>
          <p style="font-size: 11px; color: #334155; margin: 4px 0 8px 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escHtml(cleanDescription(r.description))}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            <span style="font-size: 10px; font-weight: 700; color: #16a34a;">👍 ${r.support_count} soutiens</span>
            <button id="view-report-${r.id}" style="background: #10b981; color: white; border: none; border-radius: 6px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer;">
              Ouvrir la fiche ➔
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-report-${r.id}`);
        if (btn) {
          btn.onclick = () => {
            setSelectedReport(r);
            if (window.innerWidth < 1024) {
              setMobileBottomSheetOpen(true);
            }
          };
        }
      });

      marker.on("click", () => {
        setSelectedReport(r);
        if (window.innerWidth < 1024) {
          setMobileBottomSheetOpen(true);
        }
      });

      markersRef.current.set(r.id, marker);
    });

    // If commune filter changed, center map on commune
    if (communeFilter !== "all") {
      const c = COMMUNES.find((item) => item.nom.toLowerCase() === communeFilter.toLowerCase());
      if (c) {
        map.flyTo([c.centerLat, c.centerLon], 14, { duration: 1 });
      }
    }
  }, [filteredReports, selectedReport, communeFilter]);

  // Handle select report & pan map
  const handleSelectReport = (r: InfraReport) => {
    setSelectedReport(r);
    const marker = markersRef.current.get(r.id);
    if (marker && mapInstance.current) {
      const latLng = marker.getLatLng();
      mapInstance.current.flyTo(latLng, 15, { duration: 0.8 });
      marker.openPopup();
    }
    if (window.innerWidth < 1024) {
      setMobileBottomSheetOpen(true);
    }
  };

  // Support / Vote Infrastructure Report
  const handleSupport = async (reportId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast.error("Veuillez vous connecter pour soutenir ce signalement.");
      navigate(`/auth?redirect=/infrastructures?id=${reportId}`);
      return;
    }
    const already = supported.has(reportId);
    setSupported((prev) => {
      const next = new Set(prev);
      if (already) next.delete(reportId);
      else next.add(reportId);
      return next;
    });

    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, support_count: Math.max(0, r.support_count + (already ? -1 : 1)) }
          : r
      )
    );

    try {
      const { data, error } = await (supabase as any).rpc("vote_infrastructure_support", {
        p_report_id: reportId,
      });

      if (error) {
        // Fallback direct table toggle
        if (already) {
          await supabase.from("report_support_votes").delete().eq("report_id", reportId).eq("user_id", user.id);
          toast.info("Soutien retiré.");
        } else {
          await supabase.from("report_support_votes").insert({ report_id: reportId, user_id: user.id });
          toast.success("✊ Soutien enregistré ! Cela augmente la priorité d'intervention.");
        }
      } else if (data) {
        if (data.voted) {
          toast.success("✊ Soutien enregistré ! Cela augmente la priorité d'intervention.");
        } else {
          toast.info("Soutien retiré.");
        }
        if (typeof data.support_count === "number") {
          setReports((prev) =>
            prev.map((r) =>
              r.id === reportId ? { ...r, support_count: data.support_count } : r
            )
          );
        }
      }
    } catch {
      fetchReports();
    }
  };

  // Confirm Repair with Geo-Verification
  const handleConfirmRepair = async (reportId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast.error("Connectez-vous pour confirmer la réparation.");
      navigate(`/auth?redirect=/infrastructures?id=${reportId}`);
      return;
    }
    const already = repaired.has(reportId);

    if (already) {
      setRepaired((prev) => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
      try {
        await (supabase as any).rpc("cancel_repair", { p_report_id: reportId });
        toast.info("Confirmation annulée.");
        fetchReports();
      } catch {
        fetchReports();
      }
      return;
    }

    // Capture GPS pour contrôle de proximité immédiate
    let userLat: number | null = null;
    let userLon: number | null = null;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
          });
        });
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;
      } catch {
        // En cas de désactivation du GPS, l'appel RPC traitera la règle de tolérance
      }
    }

    try {
      const { data, error } = await (supabase as any).rpc("confirm_repair_with_geo", {
        p_report_id: reportId,
        p_user_lat: userLat,
        p_user_lon: userLon,
        p_max_distance_meters: 500,
      });

      if (error) {
        toast.error(error.message || "Vérification de localisation échouée.");
        return;
      }

      setRepaired((prev) => new Set(prev).add(reportId));
      toast.success(
        data?.resolved
          ? "🎉 Réparation validée et certifiée sur le terrain !"
          : "✅ Confirmation enregistrée avec vérification de proximité."
      );
      fetchReports();
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer la confirmation.");
      fetchReports();
    }
  };

  // Citizen Dispute / Reopen Report if mistakenly resolved
  const handleReopenReport = async (reportId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast.error("Connectez-vous pour contester la résolution.");
      navigate(`/auth?redirect=/infrastructures?id=${reportId}`);
      return;
    }
    try {
      const { error } = await (supabase as any).rpc("reopen_infrastructure_report", {
        p_report_id: reportId,
        p_reason: "Contesté par un riverain : le problème persiste sur le terrain.",
      });
      if (error) throw error;
      toast.success("⚠️ Signalement réactivé. Les équipes et la communauté sont notifiées.");
      fetchReports();
    } catch (err: any) {
      toast.error("Impossible de réouvrir : " + (err?.message || ""));
    }
  };

  // Generate Official WhatsApp Share Message with PADA code
  const handleShareWhatsApp = (r: InfraReport, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isResolved = r.status === "resolved";
    const statusText = isResolved ? "✅ RÉPARÉ & CLÔTURÉ" : "⏳ EN ATTENTE D'INTERVENTION";
    const displayLabel = extractInfraLabel(r.description);
    const ticketRef = getDisplayTicketCode({
      ticket_code: r.ticket_code,
      commune: r.commune,
      created_at: r.created_at,
      id: r.id,
    });
    const url = `https://signa.ci/infrastructures?id=${r.id}`;

    const text = `🚨 *SIGNALEMENT CITOYEN SIGNA.ci*
━━━━━━━━━━━━━━━━━━━━
💡 *Panne* : ${displayLabel}
📍 *Commune & Quartier* : ${r.commune} · ${r.quartier || "Abidjan"}
🏛️ *Adresse PADA* : ${r.location || "Non renseignée"}
📋 *Réf. Ticket* : ${ticketRef}
📊 *Statut* : ${statusText}
👥 *Mobilisation* : ${r.support_count || 1} citoyen(s) soutiennent ce ticket

✊ Voisins de ${r.quartier || r.commune}, cliquez ici pour soutenir et faire accélérer l'intervention :
🔗 ${url}
━━━━━━━━━━━━━━━━━━━━
_SIGNA.ci — La voix citoyenne pour nos infrastructures._`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // Center on User GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstance.current) {
          mapInstance.current.flyTo([latitude, longitude], 15, { duration: 1 });
          L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: "#3b82f6",
            color: "#ffffff",
            weight: 3,
            fillOpacity: 1,
          }).addTo(mapInstance.current).bindPopup("📍 Vous êtes ici").openPopup();
        }
      },
      () => toast.error("Impossible de récupérer votre position GPS.")
    );
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background text-foreground overflow-hidden">
      <Header />

      {/* ── TOP HEADER CIVIQUE FIXMYSTREET ── */}
      <div className="border-b border-border/80 bg-card px-4 py-2.5 shrink-0 shadow-xs">
        <div className="container max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                  Voirie, Lampadaires & Infrastructures
                </h1>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-bold">
                  ● En direct
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Le hub citoyen pour signaler, soutenir et faire réparer les pannes et dégradations urbaines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/signaler?category=infrastructure")}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Signaler un problème</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENEUR PRINCIPAL SPLIT-SCREEN PLEIN ÉCRAN ── */}
      <main className="flex-1 min-h-0 relative flex flex-col lg:flex-row overflow-hidden">
        
        {/* ═══════════════════════════════════════════════════════════════
            VOLET GAUCHE (40%) : FIL ÉPURÉ & JOURNAL OFFICIEL DES MISES À JOUR
            ═══════════════════════════════════════════════════════════════ */}
        <div className={cn(
          "w-full lg:w-[42%] xl:w-[38%] flex flex-col h-full min-h-0 bg-background border-r border-border/80 z-10 transition-all",
          mobileTab === "map" ? "hidden lg:flex" : "flex"
        )}>
          
          {/* BARRE DE RECHERCHE ET FILTRES RAPIDES */}
          <div className="p-3 border-b border-border/60 bg-card/60 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher une rue, un quartier (ex: Bonoumin, 2 Plateaux)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters Toolbar */}
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {/* Statut */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-8 px-2 rounded-lg bg-background border border-border/80 text-[11px] font-semibold text-foreground focus:outline-none"
              >
                <option value="all">Statut : Tous</option>
                <option value="active">🔴 En attente (Actifs)</option>
                <option value="resolved">✅ Réparés</option>
              </select>

              {/* Opérateur */}
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value as OperatorFilter)}
                className="h-8 px-2 rounded-lg bg-background border border-border/80 text-[11px] font-semibold text-foreground focus:outline-none"
              >
                <option value="all">Réseau : Tous</option>
                <option value="cie">💡 CIE (Électricité)</option>
                <option value="sodeci">💧 SODECI (Eau)</option>
                <option value="mairie">🚧 Mairie (Voirie)</option>
              </select>

              {/* Commune */}
              <select
                value={communeFilter}
                onChange={(e) => setCommuneFilter(e.target.value)}
                className="h-8 px-2 rounded-lg bg-background border border-border/80 text-[11px] font-semibold text-foreground focus:outline-none"
              >
                <option value="all">Commune : Toutes</option>
                {COMMUNES.map((c) => (
                  <option key={c.nom} value={c.nom}>{c.nom}</option>
                ))}
              </select>
            </div>

            {/* Sub-bar: Count & Sort */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
              <span className="font-semibold">
                {filteredReports.length} signalement{filteredReports.length > 1 ? "s" : ""} trouvé{filteredReports.length > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <span>Trier :</span>
                <button
                  onClick={() => setSortBy(sortBy === "newest" ? "supported" : "newest")}
                  className="font-bold text-foreground hover:text-emerald-600 underline"
                >
                  {sortBy === "newest" ? "Plus récents" : "Plus soutenus"}
                </button>
              </div>
            </div>
          </div>

          {/* LISTE OU FICHE DÉTAILLÉE MASTER-DETAIL */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 pb-32 lg:pb-6">
            {selectedReport ? (
              /* ── VUE FICHE OFFICIELLE STRICTE (Conforme 100% à la Base de Données) ── */
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Retour à la liste</span>
                  </button>

                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="text-xs font-bold text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
                  >
                    <Link to={`/signalement/${selectedReport.id}`}>
                      <span>Fiche officielle</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                {/* Header Fiche & Informations Réelles */}
                <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                  {/* Bande de couleur de la commune */}
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: COMMUNE_COLORS[selectedReport.commune] || "#10B981" }}
                  />

                  <div className="p-4 space-y-3.5">
                    {/* Catégorie & Statut réel */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-border/80 bg-muted shadow-2xs">
                          <img
                            src={getInfraIllustration(selectedReport.service_type, selectedReport.description)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <h2 className="text-sm font-extrabold text-foreground leading-tight">
                            {extractInfraLabel(selectedReport.description) || "Signalement infrastructure"}
                          </h2>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{selectedReport.commune} {selectedReport.quartier ? `· ${selectedReport.quartier}` : ""}</span>
                          </div>
                        </div>
                      </div>

                      <Badge className={cn(
                        "text-[10px] font-bold shrink-0",
                        selectedReport.status === "resolved"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      )}>
                        {selectedReport.status === "resolved" ? "✅ Résolu" : "🔴 En attente"}
                      </Badge>
                    </div>

                    {/* Référence Ticket Officiel */}
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">TICKET OFFICIEL : </span>
                        <span className="font-mono font-black text-foreground">
                          {getDisplayTicketCode({
                            ticket_code: selectedReport.ticket_code,
                            commune: selectedReport.commune,
                            created_at: selectedReport.created_at,
                            id: selectedReport.id,
                          })}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 gap-1 hover:bg-emerald-500/10"
                        onClick={() => {
                          const code = getDisplayTicketCode({
                            ticket_code: selectedReport.ticket_code,
                            commune: selectedReport.commune,
                            created_at: selectedReport.created_at,
                            id: selectedReport.id,
                          });
                          navigator.clipboard.writeText(code);
                          toast.success(`Ticket ${code} copié !`);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copier</span>
                      </Button>
                    </div>

                    {/* Description réelle */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/20 p-3 rounded-xl border border-border/40">
                        {cleanDescription(selectedReport.description)}
                      </p>
                    </div>

                    {/* Photos réelles depuis Supabase Storage OU illustration officielle de catégorie */}
                    {(() => {
                      const detailPhotos = selectedReport.photo_urls && selectedReport.photo_urls.length > 0
                        ? selectedReport.photo_urls
                        : (selectedReport.photo_url ? [selectedReport.photo_url] : []);
                      
                      if (detailPhotos.length > 0) {
                        return (
                          <div className="pt-1">
                            <PhotoGallery
                              photos={detailPhotos}
                              thumbHeight="h-44"
                            />
                          </div>
                        );
                      }

                      return (
                        <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-muted/20 h-44 flex items-center justify-center group shadow-2xs">
                          <img
                            src={getInfraIllustration(selectedReport.service_type, selectedReport.description)}
                            alt={extractInfraLabel(selectedReport.description) || "Illustration catégorie"}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent p-3 flex items-center justify-between text-white text-xs">
                            <span className="font-semibold flex items-center gap-1.5 drop-shadow-sm">
                              <Camera className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              Illustration représentative
                            </span>
                            <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                              Photo citoyenne non fournie
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Métadonnées réelles de la base */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Signalé le {new Date(selectedReport.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        👍 {selectedReport.support_count || 0} soutien(s) citoyen(s)
                      </span>
                    </div>

                    {/* Actions : Bouton Soutenir très visible + Partager */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/60">
                      <Button
                        onClick={(e) => handleSupport(selectedReport.id, e)}
                        className={cn(
                          "rounded-xl text-xs font-extrabold gap-2 h-10 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]",
                          supported.has(selectedReport.id)
                            ? "bg-emerald-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        )}
                      >
                        <ThumbsUp className="h-4 w-4 stroke-[2.5]" />
                        <span>{supported.has(selectedReport.id) ? "Soutien enregistré ✓" : "Soutenir la réparation"}</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black">
                          {selectedReport.support_count || 0}
                        </span>
                      </Button>

                      <Button
                        onClick={(e) => handleShareWhatsApp(selectedReport, e)}
                        variant="outline"
                        className="rounded-xl text-xs font-bold gap-1.5 h-10 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Partager WhatsApp</span>
                      </Button>
                    </div>

                    {/* Confirmation citoyenne de réparation si non résolu */}
                    {selectedReport.status !== "resolved" ? (
                      <div className="pt-2 border-t border-border/40">
                        <Button
                          onClick={(e) => handleConfirmRepair(selectedReport.id, e)}
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-bold h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {repaired.has(selectedReport.id) ? "Confirmation envoyée ✓" : "C'est déjà réparé ? Confirmer"}
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-border/40">
                        <Button
                          onClick={(e) => handleReopenReport(selectedReport.id, e)}
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs font-semibold h-8 rounded-xl text-amber-750 dark:text-amber-350 hover:bg-amber-500/10 border border-dashed border-amber-500/30"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                          <span>Ce n'est pas réparé ? Signaler que la panne persiste</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── ENCADRÉ OFFICIEL OPÉRATEUR (Affiché UNIQUEMENT si renseigné en BDD) ── */}
                {(selectedReport.operator_name || selectedReport.operator_reference || selectedReport.operator_last_note) && (
                  <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <Landmark className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {selectedReport.operator_name || "Services Techniques"}
                        </span>
                      </div>
                      {selectedReport.operator_reference && (
                        <Badge variant="outline" className="text-[10px] font-mono bg-background border-primary/30 text-primary">
                          Réf: {selectedReport.operator_reference}
                        </Badge>
                      )}
                    </div>
                    {selectedReport.operator_last_note && (
                      <p className="text-xs italic text-foreground/90 bg-background/80 p-2.5 rounded-xl border border-border">
                        "{selectedReport.operator_last_note}"
                      </p>
                    )}
                  </div>
                )}

                {/* ── HISTORIQUE RÉEL DES MISES À JOUR (report_status_history) ── */}
                {statusHistory.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Historique des Mises à Jour
                      </h3>
                    </div>

                    <div className="space-y-2.5">
                      {statusHistory.map((item, idx) => (
                        <div key={item.id || idx} className="text-xs p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">
                              {item.operator_name || "Opérateur"} : {item.new_status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                          {item.public_note && (
                            <p className="text-[11px] text-foreground/80 italic">"{item.public_note}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : loading ? (
              /* Skeletons */
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 rounded-2xl border border-border bg-card space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              /* Empty State */
              <div className="p-8 text-center space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
                  🔍
                </div>
                <h3 className="text-sm font-bold text-foreground">Aucune panne trouvée</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Aucun signalement ne correspond à vos filtres actuels. Essayez de réinitialiser les filtres ou signalez une nouvelle panne.
                </p>
                <Button
                  onClick={() => {
                    setOperatorFilter("all");
                    setStatusFilter("all");
                    setCommuneFilter("all");
                    setSearchQuery("");
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              /* ── LISTE ÉPURÉE DES PANNES STYLE FIXMYSTREET ── */
              filteredReports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                const isResolved = r.status === "resolved";
                const photos = r.photo_urls && r.photo_urls.length > 0 ? r.photo_urls : (r.photo_url ? [r.photo_url] : []);
                const illustration = getInfraIllustration(r.service_type, r.description);

                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectReport(r)}
                    onMouseEnter={() => setHoveredReportId(r.id)}
                    onMouseLeave={() => setHoveredReportId(null)}
                    className={cn(
                      "p-3.5 sm:p-4 transition-all cursor-pointer hover:bg-muted/50 flex gap-3 sm:gap-3.5 items-start",
                      isSelected ? "bg-emerald-500/5 border-l-4 border-emerald-600" : ""
                    )}
                  >
                    {/* Category Illustration / Icon */}
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border/80 bg-muted/40 shadow-xs">
                      <img
                        src={illustration}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {extractInfraLabel(r.description) || "Signalement infrastructure"}
                          </h4>
                          <span className={cn(
                            "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md",
                            isResolved ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                          )}>
                            {isResolved ? "✓ Réparé" : "En cours"}
                          </span>
                        </div>

                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {cleanDescription(r.description) || "Dégradation signalée"}
                        </p>
                      </div>

                      {/* Footer harmonisé et bien aligné */}
                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-1.5 border-t border-border/40 text-[10px] sm:text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="font-semibold text-foreground truncate">
                            {r.commune} · {r.quartier || "Abidjan"}
                          </span>
                          <span className="hidden md:inline text-muted-foreground/60">·</span>
                          <span className="hidden md:inline text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>

                        {/* Bouton de soutien interactif harmonisé & aligné */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSupport(r.id, e);
                          }}
                          className={cn(
                            "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shrink-0 shadow-2xs",
                            supported.has(r.id)
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-700/60"
                          )}
                          title="Soutenir ce signalement pour accélérer la réparation"
                        >
                          <ThumbsUp className={cn("h-3.5 w-3.5 stroke-[2.5]", supported.has(r.id) ? "fill-white/20" : "")} />
                          <span>{supported.has(r.id) ? "Soutenu" : "Soutenir"}</span>
                          <span className={cn(
                            "min-w-[18px] text-center px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                            supported.has(r.id)
                              ? "bg-white/25 text-white"
                              : "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200"
                          )}>
                            {r.support_count || 0}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail photo bien agrandie et cliquable OU illustration représentative */}
                    <ReportThumbnail
                      path={photos.length > 0 ? photos[0] : null}
                      count={photos.length}
                      fallbackImage={illustration}
                      alt={cleanDescription(r.description)}
                      onOpen={() => photos.length > 0 && setLightboxPhotos({ photos, index: 0 })}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            VOLET DROIT (60%) : CARTE INTERACTIVE LEAFLET SYNCHRONISÉE
            ═══════════════════════════════════════════════════════════════ */}
        <div className={cn(
          "w-full lg:w-[58%] xl:w-[62%] h-full min-h-0 relative bg-slate-100 dark:bg-slate-900 transition-all",
          mobileTab === "list" ? "hidden lg:block" : "block"
        )}>
          {/* Leaflet Map Canvas — Remplissage absolu 100% de la zone droite */}
          <div
            ref={mapContainerRef}
            className="absolute inset-0 w-full h-full"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
          />

          {/* Quick GPS Floating Action */}
          <button
            onClick={handleLocateMe}
            className="absolute top-4 right-4 z-[400] h-10 w-10 rounded-xl bg-card border border-border/80 text-foreground flex items-center justify-center shadow-lg hover:bg-muted transition-all active:scale-95"
            title="Me géolocaliser"
          >
            <Compass className="h-5 w-5 text-emerald-600" />
          </button>

          {/* Floating Live Legend */}
          <div className="hidden sm:flex absolute top-4 left-4 z-[400] items-center gap-3 px-3.5 py-2 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-lg text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"></span> 💡 CIE
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block"></span> 💧 SODECI
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 inline-block"></span> 🚧 Mairie
            </span>
            <span className="flex items-center gap-1.5 text-green-700 dark:text-green-300 border-l border-border pl-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block"></span> ✓ Réparé
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            BOUTON FLOTTANT TACTILE MOBILE : [📋 Liste] ⇄ [🗺️ Carte]
            ═══════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden absolute bottom-20 left-1/2 -translate-x-1/2 z-[500]">
          <button
            onClick={() => setMobileTab(mobileTab === "list" ? "map" : "list")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950/95 text-white dark:bg-white/95 dark:text-slate-950 font-black text-xs shadow-2xl backdrop-blur-md border border-white/20 dark:border-black/20 active:scale-95 transition-all"
          >
            {mobileTab === "list" ? (
              <>
                <MapIcon className="h-4 w-4 text-emerald-400" />
                <span>Afficher la Carte</span>
              </>
            ) : (
              <>
                <List className="h-4 w-4 text-emerald-400" />
                <span>Afficher la Liste ({filteredReports.length})</span>
              </>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            BOTTOM-SHEET TACTILE MOBILE QUAND UN MARQUEUR EST CLIQUÉ
            ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {mobileTab === "map" && mobileBottomSheetOpen && selectedReport && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden absolute bottom-20 left-3 right-3 z-[450] bg-card/98 backdrop-blur-xl rounded-2xl border border-border shadow-2xl p-3.5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-border/80 bg-muted">
                    <img
                      src={getInfraIllustration(selectedReport.service_type, selectedReport.description)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate max-w-[200px]">
                      {extractInfraLabel(selectedReport.description) || "Signalement infrastructure"}
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {selectedReport.commune} · {selectedReport.quartier || "Abidjan"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileBottomSheetOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {cleanDescription(selectedReport.description)}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={(e) => handleSupport(selectedReport.id, e)}
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold h-8"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  <span>Soutenir ({selectedReport.support_count || 0})</span>
                </Button>

                <Button
                  onClick={() => {
                    setMobileTab("list");
                    setMobileBottomSheetOpen(false);
                  }}
                  size="sm"
                  className="rounded-xl text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <span>Fiche & Updates ➔</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightbox photo plein écran au clic */}
        {lightboxPhotos && (
          <Dialog open={!!lightboxPhotos} onOpenChange={(open) => !open && setLightboxPhotos(null)}>
            <DialogContent className="max-w-3xl p-3 bg-black/95 border-none text-white overflow-hidden sm:rounded-2xl">
              <DialogTitle className="sr-only">Aperçu photo du signalement</DialogTitle>
              <div className="relative flex flex-col items-center justify-center min-h-[320px]">
                <button
                  onClick={() => setLightboxPhotos(null)}
                  className="absolute top-2 right-2 z-50 bg-white/15 hover:bg-white/25 text-white rounded-full p-2 transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <XIcon className="h-5 w-5" />
                </button>

                <LightboxImage path={lightboxPhotos.photos[lightboxPhotos.index]} />

                {lightboxPhotos.photos.length > 1 && (
                  <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-black/60 hover:bg-black/80 text-white rounded-full h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxPhotos((prev) => prev ? {
                          ...prev,
                          index: (prev.index - 1 + prev.photos.length) % prev.photos.length,
                        } : null);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-mono bg-black/60 px-3 py-1 rounded-full text-white">
                      {lightboxPhotos.index + 1} / {lightboxPhotos.photos.length}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-black/60 hover:bg-black/80 text-white rounded-full h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxPhotos((prev) => prev ? {
                          ...prev,
                          index: (prev.index + 1) % prev.photos.length,
                        } : null);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
