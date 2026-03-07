import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Phone, MapPin, Home, Building2, Save, Shield,
  Bell, Globe, Palette, ChevronRight, CheckCircle2, FileText, Clock,
  Zap, Droplets, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import MyReports from "@/components/MyReports";
import { COMMUNES } from "@/lib/communes";
import { getQuartiers } from "@/lib/quartiers";

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
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
  }, [user]);

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

  const update = (field: keyof ProfileData, value: any) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  // Compute conformity score
  const conformityFields = [
    profile.first_name,
    profile.last_name,
    profile.commune,
    profile.quartier,
    profile.electricity_client_id,
    profile.electricity_meter_ref,
    profile.electricity_meter_number,
    profile.water_client_id,
    profile.water_meter_ref,
    profile.water_meter_number,
  ];
  const filledCount = conformityFields.filter((f) => f.trim() !== "").length;
  const conformityPercent = Math.round((filledCount / conformityFields.length) * 100);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl px-4 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {profile.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Mon espace</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {profile.first_name || profile.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : user?.email}
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-hero text-primary-foreground gap-2 self-end sm:self-auto">
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "Sauvegarde..." : saved ? "Sauvegardé" : "Enregistrer"}
            </Button>
          </div>

          {/* Conformity bar */}
          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conformité du profil</span>
              <span className={`text-sm font-bold ${conformityPercent >= 80 ? "text-green-500" : conformityPercent >= 50 ? "text-amber-500" : "text-destructive"}`}>
                {conformityPercent}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${conformityPercent >= 80 ? "bg-green-500" : conformityPercent >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                initial={{ width: 0 }}
                animate={{ width: `${conformityPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Plus votre profil est complet, plus vos signalements sont crédibles et traités en priorité.
            </p>
          </div>

          <Tabs defaultValue="reports" className="space-y-4 sm:space-y-6">
            <TabsList className="flex w-full overflow-x-auto no-scrollbar">
              <TabsTrigger value="reports" className="gap-1.5 min-w-0 flex-shrink-0 text-xs sm:text-sm">
                <FileText className="h-4 w-4 flex-shrink-0" /> <span className="hidden sm:inline">Signalements</span><span className="sm:hidden">Signaler</span>
              </TabsTrigger>
              <TabsTrigger value="utility" className="gap-1.5 min-w-0 flex-shrink-0 text-xs sm:text-sm">
                <Zap className="h-4 w-4 flex-shrink-0" /> <span className="hidden sm:inline">Compteurs</span><span className="sm:hidden">Compt.</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5 min-w-0 flex-shrink-0 text-xs sm:text-sm">
                <User className="h-4 w-4 flex-shrink-0" /> Profil
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-1.5 min-w-0 flex-shrink-0 text-xs sm:text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" /> <span className="hidden sm:inline">Localisation</span><span className="sm:hidden">Lieu</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 min-w-0 flex-shrink-0 text-xs sm:text-sm">
                <Shield className="h-4 w-4 flex-shrink-0" /> <span className="hidden sm:inline">Paramètres</span><span className="sm:hidden">Param.</span>
              </TabsTrigger>
            </TabsList>

            {/* ── MES SIGNALEMENTS ── */}
            <TabsContent value="reports">
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                <h2 className="font-display text-lg font-bold text-foreground mb-4">Mes signalements</h2>
                <MyReports />
              </div>
            </TabsContent>

            {/* ── COMPTEURS / UTILITY ── */}
            <TabsContent value="utility">
              <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                {/* Info banner */}
                <div className="flex gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 sm:p-4">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Augmentez la crédibilité de vos signalements</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Renseigner vos informations de compteur permet de renforcer la conformité de vos signalements auprès des autorités. 
                      <span className="font-medium text-foreground"> Ces champs sont facultatifs.</span>
                    </p>
                  </div>
                </div>

                {/* Electricity section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                      <Zap className="h-4 w-4 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-foreground">Électricité (CIE)</h3>
                    <span className="ml-auto text-xs text-muted-foreground italic">Facultatif</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Identifiant client</Label>
                      <Input
                        placeholder="Ex: 01234567"
                        value={profile.electricity_client_id}
                        onChange={(e) => update("electricity_client_id", e.target.value)}
                        maxLength={30}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Réf. compteur</Label>
                      <Input
                        placeholder="Ex: CIE-XXXX"
                        value={profile.electricity_meter_ref}
                        onChange={(e) => update("electricity_meter_ref", e.target.value)}
                        maxLength={30}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">N° compteur</Label>
                      <Input
                        placeholder="Ex: 987654321"
                        value={profile.electricity_meter_number}
                        onChange={(e) => update("electricity_meter_number", e.target.value)}
                        maxLength={30}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Water section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                      <Droplets className="h-4 w-4 text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-foreground">Eau (SODECI)</h3>
                    <span className="ml-auto text-xs text-muted-foreground italic">Facultatif</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Identifiant client</Label>
                      <Input
                        placeholder="Ex: 01234567"
                        value={profile.water_client_id}
                        onChange={(e) => update("water_client_id", e.target.value)}
                        maxLength={30}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Réf. compteur</Label>
                      <Input
                        placeholder="Ex: SOD-XXXX"
                        value={profile.water_meter_ref}
                        onChange={(e) => update("water_meter_ref", e.target.value)}
                        maxLength={30}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">N° compteur</Label>
                      <Input
                        placeholder="Ex: 123456789"
                        value={profile.water_meter_number}
                        onChange={(e) => update("water_meter_number", e.target.value)}
                        maxLength={30}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── PROFIL ── */}
            <TabsContent value="profile">
              <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Prénom</Label>
                    <Input
                      placeholder="Votre prénom"
                      value={profile.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                      maxLength={50}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Nom</Label>
                    <Input
                      placeholder="Votre nom"
                      value={profile.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                      maxLength={50}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={user?.email ?? ""} disabled className="pl-10 h-9 text-sm opacity-60" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={profile.phone || user?.phone || "Non renseigné"}
                      disabled
                      className="pl-10 h-9 text-sm opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Type de profil</Label>
                  <RadioGroup
                    value={profile.user_type}
                    onValueChange={(v) => update("user_type", v)}
                    className="flex gap-4"
                  >
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
                    <p className="text-xs text-muted-foreground">
                      Permet de cibler les signalements dans votre zone
                    </p>
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
                  <Label className="text-xs font-semibold text-muted-foreground">Quartier *</Label>
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
                      onChange={(e) => {
                        if (e.target.value.trim()) update("quartier", e.target.value.trim());
                      }}
                      maxLength={100}
                      autoFocus
                      className="h-9 text-sm"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Cette information nous aide à vous envoyer les alertes pertinentes
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ── PARAMÈTRES ── */}
            <TabsContent value="settings">
              <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Bell className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Notifications</p>
                      <p className="text-xs text-muted-foreground">Alertes de coupure dans votre zone</p>
                    </div>
                  </div>
                  <Switch
                    checked={profile.notifications_enabled}
                    onCheckedChange={(v) => update("notifications_enabled", v)}
                  />
                </div>

                <Separator />

                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Globe className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Langue</p>
                      <p className="text-xs text-muted-foreground">
                        {profile.language === "fr" ? "Français" : "English"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => update("language", profile.language === "fr" ? "en" : "fr")}
                  >
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
                    onClick={() =>
                      update(
                        "theme",
                        profile.theme === "system" ? "light" : profile.theme === "light" ? "dark" : "system"
                      )
                    }
                  >
                    {profile.theme === "system" ? "☀️" : profile.theme === "light" ? "🌙" : "⚙️"}
                  </Button>
                </div>

                <Separator />

                {/* Account actions */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Zone de danger</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-destructive hover:text-destructive"
                    onClick={async () => {
                      await signOut();
                      navigate("/");
                    }}
                  >
                    Se déconnecter
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default ProfilePage;
