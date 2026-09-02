import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Méthode non autorisée" }, { status: 405, headers: corsHeaders });
  }

  try {
    // 1. Vérification de l'authentification de l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Non authentifié" }, { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: "Configuration serveur incomplète" }, { status: 500, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Jeton de session invalide" }, { status: 401, headers: corsHeaders });
    }

    // 2. Validation des entrées
    const { image_base64, mime_type, hint = "auto" } = await req.json().catch(() => ({}));

    if (
      typeof image_base64 !== "string" ||
      !image_base64 ||
      typeof mime_type !== "string" ||
      !allowedMimeTypes.has(mime_type)
    ) {
      return Response.json(
        { error: "image_base64 et mime_type valide (jpeg/png/webp) sont requis" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Limite de taille : 8 Mo en base64
    if (image_base64.length > 8000000) {
      return Response.json({ error: "Image trop volumineuse (max 8 Mo)" }, { status: 413, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY non configurée" }, { status: 500, headers: corsHeaders });
    }

    const hintContext =
      hint === "electricity"
        ? "Il s'agit d'un document CIE (électricité)."
        : hint === "water"
        ? "Il s'agit d'un document SODECI (eau)."
        : "Le document peut concerner CIE (électricité) ou SODECI (eau), ou les deux.";

    const systemPrompt = `Tu es spécialisé dans la lecture de documents CIE/SODECI ivoiriens. ${hintContext} Extrais uniquement les informations demandées. Retourne uniquement un objet JSON valide. Champs: electricity_client_id, electricity_meter_ref, electricity_meter_number, water_client_id, water_meter_ref, water_meter_number, confidence (high|medium|low), raw_text. Si absent ou illisible, omets le champ.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mime_type, data: image_base64 } },
              { type: "text", text: "Analyse ce document et extrais les informations demandées au format JSON." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: "Erreur API Claude" }, { status: 502, headers: corsHeaders });
    }

    const result = await response.json();
    const content = result?.content?.[0]?.text ?? "";

    let parsed: any = {};
    try {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch {
      parsed = { confidence: "low" };
    }

    const clean = (v: any) => (typeof v === "string" ? v.replace(/[\s\-.]/g, "").trim() : undefined);
    const keep = (v: any) => (typeof v === "string" ? v.trim() : undefined);

    const payload = Object.fromEntries(
      Object.entries({
        electricity_client_id: clean(parsed.electricity_client_id),
        electricity_meter_ref: keep(parsed.electricity_meter_ref),
        electricity_meter_number: clean(parsed.electricity_meter_number),
        water_client_id: clean(parsed.water_client_id),
        water_meter_ref: keep(parsed.water_meter_ref),
        water_meter_number: clean(parsed.water_meter_number),
        confidence: parsed.confidence ?? "low",
        raw_text: typeof parsed.raw_text === "string" ? parsed.raw_text.slice(0, 2000) : undefined,
      }).filter(([, v]) => v !== undefined)
    );

    return Response.json(payload, { headers: corsHeaders });
  } catch (err) {
    console.error("Erreur extract-meter-info :", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500, headers: corsHeaders });
  }
});
