import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, MapPin, Home, Building2, Save, Shield,
  Bell, Globe, Palette, ChevronRight, CheckCircle2, FileText, Clock,
  Zap, Droplets, Info, History, Trash2, AlertTriangle, LogOut,
  Filter, CalendarDays, XCircle, CheckCheck, Download, Award,
  BookOpen, ExternalLink, Scale, Lightbulb, ShieldCheck
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import MyReports from "@/components/MyReports";
import { COMMUNES } from "@/lib/communes";
import { getQuartiers } from "@/lib/quartiers";
import PushNotificationToggle from "@/components/PushNotificationToggle";

interface ProfileData {
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
  commune: string;
  quartier: string;
  user_type: string;
  bio: string;
  notifications_enabled: boolean;
  language: string;
  theme: string;
  electricity_client_id: string;
  electricity_meter_ref: string;
  electricity_meter_number: string;
  water_client_id: string;
  water_meter_ref: string;
  water_meter_number: string;
}

interface HistoryReport {
  id: string;
  service_type: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  resolved_at: string | null;
  verifications: number;
  start_time: string;
}

const DELETE_REASONS = [
  "Je n'utilise plus l'application",
  "Préoccupations liées à la confidentialité",
  "Je crée un autre compte",
  "L'application ne correspond pas à mes besoins",
  "Autre raison",
];

