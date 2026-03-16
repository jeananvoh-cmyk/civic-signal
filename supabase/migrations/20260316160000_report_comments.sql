-- ============================================================
-- COMMENTAIRES CITOYENS — fil de discussion sur chaque signalement
-- ============================================================

CREATE TABLE public.report_comments (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 200),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour charger les commentaires d'un signalement rapidement
CREATE INDEX idx_report_comments_report_id ON public.report_comments (report_id, created_at);

-- RLS
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Public can read comments"
  ON public.report_comments FOR SELECT
  USING (true);

-- Insertion : utilisateur authentifié uniquement, max 5 commentaires par signalement par utilisateur
CREATE POLICY "Authenticated can insert comment"
  ON public.report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT COUNT(*) FROM public.report_comments
      WHERE report_id = report_comments.report_id
        AND user_id = auth.uid()
    ) < 5
  );

-- Suppression : uniquement son propre commentaire
CREATE POLICY "User can delete own comment"
  ON public.report_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
