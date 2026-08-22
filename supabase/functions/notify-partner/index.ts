import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
};

type Report = { id: string; user_id: string; service_type: string; report_category: string; commune: string; quartier: string; description: string; verifications: number; urgency: string; latitude: number | null; longitude: number | null; created_at: string };
type Partner = { user_id: string; org_name: string; partner_type: string; commune: string | null; email: string };
function esc(s: string | null | undefined) { return (s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;"); }
function serviceLabel(s: string) { return ({electricity:"Électricité",water:"Eau",road:"Voirie",sanitation:"Assainissement",lighting:"Éclairage public",other:"Autre"} as Record<string,string>)[s] ?? s; }
function matches(p: Partner, r: Report) { if (p.partner_type === "cie") return r.service_type === "electricity"; if (p.partner_type === "sodeci") return r.service_type === "water"; if (p.partner_type === "mairie") return r.report_category === "infrastructure" && (p.commune === null || p.commune.toLowerCase() === r.commune.toLowerCase()); return ["ong","autre","other"].includes(p.partner_type); }
function emailHtml(r: Report, p: Partner) { const map = r.latitude != null && r.longitude != null ? `<p><a href="https://maps.google.com/?q=${r.latitude},${r.longitude}">📍 Voir sur la carte</a></p>` : ""; return `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#1f2937"><h2>🏗️ Nouveau signalement SIGNA-CI</h2><p>Bonjour <strong>${esc(p.org_name)}</strong>,</p><p>Un signalement relevant de votre périmètre a été validé.</p><table cellpadding="8" cellspacing="0" border="1"><tr><td>Type</td><td>${esc(serviceLabel(r.service_type))}</td></tr><tr><td>Commune</td><td>${esc(r.commune)}</td></tr><tr><td>Quartier</td><td>${esc(r.quartier)}</td></tr><tr><td>Urgence</td><td>${esc(r.urgency)}</td></tr><tr><td>Description</td><td>${esc(r.description)}</td></tr></table>${map}<p><a href="https://civic-signal-ten.vercel.app/partner/dashboard">Accéder au tableau de bord partenaire →</a></p></body></html>`; }
async function sendEmail(to: string, subject: string, html: string, fromEmail: string, apiKey: string) { const res = await fetch("https://api.resend.com/emails", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({from:`SIGNA-CI <${fromEmail}>`,to:[to],subject,html})}); if (!res.ok) return {ok:false,error:await res.text()}; return {ok:true}; }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!; const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; const resendApiKey = Deno.env.get("RESEND_API_KEY"); const fromEmail = Deno.env.get("RELAY_FROM_EMAIL") ?? "onboarding@resend.dev"; const supabase = createClient(supabaseUrl, serviceRoleKey);
    const supplied = req.headers.get("x-internal-key"); const {data:keyRow,error:keyError} = await supabase.from("relay_config").select("value").eq("key","notify_partner_internal_key").maybeSingle();
    if (keyError || !keyRow?.value || supplied !== keyRow.value) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...corsHeaders,"Content-Type":"application/json"}});
    if (!resendApiKey) return new Response(JSON.stringify({error:"RESEND_API_KEY non configuré"}),{status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
    const {report_id} = await req.json().catch(()=>({})); if (!report_id) return new Response(JSON.stringify({error:"report_id requis"}),{status:400,headers:{...corsHeaders,"Content-Type":"application/json"}});
    const {data:report,error:reportError} = await supabase.from("reports").select("id,user_id,service_type,report_category,commune,quartier,description,verifications,urgency,latitude,longitude,created_at").eq("id",report_id).eq("validated",true).single();
    if (reportError || !report) return new Response(JSON.stringify({error:"Signalement introuvable"}),{status:404,headers:{...corsHeaders,"Content-Type":"application/json"}});
    const {data:partners,error:partnerError} = await supabase.from("partner_profiles").select("user_id,org_name,partner_type,commune"); if (partnerError) throw partnerError;
    let sent=0, errors:string[]=[];
    for (const p of (partners ?? []) as any[]) { const {data:userData} = await supabase.auth.admin.getUserById(p.user_id); const email=userData?.user?.email; if (!email) continue; const partner:Partner={...p,email}; if (!matches(partner,report as Report)) continue; const result=await sendEmail(email,`[SIGNA-CI] Nouveau signalement — ${serviceLabel((report as Report).service_type)} à ${(report as Report).commune} (${(report as Report).quartier})`,emailHtml(report as Report,partner),fromEmail,resendApiKey); if(result.ok) sent++; else errors.push(`${email}: ${result.error ?? "send failed"}`); }
    return new Response(JSON.stringify({report_id,sent,errors:errors.length?errors:undefined}),{headers:{...corsHeaders,"Content-Type":"application/json"}});
  } catch (err) { return new Response(JSON.stringify({error:(err as Error).message}),{status:500,headers:{...corsHeaders,"Content-Type":"application/json"}}); }
});
