import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey          = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Non autorisé" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return json({ error: "Accès réservé aux administrateurs" }, 403);

    const body = await req.json();
    const { action = "reset_password" } = body;

    // ── Action : rechercher par email ────────────────────────────────────────
    if (action === "search_by_email") {
      const { email } = body;
      if (!email?.trim()) return json({ error: "Email requis" }, 400);

      const { data: { users }, error } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (error) return json({ error: error.message }, 400);

      const q = email.trim().toLowerCase();
      const matches = (users ?? [])
        .filter((u) => u.email?.toLowerCase().includes(q))
        .slice(0, 10)
        .map((u) => ({ user_id: u.id, email: u.email }));

      return json({ users: matches });
    }

    // ── Action : envoyer email de réinitialisation ───────────────────────────
    if (action === "send_reset_email") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id requis" }, 400);

      // Récupérer l'email de l'utilisateur
      const { data: { user }, error: getUserError } = await adminClient.auth.admin.getUserById(user_id);
      if (getUserError || !user?.email) return json({ error: "Utilisateur introuvable" }, 404);

      // Envoyer le mail de réinitialisation
      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${supabaseUrl.replace(".supabase.co", "")}/update-password`.replace(
          "https://uycoawpbchgznkdbnfc",
          "https://signa.ci",
        ),
      });

      // On ignore l'erreur de redirect si le mail part quand même
      if (resetError && !resetError.message.includes("redirect")) {
        return json({ error: resetError.message }, 400);
      }

      return json({ success: true, email: user.email });
    }

    // ── Action : réinitialiser le mot de passe directement ──────────────────
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return json({ error: "user_id et new_password requis" }, 400);
    }
    if (new_password.length < 6) {
      return json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, 400);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });
    if (updateError) return json({ error: updateError.message }, 400);

    return json({ success: true, user_id });

  } catch (err: unknown) {
    return json({ error: (err as Error).message }, 500);
  }
});
