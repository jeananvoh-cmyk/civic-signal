import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client with user's JWT to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { reason } = await req.json();

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Delete user's photos from storage
    const { data: reports } = await adminClient
      .from("reports")
      .select("photo_url")
      .eq("user_id", userId)
      .not("photo_url", "is", null);

    if (reports) {
      const photoPaths = reports
        .map((r: any) => r.photo_url)
        .filter(Boolean)
        .map((url: string) => {
          // Extract path from full URL or path
          const match = url.match(/report-photos\/(.+)/);
          return match ? match[1] : null;
        })
        .filter((p): p is string => p !== null);

      if (photoPaths.length > 0) {
        await adminClient.storage.from("report-photos").remove(photoPaths);
      }
    }

    // 2. Delete corroborations
    await adminClient.from("corroborations").delete().eq("user_id", userId);

    // 3. Delete repair confirmations
    await adminClient.from("repair_confirmations").delete().eq("user_id", userId);

    // 4. Delete notifications
    await adminClient.from("notifications").delete().eq("user_id", userId);

    // 5. Delete reports (cascades corroborations via report_id if any)
    await adminClient.from("reports").delete().eq("user_id", userId);

    // 6. Log the deletion
    await adminClient.from("report_deletions").insert({
      report_id: "00000000-0000-0000-0000-000000000000",
      user_id: userId,
      reason: `[SUPPRESSION COMPTE] ${reason || "Non spécifié"}`,
      service_type: "account",
      description: "Suppression complète du compte utilisateur",
    });

    // 7. Delete profile
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // 8. Delete user roles
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // 9. Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la suppression du compte" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
