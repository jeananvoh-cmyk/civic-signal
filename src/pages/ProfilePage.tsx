import { useEffect, useState, useRef, useCallback } from "react";
import { useThemeBrand } from "@/hooks/useThemeBrand";
import { motion, AnimatePresence } from "framer-motion";
// ProfilePage - updated
import {
  User, Mail, Phone, MapPin, Home, Building2, Save, Shield,
  Bell, Globe, Palette, ChevronRight, CheckCircle2, FileText, Clock,
  Zap, Droplets, Info, History, Trash2, AlertTriangle, LogOut,
  Filter, CalendarDays, XCircle, CheckCheck, Download, Award,
  BookOpen, ExternalLink, Scale, Lightbulb, ShieldCheck, Camera, Loader2, ScanLine,
  Gauge, BatteryMedium, ArrowLeft,
} from "lucide-react";
import { useElectricity } from "@/hooks/useElectricity";
import { formatDaysRemaining } from "@/lib/consumptionEngine";
import AddReadingSheet from "@/components/electricity/AddReadingSheet";
import confetti from "canvas-confetti";
import waterIconSm from "@/assets/water-icon-sm.webp";
import electricityIconSm from "@/assets/electricity-icon-sm.webp";
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
import CitizenBadge from "@/components/CitizenBadge";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import MyReports from "@/components/MyReports";
import { COMMUNES } from "@/lib/communes";
import { useRightsContent } from "@/hooks/useRightsContent";
import { getQuartiers } from "@/lib/quartiers";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";

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
  report_category: string;
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

const CONTACT_COLORS: Record<string, string> = {
  electricity: "text-amber-500",
  water: "text-blue-500",
  general: "text-primary",
  emergency: "text-destructive",
};

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  electricity: <Zap className="h-4 w-4 text-amber-500" />,
  water: <Droplets className="h-4 w-4 text-blue-500" />,
  general: <Scale className="h-4 w-4 text-primary" />,
};

