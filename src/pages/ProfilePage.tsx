import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Phone, MapPin, Home, Building2, Save, Shield,
  Bell, Globe, Palette, ChevronRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";

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
      })
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
      <main className="container max-w-3xl py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Mon espace</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gérez vos informations personnelles et préférences
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gradient-hero text-primary-foreground gap-2">
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "Sauvegarde..." : saved ? "Sauvegardé" : "Enregistrer"}
            </Button>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" /> Profil
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="h-4 w-4" /> Localisation
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Shield className="h-4 w-4" /> Paramètres
              </TabsTrigger>
            </TabsList>

            {/* ── PROFIL ── */}
            <TabsContent value="profile">
              <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground">
                    {profile.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">
                      {profile.first_name || profile.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : "Nouveau membre"}
                    </p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Prénom</Label>
                    <Input
                      placeholder="Votre prénom"
                      value={profile.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Nom</Label>
                    <Input
                      placeholder="Votre nom"
                      value={profile.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={user?.email ?? ""} disabled className="pl-10 opacity-60" />
                  </div>
                  <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="+225 XX XX XX XX"
                      value={profile.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className="pl-10"
                      maxLength={20}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Type de profil</Label>
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

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Bio</Label>
                  <Textarea
                    placeholder="Décrivez-vous en quelques mots (optionnel)"
                    value={profile.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    maxLength={300}
                    rows={3}
                  />
                  <p className="text-right text-xs text-muted-foreground">{profile.bio.length}/300</p>
                </div>
              </div>
            </TabsContent>

            {/* ── LOCALISATION ── */}
            <TabsContent value="location">
              <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <MapPin className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Votre localisation</p>
                    <p className="text-sm text-muted-foreground">
                      Permet de mieux cibler les signalements dans votre zone
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Commune</Label>
                  <Input
                    placeholder="Ex: Cocody, Yopougon, Plateau..."
                    value={profile.commune}
                    onChange={(e) => update("commune", e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Quartier *</Label>
                  <Input
                    placeholder="Ex: Angré, Selmer, Bingerville..."
                    value={profile.quartier}
                    onChange={(e) => update("quartier", e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cette information nous aide à vous envoyer les alertes pertinentes
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ── PARAMÈTRES ── */}
            <TabsContent value="settings">
              <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-card">
                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Bell className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Notifications</p>
                      <p className="text-sm text-muted-foreground">Recevez des alertes de coupure dans votre zone</p>
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Globe className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Langue</p>
                      <p className="text-sm text-muted-foreground">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Palette className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Thème</p>
                      <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm font-semibold text-foreground">Zone de danger</p>
                  <Button
                    variant="outline"
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
