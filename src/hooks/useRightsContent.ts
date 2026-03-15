import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RightsItem {
  icon: string; // emoji
  title: string;
  description: string;
}

export interface ResourceLink {
  title: string;
  description: string;
  url: string;
  type: "electricity" | "water" | "general";
  format: string;
}

export interface EmergencyContact {
  name: string;
  number: string;
  type: "electricity" | "water" | "general" | "emergency";
}

export interface RightsContent {
  electricity_rights: RightsItem[];
  water_rights: RightsItem[];
  tips: RightsItem[];
  resources: ResourceLink[];
  contacts: EmergencyContact[];
}

export const DEFAULT_RIGHTS_CONTENT: RightsContent = {
  electricity_rights: [
    { icon: "✅", title: "Continuité de service", description: "La CIE est tenue d'assurer un service continu. Toute coupure prolongée sans motif légitime engage sa responsabilité (Art. 24, Code de l'électricité)." },
    { icon: "📢", title: "Information préalable", description: "La CIE doit informer les usagers avant toute coupure programmée pour maintenance." },
    { icon: "⚖️", title: "Réclamation", description: "Vous pouvez saisir l'ANARE (Autorité Nationale de Régulation du secteur de l'Électricité) en cas de litige non résolu avec la CIE." },
    { icon: "⚠️", title: "Vos obligations", description: "Payer vos factures dans les délais, ne pas frauder le compteur, ne pas effectuer de branchements illégaux (passible de sanctions pénales)." },
  ],
  water_rights: [
    { icon: "✅", title: "Droit d'accès à l'eau potable", description: "L'accès à l'eau potable est un droit fondamental reconnu par le Code de l'eau (Loi n°2023-902)." },
    { icon: "✅", title: "Qualité de l'eau", description: "La SODECI est tenue de fournir une eau conforme aux normes de qualité établies par l'OMS et la réglementation ivoirienne." },
    { icon: "⚖️", title: "Réclamation", description: "En cas de coupure prolongée ou de litige, vous pouvez saisir l'ONEP (Office National de l'Eau Potable) ou les services de la Mairie." },
    { icon: "⚠️", title: "Vos obligations", description: "Payer les factures d'eau, signaler les fuites, ne pas gaspiller l'eau potable, ne pas polluer les sources d'eau." },
  ],
  tips: [
    { icon: "⚡", title: "Débranchez les appareils", description: "Débranchez les appareils sensibles pendant les coupures pour éviter les surtensions au retour du courant." },
    { icon: "💧", title: "Stockez l'eau proprement", description: "Utilisez des récipients propres et couverts pour stocker l'eau. Renouvelez toutes les 24h." },
    { icon: "🔌", title: "Utilisez un parafoudre", description: "Protégez vos appareils électroniques avec un parafoudre ou un régulateur de tension." },
    { icon: "🚰", title: "Signalez les fuites", description: "Une fuite d'eau = gaspillage collectif. Signalez-la immédiatement via SIGNA-CI ou au 175 (SODECI)." },
    { icon: "💡", title: "Économisez l'énergie", description: "Éteignez les lumières inutiles, préférez les ampoules LED. Ça réduit la charge sur le réseau." },
    { icon: "📱", title: "Gardez vos reçus", description: "Conservez toujours vos reçus de paiement CIE/SODECI. Ils sont votre preuve en cas de litige." },
  ],
  resources: [
    { title: "Code de l'Électricité (Loi n°2014-132)", description: "Loi du 24 mars 2014 portant Code de l'Électricité en Côte d'Ivoire", url: "https://faolex.fao.org/docs/pdf/ivc146558.pdf", type: "electricity", format: "PDF" },
    { title: "Code de l'Eau (Loi n°2023-902)", description: "Nouveau Code de l'eau adopté en 2023", url: "https://www.pseau.org/outils/biblio/resume.php?d=12272&l=fr", type: "water", format: "PDF" },
    { title: "Ancien Code de l'Eau (Loi n°98-755)", description: "Loi du 23 décembre 1998 portant Code de l'Eau", url: "https://civ.abidjan.net/images/pdf/code_de%20_eau.pdf", type: "water", format: "PDF" },
    { title: "ANARE-CI — Droits des consommateurs", description: "Autorité de régulation : recours, droits et obligations des usagers", url: "https://anare.ci/documents/lois-et-reglementation/les-lois/", type: "general", format: "Site web" },
    { title: "Ma SODECI en ligne — Conditions d'utilisation", description: "Termes et conditions d'utilisation des services SODECI", url: "https://www.masodecienligne.ci/docs/TermesConditions.pdf", type: "water", format: "PDF" },
    { title: "CIE — Espace client", description: "Portail officiel de la CIE pour les usagers", url: "https://www.cie.ci", type: "electricity", format: "Site web" },
    { title: "SODECI — Espace client", description: "Portail officiel de la SODECI pour les usagers", url: "https://www.sodeci.ci", type: "water", format: "Site web" },
  ],
  contacts: [
    { name: "CIE (dépannage)", number: "179", type: "electricity" },
    { name: "SODECI (urgences)", number: "175", type: "water" },
    { name: "ANARE-CI (réclamations)", number: "+225 27 20 20 61 16", type: "general" },
    { name: "Sapeurs Pompiers", number: "180", type: "emergency" },
  ],
};

const SETTINGS_KEY = "rights_content";

export function useRightsContent() {
  return useQuery({
    queryKey: ["rights-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (error || !data) return DEFAULT_RIGHTS_CONTENT;
      try {
        return { ...DEFAULT_RIGHTS_CONTENT, ...(data.value as unknown as Partial<RightsContent>) };
      } catch {
        return DEFAULT_RIGHTS_CONTENT;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateRightsContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: RightsContent) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: SETTINGS_KEY, value: content as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rights-content"] });
    },
  });
}
