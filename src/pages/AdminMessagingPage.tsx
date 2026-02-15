import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Send, Loader2, CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES } from "@/lib/communes";
import { getQuartiers } from "@/lib/quartiers";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/contexts/AuthContext";

const AdminMessagingPage = () => {
  const { user } = useAuth();
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; commune: string; quartier: string } | null>(null);

  const quartiers = commune ? getQuartiers(commune) : [];

  const handleSend = async () => {
    if (!commune || !title.trim() || !message.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (title.trim().length > 100) {
      toast.error("Le titre ne doit pas dépasser 100 caractères.");
      return;
    }
    if (message.trim().length > 500) {
      toast.error("Le message ne doit pas dépasser 500 caractères.");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.rpc("broadcast_admin_message", {
        p_commune: commune,
        p_quartier: quartier || "",
        p_title: title.trim(),
        p_message: message.trim(),
      });
      if (error) throw error;

      const count = data as number;
      setLastResult({ count, commune, quartier });
      toast.success(`📢 Message envoyé à ${count} utilisateur${count > 1 ? "s" : ""}`);

      if (user) {
        logAudit({
          action: "broadcast_message",
          target_type: "notification",
          details: {
            commune,
            quartier: quartier || "(tous)",
            title: title.trim(),
            recipients: count,
          },
        });
      }

      // Reset form
      setTitle("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Messagerie</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Envoyez un message d'information aux utilisateurs d'une commune ou d'un quartier.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5"
      >
        {/* Commune */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Commune <span className="text-destructive">*</span>
          </label>
          <Select value={commune} onValueChange={(v) => { setCommune(v); setQuartier(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une commune" />
            </SelectTrigger>
            <SelectContent>
              {COMMUNES.map((c) => (
                <SelectItem key={c.nom} value={c.nom}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.couleur }} />
                    {c.nom}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quartier (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Quartier <span className="text-xs text-muted-foreground">(optionnel — tous si vide)</span>
          </label>
          <Select value={quartier} onValueChange={setQuartier} disabled={!commune}>
            <SelectTrigger>
              <SelectValue placeholder={commune ? "Tous les quartiers" : "Choisir d'abord une commune"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les quartiers</SelectItem>
              {quartiers.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Titre <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Maintenance prévue ce soir"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Message <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Rédigez votre message d'information..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
        </div>

        {/* Preview */}
        {title && message && commune && (
          <div className="rounded-xl bg-secondary/50 p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aperçu</p>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">📢 {message}</p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Cible : {commune}{quartier ? `, ${quartier}` : " (tous quartiers)"}
            </p>
          </div>
        )}

        <Button
          onClick={handleSend}
          disabled={sending || !commune || !title.trim() || !message.trim()}
          className="w-full py-5 font-bold"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Envoyer le message
            </>
          )}
        </Button>
      </motion.div>

      {/* Result feedback */}
      {lastResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-success/30 bg-success/5 p-5 text-center"
        >
          <CheckCircle2 className="mx-auto h-8 w-8 text-success mb-2" />
          <p className="font-bold text-foreground">
            Message envoyé à {lastResult.count} utilisateur{lastResult.count > 1 ? "s" : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {lastResult.commune}{lastResult.quartier ? `, ${lastResult.quartier}` : ""}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AdminMessagingPage;
