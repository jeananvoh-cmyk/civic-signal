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

const normalizePhotoPath = (rawPath: string, userId: string): string | null => {
  const path = rawPath.trim();
  if (!path) return null;

  const marker = "report-photos/";
  const markerIndex = path.indexOf(marker);
  if (markerIndex >= 0) {
    const objectPath = path.slice(markerIndex + marker.length).replace(/^\/+/, "");
    return objectPath || null;
  }

  if (path === userId || path.startsWith(`${userId}/`)) {
    return path;
  }

  return null;
};

const listStoragePaths = async (
  adminClient: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> => {
  const { data, error } = await adminClient.storage.from(bucket).list(prefix, {
    limit: 1000,
    offset: 0,
  });

  if (error) throw error;

  const paths: string[] = [];
  for (const entry of data ?? []) {
    if (!entry.name) continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;

    // Files have metadata/id; folders returned by Storage generally do not.
    // Recurse into folders so nested user objects cannot survive deletion.
    if (entry.id || entry.metadata) {
      paths.push(path);
    } else {
      paths.push(...await listStoragePaths(adminClient, bucket, path));
    }
  }

  return paths;
};

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
      // Reason is optional.
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userId = user.id;

    // Capture storage paths before the DB RPC removes report rows.
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
      .map((path) => normalizePhotoPath(path, userId))
      .filter((path): path is string => path !== null);

    // Current storage layout is <userId>/<filename>. Recursively listing the
    // user's prefix also lets a retry clean nested objects from a prior attempt.
    let listedPaths: string[];
    try {
      listedPaths = await listStoragePaths(adminClient, "report-photos", userId);
    } catch (error) {
      console.error("delete-account: failed to list user storage", error);
      return jsonResponse({ error: "Impossible de préparer la suppression des fichiers" }, 500);
    }

    const pathsToRemove = [...new Set([...photoPaths, ...listedPaths])];

    // Delete application data through the authenticated SECURITY DEFINER RPC.
    const { error: deletionError } = await userClient.rpc("delete_user_account_data", {
      p_user_id: userId,
      p_reason: reason,
    });

    if (deletionError) {
      console.error("delete-account: account data deletion failed", deletionError);
      return jsonResponse({ error: "Erreur lors de la suppression des données du compte" }, 500);
    }

    if (pathsToRemove.length > 0) {
      const { error: storageError } = await adminClient.storage
        .from("report-photos")
        .remove(pathsToRemove);

      if (storageError) {
        console.error("delete-account: storage cleanup failed", storageError);
        return jsonResponse({ error: "Les données ont été supprimées, mais certains fichiers restent à nettoyer" }, 500);
      }
    }

    // Auth deletion is deliberately last. If it fails, the authenticated user
    // can retry the operation without reintroducing application data.
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
