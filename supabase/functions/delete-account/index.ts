import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function listAllUserPhotoPaths(admin: ReturnType<typeof createClient>, userId: string): Promise<string[]> {
  const paths: string[] = [];
  const queue: string[] = [userId];
  const pageSize = 1000;

  while (queue.length) {
    const prefix = queue.shift()!;
    let offset = 0;

    while (true) {
      const { data: objects, error } = await admin.storage
        .from("report-photos")
        .list(prefix, { limit: pageSize, offset });
      if (error) throw new Error(`Storage listing failed: ${error.message}`);
      if (!objects?.length) break;

      for (const object of objects) {
        if (!object.name) continue;
        const fullPath = `${prefix}/${object.name}`;
        if (object.id) paths.push(fullPath);
        else queue.push(fullPath);
      }

      if (objects.length < pageSize) break;
      offset += objects.length;
    }
  }

  return paths;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { reason = "Non spécifié" } = await req.json().catch(() => ({}));

    // Storage is authoritative for user photo cleanup. Fail closed: do not delete
    // database/Auth data if Storage cannot be fully enumerated or removed.
    const photoPaths = await listAllUserPhotoPaths(admin, user.id);
    if (photoPaths.length) {
      const { error: removeError } = await admin.storage.from("report-photos").remove(photoPaths);
      if (removeError) throw new Error(`Photo cleanup failed: ${removeError.message}`);
    }

    const operations = [
      admin.from("corroborations").delete().eq("user_id", user.id),
      admin.from("repair_confirmations").delete().eq("user_id", user.id),
      admin.from("notifications").delete().eq("user_id", user.id),
      admin.from("reports").delete().eq("user_id", user.id),
    ];
    const results = await Promise.all(operations);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(`Account data cleanup failed: ${failed.error.message}`);

    const { error: auditError } = await admin.from("report_deletions").insert({
      report_id: "00000000-0000-0000-0000-000000000000",
      user_id: user.id,
      reason: `[SUPPRESSION COMPTE] ${String(reason).slice(0, 500)}`,
      service_type: "account",
      description: "Suppression complète du compte utilisateur",
    });
    if (auditError) throw new Error(`Deletion audit failed: ${auditError.message}`);

    const profileResult = await admin.from("profiles").delete().eq("user_id", user.id);
    if (profileResult.error) throw new Error(`Profile cleanup failed: ${profileResult.error.message}`);
    const rolesResult = await admin.from("user_roles").delete().eq("user_id", user.id);
    if (rolesResult.error) throw new Error(`Role cleanup failed: ${rolesResult.error.message}`);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error(`Auth deletion failed: ${deleteError.message}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err instanceof Error ? err.message : "unknown error");
    return new Response(JSON.stringify({ error: "Erreur lors de la suppression du compte" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});