import { useEffect, useState } from "react";
import { Zap, Droplets, Scale, BookOpen, ChevronRight, Phone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRightsContent } from "@/hooks/useRightsContent";

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

const WhatsAppIcon = () => (
  <div className="h-7 w-7 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </div>
);

export const RightsTabContent = () => {
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

  return (
    <div className="space-y-4 text-sm">
      {/* WhatsApp Section */}
      <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
          <WhatsAppIcon />
          <span>Canaux WhatsApp Officiels</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Contactez directement les services réclamations CIE et SODECI via WhatsApp.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {relayWA.cie && (
            <a
              href={`https://wa.me/${relayWA.cie.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border bg-background hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-xs">CIE WhatsApp</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          )}
          {relayWA.sodeci && (
            <a
              href={`https://wa.me/${relayWA.sodeci.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border bg-background hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-xs">SODECI WhatsApp</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>

      {/* Guide des Droits */}
      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Vos Droits en tant qu'Usager
        </h3>
        <div className="space-y-2">
          {rights.sections.map((section) => {
            const isOpen = openSections.has(section.id);
            return (
              <div key={section.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  onClick={() => toggle(section.id)}
                  className="w-full p-3 text-left font-medium flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {RESOURCE_ICONS[section.category] ?? <BookOpen className="h-4 w-4 text-primary" />}
                    <span>{section.title}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground space-y-2">
                    <p>{section.content}</p>
                    {section.lawReference && (
                      <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px]">
                        Ref: {section.lawReference}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Numéros Utiles */}
      <div className="space-y-2 pt-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          Contacts Utiles
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {rights.contacts.map((c) => (
            <a
              key={c.name}
              href={`tel:${c.phone}`}
              className="p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-xs">{c.name}</div>
                <div className={`text-[11px] font-mono ${CONTACT_COLORS[c.category] ?? "text-muted-foreground"}`}>
                  {c.phone}
                </div>
              </div>
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightsTabContent;
