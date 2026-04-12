import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Users, CheckCircle2, Info, ThumbsUp, Maximize2, X, ExternalLink, MessageSquare, Send, ChevronLeft, ChevronRight } from "lucide-react";
import DurationBadge from "@/components/DurationBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import SignedImage from "@/components/SignedImage";
import PriorityBadge from "@/components/PriorityBadge";
import { calculatePriority, getNormReference } from "@/lib/priority-score";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";

const NEGLECTED_DAYS = 7;

interface ReportDetail {
  id: string;
  status: string;
  urgency: string;
  service_type: string;
  report_category: string | null;
  description: string;
  commune: string | null;
  quartier: string | null;
  location: string | null;
  created_at: string;
  start_time: string | null;
  resolved_at: string | null;
  verifications: number;
  validated: boolean | null;
  impacted_people: number | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  babies: number | null;
  pregnant: number | null;
  elderly: number | null;
  repair_verifications: number | null;
  latitude: number | null;
  longitude: number | null;
}

type ComputedStatus = "nouveau" | "en_cours" | "resolu" | "non_pris";

function getComputedStatus(report: ReportDetail): ComputedStatus {
  if (report.status === "resolved") return "resolu";
  const ageDays = (Date.now() - new Date(report.created_at).getTime()) / 86400000;
  if ((report.verifications ?? 0) > 0) return "en_cours";
  if (ageDays > NEGLECTED_DAYS) return "non_pris";
  return "nouveau";
}

const STATUS_META: Record<ComputedStatus, { label: string; emoji: string; pill: string }> = {
  nouveau: {
    label: "Nouveau",
    emoji: "🔴",
    pill: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800",
  },
  en_cours: {
    label: "En cours",
    emoji: "🟡",
    pill: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
  },
  resolu: {
    label: "Résolu",
    emoji: "🟢",
    pill: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800",
  },
  non_pris: {
    label: "Non pris en charge",
    emoji: "⚫",
    pill: "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700",
  },
};

function getTypeEmoji(serviceType: string, reportCategory: string | null, description?: string): string {
  if (reportCategory === "infrastructure") return infraEmoji(description ? extractInfraLabel(description) : null);
  if (serviceType === "electricity") return "⚡";
  if (serviceType === "water") return "💧";
  return "📍";
}

function getTypeLabel(serviceType: string, reportCategory: string | null, description?: string): string {
  if (reportCategory === "infrastructure") {
    return extractInfraLabel(description ?? "") ?? "Problème d'infrastructure";
  }
  if (serviceType === "electricity") {
    return "Coupure d'électricité";
  }
  if (serviceType === "water") {
    return "Coupure d'eau";
  }
  return "Signalement";
}

const SignalementDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [supported, setSupported] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const { canValidate } = useUserRole();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["signalement-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, status, urgency, service_type, report_category, description, commune, quartier, location, created_at, start_time, resolved_at, verifications, validated, impacted_people, photo_url, photo_urls, babies, pregnant, elderly, repair_verifications, latitude, longitude")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as ReportDetail;
    },
    enabled: !!id,
  });

  // GPS corroboration : autres signalements infrastructure du même type aux mêmes coordonnées
  const { data: gpsCorroborationCount } = useQuery({
    queryKey: ["gps-corroboration", report?.id, report?.latitude, report?.longitude],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_nearby_reports", {
        p_lat: report!.latitude!,
        p_lon: report!.longitude!,
        p_rayon_m: 50,
      });
      if (error) return 0;
      // Exclure le signalement lui-même, ne garder que le même service_type
      return (data ?? []).filter(
        (r: { id: string; service_type: string }) =>
          r.id !== report!.id && r.service_type === report!.service_type
      ).length;
    },
    enabled: !!report?.latitude && !!report?.longitude && report?.report_category === "infrastructure",
  });

  // Zone context: count active reports in same quartier
  const { data: zoneContext } = useQuery({
    queryKey: ["zone-context", report?.commune, report?.quartier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, verifications")
        .eq("commune", report!.commune!)
        .eq("quartier", report!.quartier!)
        .eq("status", "active")
        .eq("validated", true);
      if (error) return { totalReportsInQuartier: 0, confirmedReportsInQuartier: 0 };
      const total = data.length;
      const confirmed = data.filter((r) => (r.verifications ?? 0) > 0).length;
      return { totalReportsInQuartier: total, confirmedReportsInQuartier: confirmed };
    },
    enabled: !!report?.commune && !!report?.quartier,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["report-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_comments")
        .select("id, user_id, content, created_at")
        .eq("report_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as { id: string; user_id: string; content: string; created_at: string }[];
    },
    enabled: !!id,
  });

  const handleAddComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmittingComment(true);
    const { error } = await supabase
      .from("report_comments")
      .insert({ report_id: id, user_id: user.id, content: commentText.trim() });
    setSubmittingComment(false);
    if (error) {
      toast({ title: "Impossible d'envoyer", description: error.message, variant: "destructive" });
      return;
    }
    setCommentText("");
    refetchComments();
  };

  const supportReport = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("support_infra_report", { p_report_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      setSupported(true);
      queryClient.invalidateQueries({ queryKey: ["signalement-detail", id] });
      toast({ title: "Merci pour votre soutien !", description: "La mairie sera informée du nombre de citoyens concernés." });
    },
    onError: (err: any) => {
      toast({ title: "Impossible de soutenir", description: err.message, variant: "destructive" });
    },
  });

  // Mini-carte Leaflet — s'initialise quand les coordonnées sont disponibles
  useEffect(() => {
    if (!report?.latitude || !report?.longitude || !mapRef.current) return;
    if (mapInstance.current) return; // déjà initialisé

    const markerColor =
      report.service_type === "electricity" ? "#F59E0B" :
      report.service_type === "water" ? "#3B82F6" : "#10B981";

    const mapOptions: any = {
      center: [report.latitude, report.longitude],
      zoom: 17,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      keyboard: false,
      tap: false,
      attributionControl: false,
    };
    const map = L.map(mapRef.current, mapOptions);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:${markerColor};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);transform:rotate(-45deg);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 20],
    });

    L.marker([report.latitude, report.longitude], { icon }).addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [report?.latitude, report?.longitude, report?.service_type]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-lg py-12 px-4 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="font-display text-xl font-bold mb-2">Signalement introuvable</h1>
          <p className="text-muted-foreground mb-6">Ce signalement n'existe pas ou a été supprimé.</p>
          <Button asChild variant="outline">
            <Link to="/suivi">← Voir tous les signalements</Link>
          </Button>
        </main>
      </div>
    );
  }

  const computedStatus = getComputedStatus(report);
  const meta = STATUS_META[computedStatus];
  const daysSince = Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000);
  const communeLabel = report.commune || report.location || "Inconnu";
  const locationLabel = `${communeLabel}${report.quartier ? `, ${report.quartier}` : ""}`;
  const typeEmoji = getTypeEmoji(report.service_type, report.report_category, report.description);
  const typeLabel = getTypeLabel(report.service_type, report.report_category, report.description);
  const priority = calculatePriority({
    service_type: report.service_type,
    report_category: report.report_category,
    start_time: report.start_time,
    created_at: report.created_at,
    status: report.status,
    verifications: report.verifications,
    impacted_people: report.report_category === "infrastructure" ? undefined : report.impacted_people,
    corroborating_reports: report.report_category === "infrastructure" ? (gpsCorroborationCount ?? 0) : undefined,
    babies: report.babies,
    pregnant: report.pregnant,
    elderly: report.elderly,
    urgency: report.urgency,
    zoneContext: zoneContext || undefined,
  });
  const normRef = getNormReference(report.service_type);

  const shareUrl = `${window.location.origin}/signalement/${report.id}`;
  const daysText = report.status !== "resolved" && daysSince > 0
    ? `, signalé il y a ${daysSince} jour${daysSince > 1 ? "s" : ""} sans intervention !`
    : "";
  const verifText = (report.verifications ?? 0) > 0
    ? `\n👥 ${report.verifications} voisin${report.verifications > 1 ? "s" : ""} ont confirmé.`
    : "";
  const shareText = `${typeEmoji} ${cleanDescription(report.description)} — ${locationLabel}${daysText}${verifText}\n\nAidez à faire bouger les choses sur CivicSignal :`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg py-8 px-4">
        {/* Retour */}
        <Link
          to="/suivi"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au suivi
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Galerie photos — en premier pour l'impact visuel */}
          {(() => {
            const photos = (report.photo_urls && report.photo_urls.length > 0)
              ? report.photo_urls
              : report.photo_url ? [report.photo_url] : [];
            if (photos.length === 0) return null;
            return (
              <>
                {photos.length === 1 ? (
                  <div
                    className="relative mb-5 rounded-xl overflow-hidden cursor-pointer group"
                    onClick={() => setPhotoIndex(0)}
                  >
                    <SignedImage storagePath={photos[0]} alt="Photo du signalement" className="w-full max-h-64 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-2 mb-5 ${photos.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {photos.map((p, i) => (
                      <div key={p} className="relative rounded-xl overflow-hidden cursor-pointer group aspect-square" onClick={() => setPhotoIndex(i)}>
                        <SignedImage storagePath={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute bottom-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Dialog open={photoIndex !== null} onOpenChange={(open) => !open && setPhotoIndex(null)}>
                  <DialogContent className="max-w-screen-md p-0 bg-black border-0 overflow-hidden">
                    <button
                      onClick={() => setPhotoIndex(null)}
                      className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setPhotoIndex((i) => i !== null ? (i - 1 + photos.length) % photos.length : 0)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPhotoIndex((i) => i !== null ? (i + 1) % photos.length : 0)}
                          className="absolute right-12 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white text-xs rounded-full px-2 py-0.5">
                          {(photoIndex ?? 0) + 1} / {photos.length}
                        </div>
                      </>
                    )}
                    {photoIndex !== null && (
                      <SignedImage storagePath={photos[photoIndex]} alt="Photo du signalement" className="w-full max-h-[90vh] object-contain" />
                    )}
                  </DialogContent>
                </Dialog>
              </>
            );
          })()}

          {/* En-tête type + priorité */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{typeEmoji}</span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{typeLabel}</p>
              <div className="flex items-center gap-2 mt-1">
                <PriorityBadge priority={priority} showScore={canValidate} showFactors={canValidate} />
                <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${meta.pill}`}>
                  {meta.emoji} {meta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Référence normative */}
          <div className="mb-4 flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            <span>Priorité calculée selon : {normRef}</span>
          </div>

          {/* Compteur jours — critique */}
          {report.status !== "resolved" && daysSince >= 7 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Sans intervention depuis</p>
                <p className="font-display text-3xl font-extrabold text-destructive leading-none mt-0.5">
                  {daysSince} jours
                </p>
              </div>
              <span className="text-4xl opacity-50">⏰</span>
            </motion.div>
          )}

          {/* Compteur jours — avertissement */}
          {report.status !== "resolved" && daysSince >= 3 && daysSince < 7 && (
            <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{daysSince} jours sans réponse</p>
            </div>
          )}

          {/* Détails */}
          <Card className="mb-4">
            <CardContent className="p-5 space-y-4">
              <p className="text-base font-semibold text-foreground leading-snug">{cleanDescription(report.description)}</p>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground border-t border-border pt-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {locationLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 shrink-0" />
                  Signalé le{" "}
                  {new Date(report.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {(report.verifications ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="font-semibold text-foreground">{report.verifications} voisin{report.verifications > 1 ? "s" : ""}</span>
                    {" "}ont confirmé ce problème
                  </span>
                )}
                {report.impacted_people && report.impacted_people > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span>👥</span>
                    <span className="font-semibold text-foreground">{report.impacted_people} personne{report.impacted_people > 1 ? "s" : ""}</span>
                    {" "}impactée{report.impacted_people > 1 ? "s" : ""}
                  </span>
                )}
                {report.status === "resolved" && report.resolved_at && (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Résolu le{" "}
                    {new Date(report.resolved_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                {/* Duration with confidence label */}
                <div className="pt-1">
                  <DurationBadge
                    status={report.status}
                    resolved_at={report.resolved_at}
                    start_time={report.start_time}
                    created_at={report.created_at}
                    repair_verifications={report.repair_verifications}
                    verifications={report.verifications}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mini-carte localisation exacte */}
          {report.latitude && report.longitude && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border">
              <div ref={mapRef} className="h-44 w-full" />
              <a
                href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-muted transition-colors bg-card border-t border-border"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Voir sur Google Maps
              </a>
            </div>
          )}

          {/* Commentaires citoyens */}
          <div className="mb-4 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Commentaires
              </span>
              {comments.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{comments.length}</span>
              )}
            </div>

            {/* Liste des commentaires */}
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-5 px-4">
                Soyez le premier à commenter — infos utiles, évolution du problème…
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {comments.map((c) => (
                  <li key={c.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {c.user_id === user?.id ? "Vous" : "Un voisin"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{c.content}</p>
                  </li>
                ))}
              </ul>
            )}

            {/* Formulaire */}
            {user ? (
              <div className="px-4 py-3 border-t border-border space-y-2">
                <div className="relative">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value.slice(0, 200))}
                    placeholder="Ajouter une info utile… (max 200 caractères)"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-10"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground">
                    {commentText.length}/200
                  </span>
                </div>
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || submittingComment}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary disabled:opacity-40 hover:underline transition-opacity"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submittingComment ? "Envoi…" : "Publier"}
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-border">
                <Link
                  to="/auth"
                  className="text-xs text-primary hover:underline"
                >
                  Connectez-vous pour commenter
                </Link>
              </div>
            )}
          </div>

          {/* Soutien citoyen — uniquement pour les infrastructures actives */}
          {report.report_category === "infrastructure" && report.status === "active" && user && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Ce problème vous concerne aussi ?
              </p>
              <p className="text-xs text-muted-foreground">
                Exprimez votre soutien — le nombre de citoyens concernés sera transmis à la mairie.
              </p>
              <Button
                onClick={() => supportReport.mutate()}
                disabled={supported || supportReport.isPending}
                variant={supported ? "outline" : "default"}
                className="w-full gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                {supported
                  ? `Soutenu · ${report.verifications} citoyen${report.verifications > 1 ? "s" : ""}`
                  : supportReport.isPending
                    ? "En cours…"
                    : `Je soutiens ce signalement · ${report.verifications} soutien${report.verifications > 1 ? "s" : ""}`
                }
              </Button>
            </div>
          )}

          {/* Partage */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Partagez pour faire pression sur les autorités
            </p>
            <ShareButton
              title={`${typeEmoji} Signalement — ${locationLabel}`}
              text={shareText}
              url={shareUrl}
              className="w-full justify-center"
              variant="default"
              size="default"
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default SignalementDetailPage;