const RightsTabContent = () => {
  const { data: rights, isLoading } = useRightsContent();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [relayWA, setRelayWA] = useState<{ cie: string; sodeci: string }>({ cie: "", sodeci: "" });

  useEffect(() => {
    supabase
      .from("relay_config")
      .select("key, value")
      .in("key", ["whatsapp_cie", "whatsapp_sodeci"])
      .then(({ data }) => {
        if (!data) return;
        const cie = data.find(r => r.key === "whatsapp_cie")?.value ?? "";
        const sodeci = data.find(r => r.key === "whatsapp_sodeci")?.value ?? "";
        setRelayWA({ cie, sodeci });
      });
  }, []);

  const toggle = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (isLoading || !rights) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // WhatsApp icon reusable
  const WhatsAppIcon = () => (
    <div className="h-7 w-7 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </div>
  );

  // Build contacts merged cards (same logic as below)
  const waMap: Record<string, string> = Object.fromEntries(
    rights.contacts.filter(c => c.whatsapp).map(c => [c.type, c.whatsapp!])
  );
  const typesWithWA = new Set(Object.keys(waMap));
  const mergedContacts = [...typesWithWA].map(type => {
    const group = rights.contacts.filter(c => c.type === type);
    const phoneContact = group.find(c => !c.whatsapp) ?? group[0];
    return { contact: phoneContact, waNumber: waMap[type] };
  }).filter(m => !!m.contact);
  const contactsWithoutWA = rights.contacts.filter(c => !typesWithWA.has(c.type));

  const sections = [
    {
      key: "elec",
      icon: <Zap className="h-4 w-4 text-amber-500" />,
      title: "Électricité — Vos droits",
      count: rights.electricity_rights.length,
      bgAccent: "bg-amber-500/5",
      items: rights.electricity_rights,
    },
    {
      key: "water",
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
      title: "Eau — Vos droits",
      count: rights.water_rights.length,
      bgAccent: "bg-blue-500/5",
      items: rights.water_rights,
    },
    {
      key: "tips",
      icon: <Lightbulb className="h-4 w-4 text-green-600 dark:text-green-400" />,
      title: "Conseils & bonnes pratiques",
      count: rights.tips.length,
      bgAccent: "bg-green-500/5",
      items: rights.tips,
      grid: true,
    },
    {
      key: "resources",
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      title: "Textes de loi & ressources",
      count: rights.resources.length,
      bgAccent: "bg-muted/30",
    },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-3">

      {/* ── Mon Espace Eau & Électricité — collapsible ── */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <button
          onClick={() => toggle("intro")}
          aria-expanded={openSections.has("intro")}
          aria-controls="section-intro"
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
              <Scale className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 text-left">
              <h2 className="font-display text-base font-bold text-foreground">Mon Espace Eau & Électricité</h2>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                Vos droits, devoirs, conseils et ressources officielles en tant qu'usager en Côte d'Ivoire.
              </p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${openSections.has("intro") ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence initial={false}>
          {openSections.has("intro") && (
            <motion.div
              id="section-intro"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border pt-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-left">
                    <span className="text-base">💧</span>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">ODD 6 — Eau propre</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-left">
                    <span className="text-base">⚡</span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">ODD 7 — Énergie</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Numéros utiles — collapsible, after intro ── */}
      {rights.contacts.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <button
            onClick={() => toggle("contacts")}
            aria-expanded={openSections.has("contacts")}
            aria-controls="section-contacts"
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-destructive/5 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-destructive shrink-0" />
              <span className="font-semibold text-sm text-foreground">Numéros utiles</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">{rights.contacts.length}</Badge>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections.has("contacts") ? "rotate-90" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {openSections.has("contacts") && (
              <motion.div
                id="section-contacts"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-2 border-t border-border">
                  {mergedContacts.map(({ contact: c, waNumber }, i) => {
                    const color = CONTACT_COLORS[c.type] || "text-primary";
                    const waClean = waNumber.replace(/\D/g, "");
                    return (
                      <div key={i} className="rounded-lg border border-border bg-background overflow-hidden">
                        <div className="flex">
                          <a href={`tel:${c.number.replace(/\s/g, "")}`}
                            className="flex flex-1 items-center gap-2.5 p-3 hover:bg-accent transition-colors border-r border-border">
                            <Phone className={`h-4 w-4 ${color} shrink-0`} />
                            <div>
                              <p className="text-[11px] text-muted-foreground leading-tight">{c.name}</p>
                              <p className={`text-sm font-bold ${color}`}>{c.number}</p>
                            </div>
                          </a>
                          <a href={`https://wa.me/${waClean}`} target="_blank" rel="noopener noreferrer"
                            className="flex flex-1 items-center gap-2.5 p-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            <WhatsAppIcon />
                            <div>
                              <p className="text-[11px] text-muted-foreground leading-tight">WhatsApp</p>
                              <p className="text-sm font-bold text-[#25D366]">{waNumber}</p>
                            </div>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                  {contactsWithoutWA.length > 0 && (
                    <div className="grid gap-2 grid-cols-2">
                      {contactsWithoutWA.map((c, i) => {
                        const color = CONTACT_COLORS[c.type] || "text-primary";
                        const isWA = /whatsapp/i.test(c.name);
                        const numClean = c.number.replace(/\D/g, "");
                        if (isWA) {
                          return (
                            <a key={i} href={`https://wa.me/${numClean}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2.5 rounded-lg border border-green-200 dark:border-green-800/40 p-2.5 bg-background hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                              <WhatsAppIcon />
                              <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground leading-tight truncate">{c.name}</p>
                                <p className="text-xs font-bold text-[#25D366]">{c.number}</p>
                              </div>
                            </a>
                          );
                        }
                        return (
                          <a key={i} href={`tel:${c.number.replace(/\s/g, "")}`}
                            className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 bg-background hover:bg-accent transition-colors">
                            <Phone className={`h-4 w-4 ${color} shrink-0`} />
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground leading-tight truncate">{c.name}</p>
                              <p className={`text-xs font-bold ${color}`}>{c.number}</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                {/* WhatsApp relay_config CIE / SODECI — si configurés par l'admin */}
                {(relayWA.cie || relayWA.sodeci) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[11px] text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Contact WhatsApp direct</p>
                    <div className="grid gap-2 grid-cols-2">
                      {relayWA.cie && (
                        <a href={`https://wa.me/${relayWA.cie.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-lg border border-green-200 dark:border-green-800/40 p-2.5 bg-background hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <WhatsAppIcon />
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-tight">CIE WhatsApp</p>
                            <p className="text-xs font-bold text-[#25D366]">{relayWA.cie}</p>
                          </div>
                        </a>
                      )}
                      {relayWA.sodeci && (
                        <a href={`https://wa.me/${relayWA.sodeci.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-lg border border-green-200 dark:border-green-800/40 p-2.5 bg-background hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <WhatsAppIcon />
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground leading-tight">SODECI WhatsApp</p>
                            <p className="text-xs font-bold text-[#25D366]">{relayWA.sodeci}</p>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Accordion sections */}
      {sections.map(s => {
        const isOpen = openSections.has(s.key);
        return (
          <div key={s.key} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <button
              onClick={() => toggle(s.key)}
              aria-expanded={isOpen}
              aria-controls={`section-${s.key}`}
              className={`w-full flex items-center justify-between gap-2 px-4 py-3 ${s.bgAccent} hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
              <div className="flex items-center gap-2">
                {s.icon}
                <span className="font-semibold text-sm text-foreground">{s.title}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{s.count}</Badge>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`section-${s.key}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-border">
                    {/* Rights items (elec/water) */}
                    {s.items && !s.grid && (
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {s.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">{item.icon}</span>
                            <p><span className="font-semibold text-foreground">{item.title}</span> — {item.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tips grid */}
                    {s.items && s.grid && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {s.items.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2.5 bg-background">
                            <span className="text-base shrink-0">{tip.icon}</span>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{tip.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resources */}
                    {s.key === "resources" && (
                      <div className="space-y-1.5">
                        {rights.resources.map((r, i) => (
                          <a
                            key={i}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-border p-2.5 bg-background hover:bg-accent transition-colors group"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                              {RESOURCE_ICONS[r.type] || RESOURCE_ICONS.general}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{r.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">{r.format}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Contacts — now rendered above the accordion, nothing to render here */}
                    {s.key === "contacts" && null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};


// ─── Widget électricité — visible directement dans l'onglet Compteurs ────────

function ElectricityWidget() {
  const { activeMeter, recharges, estimate, addReading, hasData } = useElectricity();
  const [showReadingSheet, setShowReadingSheet] = useState(false);

  // Pas encore de compteur configuré → simple lien vers /compteur
  if (!hasData) {
    return (
      <Link
        to="/compteur"
        className="flex items-center justify-between rounded-2xl border border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-yellow-400/5 px-4 py-4 mb-5 hover:from-yellow-500/15 hover:to-yellow-400/10 active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-yellow-500/15 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">Suivi électricité prépayée</p>
            <p className="text-xs text-muted-foreground mt-0.5">Commencer le suivi de votre consommation</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </Link>
    );
  }

  const isInsufficient = estimate.confidence === "insufficient";

  // Couleur urgence selon jours restants
  const urgentBorder = estimate.days_remaining !== null && estimate.days_remaining <= 3
    ? "border-red-500/40 from-red-500/10 to-red-400/5"
    : estimate.days_remaining !== null && estimate.days_remaining <= 7
    ? "border-orange-500/40 from-orange-500/10 to-orange-400/5"
    : "border-yellow-500/40 from-yellow-500/10 to-yellow-400/5";

  return (
    <>
      <div className={`rounded-2xl border bg-gradient-to-r ${urgentBorder} p-4 mb-5 space-y-3`}>

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{activeMeter?.label ?? "Mon compteur"}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {activeMeter?.meter_number ? `Ctr: ${activeMeter.meter_number}` : "Suivi électricité prépayée"}
              </p>
            </div>
          </div>
          <Link to="/compteur" className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5">
            Détails <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Métriques principales */}
        {!isInsufficient ? (
          <div className="grid grid-cols-3 gap-2">
            {/* kWh restants */}
            <div className="rounded-xl bg-white/60 dark:bg-card/60 border border-border px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground leading-tight mb-0.5">kWh restants</p>
              <p className={`text-xl font-extrabold leading-tight ${
                (estimate.current_kwh ?? 0) <= 10 ? "text-red-600" :
                (estimate.current_kwh ?? 0) <= 25 ? "text-orange-600" : "text-foreground"
              }`}>
                {estimate.current_kwh ?? "—"}
              </p>
            </div>
            {/* Jours restants */}
            <div className="rounded-xl bg-white/60 dark:bg-card/60 border border-border px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground leading-tight mb-0.5">Autonomie</p>
              <p className={`text-base font-extrabold leading-tight ${
                (estimate.days_remaining ?? 99) <= 3 ? "text-red-600" :
                (estimate.days_remaining ?? 99) <= 7 ? "text-orange-600" : "text-foreground"
              }`}>
                {formatDaysRemaining(estimate.days_remaining)}
              </p>
            </div>
            {/* Conso/jour */}
            <div className="rounded-xl bg-white/60 dark:bg-card/60 border border-border px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground leading-tight mb-0.5">Conso/jour</p>
              <p className="text-base font-extrabold text-foreground leading-tight">
                {estimate.avg_kwh_per_day !== null ? `${estimate.avg_kwh_per_day}` : "—"}
                {estimate.avg_kwh_per_day !== null && <span className="text-[10px] font-medium text-muted-foreground"> kWh</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/60 dark:bg-card/60 border border-border px-3 py-2.5">
            <p className="text-xs text-muted-foreground text-center">
              {recharges.length === 0
                ? "Enregistrez une recharge pour démarrer le suivi"
                : "Ajoutez une mise à jour de consommation pour voir l'estimation"}
            </p>
          </div>
        )}

        {/* Disclaimer estimation */}
        <p className="text-[10px] text-muted-foreground leading-tight px-0.5">
          ⓘ Estimation basée uniquement sur vos données saisies. La quantité réelle peut différer.
        </p>

        {/* Bouton mise à jour rapide */}
        <button
          onClick={() => setShowReadingSheet(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-yellow-500/40 py-2.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/5 transition-colors active:scale-[0.98]"
        >
          <Gauge className="h-3.5 w-3.5" />
          Mettre à jour mes kWh restants
        </button>
      </div>

      {showReadingSheet && activeMeter && (
        <AddReadingSheet
          meterId={activeMeter.id}
          currentEstimate={estimate.current_kwh}
          onSave={async (data) => {
            await addReading.mutateAsync(data);
            const { toast: t } = await import("sonner");
            t.success("Mise à jour enregistrée");
          }}
          onClose={() => setShowReadingSheet(false)}
        />
      )}
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { isIvoire, toggle: toggleBrandTheme } = useThemeBrand();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "rights";
  const targetField = searchParams.get("field");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const initialProfileRef = useRef<ProfileData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<"electricity" | "water" | null>(null);
  const [ocrPreview, setOcrPreview] = useState<{ type: "electricity" | "water"; url: string } | null>(null);
  const elecFileRef = useRef<HTMLInputElement>(null);
  const waterFileRef = useRef<HTMLInputElement>(null);
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

  // Active & resolved reports count
  const [activeReportsCount, setActiveReportsCount] = useState<number | null>(null);
  const [resolvedReportsCount, setResolvedReportsCount] = useState<number>(0);

  // History state
  const [history, setHistory] = useState<HistoryReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "active" | "resolved">("all");
  const [historyType, setHistoryType] = useState<"all" | "electricity" | "water">("all");

  // Google-style section navigation
  const [activeSection, setActiveSection] = useState<string | null>(() => {
    const t = searchParams.get("tab");
    const f = searchParams.get("field");
    if (f && !t) {
      if (f.startsWith("electricity") || f.startsWith("water")) return "utility";
      if (f === "commune" || f === "quartier") return "location";
      return "profile";
    }
    if (!t || t === "rights") return null;
    if (t === "settings") return "notifications";
    return t;
  });

  const goToSection = (s: string) => {
    if (s === "history" && history.length === 0) fetchHistory();
    setActiveSection(s);
  };

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showOddDialog, setShowOddDialog] = useState<"odd6" | "odd7" | null>(null);
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
        initialProfileRef.current = {
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
        };
      }
      setLoading(false);
    };
    fetchProfile();

    // Fetch active & resolved reports count
    const fetchCounts = async () => {
      const [{ count: activeCount }, { count: resolvedCount }] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "resolved"),
      ]);
      setActiveReportsCount(activeCount ?? 0);
      setResolvedReportsCount(resolvedCount ?? 0);
    };
    fetchCounts();
  }, [user]);

  // ── Auto-focus field from ?field= param (après chargement) ──────────────────
  useEffect(() => {
    if (!targetField || loading) return;
    // Petit délai pour que le tab soit rendu
    const t = setTimeout(() => {
      const el = document.getElementById(`field-${targetField}`) as HTMLInputElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
        // Flash visuel
        el.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 2000);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [targetField, loading]);

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, resolved_at, verifications, start_time")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setHistory(data as HistoryReport[]);
    setHistoryLoading(false);
  };

  const sanitizePreviewImageUrl = (url: string): string => {
    return url.startsWith("blob:") ? url : "";
  };

  const handleOcrScan = async (file: File, hint: "electricity" | "water") => {
    setOcrLoading(hint);
    const previewUrl = URL.createObjectURL(file);
    setOcrPreview({ type: hint, url: previewUrl });

    try {
      // Convertir en base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      // Appel via supabase.functions.invoke (pattern standard de l'app)
      const { data: result, error } = await supabase.functions.invoke("extract-meter-info", {
        body: {
          image_base64: base64,
          mime_type: file.type || "image/jpeg",
          hint,
        },
      });

      if (error) {
        toast.error("Impossible d'analyser l'image", { description: error.message });
        return;
      }

      if (result?.error) {
        toast.error("Impossible d'analyser l'image", { description: result.error });
        return;
      }

      // Remplir les champs détectés
      let filled = 0;
      const fields = [
        "electricity_client_id", "electricity_meter_ref", "electricity_meter_number",
        "water_client_id", "water_meter_ref", "water_meter_number",
      ] as const;

      fields.forEach((f) => {
        if (result?.[f]) { update(f, result[f]); filled++; }
      });

      if (filled === 0) {
        toast.warning("Aucun numéro détecté", {
          description: "L'image n'est peut-être pas assez nette. Réessayez avec une meilleure photo.",
        });
      } else {
        const confidence = result?.confidence === "high" ? "haute" : result?.confidence === "medium" ? "moyenne" : "faible";
        toast.success(`${filled} champ${filled > 1 ? "s" : ""} rempli${filled > 1 ? "s" : ""}`, {
          description: `Fiabilité de lecture : ${confidence}. Vérifiez les valeurs avant d'enregistrer.`,
        });
      }
    } catch (err) {
      console.error("OCR error:", err);
      toast.error("Analyse impossible", { description: "Vérifiez que la photo est nette et réessayez." });
    } finally {
      setOcrLoading(null);
      URL.revokeObjectURL(previewUrl);
      setOcrPreview(null);
      if (elecFileRef.current) elecFileRef.current.value = "";
      if (waterFileRef.current) waterFileRef.current.value = "";
    }
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
      setIsDirty(false);
      initialProfileRef.current = { ...profile };
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
    setProfile((p) => {
      const next = { ...p, [field]: value };
      // Check dirty
      if (initialProfileRef.current) {
        const dirty = (Object.keys(next) as (keyof ProfileData)[]).some(
          (k) => next[k] !== initialProfileRef.current![k]
        );
        setIsDirty(dirty);
      }
      return next;
    });
    setSaved(false);
  };

  // Weighted conformity: 5 identity fields = 19% each (95%), 6 meter fields share remaining 5%
  const METER_WEIGHT = 5 / 6; // ~0.83% each
  const conformityWeighted: { field: string; value: string; weight: number; label: string; displayWeight: string }[] = [
    { field: "first_name", value: profile.first_name, weight: 19, label: "Prénom", displayWeight: "19%" },
    { field: "last_name", value: profile.last_name, weight: 19, label: "Nom", displayWeight: "19%" },
    { field: "phone", value: profile.phone, weight: 19, label: "WhatsApp", displayWeight: "19%" },
    { field: "commune", value: profile.commune, weight: 19, label: "Commune", displayWeight: "19%" },
    { field: "quartier", value: profile.quartier, weight: 19, label: "Quartier", displayWeight: "19%" },
    { field: "electricity_client_id", value: profile.electricity_client_id, weight: METER_WEIGHT, label: "N° client CIE", displayWeight: "<1%" },
    { field: "electricity_meter_ref", value: profile.electricity_meter_ref, weight: METER_WEIGHT, label: "Réf. compteur CIE", displayWeight: "<1%" },
    { field: "electricity_meter_number", value: profile.electricity_meter_number, weight: METER_WEIGHT, label: "N° compteur CIE", displayWeight: "<1%" },
    { field: "water_client_id", value: profile.water_client_id, weight: METER_WEIGHT, label: "N° client SODECI", displayWeight: "<1%" },
    { field: "water_meter_ref", value: profile.water_meter_ref, weight: METER_WEIGHT, label: "Réf. compteur SODECI", displayWeight: "<1%" },
    { field: "water_meter_number", value: profile.water_meter_number, weight: METER_WEIGHT, label: "N° compteur SODECI", displayWeight: "<1%" },
  ];
  const conformityPercent = Math.min(100, Math.round(conformityWeighted.reduce((sum, f) => sum + (f.value.trim() ? f.weight : 0), 0)));
  const missingFields = conformityWeighted.filter((f) => !f.value.trim());
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

  const SECTION_TITLES: Record<string, string> = {
    profile: "Mon profil",
    location: "Ma localisation",
    history: "Mes signalements",
    utility: "Mes compteurs",
    rights: "Eau & énergie",
    notifications: "Notifications",
    appearance: "Apparence",
  };

  const conformityColor = isProfileComplete
    ? "hsl(45 93% 47%)"
    : conformityPercent >= 80
    ? "hsl(142 71% 45%)"
    : conformityPercent >= 50
    ? "hsl(38 92% 50%)"
    : "hsl(var(--destructive))";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl px-0 sm:px-4 py-0 sm:py-6">
        <AnimatePresence mode="wait">
          {!activeSection ? (
            /* ═══ MAIN MENU VIEW ═══ */
            <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pb-20">

              {/* ── Profile Card Header ── */}
              <div className="bg-gradient-to-b from-primary/15 via-primary/5 to-background pb-4 pt-6 px-4">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar with conformity ring */}
                  <div className="relative mb-3">
                    <svg width="80" height="80" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                      <circle cx="48" cy="48" r="42" fill="none" stroke={conformityColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - conformityPercent / 100)}`} transform="rotate(-90 48 48)" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg">
                        {avatarInitial}
                      </div>
                    </div>
                    {isProfileComplete && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-[hsl(45_93%_47%)] flex items-center justify-center border-2 border-background shadow">
                        <Award className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground leading-tight">{displayName}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
                  {profile.commune && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />{profile.commune}{profile.quartier ? `, ${profile.quartier}` : ""}
                    </p>
                  )}
                  {conformityPercent < 100 && (
                    <button onClick={() => goToSection("profile")} className="mt-3 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      Profil à {conformityPercent}% — Compléter maintenant
                    </button>
                  )}
                </div>

                {/* Stats strip */}
                <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card/80 overflow-hidden">
                  <div className="flex flex-col items-center py-3 px-2">
                    <span className="text-lg font-bold text-destructive">{activeReportsCount ?? 0}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">En cours</span>
                  </div>
                  <div className="flex flex-col items-center py-3 px-2">
                    <span className="text-lg font-bold text-green-600">{resolvedReportsCount}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Résolus</span>
                  </div>
                  <div className="flex flex-col items-center py-3 px-2">
                    <span className="text-lg font-bold" style={{ color: conformityColor }}>{conformityPercent}%</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Complétude</span>
                  </div>
                </div>

                {/* ODD chips */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => setShowOddDialog("odd6")} className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-2.5 hover:bg-blue-500/10 transition-colors text-left">
                    <span className="text-lg shrink-0">💧</span>
                    <div className="min-w-0"><p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-tight">ODD 6</p><p className="text-[10px] text-muted-foreground leading-tight">Eau propre</p></div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                  </button>
                  <button onClick={() => setShowOddDialog("odd7")} className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 hover:bg-amber-500/10 transition-colors text-left">
                    <span className="text-lg shrink-0">⚡</span>
                    <div className="min-w-0"><p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-tight">ODD 7</p><p className="text-[10px] text-muted-foreground leading-tight">Énergie propre</p></div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                  </button>
                </div>
              </div>

              {/* ── Navigation sections ── */}
              <div className="px-4 space-y-3 mt-4">
                {/* Mon compte */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">Mon compte</p>
                  {[
                    { key: "profile", icon: <User className="h-5 w-5 text-primary" />, label: "Mon profil", sub: "Prénom, nom, téléphone", bg: "bg-primary/10" },
                    { key: "location", icon: <MapPin className="h-5 w-5 text-blue-600" />, label: "Ma localisation", sub: profile.commune || "Commune, quartier", bg: "bg-blue-500/10" },
                  ].map((item, i, arr) => (
                    <button key={item.key} onClick={() => goToSection(item.key)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>{item.icon}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="text-xs text-muted-foreground truncate">{item.sub}</p></div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Mon activité */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">Mon activité</p>
                  {[
                    { key: "history", icon: <History className="h-5 w-5 text-green-600" />, label: "Mes signalements", sub: `${historyStats.total} signalement${historyStats.total > 1 ? "s" : ""}`, bg: "bg-green-500/10", badge: (activeReportsCount ?? 0) > 0 ? `${activeReportsCount} actif${(activeReportsCount ?? 0) > 1 ? "s" : ""}` : null, dot: false },
                    { key: "utility", icon: <Zap className="h-5 w-5 text-amber-500" />, label: "Mes compteurs", sub: "CIE · SODECI", bg: "bg-amber-500/10", badge: null, dot: true },
                  ].map((item, i, arr) => (
                    <button key={item.key} onClick={() => goToSection(item.key)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>{item.icon}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.sub}</p></div>
                      {item.badge && <span className="text-[10px] font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5 shrink-0 mr-1">{item.badge}</span>}
                      {item.dot && <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0 mr-1" />}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Informations */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">Informations</p>
                  <button onClick={() => goToSection("rights")} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/10"><Scale className="h-5 w-5 text-teal-600" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">Eau & Énergie</p><p className="text-xs text-muted-foreground">Droits, contacts, tarifs</p></div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </div>

                {/* Préférences */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">Préférences</p>
                  {[
                    { key: "notifications", icon: <Bell className="h-5 w-5 text-purple-600" />, label: "Notifications", sub: profile.notifications_enabled ? "Activées" : "Désactivées", bg: "bg-purple-500/10" },
                    { key: "appearance", icon: <Palette className="h-5 w-5 text-pink-500" />, label: "Apparence & thème", sub: profile.theme === "system" ? "Système" : profile.theme === "dark" ? "Sombre" : "Clair", bg: "bg-pink-500/10" },
                  ].map((item, i, arr) => (
                    <button key={item.key} onClick={() => goToSection(item.key)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>{item.icon}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.sub}</p></div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Account actions */}
                <div className="space-y-2 pt-1">
                  <Button variant="outline" size="sm" className="w-full justify-between h-12 rounded-xl" onClick={async () => {
                    if (!user) return;
                    toast.info("Préparation de l'export...");
                    try {
                      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
                      const { data: reportsData } = await supabase.from("reports").select("id, service_type, report_category, description, commune, quartier, status, urgency, created_at, resolved_at, start_time, impacted_people, babies, pregnant, elderly, verifications").eq("user_id", user.id).order("created_at", { ascending: false });
                      const { data: corroborationsData } = await supabase.from("corroborations").select("report_id, created_at").eq("user_id", user.id);
                      const exportData = { exported_at: new Date().toISOString(), user_email: user.email, profile: profileData ? { first_name: profileData.first_name, last_name: profileData.last_name, display_name: profileData.display_name, phone: profileData.phone, commune: profileData.commune, quartier: profileData.quartier, user_type: profileData.user_type, created_at: profileData.created_at } : null, reports: reportsData || [], corroborations: corroborationsData || [] };
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `signaci-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Export téléchargé !");
                    } catch { toast.error("Erreur lors de l'export"); }
                  }}>
                    <span className="flex items-center gap-2"><Download className="h-4 w-4" />Exporter mes données</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-between h-12 rounded-xl" onClick={async () => { await signOut(); navigate("/"); }}>
                    <span className="flex items-center gap-2"><LogOut className="h-4 w-4" />Se déconnecter</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Danger zone */}
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-semibold text-destructive">Zone de danger</p>
                  </div>
                  <p className="text-xs text-muted-foreground">La suppression de votre compte est <strong>irréversible</strong>. Toutes vos données seront définitivement supprimées.</p>
                  <Button variant="destructive" size="sm" className="w-full gap-2" onClick={() => { setShowDeleteDialog(true); setDeleteReason(""); setDeleteOther(""); setDeleteConfirmText(""); }}>
                    <Trash2 className="h-4 w-4" />
                    Supprimer mon compte
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ═══ SECTION VIEW ═══ */
            <motion.div key={activeSection} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="pb-20">

              {/* Sticky section header */}
              <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
                <button onClick={() => setActiveSection(null)} className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="font-semibold text-base text-foreground flex-1">{SECTION_TITLES[activeSection]}</h2>
                {isDirty && (
                  <Button size="sm" onClick={handleSave} disabled={saving} className="shrink-0 gap-1.5">
                    {saving ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />...</> : <><CheckCircle2 className="h-3.5 w-3.5" />Enregistrer</>}
                  </Button>
                )}
              </div>

              {/* Section content */}
              <div className="px-4 py-4 sm:px-0 sm:py-6 space-y-4">

                {/* ── PROFIL ── */}
                {activeSection === "profile" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                      <div className="h-28 bg-gradient-to-r from-primary via-primary/90 to-primary/70 relative flex items-end px-5 pb-3">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                        <div className="relative z-10 flex items-center gap-3">
                          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-white/30">{avatarInitial}</div>
                          <div className="min-w-0"><p className="font-bold text-lg text-white leading-tight truncate drop-shadow">{displayName}</p><p className="text-xs text-white/75 truncate">{user?.email}</p></div>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label className="text-xs font-semibold text-foreground">Prénom</Label><Input id="field-first_name" placeholder="Votre prénom" value={profile.first_name} onChange={(e) => update("first_name", e.target.value)} maxLength={50} className="h-11 text-sm rounded-xl" /></div>
                          <div className="space-y-1.5"><Label className="text-xs font-semibold text-foreground">Nom de famille</Label><Input id="field-last_name" placeholder="Votre nom" value={profile.last_name} onChange={(e) => update("last_name", e.target.value)} maxLength={50} className="h-11 text-sm rounded-xl" /></div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-primary" /></div>
                        <h3 className="font-semibold text-sm text-foreground">Contact</h3>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adresse e-mail</Label>
                          <div className="flex items-center gap-3 h-11 rounded-xl border border-border bg-muted/40 px-3">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground truncate flex-1">{user?.email}</span>
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">Non modifiable</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Numéro WhatsApp <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </div>
                            <Input id="field-phone" placeholder="Ex: +225 07 01 23 45 67" value={profile.phone} onChange={(e) => update("phone", e.target.value)} maxLength={20} type="tel" className="pl-11 h-11 text-sm rounded-xl border-border focus:border-[#25D366] focus:ring-[#25D366]/20" />
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />Requis pour faire un signalement</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><User className="h-3.5 w-3.5 text-primary" /></div>
                        <h3 className="font-semibold text-sm text-foreground">Type de profil</h3>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => update("user_type", "household")} className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${profile.user_type === "household" ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
                            {profile.user_type === "household" && <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-white" /></div>}
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${profile.user_type === "household" ? "bg-primary/15" : "bg-muted"}`}><Home className={`h-5 w-5 ${profile.user_type === "household" ? "text-primary" : "text-muted-foreground"}`} /></div>
                            <div className="text-center"><p className={`text-sm font-semibold ${profile.user_type === "household" ? "text-primary" : "text-foreground"}`}>Ménage</p><p className="text-[11px] text-muted-foreground">Particulier / Famille</p></div>
                          </button>
                          <button type="button" onClick={() => update("user_type", "business")} className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${profile.user_type === "business" ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
                            {profile.user_type === "business" && <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-white" /></div>}
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${profile.user_type === "business" ? "bg-primary/15" : "bg-muted"}`}><Building2 className={`h-5 w-5 ${profile.user_type === "business" ? "text-primary" : "text-muted-foreground"}`} /></div>
                            <div className="text-center"><p className={`text-sm font-semibold ${profile.user_type === "business" ? "text-primary" : "text-foreground"}`}>Entreprise</p><p className="text-[11px] text-muted-foreground">Commerce / Structure</p></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── LOCALISATION ── */}
                {activeSection === "location" && (
                  <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary"><MapPin className="h-4 w-4 text-secondary-foreground" /></div>
                      <div><p className="font-semibold text-sm text-foreground">Votre localisation</p><p className="text-xs text-muted-foreground">Permet de cibler les signalements dans votre zone</p></div>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Commune</Label>
                      <Select value={profile.commune} onValueChange={(v) => { update("commune", v); update("quartier", ""); }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner votre commune" /></SelectTrigger>
                        <SelectContent>
                          {COMMUNES.map((c) => (
                            <SelectItem key={c.nom} value={c.nom}>
                              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: c.couleur }} />{c.nom}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Quartier</Label>
                      {profile.commune ? (
                        <Select value={profile.quartier} onValueChange={(v) => update("quartier", v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner votre quartier" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {getQuartiers(profile.commune).map((q) => (<SelectItem key={q} value={q}>{q}</SelectItem>))}
                            <SelectItem value="__other">Autre quartier...</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sélectionnez d'abord une commune</p>
                      )}
                      {profile.quartier === "__other" && (
                        <Input placeholder="Saisissez le nom du quartier" onChange={(e) => { if (e.target.value.trim()) update("quartier", e.target.value.trim()); }} maxLength={100} autoFocus className="h-9 text-sm" />
                      )}
                      <p className="text-xs text-muted-foreground">Cette information nous aide à vous envoyer les alertes pertinentes</p>
                    </div>
                  </div>
                )}

                {/* ── HISTORIQUE ── */}
                {activeSection === "history" && (
                  <div className="space-y-4">
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
                    {resolvedReportsCount >= 1 && (
                      <CitizenBadge
                        displayName={profile?.display_name || profile?.first_name || "Citoyen"}
                        resolvedCount={resolvedReportsCount}
                        commune={profile?.commune || undefined}
                      />
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex gap-1.5 flex-wrap">
                        {(["all", "active", "resolved"] as const).map((f) => (
                          <button key={f} onClick={() => setHistoryFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${historyFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}>
                            {f === "all" ? "Tous" : f === "active" ? "En cours" : "Résolus"}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5 flex-wrap ml-1">
                        {(["all", "electricity", "water"] as const).map((t) => (
                          <button key={t} onClick={() => setHistoryType(t)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border flex items-center gap-1 ${historyType === t ? t === "electricity" ? "bg-amber-500 text-white border-amber-500" : t === "water" ? "bg-blue-500 text-white border-blue-500" : "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}>
                            {t === "electricity" ? <Zap className="h-3 w-3" /> : t === "water" ? <Droplets className="h-3 w-3" /> : null}
                            {t === "all" ? "Tous types" : t === "electricity" ? "Électricité" : "Eau"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {historyLoading ? (
                      <div className="flex justify-center py-10"><div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                    ) : filteredHistory.length === 0 ? (
                      <div className="rounded-xl border border-border bg-card p-8 text-center">
                        <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">Aucun signalement trouvé</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-5 top-4 bottom-4 w-px bg-border hidden sm:block" />
                        <div className="space-y-3">
                          <AnimatePresence>
                            {filteredHistory.map((r, i) => {
                              const isElec = r.service_type === "electricity";
                              const isInfra = r.report_category === "infrastructure";
                              const infraLabel = isInfra ? extractInfraLabel(r.description) : null;
                              const isActive = r.status === "active";
                              const duration = r.resolved_at ? formatDuration(r.start_time, r.resolved_at) : null;
                              return (
                                <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ delay: i * 0.03 }} className="flex gap-3 sm:gap-4">
                                  <div className="relative z-10 flex-shrink-0 hidden sm:flex">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${isInfra ? "bg-teal-500/10 border-teal-500/40 text-teal-600" : isElec ? "bg-amber-500/10 border-amber-500/40 text-amber-500" : "bg-blue-500/10 border-blue-500/40 text-blue-500"}`}>
                                      {isInfra ? <span className="text-base leading-none">{infraEmoji(infraLabel)}</span> : isElec ? <Zap className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                                    </div>
                                  </div>
                                  <div className={`flex-1 rounded-xl border bg-card p-3 sm:p-4 shadow-sm ${isActive ? "border-border" : "border-border/60 opacity-80"}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                          <span className={`sm:hidden text-sm ${isInfra ? "text-teal-600" : isElec ? "text-amber-500" : "text-blue-500"}`}>{isInfra ? <span className="text-sm leading-none">{infraEmoji(infraLabel)}</span> : isElec ? <Zap className="h-3.5 w-3.5 inline" /> : <Droplets className="h-3.5 w-3.5 inline" />}</span>
                                          <span className="font-semibold text-sm text-foreground">{r.commune}</span>
                                          {r.quartier && <span className="text-xs text-muted-foreground">· {r.quartier}</span>}
                                          {isInfra && infraLabel && <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-400">{infraLabel}</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{cleanDescription(r.description)}</p>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <Badge variant={isActive ? "default" : "outline"} className={`text-xs h-5 ${isActive ? "bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20" : "border-green-500/40 text-green-600"}`}>
                                            {isActive ? <><Clock className="h-2.5 w-2.5 mr-1" />En cours</> : <><CheckCheck className="h-2.5 w-2.5 mr-1" />Résolu</>}
                                          </Badge>
                                          {r.verifications > 0 && <Badge variant="outline" className="text-xs h-5 border-primary/30 text-primary">{isInfra ? `${r.verifications} demande(s)` : `${r.verifications} confirm.`}</Badge>}
                                          {duration && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {duration}</span>}
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0 text-right">
                                        <p className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).getFullYear()}</p>
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
                )}

                {/* ── COMPTEURS / UTILITY ── */}
                {activeSection === "utility" && (
                  <>
                    <ElectricityWidget />
                    <input ref={elecFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleOcrScan(file, "electricity"); }} />
                    <input ref={waterFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleOcrScan(file, "water"); }} />
                    <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                      <div className="flex gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 sm:p-4">
                        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Augmentez la crédibilité de vos signalements</p>
                          <p className="text-xs text-muted-foreground mt-1">Renseigner vos informations de compteur permet de renforcer la conformité de vos signalements.{" "}<span className="font-medium text-foreground">Ces champs sont facultatifs.</span></p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15"><ScanLine className="h-5 w-5 text-violet-600 dark:text-violet-400" /></div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">Remplissage automatique par photo</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Photographiez votre <strong>compteur</strong>, votre <strong>facture</strong> ou votre <strong>reçu de rechargement</strong>.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" disabled={ocrLoading !== null} onClick={() => elecFileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 px-3 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-400 transition-colors disabled:opacity-50">
                            {ocrLoading === "electricity" ? <><Loader2 className="h-4 w-4 animate-spin" />Analyse…</> : <><Camera className="h-4 w-4" /><Zap className="h-3.5 w-3.5" />Scanner CIE</>}
                          </button>
                          <button type="button" disabled={ocrLoading !== null} onClick={() => waterFileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 transition-colors disabled:opacity-50">
                            {ocrLoading === "water" ? <><Loader2 className="h-4 w-4 animate-spin" />Analyse…</> : <><Camera className="h-4 w-4" /><Droplets className="h-3.5 w-3.5" />Scanner SODECI</>}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">Vérifiez toujours les valeurs extraites avant d'enregistrer</p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15"><Zap className="h-4 w-4 text-amber-500" /></div>
                          <h3 className="font-semibold text-foreground">Électricité (CIE)</h3>
                          <span className="ml-auto text-xs text-muted-foreground italic">Facultatif</span>
                        </div>
                        {ocrPreview?.type === "electricity" && (
                          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
                            <img src={ocrPreview.url} alt="Aperçu" className="h-14 w-14 rounded object-cover shrink-0" />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-amber-500" />Extraction des numéros en cours…</div>
                          </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            { label: "Identifiant client", field: "electricity_client_id" as const, placeholder: "Ex: 01234567" },
                            { label: "Réf. compteur", field: "electricity_meter_ref" as const, placeholder: "Ex: CIE-XXXX" },
                            { label: "N° compteur", field: "electricity_meter_number" as const, placeholder: "Ex: 987654321" },
                          ].map((f) => (
                            <div key={f.field} className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                              <Input id={`field-${f.field}`} placeholder={f.placeholder} value={profile[f.field]} onChange={(e) => update(f.field, e.target.value)} maxLength={30} className="h-9 text-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15"><Droplets className="h-4 w-4 text-blue-500" /></div>
                          <h3 className="font-semibold text-foreground">Eau (SODECI)</h3>
                          <span className="ml-auto text-xs text-muted-foreground italic">Facultatif</span>
                        </div>
                        {ocrPreview?.type === "water" && (
                          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
                            <img src={sanitizePreviewImageUrl(ocrPreview.url)} alt="Aperçu" className="h-14 w-14 rounded object-cover shrink-0" />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-blue-500" />Extraction des numéros en cours…</div>
                          </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            { label: "Identifiant client", field: "water_client_id" as const, placeholder: "Ex: 01234567" },
                            { label: "Réf. compteur", field: "water_meter_ref" as const, placeholder: "Ex: SOD-XXXX" },
                            { label: "N° compteur", field: "water_meter_number" as const, placeholder: "Ex: 123456789" },
                          ].map((f) => (
                            <div key={f.field} className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                              <Input id={`field-${f.field}`} placeholder={f.placeholder} value={profile[f.field]} onChange={(e) => update(f.field, e.target.value)} maxLength={30} className="h-9 text-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── DROITS & CONSEILS ── */}
                {activeSection === "rights" && <RightsTabContent />}

                {/* ── NOTIFICATIONS ── */}
                {activeSection === "notifications" && (
                  <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary"><Bell className="h-4 w-4 text-secondary-foreground" /></div>
                        <div><p className="font-semibold text-sm text-foreground">Notifications in-app</p><p className="text-xs text-muted-foreground">Alertes de coupure dans votre zone</p></div>
                      </div>
                      <Switch checked={profile.notifications_enabled} onCheckedChange={(v) => update("notifications_enabled", v)} />
                    </div>
                    <PushNotificationToggle />
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary"><Globe className="h-4 w-4 text-secondary-foreground" /></div>
                        <div><p className="font-semibold text-sm text-foreground">Langue</p><p className="text-xs text-muted-foreground">{profile.language === "fr" ? "Français" : "English"}</p></div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => update("language", profile.language === "fr" ? "en" : "fr")}>{profile.language === "fr" ? "EN" : "FR"}</Button>
                    </div>
                  </div>
                )}

                {/* ── APPARENCE ── */}
                {activeSection === "appearance" && (
                  <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary"><Palette className="h-4 w-4 text-secondary-foreground" /></div>
                        <div><p className="font-semibold text-sm text-foreground">Thème</p><p className="text-xs text-muted-foreground">{profile.theme === "system" ? "Système" : profile.theme === "dark" ? "Sombre" : "Clair"}</p></div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => update("theme", profile.theme === "system" ? "light" : profile.theme === "light" ? "dark" : "system")}>
                        {profile.theme === "system" ? "☀️" : profile.theme === "light" ? "🌙" : "⚙️"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Palette className="h-4 w-4 text-primary" /></div>
                        <div><p className="font-semibold text-sm text-foreground">Couleurs SIGNA·CI</p><p className="text-xs text-muted-foreground">{isIvoire ? "🟠 Thème Ivoire (orange soleil)" : "🔵 Thème SIGNA·CI (bleu institutionnel)"}</p></div>
                      </div>
                      <Button variant="outline" size="sm" onClick={toggleBrandTheme}>{isIvoire ? "→ Bleu" : "→ Ivoire 🟠"}</Button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── ODD DIALOG ── */}
      <Dialog open={showOddDialog !== null} onOpenChange={(open) => { if (!open) setShowOddDialog(null); }}>
        <DialogContent className="max-w-lg mx-4 sm:mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {showOddDialog === "odd6" ? (
                <><span className="text-xl">💧</span> ODD 6 — Eau propre et assainissement</>
              ) : (
                <><span className="text-xl">⚡</span> ODD 7 — Énergie propre et d'un coût abordable</>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {showOddDialog === "odd6"
                ? "Garantir l'accès de tous à des services d'alimentation en eau et d'assainissement gérés de façon durable d'ici 2030."
                : "Garantir l'accès de tous à des services énergétiques fiables, durables et modernes, à un coût abordable d'ici 2030."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {showOddDialog === "odd6" ? (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" /> Cibles clés
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex gap-2 items-start">
                      <span className="text-blue-500 font-bold text-xs mt-0.5">6.1</span>
                      <p>Accès universel et équitable à l'eau potable, à un coût abordable.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-blue-500 font-bold text-xs mt-0.5">6.2</span>
                      <p>Accès à des services d'assainissement et d'hygiène adéquats pour tous.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-blue-500 font-bold text-xs mt-0.5">6.4</span>
                      <p>Utilisation rationnelle des ressources en eau et réduction de la pénurie.</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" /> En Côte d'Ivoire
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    La SODECI assure la distribution d'eau potable. Le taux d'accès à l'eau potable en milieu urbain est d'environ 80%, mais de nombreuses zones périurbaines subissent encore des coupures régulières. Chaque signalement sur SIGNA-CI contribue à identifier ces zones et à améliorer le service.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-blue-500" /> Ressources
                  </h3>
                  <div className="grid gap-2">
                    <a href="https://sdgs.un.org/goals/goal6" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> Nations Unies — ODD 6
                    </a>
                    <a href="https://www.sodeci.ci" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> SODECI — Site officiel
                    </a>
                    <a href="https://www.onep.ci" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> ONEP — Office National de l'Eau Potable
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-500" /> Cibles clés
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex gap-2 items-start">
                      <span className="text-amber-500 font-bold text-xs mt-0.5">7.1</span>
                      <p>Accès universel à des services énergétiques fiables et modernes, à un coût abordable.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-amber-500 font-bold text-xs mt-0.5">7.2</span>
                      <p>Accroître la part de l'énergie renouvelable dans le bouquet énergétique mondial.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-amber-500 font-bold text-xs mt-0.5">7.b</span>
                      <p>Développer l'infrastructure et améliorer la technologie pour fournir des services énergétiques modernes.</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-500" /> En Côte d'Ivoire
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    La CIE (Compagnie Ivoirienne d'Électricité) gère la distribution d'électricité. Le pays produit environ 2 200 MW mais la demande croissante entraîne des délestages fréquents, notamment dans les quartiers populaires. Vos signalements aident à cartographier les zones les plus touchées.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-amber-500" /> Ressources
                  </h3>
                  <div className="grid gap-2">
                    <a href="https://sdgs.un.org/goals/goal7" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> Nations Unies — ODD 7
                    </a>
                    <a href="https://www.cie.ci" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> CIE — Site officiel
                    </a>
                    <a href="https://www.anare.ci" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> ANARE-CI — Autorité de Régulation
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      {/* ═══ Floating Save Button ═══ */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="gap-2 shadow-2xl rounded-full px-8 py-6 text-base font-bold"
            >
              {saved ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
              {saving ? "Enregistrement..." : saved ? "Sauvegardé !" : "Enregistrer les modifications"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
