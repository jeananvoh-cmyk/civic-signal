/**
 * extract-meter-info
 * ------------------
 * OCR vision endpoint for CIE/SODECI meter documents.
 * Authentication is required; OCR output is validated before being returned.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_HINTS = new Set(["electricity", "water", "auto"]);
const MAX_BASE64_LENGTH = 7_000_000; // roughly 5 MB binary after base64 decoding
const MAX_NUMERIC_ID_LENGTH = 20;
const MAX_REF_LENGTH = 80;
const MAX_RAW_TEXT_LENGTH = 1000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function cleanNumeric(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\s\-\.]/g, "").trim();
  if (!cleaned || cleaned.length > MAX_NUMERIC_ID_LENGTH || !/^\d+$/.test(cleaned)) return undefined;
  return cleaned;
}

function cleanRef(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > MAX_REF_LENGTH) return undefined;
  // References may be alphanumeric with common separators only.
  if (!/^[A-Za-z0-9._/-]+$/.test(cleaned)) return undefined;
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
      console.error("extract-meter-info configuration incomplete");
      return json({ error: "Service unavailable" }, 503);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // OCR consumes a paid third-party API: never expose it as an unauthenticated endpoint.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length).trim();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { image_base64, mime_type, hint = "auto" } = body;

    if (typeof image_base64 !== "string" || !image_base64 || image_base64.length > MAX_BASE64_LENGTH) {
      return json({ error: "Invalid or oversized image" }, 400);
    }
    if (!ALLOWED_MIME_TYPES.has(mime_type)) return json({ error: "Unsupported image type" }, 400);
    if (!ALLOWED_HINTS.has(hint)) return json({ error: "Invalid hint" }, 400);
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(image_base64)) return json({ error: "Invalid image encoding" }, 400);

    // Raw OCR text is sensitive and is disabled by default. It can only be enabled
    // explicitly for an admin/debug deployment.
    const returnRawText = Deno.env.get("RETURN_OCR_RAW_TEXT") === "true";
    let callerIsAdmin = false;
    if (returnRawText) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      callerIsAdmin = profile?.role === "admin";
    }

    const hintContext = hint === "electricity"
      ? "Il s'agit d'un document CIE (électricité)."
      : hint === "water"
        ? "Il s'agit d'un document SODECI (eau)."
        : "Le document peut concerner CIE (électricité) ou SODECI (eau), ou les deux.";

    const systemPrompt = `Tu es un assistant spécialisé dans la lecture de documents de services publics ivoiriens (CIE pour l'électricité, SODECI pour l'eau).
Tu analyses des photos de compteurs, de factures ou de reçus de rechargement.
${hintContext}

Extrais UNIQUEMENT les informations demandées. Si une information est absente ou illisible, ne l'inclus pas dans la réponse.
Retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après.

Champs à extraire (si présents) :
- electricity_client_id : numéro de client CIE (6-10 chiffres)
- electricity_meter_ref : référence du compteur CIE (alphanumérique)
- electricity_meter_number : numéro de compteur CIE (8-12 chiffres)
- water_client_id : numéro de client SODECI (6-10 chiffres)
- water_meter_ref : référence du compteur SODECI (alphanumérique)
- water_meter_number : numéro de compteur SODECI (8-12 chiffres)
- confidence : "high" | "medium" | "low"
- raw_text : texte brut détecté, uniquement pour débogage administrateur

N'invente jamais une valeur absente ou illisible.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mime_type, data: image_base64 },
            },
            { type: "text", text: "Analyse ce document et extrais les informations demandées au format JSON." },
          ],
        }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error status:", response.status);
      return json({ error: "OCR service temporarily unavailable" }, 502);
    }

    const result = await response.json();
    const content = result?.content?.[0]?.text ?? "";

    let parsed: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Unable to parse Claude OCR response");
      parsed = {};
    }

    const rawConfidence = parsed.confidence;
    const confidence = ["high", "medium", "low"].includes(String(rawConfidence))
      ? String(rawConfidence)
      : "low";

    const extracted: Record<string, unknown> = {
      electricity_client_id: cleanNumeric(parsed.electricity_client_id),
      electricity_meter_ref: cleanRef(parsed.electricity_meter_ref),
      electricity_meter_number: cleanNumeric(parsed.electricity_meter_number),
      water_client_id: cleanNumeric(parsed.water_client_id),
      water_meter_ref: cleanRef(parsed.water_meter_ref),
      water_meter_number: cleanNumeric(parsed.water_meter_number),
      confidence,
    };

    if (returnRawText && callerIsAdmin && typeof parsed.raw_text === "string") {
      extracted.raw_text = parsed.raw_text.slice(0, MAX_RAW_TEXT_LENGTH);
    }

    const payload = Object.fromEntries(
      Object.entries(extracted).filter(([, value]) => value !== undefined),
    );

    return json(payload);
  } catch (err) {
    console.error("extract-meter-info error:", err instanceof Error ? err.message : "unknown error");
    return json({ error: "Internal error" }, 500);
  }
});
