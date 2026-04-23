/**
 * extract-meter-info
 * ------------------
 * Extrait les numéros de compteur CIE / SODECI depuis une photo :
 *   - Photo du compteur physique (affichage numérique)
 *   - Facture CIE ou SODECI (PDF rendu en image ou photo)
 *   - Reçu de rechargement de compteur prépayé (token)
 *
 * Body attendu :
 *   {
 *     image_base64: string,   // base64 de l'image (sans préfixe data:...)
 *     mime_type: string,      // "image/jpeg" | "image/png" | "image/webp"
 *     hint?: "electricity" | "water" | "auto"
 *   }
 *
 * Réponse :
 *   {
 *     electricity_client_id?: string,
 *     electricity_meter_ref?: string,
 *     electricity_meter_number?: string,
 *     water_client_id?: string,
 *     water_meter_ref?: string,
 *     water_meter_number?: string,
 *     raw_text?: string,   // texte brut détecté (débogage)
 *     confidence: "high" | "medium" | "low"
 *   }
 *
 * Variables d'environnement requises (Supabase Secrets) :
 *   ANTHROPIC_API_KEY
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64, mime_type, hint = "auto" } = await req.json();

    if (!image_base64 || !mime_type) {
      return Response.json({ error: "image_base64 et mime_type sont requis" }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY non configurée" }, { status: 500, headers: corsHeaders });
    }

    // ── Prompt adapté selon le type de document ──────────────────────────────
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
- electricity_client_id : numéro de client CIE (souvent "N° Client" ou "Client N°", 6-10 chiffres)
- electricity_meter_ref : référence du compteur CIE (souvent "Réf." ou "Référence compteur", format alphanumérique)
- electricity_meter_number : numéro de compteur CIE (souvent "N° Compteur" ou "Compteur", 8-12 chiffres)
- water_client_id : numéro de client SODECI (6-10 chiffres)
- water_meter_ref : référence du compteur SODECI (alphanumérique)
- water_meter_number : numéro de compteur SODECI (8-12 chiffres)
- confidence : "high" si tu lis clairement les données, "medium" si partiellement lisible, "low" si peu sûr
- raw_text : texte brut de tous les numéros détectés sur l'image (pour vérification)

Exemple de réponse :
{
  "electricity_client_id": "01234567",
  "electricity_meter_number": "987654321",
  "confidence": "high",
  "raw_text": "N° Client: 01234567, N° Compteur: 987654321"
}`;

    // ── Appel Claude claude-haiku-4-5 (rapide + vision) ───────────────────────────────
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
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mime_type,
                  data: image_base64,
                },
              },
              {
                type: "text",
                text: "Analyse ce document et extrais les informations demandées au format JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude API error:", err);
      return Response.json({ error: "Erreur API Claude", details: err }, { status: 502, headers: corsHeaders });
    }

    const result = await response.json();
    const content = result?.content?.[0]?.text ?? "";

    // ── Parser la réponse JSON de Claude ──────────────────────────────────────
    let parsed: Record<string, string> = {};
    try {
      // Claude peut parfois entourer le JSON de backticks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Impossible de parser la réponse Claude:", content);
      parsed = { confidence: "low", raw_text: content };
    }

    // ── Nettoyer les valeurs (retirer espaces, tirets superflus) ─────────────
    const clean = (v: unknown) => typeof v === "string" ? v.replace(/[\s\-\.]/g, "").trim() : undefined;
    const keep = (v: unknown) => typeof v === "string" ? v.trim() : undefined;

    const extracted = {
      electricity_client_id:    clean(parsed.electricity_client_id),
      electricity_meter_ref:    keep(parsed.electricity_meter_ref),
      electricity_meter_number: clean(parsed.electricity_meter_number),
      water_client_id:          clean(parsed.water_client_id),
      water_meter_ref:          keep(parsed.water_meter_ref),
      water_meter_number:       clean(parsed.water_meter_number),
      confidence:               parsed.confidence ?? "low",
      raw_text:                 parsed.raw_text,
    };

    // Retirer les undefined
    const payload = Object.fromEntries(
      Object.entries(extracted).filter(([, v]) => v !== undefined)
    );

    return Response.json(payload, { headers: corsHeaders });

  } catch (err) {
    console.error("extract-meter-info error:", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500, headers: corsHeaders });
  }
});
