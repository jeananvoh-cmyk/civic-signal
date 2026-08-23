import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { reason = "Non spécifié" } = await req.json().catch(() => ({}));

    // Storage is authoritative for photo cleanup: report.photo_urls may be stale/incomplete.
    // User photos are stored under <user_id>/..., so remove every object in that prefix.
    const photoPaths: string[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data: objects, error: listError } = await admin.storage.from("report-photos").list(user.id, { limit: pageSize, offset });
      if (listError) {
        console.error("Storage listing failed:", listError.message);
        break;
      }
      if (!objects?.length) break;
      for (const object of objects) {
        if (object.name && !object.name.endsWith("/")) photoPaths.push(`${user.id}/${object.name}`);
      }
      if (objects.length < pageSize) break;
      offset += objects.length;
    }
    if (photoPaths.length) {
      const { error: removeError } = await admin.storage.from("report-photos").remove(photoPaths);
      if (removeError) console.error("Photo cleanup failed:", removeError.message);
    }

    await admin.from("corroborations").delete().eq("user_id", user.id);
    await admin.from("repair_confirmations").delete().eq("user_id", user.id);
    await admin.from("notifications").delete().eq("user_id", user.id);
    await admin.from("reports").delete().eq("user_id", user.id);

    await admin.from("report_deletions").insert({
      report_id: "00000000-0000-0000-0000-000000000000",
      user_id: user.id,
      reason: `[SUPPRESSION COMPTE] ${String(reason).slice(0, 500)}`,
      service_type: "account",
      description: "Suppression complète du compte utilisateur",
    });

    await admin.from("profiles").delete().eq("user_id", user.id);
    await admin.from("user_roles").delete().eq("user_id", user.id);
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError.message);
      return new Response(JSON.stringify({ error: "Erreur lors de la suppression du compte" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