const formatDuration = (start: string, end: string | null) => {
  if (!end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`;
  return `${mins}min`;
};

const ProfilePage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    display_name: "",
    phone: "",
    commune: "",
    quartier: "",
    user_type: "household",
    bio: "",
    notifications_enabled: true,
    language: "fr",
    theme: "system",
    electricity_client_id: "",
    electricity_meter_ref: "",
    electricity_meter_number: "",
    water_client_id: "",
    water_meter_ref: "",
    water_meter_number: "",
  });

  // Active reports count
  const [activeReportsCount, setActiveReportsCount] = useState<number | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "active" | "resolved">("all");
  const [historyType, setHistoryType] = useState<"all" | "electricity" | "water">("all");

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteOther, setDeleteOther] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const CONFIRM_PHRASE = "SUPPRIMER MON COMPTE";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (!error && data) {
        setProfile({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          display_name: data.display_name ?? "",
          phone: data.phone ?? "",
          commune: data.commune ?? "",
          quartier: data.quartier ?? "",
          user_type: data.user_type ?? "household",
          bio: data.bio ?? "",
          notifications_enabled: data.notifications_enabled ?? true,
          language: data.language ?? "fr",
          theme: data.theme ?? "system",
          electricity_client_id: (data as any).electricity_client_id ?? "",
          electricity_meter_ref: (data as any).electricity_meter_ref ?? "",
          electricity_meter_number: (data as any).electricity_meter_number ?? "",
          water_client_id: (data as any).water_client_id ?? "",
          water_meter_ref: (data as any).water_meter_ref ?? "",
          water_meter_number: (data as any).water_meter_number ?? "",
        });
      }
      setLoading(false);
    };
    fetchProfile();

    // Fetch active reports count
    const fetchActiveCount = async () => {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      setActiveReportsCount(count ?? 0);
    };
    fetchActiveCount();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("id, service_type, description, commune, quartier, status, urgency, created_at, resolved_at, verifications, start_time")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setHistory(data as HistoryReport[]);
    setHistoryLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        display_name: `${profile.first_name.trim()} ${profile.last_name.trim()}`.trim(),
        phone: profile.phone.trim(),
        commune: profile.commune.trim(),
        quartier: profile.quartier.trim(),
        user_type: profile.user_type,
        bio: profile.bio.trim(),
        notifications_enabled: profile.notifications_enabled,
        language: profile.language,
        theme: profile.theme,
        electricity_client_id: profile.electricity_client_id.trim(),
        electricity_meter_ref: profile.electricity_meter_ref.trim(),
        electricity_meter_number: profile.electricity_meter_number.trim(),
        water_client_id: profile.water_client_id.trim(),
        water_meter_ref: profile.water_meter_ref.trim(),
        water_meter_number: profile.water_meter_number.trim(),
      } as any)
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      setSaved(true);
      toast.success("Profil mis à jour !");
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== CONFIRM_PHRASE) return;
    const finalReason = deleteReason === "Autre raison" ? deleteOther.trim() : deleteReason;
    if (!finalReason) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const response = await supabase.functions.invoke("delete-account", {
        body: { reason: finalReason },
      });

      if (response.error) throw response.error;

      await signOut();
      toast.success("Votre compte et toutes vos données ont été définitivement supprimés.");
      navigate("/");
    } catch (err: any) {
      toast.error("Erreur lors de la suppression. Contactez signaci@civictech.ci");
    } finally {
      setDeleting(false);
    }
  };

  const update = (field: keyof ProfileData, value: any) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const conformityFields = [
    profile.first_name, profile.last_name, profile.phone, profile.commune, profile.quartier,
    profile.electricity_client_id, profile.electricity_meter_ref, profile.electricity_meter_number,
    profile.water_client_id, profile.water_meter_ref, profile.water_meter_number,
  ];
  const filledCount = conformityFields.filter((f) => f.trim() !== "").length;
  const conformityPercent = Math.round((filledCount / conformityFields.length) * 100);
  const isProfileComplete = conformityPercent >= 100;
  const prevConformityRef = useRef(conformityPercent);

  // Confetti when reaching 100%
  useEffect(() => {
    if (isProfileComplete && prevConformityRef.current < 100) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.3 },
        colors: ["#FFD700", "#FFA500", "#22C55E", "#3B82F6", "#8B5CF6"],
      });
    }
    prevConformityRef.current = conformityPercent;
  }, [conformityPercent, isProfileComplete]);

  const filteredHistory = history.filter((r) => {
    const statusOk = historyFilter === "all" || r.status === historyFilter;
    const typeOk = historyType === "all" || r.service_type === historyType;
    return statusOk && typeOk;
  });

  const historyStats = {
    total: history.length,
    active: history.filter((r) => r.status === "active").length,
    resolved: history.filter((r) => r.status === "resolved").length,
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const displayName = profile.first_name || profile.last_name
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : user?.email?.split("@")[0] || "Utilisateur";

  const initials = (profile.first_name?.[0] || "") + (profile.last_name?.[0] || "");
  const avatarInitial = initials || user?.email?.[0]?.toUpperCase() || "?";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl px-0 sm:px-4 py-0 sm:py-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* ═══ Profile Header with Conformity Circle ═══ */}
          <div className="relative mb-6 sm:mb-8 px-4 sm:px-6 pt-6">
            <div className="flex items-center gap-5">
              {/* Conformity circle */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative flex-shrink-0"
              >
                <svg width="96" height="96" viewBox="0 0 96 96" className="sm:w-[112px] sm:h-[112px]">
                  {/* Background circle */}
                  <circle cx="48" cy="48" r="42" fill="none" stroke={isProfileComplete ? "hsl(45 93% 47% / 0.2)" : "hsl(var(--muted))"} strokeWidth="6" />
                  {/* Progress arc */}
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke={isProfileComplete ? "hsl(45 93% 47%)" : conformityPercent >= 80 ? "hsl(var(--success, 142 71% 45%))" : conformityPercent >= 50 ? "hsl(var(--warning, 38 92% 50%))" : "hsl(var(--destructive))"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - conformityPercent / 100)}`}
                    transform="rotate(-90 48 48)"
                    className="transition-all duration-700"
                  />
                  {/* Golden glow for 100% */}
                  {isProfileComplete && (
                    <circle cx="48" cy="48" r="42" fill="none" stroke="hsl(45 93% 47% / 0.3)" strokeWidth="12" className="animate-pulse" />
                  )}
                </svg>
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isProfileComplete ? (
                    <>
                      <Award className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: "hsl(45 93% 47%)" }} />
                      <span className="text-[8px] sm:text-[9px] font-bold mt-0.5" style={{ color: "hsl(45 93% 47%)" }}>EXEMPLAIRE</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl sm:text-2xl font-bold text-foreground">{conformityPercent}%</span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Conformité</span>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Name & info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">{displayName}</h1>
                  {isProfileComplete && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border" style={{ borderColor: "hsl(45 93% 47%)", color: "hsl(45 93% 47%)", background: "hsl(45 93% 47% / 0.1)" }}>
                      ✅ Vérifié
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  {profile.commune && (
                    <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{profile.commune}{profile.quartier ? `, ${profile.quartier}` : ""}
                    </span>
                  )}
                  {memberSince && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />Membre depuis {memberSince}
                    </span>
                  )}
                </div>
                {/* Save button */}
                <div className="mt-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="gap-2"
                  >
                    {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saving ? "..." : saved ? "Sauvegardé" : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Stats bar (Facebook-style) ═══ */}
          <div className="px-4 sm:px-0 mb-5">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              {/* Conformity ring */}
              <div className="relative flex-shrink-0">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={isProfileComplete ? "hsl(45 93% 47%)" : conformityPercent >= 80 ? "hsl(150 60% 40%)" : conformityPercent >= 50 ? "hsl(40 95% 50%)" : "hsl(var(--destructive))"}
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${conformityPercent * 0.9738} 97.38`}
                    initial={{ strokeDasharray: "0 97.38" }}
                    animate={{ strokeDasharray: `${conformityPercent * 0.9738} 97.38` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                  {conformityPercent}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {isProfileComplete ? "🏆 Profil exemplaire" : "Conformité du profil"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {isProfileComplete ? "Vos signalements sont traités en priorité" : "Complétez pour renforcer vos signalements"}
                </p>
              </div>
              {/* Quick stats */}
              <div className="hidden sm:flex items-center gap-4 border-l border-border pl-4">
                <div className="text-center">
                  <p className="font-display text-lg font-bold text-foreground">{history.length || "—"}</p>
                  <p className="text-xs text-muted-foreground">Signalements</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-lg font-bold text-foreground">
                    {profile.user_type === "household" ? "🏠" : "🏢"}
                  </p>
                  <p className="text-xs text-muted-foreground">{profile.user_type === "household" ? "Ménage" : "Entreprise"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Friendly reminder to complete profile */}
          <div className="px-4 sm:px-0">
          <AnimatePresence>
            {conformityPercent < 100 && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="mb-5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary flex-shrink-0">
                    <Info className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm mb-1">
                      👋 Renforcez vos signalements !
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      Un profil complet nous aide à produire des rapports fiables pour les opérateurs (CIE, SODECI, Mairie). 
                      Pensez à renseigner :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {!profile.phone && (
                        <Badge variant="outline" className="text-xs bg-background border-amber-500/50 text-amber-600 gap-1">
                          <Phone className="h-3 w-3" />
                          N° WhatsApp
                        </Badge>
                      )}
                      {(!profile.commune || !profile.quartier) && (
                        <Badge variant="outline" className="text-xs bg-background border-blue-500/50 text-blue-600 gap-1">
                          <MapPin className="h-3 w-3" />
                          Localisation
                        </Badge>
                      )}
                      {(!profile.electricity_client_id && !profile.electricity_meter_number) && (
                        <Badge variant="outline" className="text-xs bg-background border-yellow-500/50 text-yellow-600 gap-1">
                          <Zap className="h-3 w-3" />
                          Compteur CIE
                        </Badge>
                      )}
                      {(!profile.water_client_id && !profile.water_meter_number) && (
                        <Badge variant="outline" className="text-xs bg-background border-cyan-500/50 text-cyan-600 gap-1">
                          <Droplets className="h-3 w-3" />
                          Compteur SODECI
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          <div className="px-4 sm:px-0">
          <Tabs defaultValue="rights" className="space-y-4 sm:space-y-6" onValueChange={(v) => { if (v === "history" && history.length === 0) fetchHistory(); }}>
            <TabsList className="flex w-full overflow-x-auto no-scrollbar gap-0.5">
              <TabsTrigger value="rights" className="gap-1.5 min-w-0 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
                <Scale className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Droits & Conseils</span>
                <span className="sm:hidden">Droits</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 min-w-0 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
                <History className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Historique</span>
              </TabsTrigger>
              <TabsTrigger value="utility" className="gap-1 min-w-0 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
                <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Compteurs</span>
                <span className="sm:hidden">Compt.</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 min-w-0 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Profil</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-1 min-w-0 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Localisation</span>
                <span className="sm:hidden">Lieu</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 min-w-0 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
                <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Paramètres</span>
                <span className="sm:hidden">Param.</span>
              </TabsTrigger>
            </TabsList>

            {/* ── DROITS & CONSEILS ── */}
            <TabsContent value="rights">
              <div className="space-y-5">
                {/* Intro */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary flex-shrink-0">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Vos droits & devoirs</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        En tant qu'usager de l'électricité et de l'eau en Côte d'Ivoire, vous êtes protégé par la loi. Voici l'essentiel à connaître.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ⚡ Droits Électricité */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-amber-500/5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-sm text-foreground">Électricité — Vos droits</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-3">
                    <div className="space-y-2.5 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Continuité de service</span> — La CIE est tenue d'assurer un service continu. Toute coupure prolongée sans motif légitime engage sa responsabilité (Art. 24, Code de l'électricité).</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Information préalable</span> — La CIE doit informer les usagers avant toute coupure programmée pour maintenance.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Réclamation</span> — Vous pouvez saisir l'ANARE (Autorité Nationale de Régulation du secteur de l'Électricité) en cas de litige non résolu avec la CIE.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Vos obligations</span> — Payer vos factures dans les délais, ne pas frauder le compteur, ne pas effectuer de branchements illégaux (passible de sanctions pénales).</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 💧 Droits Eau */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-blue-500/5">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold text-sm text-foreground">Eau — Vos droits</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-3">
                    <div className="space-y-2.5 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Droit d'accès à l'eau potable</span> — L'accès à l'eau potable est un droit fondamental reconnu par le Code de l'eau (Loi n°2023-902).</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Qualité de l'eau</span> — La SODECI est tenue de fournir une eau conforme aux normes de qualité établies par l'OMS et la réglementation ivoirienne.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Réclamation</span> — En cas de coupure prolongée ou de litige, vous pouvez saisir l'ONEP (Office National de l'Eau Potable) ou les services de la Mairie.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p><span className="font-semibold text-foreground">Vos obligations</span> — Payer les factures d'eau, signaler les fuites, ne pas gaspiller l'eau potable, ne pas polluer les sources d'eau.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 💡 Conseils & bonnes pratiques */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-green-500/5">
                    <Lightbulb className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-sm text-foreground">Conseils & bonnes pratiques</h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { emoji: "⚡", title: "Débranchez les appareils", desc: "Débranchez les appareils sensibles pendant les coupures pour éviter les surtensions au retour du courant." },
                        { emoji: "💧", title: "Stockez l'eau proprement", desc: "Utilisez des récipients propres et couverts pour stocker l'eau. Renouvelez toutes les 24h." },
                        { emoji: "🔌", title: "Utilisez un parafoudre", desc: "Protégez vos appareils électroniques avec un parafoudre ou un régulateur de tension." },
                        { emoji: "🚰", title: "Signalez les fuites", desc: "Une fuite d'eau = gaspillage collectif. Signalez-la immédiatement via SIGNA-CI ou au 175 (SODECI)." },
                        { emoji: "💡", title: "Économisez l'énergie", desc: "Éteignez les lumières inutiles, préférez les ampoules LED. Ça réduit la charge sur le réseau." },
                        { emoji: "📱", title: "Gardez vos reçus", desc: "Conservez toujours vos reçus de paiement CIE/SODECI. Ils sont votre preuve en cas de litige." },
                      ].map((tip) => (
                        <div key={tip.title} className="flex items-start gap-2.5 rounded-lg border border-border p-3 bg-background">
                          <span className="text-lg shrink-0">{tip.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 📄 Textes de loi & ressources */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">Textes de loi & ressources officielles</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-2">
                    {[
                      {
                        title: "Code de l'Électricité (Loi n°2014-132)",
                        desc: "Loi du 24 mars 2014 portant Code de l'Électricité en Côte d'Ivoire",
                        url: "https://faolex.fao.org/docs/pdf/ivc146558.pdf",
                        icon: <Zap className="h-4 w-4 text-amber-500" />,
                        format: "PDF",
                      },
                      {
                        title: "Code de l'Eau (Loi n°2023-902)",
                        desc: "Nouveau Code de l'eau adopté en 2023, remplaçant la Loi n°98-755",
                        url: "https://www.pseau.org/outils/biblio/resume.php?d=12272&l=fr",
                        icon: <Droplets className="h-4 w-4 text-blue-500" />,
                        format: "PDF",
                      },
                      {
                        title: "Ancien Code de l'Eau (Loi n°98-755)",
                        desc: "Loi du 23 décembre 1998 portant Code de l'Eau (toujours applicable en partie)",
                        url: "https://civ.abidjan.net/images/pdf/code_de%20_eau.pdf",
                        icon: <Droplets className="h-4 w-4 text-blue-500" />,
                        format: "PDF",
                      },
                      {
                        title: "ANARE-CI — Droits des consommateurs",
                        desc: "Autorité de régulation : recours, droits et obligations des usagers de l'électricité",
                        url: "https://anare.ci/documents/lois-et-reglementation/les-lois/",
                        icon: <Scale className="h-4 w-4 text-primary" />,
                        format: "Site web",
                      },
                      {
                        title: "Ma SODECI en ligne — Conditions d'utilisation",
                        desc: "Termes et conditions d'utilisation des services SODECI en ligne",
                        url: "https://www.masodecienligne.ci/docs/TermesConditions.pdf",
                        icon: <Droplets className="h-4 w-4 text-blue-500" />,
                        format: "PDF",
                      },
                      {
                        title: "CIE — Espace client",
                        desc: "Portail officiel de la CIE pour les usagers (réclamations, suivi de consommation)",
                        url: "https://www.cie.ci",
                        icon: <Zap className="h-4 w-4 text-amber-500" />,
                        format: "Site web",
                      },
                      {
                        title: "SODECI — Espace client",
                        desc: "Portail officiel de la SODECI pour les usagers (réclamations, paiements)",
                        url: "https://www.sodeci.ci",
                        icon: <Droplets className="h-4 w-4 text-blue-500" />,
                        format: "Site web",
                      },
                    ].map((resource) => (
                      <a
                        key={resource.title}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-border p-3 bg-background hover:bg-accent transition-colors group"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                          {resource.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{resource.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{resource.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">{resource.format}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Numéros utiles */}
                <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                  <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Numéros utiles
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { name: "CIE (dépannage)", number: "179", color: "text-amber-500" },
                      { name: "SODECI (urgences)", number: "175", color: "text-blue-500" },
                      { name: "ANARE-CI (réclamations)", number: "+225 27 20 20 61 16", color: "text-primary" },
                      { name: "Sapeurs Pompiers", number: "180", color: "text-destructive" },
                    ].map((contact) => (
                      <a
                        key={contact.name}
                        href={`tel:${contact.number.replace(/\s/g, "")}`}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 bg-background hover:bg-accent transition-colors"
                      >
                        <Phone className={`h-4 w-4 ${contact.color} shrink-0`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{contact.name}</p>
                          <p className={`text-sm font-bold ${contact.color}`}>{contact.number}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── HISTORIQUE ── */}
            <TabsContent value="history">
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: historyStats.total, color: "bg-primary/10 text-primary" },
                    { label: "En cours", value: historyStats.active, color: "bg-amber-500/10 text-amber-600" },
                    { label: "Résolus", value: historyStats.resolved, color: "bg-green-500/10 text-green-600" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl p-3 text-center ${s.color} border border-border bg-card`}>
                      <p className={`text-xl font-bold ${s.color.split(" ")[1]}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex gap-1.5 flex-wrap">
                    {(["all", "active", "resolved"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setHistoryFilter(f)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                          historyFilter === f
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {f === "all" ? "Tous" : f === "active" ? "En cours" : "Résolus"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap ml-1">
                    {(["all", "electricity", "water"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setHistoryType(t)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border flex items-center gap-1 ${
                          historyType === t
                            ? t === "electricity"
                              ? "bg-amber-500 text-white border-amber-500"
                              : t === "water"
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {t === "electricity" ? <Zap className="h-3 w-3" /> : t === "water" ? <Droplets className="h-3 w-3" /> : null}
                        {t === "all" ? "Tous types" : t === "electricity" ? "Électricité" : "Eau"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                {historyLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Aucun signalement trouvé</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-4 bottom-4 w-px bg-border hidden sm:block" />
                    <div className="space-y-3">
                      <AnimatePresence>
                        {filteredHistory.map((r, i) => {
                          const isElec = r.service_type === "electricity";
                          const isActive = r.status === "active";
                          const duration = r.resolved_at ? formatDuration(r.start_time, r.resolved_at) : null;
                          return (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ delay: i * 0.03 }}
                              className="flex gap-3 sm:gap-4"
                            >
                              {/* Timeline dot */}
                              <div className="relative z-10 flex-shrink-0 hidden sm:flex">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                                  isElec
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                                    : "bg-blue-500/10 border-blue-500/40 text-blue-500"
                                }`}>
                                  {isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                                </div>
                              </div>

                              {/* Card */}
                              <div className={`flex-1 rounded-xl border bg-card p-3 sm:p-4 shadow-sm transition-all ${
                                isActive ? "border-border" : "border-border/60 opacity-80"
                              }`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                      {/* Mobile icon */}
                                      <span className={`sm:hidden text-sm ${isElec ? "text-amber-500" : "text-blue-500"}`}>
                                        {isElec ? <Zap className="h-3.5 w-3.5 inline" /> : <Droplets className="h-3.5 w-3.5 inline" />}
                                      </span>
                                      <span className="font-semibold text-sm text-foreground">{r.commune}</span>
                                      {r.quartier && (
                                        <span className="text-xs text-muted-foreground">· {r.quartier}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Badge
                                        variant={isActive ? "default" : "outline"}
                                        className={`text-xs h-5 ${isActive ? "bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20" : "border-green-500/40 text-green-600"}`}
                                      >
                                        {isActive ? (
                                          <><Clock className="h-2.5 w-2.5 mr-1" />En cours</>
                                        ) : (
                                          <><CheckCheck className="h-2.5 w-2.5 mr-1" />Résolu</>
                                        )}
                                      </Badge>
                                      {r.verifications > 0 && (
                                        <Badge variant="outline" className="text-xs h-5 border-primary/30 text-primary">
                                          {r.verifications} confirm.
                                        </Badge>
                                      )}
                                      {duration && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" /> {duration}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(r.created_at).getFullYear()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── COMPTEURS / UTILITY ── */}
            <TabsContent value="utility">
              <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                <div className="flex gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 sm:p-4">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Augmentez la crédibilité de vos signalements</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Renseigner vos informations de compteur permet de renforcer la conformité de vos signalements auprès des autorités.{" "}
                      <span className="font-medium text-foreground">Ces champs sont facultatifs.</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                      <Zap className="h-4 w-4 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-foreground">Électricité (CIE)</h3>
                    <span className="ml-auto text-xs text-muted-foreground italic">Facultatif</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Identifiant client", field: "electricity_client_id" as const, placeholder: "Ex: 01234567" },
                      { label: "Réf. compteur", field: "electricity_meter_ref" as const, placeholder: "Ex: CIE-XXXX" },
                      { label: "N° compteur", field: "electricity_meter_number" as const, placeholder: "Ex: 987654321" },
                    ].map((f) => (
                      <div key={f.field} className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                        <Input placeholder={f.placeholder} value={profile[f.field]} onChange={(e) => update(f.field, e.target.value)} maxLength={30} className="h-9 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                      <Droplets className="h-4 w-4 text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-foreground">Eau (SODECI)</h3>
                    <span className="ml-auto text-xs text-muted-foreground italic">Facultatif</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Identifiant client", field: "water_client_id" as const, placeholder: "Ex: 01234567" },
                      { label: "Réf. compteur", field: "water_meter_ref" as const, placeholder: "Ex: SOD-XXXX" },
                      { label: "N° compteur", field: "water_meter_number" as const, placeholder: "Ex: 123456789" },
                    ].map((f) => (
                      <div key={f.field} className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                        <Input placeholder={f.placeholder} value={profile[f.field]} onChange={(e) => update(f.field, e.target.value)} maxLength={30} className="h-9 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── PROFIL ── */}
            <TabsContent value="profile">
              <div className="space-y-4">
                {/* Identity card */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                    <User className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">Identité</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Prénom</Label>
                        <Input placeholder="Votre prénom" value={profile.first_name} onChange={(e) => update("first_name", e.target.value)} maxLength={50} className="h-10 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Nom</Label>
                        <Input placeholder="Votre nom" value={profile.last_name} onChange={(e) => update("last_name", e.target.value)} maxLength={50} className="h-10 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact card */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                    <Mail className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">Contact</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={user?.email ?? ""} disabled className="pl-10 h-10 text-sm opacity-60" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Téléphone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={profile.phone || user?.phone || "Non renseigné"} disabled className="pl-10 h-10 text-sm opacity-60" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* About card */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                    <Info className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">À propos</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Type de profil</Label>
                      <RadioGroup value={profile.user_type} onValueChange={(v) => update("user_type", v)} className="flex gap-4 pt-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="household" id="p-household" />
                          <Label htmlFor="p-household" className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <Home className="h-4 w-4" /> Ménage
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="business" id="p-business" />
                          <Label htmlFor="p-business" className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <Building2 className="h-4 w-4" /> Entreprise
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Bio</Label>
                      <Textarea
                        placeholder="Décrivez-vous en quelques mots (optionnel)"
                        value={profile.bio}
                        onChange={(e) => update("bio", e.target.value)}
                        maxLength={300}
                        rows={3}
                        className="text-sm"
                      />
                      <p className="text-right text-xs text-muted-foreground">{profile.bio.length}/300</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── LOCALISATION ── */}
            <TabsContent value="location">
              <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    <MapPin className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Votre localisation</p>
                    <p className="text-xs text-muted-foreground">Permet de cibler les signalements dans votre zone</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Commune</Label>
                  <Select value={profile.commune} onValueChange={(v) => { update("commune", v); update("quartier", ""); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Sélectionner votre commune" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMUNES.map((c) => (
                        <SelectItem key={c.nom} value={c.nom}>
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: c.couleur }} />
                            {c.nom}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Quartier</Label>
                  {profile.commune ? (
                    <Select value={profile.quartier} onValueChange={(v) => update("quartier", v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Sélectionner votre quartier" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {getQuartiers(profile.commune).map((q) => (
                          <SelectItem key={q} value={q}>{q}</SelectItem>
                        ))}
                        <SelectItem value="__other">Autre quartier...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sélectionnez d'abord une commune</p>
                  )}
                  {profile.quartier === "__other" && (
                    <Input
                      placeholder="Saisissez le nom du quartier"
                      onChange={(e) => { if (e.target.value.trim()) update("quartier", e.target.value.trim()); }}
                      maxLength={100}
                      autoFocus
                      className="h-9 text-sm"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Cette information nous aide à vous envoyer les alertes pertinentes</p>
                </div>
              </div>
            </TabsContent>

            {/* ── PARAMÈTRES ── */}
            <TabsContent value="settings">
              <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                {/* Notifications in-app */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Bell className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Notifications in-app</p>
                      <p className="text-xs text-muted-foreground">Alertes de coupure dans votre zone</p>
                    </div>
                  </div>
                  <Switch checked={profile.notifications_enabled} onCheckedChange={(v) => update("notifications_enabled", v)} />
                </div>

                {/* Push notifications */}
                <PushNotificationToggle />

                <Separator />

                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Globe className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Langue</p>
                      <p className="text-xs text-muted-foreground">{profile.language === "fr" ? "Français" : "English"}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => update("language", profile.language === "fr" ? "en" : "fr")}>
                    {profile.language === "fr" ? "EN" : "FR"}
                  </Button>
                </div>

                <Separator />

                {/* Theme */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Palette className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Thème</p>
                      <p className="text-xs text-muted-foreground">
                        {profile.theme === "system" ? "Système" : profile.theme === "dark" ? "Sombre" : "Clair"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => update("theme", profile.theme === "system" ? "light" : profile.theme === "light" ? "dark" : "system")}
                  >
                    {profile.theme === "system" ? "☀️" : profile.theme === "light" ? "🌙" : "⚙️"}
                  </Button>
                </div>

                <Separator />

                {/* Account actions */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions du compte</p>

                  {/* Export des données */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={async () => {
                      if (!user) return;
                      toast.info("Préparation de l'export...");
                      try {
                        const { data: profileData } = await supabase
                          .from("profiles")
                          .select("*")
                          .eq("user_id", user.id)
                          .single();
                        const { data: reportsData } = await supabase
                          .from("reports")
                          .select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, resolved_at, start_time, impacted_people, babies, pregnant, elderly, verifications")
                          .eq("user_id", user.id)
                          .order("created_at", { ascending: false });
                        const { data: corroborationsData } = await supabase
                          .from("corroborations")
                          .select("report_id, created_at")
                          .eq("user_id", user.id);

                        const exportData = {
                          exported_at: new Date().toISOString(),
                          user_email: user.email,
                          profile: profileData ? {
                            first_name: profileData.first_name,
                            last_name: profileData.last_name,
                            display_name: profileData.display_name,
                            phone: profileData.phone,
                            commune: profileData.commune,
                            quartier: profileData.quartier,
                            user_type: profileData.user_type,
                            created_at: profileData.created_at,
                          } : null,
                          reports: reportsData || [],
                          corroborations: corroborationsData || [],
                        };

                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `signaci-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Export téléchargé !");
                      } catch {
                        toast.error("Erreur lors de l'export");
                      }
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Exporter mes données
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={async () => { await signOut(); navigate("/"); }}
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Se déconnecter
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                {/* Danger zone */}
                <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-semibold text-destructive">Zone de danger</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La suppression de votre compte est <strong>irréversible</strong>. Toutes vos données et signalements seront définitivement supprimés.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setShowDeleteDialog(true);
                      setDeleteReason("");
                      setDeleteOther("");
                      setDeleteConfirmText("");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer mon compte
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </motion.div>
      </main>

      {/* ── DELETE ACCOUNT DIALOG ── */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open && !deleting) { setShowDeleteDialog(false); } }}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Supprimer mon compte
            </DialogTitle>
            <DialogDescription className="text-sm">
              Cette action est <strong>irréversible</strong>. Vos données, signalements et historique seront définitivement effacés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Step 1: Reason */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                1. Pourquoi supprimez-vous votre compte ?
              </Label>
              <div className="space-y-2">
                {DELETE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setDeleteReason(reason)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all ${
                      deleteReason === reason
                        ? "border-destructive bg-destructive/10 text-destructive font-medium"
                        : "border-border bg-card text-foreground hover:border-destructive/40"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                        deleteReason === reason ? "border-destructive bg-destructive" : "border-muted-foreground"
                      }`} />
                      {reason}
                    </span>
                  </button>
                ))}
              </div>
              {deleteReason === "Autre raison" && (
                <Textarea
                  placeholder="Précisez votre raison..."
                  value={deleteOther}
                  onChange={(e) => setDeleteOther(e.target.value)}
                  maxLength={300}
                  className="min-h-[70px] resize-none text-sm mt-2"
                />
              )}
            </div>

            {/* Step 2: Confirm text */}
            {deleteReason && (deleteReason !== "Autre raison" || deleteOther.trim()) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  2. Confirmez en tapant exactement :
                </Label>
                <p className="text-xs font-mono font-bold text-destructive bg-destructive/10 rounded px-2 py-1 tracking-widest">
                  {CONFIRM_PHRASE}
                </p>
                <Input
                  placeholder={CONFIRM_PHRASE}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className={`h-9 text-sm font-mono tracking-wide transition-colors ${
                    deleteConfirmText === CONFIRM_PHRASE
                      ? "border-destructive ring-1 ring-destructive/30"
                      : ""
                  }`}
                />
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                disabled={
                  !deleteReason ||
                  (deleteReason === "Autre raison" && !deleteOther.trim()) ||
                  deleteConfirmText !== CONFIRM_PHRASE ||
                  deleting
                }
                onClick={handleDeleteAccount}
              >
                {deleting ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Suppression...</>
                ) : (
                  <><XCircle className="h-4 w-4" /> Supprimer définitivement</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
