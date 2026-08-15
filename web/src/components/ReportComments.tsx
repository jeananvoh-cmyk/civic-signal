import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2, Building2, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
  organization_name: string | null;
  partner_type: string | null;
}

const PARTNER_LABELS: Record<string, string> = {
  cie:    "CIE",
  sodeci: "SODECI",
  mairie: "Mairie",
  ngo:    "ONG",
  other:  "Partenaire",
};

const PARTNER_COLORS: Record<string, string> = {
  cie:    "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-300",
  sodeci: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300",
  mairie: "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300",
  ngo:    "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-300",
  other:  "bg-muted text-muted-foreground border-border",
};

interface ReportCommentsProps {
  reportId: string;
}

const ReportComments = ({ reportId }: ReportCommentsProps) => {
  const { user } = useAuth();
  const { canValidate } = useUserRole();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    const { data } = await supabase.rpc("get_report_comments" as any, { p_report_id: reportId });
    if (data) setComments(data as Comment[]);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [reportId]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !user) return;
    if (trimmed.length > 200) {
      toast.error("200 caractères maximum");
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from("report_comments")
      .insert({ report_id: reportId, user_id: user.id, content: trimmed });
    setSending(false);
    if (error) {
      if (error.message?.includes("violates check constraint")) {
        toast.error("Limite de 5 commentaires par signalement atteinte.");
      } else {
        toast.error("Impossible d'envoyer le commentaire.");
      }
      return;
    }
    setDraft("");
    await fetchComments();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleDelete = async (commentId: string) => {
    setDeleting(commentId);
    const { error } = await supabase
      .from("report_comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      toast.error("Impossible de supprimer le commentaire.");
    } else {
      toast.success("Commentaire supprimé.");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
    setDeleting(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Commentaires
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">({comments.length})</span>
          )}
        </h3>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            Aucun commentaire pour l'instant.
          </p>
        ) : (
          comments.map((c) => {
            const isPartner = !!c.partner_type;
            const isOwn = user?.id === c.user_id;
            return (
              <div key={c.id} className={`px-4 py-3 ${isOwn ? "bg-primary/3" : ""}`}>
                {/* Author row */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <div className={`flex items-center justify-center h-6 w-6 rounded-full shrink-0 ${
                    isPartner ? "bg-primary/10" : "bg-muted"
                  }`}>
                    {isPartner
                      ? <Building2 className="h-3.5 w-3.5 text-primary" />
                      : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {isPartner ? c.organization_name : c.display_name}
                    {isOwn && <span className="ml-1 text-muted-foreground font-normal">(vous)</span>}
                  </span>
                  {isPartner && c.partner_type && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PARTNER_COLORS[c.partner_type] ?? PARTNER_COLORS.other}`}>
                      {PARTNER_LABELS[c.partner_type] ?? "Partenaire"}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(c.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {/* Delete button — own comment OR admin/moderator */}
                  {(isOwn || canValidate) && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                      title="Supprimer"
                      aria-label="Supprimer le commentaire"
                    >
                      {deleting === c.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                    </button>
                  )}
                </div>
                {/* Content */}
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pl-8">
                  {c.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        {user ? (
          <div className="flex gap-2 items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Laissez un commentaire…"
              rows={2}
              maxLength={200}
              className="resize-none text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
              }}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="shrink-0 gap-1.5"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground">
            <Link to="/auth" className="text-primary underline underline-offset-2">Connectez-vous</Link> pour laisser un commentaire.
          </p>
        )}
        {draft.length > 150 && (
          <p className="text-[10px] text-muted-foreground text-right mt-1">{draft.length}/200</p>
        )}
      </div>
    </div>
  );
};

export default ReportComments;
