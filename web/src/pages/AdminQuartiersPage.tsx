import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, XCircle, MapPin, Clock, User, Plus, Pencil, Trash2,
  Eye, EyeOff, Search, Building2, AlertTriangle, GitMerge, X, Tag,
  Copy, CheckSquare, ArrowRight, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import { QUARTIERS, normalizeQuartier } from "@/lib/quartiers";
import { getCommunePadaCode } from "@/lib/pada";

type Quartier = {
  id: string;
  nom: string;
  commune: string;
  source: string;
  validated: boolean;
  hidden: boolean;
  created_at: string;
  aliases: string[];
  submitted_by?: string | null;
  submitter_name?: string | null;
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, icon, color,
}: { label: string; value: number; icon: React.ReactNode; color: string }) => (
  <Card className="flex-1 min-w-[130px]">
    <CardContent className="pt-4 pb-3">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
);

// ─── Age badge ────────────────────────────────────────────────────────────────
const AgeBadge = ({ date }: { date: string }) => {
  const days = differenceInDays(new Date(), new Date(date));
  if (days <= 2) return null;
  const isOld = days > 7;
  return (
    <Badge
      variant="outline"
      className={`text-xs px-1.5 py-0 ml-1 ${
        isOld
          ? "border-red-400 text-red-500 bg-red-50 dark:bg-red-950"
          : "border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-950"
      }`}
    >
      J+{days}
    </Badge>
  );
};

// ─── Aliases display ─────────────────────────────────────────────────────────
const AliasesBadges = ({ aliases }: { aliases: string[] }) => {
  if (!aliases || aliases.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {aliases.map((a) => (
        <span
          key={a}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5"
        >
          <Tag className="h-2.5 w-2.5" />
          {a}
        </span>
      ))}
    </div>
  );
};

