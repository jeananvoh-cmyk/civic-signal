import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Non authentifié" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("delete-account: missing Supabase environment variables");
      return jsonResponse({ error: "Configuration serveur invalide" }, 500);
    }

    // User-scoped client: preserves auth.uid() for the SECURITY DEFINER RPC.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Non authentifié" }, 401);
    }

    let reason: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.reason === "string") {
        reason = body.reason.trim().slice(0, 500) || null;
      }
    } catch {
      // Reason is optional; continue with the authenticated user.
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userId = user.id;

    // Capture the user's storage paths before the DB RPC removes the report rows.
    const { data: reports, error: reportsError } = await adminClient
      .from("reports")
      .select("photo_url")
      .eq("user_id", userId)
      .not("photo_url", "is", null);

    if (reportsError) {
      console.error("delete-account: failed to load report photos", reportsError);
      return jsonResponse({ error: "Impossible de préparer la suppression" }, 500);
    }

    const photoPaths = (reports ?? [])
      .map((report: { photo_url: string | null }) => report.photo_url)
      .filter((path): path is string => typeof path === "string" && path.length > 0)
      .map((path) => {
        // Current rows store paths such as <userId>/<timestamp>.jpg.
        // Also accept legacy absolute/public URLs containing report-photos/.
        const marker = "report-photos/";
        const markerIndex = path.indexOf(marker);
        return markerIndex >= 0 ? path.slice(markerIndex + marker.length) : path;
      });

    // The current storage layout is <userId>/<filename>. Listing the user's
    // folder makes cleanup retryable even after reports have been deleted.
    const { data: listedFiles, error: listError } = await adminClient.storage
      .from("report-photos")
      .list(userId, { limit: 1000 });

    if (listError) {
      console.error("delete-account: failed to list user storage", listError);
      return jsonResponse({ error: "Impossible de préparer la suppression des fichiers" }, 500);
    }

    const listedPaths = (listedFiles ?? [])
      .filter((file) => file.name)
      .map((file) => `${userId}/${file.name}`);

    const pathsToRemove = [...new Set([...photoPaths, ...listedPaths])];

    // Remove storage objects before deleting the DB rows so we still have the
    // complete set of paths if the DB operation fails and the request is retried.
    if (pathsToRemove.length > 0) {
      const { error: storageError } = await adminClient.storage
        .from("report-photos")
        .remove(pathsToRemove);

      if (storageError) {
        console.error("delete-account: storage cleanup failed", storageError);
        return jsonResponse({ error: "Impossible de supprimer les fichiers du compte" }, 500);
      }
    }

    // Centralized, authenticated deletion. The user-scoped client is intentional:
    // delete_user_account_data() validates p_user_id against auth.uid().
    const { error: deletionError } = await userClient.rpc("delete_user_account_data", {
      p_user_id: userId,
      p_reason: reason,
    });

    if (deletionError) {
      console.error("delete-account: account data deletion failed", deletionError);
      return jsonResponse({ error: "Erreur lors de la suppression des données du compte" }, 500);
    }

    // Auth deletion is deliberately last: the database RPC and storage cleanup
    // must succeed before the identity itself is permanently removed.
    const { error: authDeletionError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeletionError) {
      console.error("delete-account: auth user deletion failed", authDeletionError);
      return jsonResponse(
        { error: "Les données ont été supprimées, mais la suppression du compte Auth a échoué" },
        500,
      );
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return jsonResponse({ error: "Erreur interne" }, 500);
  }
});