// ─── Alias tag input ──────────────────────────────────────────────────────────
const AliasTagInput = ({
  aliases,
  onChange,
}: {
  aliases: string[];
  onChange: (aliases: string[]) => void;
}) => {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim();
    if (!val || aliases.includes(val)) return;
    onChange([...aliases, val]);
    setInput("");
  };

  const remove = (alias: string) => onChange(aliases.filter((a) => a !== alias));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Ex: Zoé Bruno, Ancien nom..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={!input.trim()} className="h-8 shrink-0">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {aliases.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 text-xs bg-muted border border-border rounded-full px-2.5 py-0.5"
            >
              {a}
              <button
                type="button"
                onClick={() => remove(a)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Similarity helpers ───────────────────────────────────────────────────────
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function isSimilar(a: string, b: string): boolean {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  if (na.length > 4 && nb.length > 4 && levenshtein(na, nb) <= 2) return true;
  return false;
}

function findSimilar(nom: string, commune: string, quartiers: Quartier[]): Quartier[] {
  return quartiers.filter(
    (q) =>
      q.validated &&
      q.commune === commune &&
      (isSimilar(q.nom, nom) || (q.aliases ?? []).some((a) => isSimilar(a, nom)))
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
const AdminQuartiersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Quartier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quartier | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Quartier | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [mergeTarget, setMergeTarget] = useState<Quartier | null>(null);
  const [mergeIntoId, setMergeIntoId] = useState("");

  // Duplicate detection
  const [duplicateCheckTarget, setDuplicateCheckTarget] = useState<Quartier | null>(null);
  const [duplicateSimilar, setDuplicateSimilar] = useState<Quartier[]>([]);

  // Bulk selection (onglet "En attente")
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Add form
  const [newNom, setNewNom] = useState("");
  const [newCommune, setNewCommune] = useState(COMMUNES[0].nom);

  // Edit form
  const [editNom, setEditNom] = useState("");
  const [editAliases, setEditAliases] = useState<string[]>([]);

  // All-tab filters
  const [search, setSearch] = useState("");
  const [filterCommune, setFilterCommune] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Fetch all quartiers ──────────────────────────────────────────────────
  const { data: quartiers = [], isLoading } = useQuery<Quartier[]>({
    queryKey: ["admin-quartiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quartiers")
        .select("*")
        .order("nom", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        hidden: q.hidden ?? false,
        aliases: q.aliases ?? [],
      }));
    },
  });

  // ── Fetch profiles for submitter names ──────────────────────────────────
  const { data: profiles = {} } = useQuery<Record<string, string>>({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const pendingIds = quartiers
        .filter((q) => !q.validated && q.source === "user" && q.submitted_by)
        .map((q) => q.submitted_by as string);
      if (pendingIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", pendingIds);
      const map: Record<string, string> = {};
      for (const p of data ?? []) {
        map[p.user_id] = p.display_name || `${p.first_name} ${p.last_name}`.trim() || "Utilisateur inconnu";
      }
      return map;
    },
    enabled: quartiers.some((q) => !q.validated && q.source === "user" && q.submitted_by),
  });

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = quartiers.length;
    const pending = quartiers.filter((q) => !q.validated && q.source === "user").length;
    const hidden = quartiers.filter((q) => q.hidden).length;
    const official = quartiers.filter((q) => q.source !== "user").length;
    const perCommune: Record<string, number> = {};
    for (const q of quartiers) {
      if (!q.hidden) perCommune[q.commune] = (perCommune[q.commune] ?? 0) + 1;
    }
    return { total, pending, hidden, official, perCommune };
  }, [quartiers]);

  // Missing canonical official quartiers to seed into the database
  const missingQuartiers = useMemo(() => {
    const existingSet = new Set(
      quartiers.map((q) => `${q.commune.toLowerCase().trim()}|${q.nom.toLowerCase().trim()}`)
    );
    const toInsert: Array<{ commune: string; nom: string; source: string; validated: boolean }> = [];

    for (const [communeName, qList] of Object.entries(QUARTIERS)) {
      for (const qNom of qList) {
        const key = `${communeName.toLowerCase().trim()}|${qNom.toLowerCase().trim()}`;
        if (!existingSet.has(key)) {
          toInsert.push({
            commune: communeName,
            nom: qNom,
            source: "static",
            validated: true,
          });
        }
      }
    }
    return toInsert;
  }, [quartiers]);

  const sortedCommunes = useMemo(
    () => [...COMMUNES].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    []
  );

  const pendingByCommune = useMemo(() => {
    const pending = quartiers.filter((q) => !q.validated && q.source === "user");
    const map: Record<string, Quartier[]> = {};
    for (const q of pending) {
      if (!map[q.commune]) map[q.commune] = [];
      map[q.commune].push(q);
    }
    // Tri alphabétique des soumissions dans chaque commune
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    }
    return map;
  }, [quartiers]);

  const byCommune = useMemo(() => {
    const map: Record<string, Quartier[]> = {};
    for (const q of quartiers) {
      if (!map[q.commune]) map[q.commune] = [];
      map[q.commune].push(q);
    }
    // Tri alphabétique dans chaque commune
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    }
    return map;
  }, [quartiers]);

  const filteredQuartiers = useMemo(() => {
    return quartiers.filter((q) => {
      if (search) {
        const s = search.toLowerCase();
        const matchNom = q.nom.toLowerCase().includes(s);
        const matchAlias = (q.aliases ?? []).some((a) => a.toLowerCase().includes(s));
        if (!matchNom && !matchAlias) return false;
      }
      if (filterCommune !== "all" && q.commune !== filterCommune) return false;
      if (filterSource !== "all" && q.source !== filterSource) return false;
      if (filterStatus === "validated" && !q.validated) return false;
      if (filterStatus === "pending" && (q.validated || q.source !== "user")) return false;
      if (filterStatus === "hidden" && !q.hidden) return false;
      return true;
    });
  }, [quartiers, search, filterCommune, filterSource, filterStatus]);

  // Quartiers validés d'une commune, pour le merge
  const validatedInCommune = (commune: string) =>
    quartiers.filter((q) => q.commune === commune && q.validated && q.id !== mergeTarget?.id);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-quartiers"] });
    queryClient.invalidateQueries({ queryKey: ["quartiers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-profiles-map"] });
  };

  // Intercepte la validation avec vérification de doublons
  const handleValidate = (q: Quartier) => {
    const similar = findSimilar(q.nom, q.commune, quartiers).filter((s) => s.id !== q.id);
    if (similar.length > 0) {
      setDuplicateCheckTarget(q);
      setDuplicateSimilar(similar);
    } else {
      validateMutation.mutate({ id: q.id, validated: true });
    }
  };

  // ── Mutations ────────────────────────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: async ({ id, validated }: { id: string; validated: boolean }) => {
      const { error } = await supabase.from("quartiers").update({ validated }).eq("id", id);
      if (error) throw error;
      const q = quartiers.find((x) => x.id === id);
      await logAudit({
        action: (validated ? "quartier_validated" : "quartier_rejected") as any,
        target_type: "quartier" as any,
        target_id: id,
        details: { commune: q?.commune, nom: q?.nom },
      });
    },
    onSuccess: (_, { validated }) => {
      invalidate();
      toast({ title: validated ? "Quartier validé ✓" : "Quartier rejeté" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const rejectWithReasonMutation = useMutation({
    mutationFn: async ({ q, reason }: { q: Quartier; reason: string }) => {
      const { error } = await supabase.from("quartiers").delete().eq("id", q.id);
      if (error) throw error;
      await logAudit({
        action: "quartier_rejected" as any,
        target_type: "quartier" as any,
        target_id: q.id,
        details: { commune: q.commune, nom: q.nom, reason },
      });
      if (q.submitted_by) {
        await supabase.from("notifications").insert([{
          user_id: q.submitted_by,
          title: "Soumission de quartier refusée",
          message: `Votre demande d'ajout du quartier "${q.nom}" (${q.commune}) n'a pas été retenue. Motif : ${reason}`,
          report_id: q.id,
        }]);
      }
    },
    onSuccess: () => {
      invalidate();
      setRejectTarget(null);
      setRejectReason("");
      toast({ title: "Soumission rejetée" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const aliasMutation = useMutation({
    mutationFn: async ({
      submission,
      canonicalId,
    }: {
      submission: Quartier;
      canonicalId: string;
    }) => {
      const canonical = quartiers.find((q) => q.id === canonicalId);
      if (!canonical) throw new Error("Quartier canonique introuvable");
      const newAliases = [...new Set([...(canonical.aliases ?? []), submission.nom])];
      const { error: updateErr } = await supabase
        .from("quartiers")
        .update({ aliases: newAliases } as any)
        .eq("id", canonicalId);
      if (updateErr) throw updateErr;
      // Réassigner tous les signalements de l'alias vers le quartier canonique
      // pour qu'ils apparaissent correctement dans les stats et la carte.
      const { error: reportsErr } = await supabase
        .from("reports")
        .update({ quartier: canonical.nom } as any)
        .eq("quartier", submission.nom)
        .eq("commune", submission.commune);
      if (reportsErr) throw reportsErr;

      const { error: deleteErr } = await supabase
        .from("quartiers")
        .delete()
        .eq("id", submission.id);
      if (deleteErr) throw deleteErr;
      await logAudit({
        action: "quartier_aliased" as any,
        target_type: "quartier" as any,
        target_id: canonicalId,
        details: {
          alias: submission.nom,
          canonical: canonical.nom,
          commune: canonical.commune,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      setMergeTarget(null);
      setMergeIntoId("");
      toast({ title: "Alias enregistré ✓" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const hideMutation = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase.from("quartiers").update({ hidden } as any).eq("id", id);
      if (error) throw error;
      const q = quartiers.find((x) => x.id === id);
      await logAudit({
        action: (hidden ? "quartier_hidden" : "quartier_shown") as any,
        target_type: "quartier" as any,
        target_id: id,
        details: { commune: q?.commune, nom: q?.nom },
      });
    },
    onSuccess: (_, { hidden }) => {
      invalidate();
      toast({ title: hidden ? "Quartier masqué" : "Quartier visible" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: async ({ nom, commune }: { nom: string; commune: string }) => {
      const { error } = await supabase.from("quartiers").insert({
        nom: nom.trim(),
        commune,
        source: "admin",
        validated: true,
        aliases: [],
      });
      if (error) throw error;
      await logAudit({
        action: "quartier_created" as any,
        target_type: "quartier" as any,
        target_id: nom,
        details: { commune, nom },
      });
    },
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setNewNom("");
      toast({ title: "Quartier ajouté ✓" });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("unique")
        ? "Ce quartier existe déjà dans cette commune."
        : "Erreur lors de l'ajout.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, nom, aliases }: { id: string; nom: string; aliases: string[] }) => {
      const { error } = await supabase
        .from("quartiers")
        .update({ nom: nom.trim(), aliases } as any)
        .eq("id", id);
      if (error) throw error;
      await logAudit({
        action: "quartier_updated" as any,
        target_type: "quartier" as any,
        target_id: id,
        details: { nom, aliases },
      });
    },
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
      toast({ title: "Quartier modifié ✓" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (q: Quartier) => {
      const { error } = await supabase.from("quartiers").delete().eq("id", q.id);
      if (error) throw error;
      await logAudit({
        action: "quartier_deleted" as any,
        target_type: "quartier" as any,
        target_id: q.id,
        details: { commune: q.commune, nom: q.nom },
      });
    },
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast({ title: "Quartier supprimé" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  // ── Bulk mutations ────────────────────────────────────────────────────────
  const bulkValidateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("quartiers")
        .update({ validated: true })
        .in("id", ids);
      if (error) throw error;
      await logAudit({
        action: "quartier_validated" as any,
        target_type: "quartier" as any,
        target_id: "bulk",
        details: { count: ids.length, ids },
      });
    },
    onSuccess: (_, ids) => {
      invalidate();
      setSelectedPending(new Set());
      toast({ title: `${ids.length} quartier${ids.length > 1 ? "s" : ""} validé${ids.length > 1 ? "s" : ""} ✓` });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      const { error } = await supabase.from("quartiers").delete().in("id", ids);
      if (error) throw error;
      await logAudit({
        action: "quartier_rejected" as any,
        target_type: "quartier" as any,
        target_id: "bulk",
        details: { count: ids.length, ids, reason },
      });
    },
    onSuccess: (_, { ids }) => {
      invalidate();
      setSelectedPending(new Set());
      setBulkRejectOpen(false);
      setBulkRejectReason("");
      toast({ title: `${ids.length} soumission${ids.length > 1 ? "s" : ""} rejetée${ids.length > 1 ? "s" : ""}` });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const syncOfficialMutation = useMutation({
    mutationFn: async () => {
      if (missingQuartiers.length === 0) return 0;
      const CHUNK_SIZE = 50;
      for (let i = 0; i < missingQuartiers.length; i += CHUNK_SIZE) {
        const chunk = missingQuartiers.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from("quartiers")
          .upsert(chunk, { onConflict: "commune,nom" } as any);
        if (error) throw error;
      }
      await logAudit({
        action: "quartier_seeded" as any,
        target_type: "quartier" as any,
        target_id: "all_14_communes",
        details: { count: missingQuartiers.length },
      });
      return missingQuartiers.length;
    },
    onSuccess: (count) => {
      invalidate();
      toast({
        title: `${count} quartiers officiels synchronisés ✓`,
        description: "Toutes les 14 communes disposent désormais de leurs quartiers officiels.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur lors de la synchronisation",
        description: err?.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    },
  });

  // ── Action buttons ────────────────────────────────────────────────────────
  const ActionButtons = ({ q }: { q: Quartier }) => (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        {!q.validated && q.source === "user" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleValidate(q)}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Valider</TooltipContent>
          </Tooltip>
        )}
        {q.validated && q.source === "user" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                onClick={() => validateMutation.mutate({ id: q.id, validated: false })}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rejeter</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon" variant="ghost"
              className={`h-7 w-7 ${q.hidden ? "text-yellow-600 hover:bg-yellow-50" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => hideMutation.mutate({ id: q.id, hidden: !q.hidden })}
            >
              {q.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{q.hidden ? "Afficher" : "Masquer"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-blue-600 hover:bg-blue-50"
              onClick={() => { setEditTarget(q); setEditNom(q.nom); setEditAliases(q.aliases ?? []); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Modifier / Gérer alias</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteTarget(q)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Supprimer</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Gestion des quartiers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez, modifiez, masquez ou supprimez des quartiers. Validez les soumissions utilisateurs.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {missingQuartiers.length > 0 && (
            <Button
              onClick={() => syncOfficialMutation.mutate()}
              disabled={syncOfficialMutation.isPending}
              variant="outline"
              className="border-emerald-500/50 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 font-bold gap-2 shadow-2xs"
            >
              <RefreshCw className={`h-4 w-4 ${syncOfficialMutation.isPending ? "animate-spin" : "text-emerald-600"}`} />
              ⚡ Synchroniser les 14 communes ({missingQuartiers.length} officiels)
            </Button>
          )}
          <Button
            onClick={() => { setNewNom(""); setNewCommune(COMMUNES[0].nom); setAddOpen(true); }}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un quartier
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="Total quartiers" value={stats.total} icon={<MapPin className="h-4 w-4 text-primary" />} color="bg-primary/10" />
        <StatCard
          label="En attente"
          value={stats.pending}
          icon={<Clock className="h-4 w-4 text-orange-500" />}
          color="bg-orange-50 dark:bg-orange-950"
        />
        <StatCard label="Masqués" value={stats.hidden} icon={<EyeOff className="h-4 w-4 text-yellow-600" />} color="bg-yellow-50 dark:bg-yellow-950" />
        <StatCard label="Officiels" value={stats.official} icon={<Building2 className="h-4 w-4 text-blue-600" />} color="bg-blue-50 dark:bg-blue-950" />
      </div>

      {/* Commune counters */}
      <div className="flex gap-2 flex-wrap">
        {sortedCommunes.map((c) => (
          <Badge
            key={c.nom}
            variant="outline"
            className="text-xs font-medium px-2 py-1 gap-1.5"
            style={{ borderColor: c.couleur, color: c.couleur }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.couleur }} />
            {c.nom} — {stats.perCommune[c.nom] ?? 0}
          </Badge>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="commune">
        <TabsList className="mb-4">
          <TabsTrigger value="commune">
            <Building2 className="h-4 w-4 mr-1.5" />
            Par commune
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            <Clock className="h-4 w-4 mr-1.5" />
            En attente
            {stats.pending > 0 && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            <Search className="h-4 w-4 mr-1.5" />
            Tous
          </TabsTrigger>
          <TabsTrigger value="aliases">
            <ArrowRight className="h-4 w-4 mr-1.5" />
            Aliases
          </TabsTrigger>
        </TabsList>

        {/* ── PAR COMMUNE ── */}
        <TabsContent value="commune">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {sortedCommunes.map((c) => {
                const cqs = byCommune[c.nom] ?? [];
                const pendingInCommune = cqs.filter((q) => !q.validated && q.source === "user").length;
                return (
                  <AccordionItem key={c.nom} value={c.nom} className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
                        <span className="font-semibold">{c.nom}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                          PADA {getCommunePadaCode(c.nom)}
                        </span>
                        <Badge variant="secondary" className="text-xs ml-auto mr-2">
                          {cqs.filter((q) => !q.hidden).length} quartiers
                        </Badge>
                        {pendingInCommune > 0 && (
                          <Badge variant="destructive" className="text-xs mr-2">
                            {pendingInCommune} en attente
                          </Badge>
                        )}
                        {cqs.filter((q) => q.hidden).length > 0 && (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400 mr-2">
                            {cqs.filter((q) => q.hidden).length} masqués
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <div className="border-t">
                        {cqs.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Aucun quartier</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="pl-6">Quartier</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right pr-4">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cqs.map((q) => (
                                <TableRow key={q.id} className={q.hidden ? "opacity-50" : ""}>
                                  <TableCell className="pl-6">
                                    <div>
                                      <span className="font-medium">{q.nom}</span>
                                      {q.hidden && <EyeOff className="inline ml-1.5 h-3 w-3 text-yellow-500" />}
                                      <AliasesBadges aliases={q.aliases} />
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={q.source === "user" ? "secondary" : "outline"} className="text-xs">
                                      {q.source === "user" ? (
                                        <><User className="h-3 w-3 mr-1" />Utilisateur</>
                                      ) : q.source === "admin" ? "Admin" : "Officiel"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={q.validated ? "default" : "destructive"} className="text-xs">
                                      {q.validated ? "Validé" : "En attente"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {format(new Date(q.created_at), "dd MMM yyyy", { locale: fr })}
                                  </TableCell>
                                  <TableCell className="text-right pr-4">
                                    <ActionButtons q={q} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        <div className="px-4 py-2 border-t bg-muted/20">
                          <Button
                            size="sm" variant="ghost" className="text-xs text-muted-foreground"
                            onClick={() => { setNewCommune(c.nom); setNewNom(""); setAddOpen(true); }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Ajouter un quartier à {c.nom}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        {/* ── EN ATTENTE ── */}
        <TabsContent value="pending">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : Object.keys(pendingByCommune).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-medium">Aucun quartier en attente de validation</p>
              <p className="text-sm mt-1">Toutes les soumissions ont été traitées.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barre bulk actions */}
              {selectedPending.size > 0 && (
                <div className="sticky top-2 z-10 flex items-center gap-3 rounded-lg border border-primary/30 bg-background/95 backdrop-blur px-4 py-2.5 shadow-md">
                  <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium flex-1">
                    {selectedPending.size} soumission{selectedPending.size > 1 ? "s" : ""} sélectionnée{selectedPending.size > 1 ? "s" : ""}
                  </span>
                  <Button
                    size="sm"
                    className="h-7 bg-green-600 hover:bg-green-700 text-white"
                    disabled={bulkValidateMutation.isPending}
                    onClick={() => bulkValidateMutation.mutate([...selectedPending])}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Valider tout ({selectedPending.size})
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-destructive border-destructive/50 hover:bg-destructive/10"
                    disabled={bulkRejectMutation.isPending}
                    onClick={() => { setBulkRejectOpen(true); setBulkRejectReason(""); }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Rejeter tout ({selectedPending.size})
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 text-muted-foreground"
                    onClick={() => setSelectedPending(new Set())}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {sortedCommunes.filter((c) => pendingByCommune[c.nom]?.length > 0).map((c) => {
                const allIds = pendingByCommune[c.nom].map((q) => q.id);
                const allSelected = allIds.every((id) => selectedPending.has(id));
                const toggleAll = () => {
                  setSelectedPending((prev) => {
                    const next = new Set(prev);
                    if (allSelected) allIds.forEach((id) => next.delete(id));
                    else allIds.forEach((id) => next.add(id));
                    return next;
                  });
                };
                return (
                  <Card key={c.nom}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          aria-label={`Sélectionner toute la commune ${c.nom}`}
                        />
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.couleur }} />
                        {c.nom}
                        <Badge variant="destructive" className="text-xs ml-1">
                          {pendingByCommune[c.nom].length} en attente
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead className="pl-4 w-8" />
                            <TableHead>Quartier proposé</TableHead>
                            <TableHead>Soumis par</TableHead>
                            <TableHead>Soumis le</TableHead>
                            <TableHead className="text-right pr-4">Décision</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingByCommune[c.nom].map((q) => {
                            const submitterName = q.submitted_by
                              ? (profiles[q.submitted_by] ?? "Chargement...")
                              : "Anonyme";
                            const isSelected = selectedPending.has(q.id);
                            return (
                              <TableRow key={q.id} className={isSelected ? "bg-primary/5" : ""}>
                                <TableCell className="pl-4">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      setSelectedPending((prev) => {
                                        const next = new Set(prev);
                                        if (checked) next.add(q.id);
                                        else next.delete(q.id);
                                        return next;
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span>{q.nom}</span>
                                    <AgeBadge date={q.created_at} />
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {submitterName}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {format(new Date(q.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                  <div className="flex items-center justify-end gap-2 flex-wrap">
                                    <Button
                                      size="sm"
                                      className="h-7 bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleValidate(q)}
                                      disabled={validateMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      Valider
                                    </Button>
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm" variant="outline"
                                            className="h-7 text-purple-600 border-purple-400 hover:bg-purple-50"
                                            onClick={() => { setMergeTarget(q); setMergeIntoId(""); }}
                                          >
                                            <GitMerge className="h-3.5 w-3.5 mr-1" />
                                            Alias de...
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Ce nom est un alias d'un quartier déjà existant</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <Button
                                      size="sm" variant="outline"
                                      className="h-7 text-destructive border-destructive/50 hover:bg-destructive/10"
                                      onClick={() => { setRejectTarget(q); setRejectReason(""); }}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      Rejeter
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TOUS ── */}
        <TabsContent value="all">
          <div className="flex gap-2 flex-wrap mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher nom ou alias..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterCommune} onValueChange={setFilterCommune}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Commune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les communes</SelectItem>
                {sortedCommunes.map((c) => (
                  <SelectItem key={c.nom} value={c.nom}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sources</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="static">Officiel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="hidden">Masqués</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredQuartiers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Aucun quartier trouvé</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="px-4 py-2 border-b bg-muted/30 text-xs text-muted-foreground">
                  {filteredQuartiers.length} quartier{filteredQuartiers.length > 1 ? "s" : ""}
                  {search && " (alias inclus)"}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quartier</TableHead>
                      <TableHead>Commune</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuartiers.map((q) => (
                      <TableRow key={q.id} className={q.hidden ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{q.nom}</span>
                            {q.hidden && <EyeOff className="inline ml-1.5 h-3 w-3 text-yellow-500" />}
                            <AliasesBadges aliases={q.aliases} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: COMMUNE_COLORS[q.commune] ?? "#888" }}
                            />
                            {q.commune}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.source === "user" ? "secondary" : "outline"} className="text-xs">
                            {q.source === "user" ? (
                              <><User className="h-3 w-3 mr-1" />Utilisateur</>
                            ) : q.source === "admin" ? "Admin" : "Officiel"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.validated ? "default" : "destructive"} className="text-xs">
                            {q.validated ? "Validé" : "En attente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(q.created_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <ActionButtons q={q} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── ALIASES ── */}
        <TabsContent value="aliases">
          <AliasesTab />
        </TabsContent>
      </Tabs>

      {/* ── ADD DIALOG ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Ajouter un quartier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-commune">Commune</Label>
              <Select value={newCommune} onValueChange={setNewCommune}>
                <SelectTrigger id="add-commune">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedCommunes.map((c) => (
                    <SelectItem key={c.nom} value={c.nom}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-nom">Nom du quartier</Label>
              <Input
                id="add-nom"
                placeholder="Ex: Cité des Lauriers"
                value={newNom}
                onChange={(e) => setNewNom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newNom.trim()) {
                    addMutation.mutate({ nom: newNom, commune: newCommune });
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              onClick={() => addMutation.mutate({ nom: newNom, commune: newCommune })}
              disabled={!newNom.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Modifier le quartier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Commune</Label>
              <p className="text-sm text-muted-foreground px-3 py-2 rounded-md bg-muted">
                {editTarget?.commune}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nom">Nom officiel (nom canonique)</Label>
              <Input
                id="edit-nom"
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editNom.trim() && editTarget) {
                    editMutation.mutate({ id: editTarget.id, nom: editNom, aliases: editAliases });
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Noms alternatifs / populaires
              </Label>
              <p className="text-xs text-muted-foreground">
                Appuyez sur Entrée ou virgule pour ajouter. Ex&nbsp;: Soweto → alias de Zoé Bruno.
              </p>
              <AliasTagInput aliases={editAliases} onChange={setEditAliases} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              onClick={() =>
                editTarget &&
                editMutation.mutate({ id: editTarget.id, nom: editNom, aliases: editAliases })
              }
              disabled={!editNom.trim() || editMutation.isPending}
            >
              {editMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ALIAS (MERGE) DIALOG ── */}
      <Dialog open={!!mergeTarget} onOpenChange={(o) => !o && setMergeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-purple-600" />
              Marquer comme alias
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">"{mergeTarget?.nom}"</strong> sera ajouté comme nom
              alternatif du quartier sélectionné. La soumission sera supprimée.
            </p>
            <div className="space-y-1.5">
              <Label>Quartier canonique ({mergeTarget?.commune})</Label>
              <Select value={mergeIntoId} onValueChange={setMergeIntoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le quartier officiel..." />
                </SelectTrigger>
                <SelectContent>
                  {validatedInCommune(mergeTarget?.commune ?? "").map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      <div className="flex flex-col">
                        <span>{q.nom}</span>
                        {q.aliases.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            alias : {q.aliases.join(", ")}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mergeIntoId && (
              <div className="rounded-md bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 p-3 text-sm">
                <span className="text-purple-700 dark:text-purple-300">
                  <strong>"{mergeTarget?.nom}"</strong> sera ajouté aux alias de{" "}
                  <strong>"{quartiers.find((q) => q.id === mergeIntoId)?.nom}"</strong>.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!mergeIntoId || aliasMutation.isPending}
              onClick={() =>
                mergeTarget &&
                aliasMutation.mutate({ submission: mergeTarget, canonicalId: mergeIntoId })
              }
            >
              {aliasMutation.isPending ? "Enregistrement..." : "Confirmer l'alias"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REJECT WITH REASON DIALOG ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejeter la soumission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Soumission : <strong className="text-foreground">"{rejectTarget?.nom}"</strong>{" "}
              ({rejectTarget?.commune})
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Motif de rejet</Label>
              <Select
                value={rejectReason}
                onValueChange={setRejectReason}
              >
                <SelectTrigger id="reject-reason">
                  <SelectValue placeholder="Choisir un motif..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doublon">Doublon — ce quartier existe déjà</SelectItem>
                  <SelectItem value="nom_invalide">Nom invalide ou incompréhensible</SelectItem>
                  <SelectItem value="commune_incorrecte">Commune incorrecte</SelectItem>
                  <SelectItem value="hors_perimetre">Hors périmètre de l'application</SelectItem>
                  <SelectItem value="autre">Autre raison</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rejectReason === "autre" && (
              <Textarea
                placeholder="Précisez le motif..."
                value={rejectReason === "autre" ? "" : rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-sm"
                rows={3}
              />
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!rejectReason || rejectWithReasonMutation.isPending}
              onClick={() =>
                rejectTarget &&
                rejectWithReasonMutation.mutate({ q: rejectTarget, reason: rejectReason })
              }
            >
              {rejectWithReasonMutation.isPending ? "Rejet..." : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DUPLICATE CHECK DIALOG ── */}
      <Dialog
        open={!!duplicateCheckTarget}
        onOpenChange={(o) => !o && setDuplicateCheckTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-orange-500" />
              Doublon potentiel détecté
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Le quartier proposé{" "}
              <strong className="text-foreground">"{duplicateCheckTarget?.nom}"</strong> ressemble
              à {duplicateSimilar.length > 1 ? "des quartiers existants" : "un quartier existant"} dans{" "}
              <strong className="text-foreground">{duplicateCheckTarget?.commune}</strong> :
            </p>
            <div className="space-y-2">
              {duplicateSimilar.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 px-3 py-2"
                >
                  <div>
                    <span className="font-medium text-sm">{q.nom}</span>
                    {q.aliases.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        alias : {q.aliases.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-purple-600 border-purple-400 hover:bg-purple-50 ml-3 shrink-0"
                    onClick={() => {
                      setDuplicateCheckTarget(null);
                      setMergeTarget(duplicateCheckTarget);
                      setMergeIntoId(q.id);
                    }}
                  >
                    <GitMerge className="h-3.5 w-3.5 mr-1" />
                    Marquer comme alias
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                if (duplicateCheckTarget) {
                  validateMutation.mutate({ id: duplicateCheckTarget.id, validated: true });
                  setDuplicateCheckTarget(null);
                }
              }}
              disabled={validateMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Valider quand même
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BULK REJECT DIALOG ── */}
      <Dialog open={bulkRejectOpen} onOpenChange={(o) => !o && setBulkRejectOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejeter {selectedPending.size} soumission{selectedPending.size > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Ce motif s'appliquera à toutes les soumissions sélectionnées.
            </p>
            <div className="space-y-1.5">
              <Label>Motif de rejet</Label>
              <Select value={bulkRejectReason} onValueChange={setBulkRejectReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un motif..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doublon">Doublon — quartier déjà existant</SelectItem>
                  <SelectItem value="nom_invalide">Noms invalides ou incompréhensibles</SelectItem>
                  <SelectItem value="hors_perimetre">Hors périmètre de l'application</SelectItem>
                  <SelectItem value="spam">Soumissions abusives</SelectItem>
                  <SelectItem value="autre">Autre raison</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!bulkRejectReason || bulkRejectMutation.isPending}
              onClick={() =>
                bulkRejectMutation.mutate({
                  ids: [...selectedPending],
                  reason: bulkRejectReason,
                })
              }
            >
              {bulkRejectMutation.isPending ? "Rejet..." : `Rejeter (${selectedPending.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer ce quartier ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le quartier <strong>"{deleteTarget?.nom}"</strong> ({deleteTarget?.commune}) sera
              supprimé définitivement. Si vous souhaitez le masquer temporairement, utilisez
              l'icône <EyeOff className="inline h-3.5 w-3.5" /> à la place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Aliases Tab ─────────────────────────────────────────────────────────────

type QuartierAlias = {
  id: number;
  commune: string;
  alias: string;
  canonical: string;
};

function AliasesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCommune, setFilterCommune] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<QuartierAlias | null>(null);
  const [form, setForm] = useState({ commune: "", alias: "", canonical: "" });

  const { data: aliases = [], isLoading } = useQuery({
    queryKey: ["quartier-aliases"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quartier_aliases")
        .select("*")
        .order("commune")
        .order("alias");
      if (error) throw error;
      return data as QuartierAlias[];
    },
  });

  const filtered = aliases.filter((a) => {
    if (filterCommune !== "all" && a.commune !== filterCommune) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.alias.toLowerCase().includes(s) || a.canonical.toLowerCase().includes(s);
    }
    return true;
  });

  const upsert = useMutation({
    mutationFn: async (row: Omit<QuartierAlias, "id"> & { id?: number }) => {
      if (row.id) {
        const { error } = await (supabase as any)
          .from("quartier_aliases")
          .update({ commune: row.commune, alias: row.alias, canonical: row.canonical })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("quartier_aliases")
          .insert({ commune: row.commune, alias: row.alias, canonical: row.canonical });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quartier-aliases"] });
      toast({ title: "Alias sauvegardé" });
      setAddOpen(false);
      setEditItem(null);
      setForm({ commune: "", alias: "", canonical: "" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await (supabase as any).from("quartier_aliases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quartier-aliases"] });
      toast({ title: "Alias supprimé" });
    },
  });

  const openEdit = (a: QuartierAlias) => {
    setEditItem(a);
    setForm({ commune: a.commune, alias: a.alias, canonical: a.canonical });
    setAddOpen(true);
  };

  const communes = Array.from(new Set(aliases.map((a) => a.commune))).sort();

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            Gestion des aliases de quartiers
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Unifie les noms saisis différemment par les utilisateurs vers un nom canonique unique.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setForm({ commune: "", alias: "", canonical: "" }); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Rechercher un alias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterCommune} onValueChange={setFilterCommune}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Commune" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les communes</SelectItem>
              {communes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <p className="text-xs text-muted-foreground">{filtered.length} alias{filtered.length > 1 ? "es" : ""} · {aliases.length} au total</p>

        {/* Table */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun alias trouvé</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Commune</TableHead>
                <TableHead className="text-xs">Alias saisi</TableHead>
                <TableHead className="text-xs"><ArrowRight className="h-3 w-3 inline mr-1" />Nom canonique</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm font-medium">{a.commune}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono">
                      {a.alias}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-primary font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {a.canonical}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => remove.mutate(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? "Modifier l'alias" : "Nouvel alias"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Commune *</Label>
              <Select value={form.commune} onValueChange={(v) => setForm((f) => ({ ...f, commune: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une commune" />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNES.map((c) => <SelectItem key={c.nom} value={c.nom}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alias saisi par l'utilisateur *</Label>
              <Input
                placeholder="Ex: Blockauss (village)"
                value={form.alias}
                onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Nom tel qu'il peut être saisi dans l'app</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nom canonique (officiel) *</Label>
              <Input
                placeholder="Ex: Blockauss"
                value={form.canonical}
                onChange={(e) => setForm((f) => ({ ...f, canonical: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Nom vers lequel les signalements seront unifiés</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Annuler</Button>
            </DialogClose>
            <Button
              size="sm"
              disabled={!form.commune || !form.alias || !form.canonical || upsert.isPending}
              onClick={() => upsert.mutate({ ...form, ...(editItem ? { id: editItem.id } : {}) })}
            >
              {upsert.isPending ? "Enregistrement…" : editItem ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AdminQuartiersPage;
