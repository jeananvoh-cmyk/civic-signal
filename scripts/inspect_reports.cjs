const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://uycoawpbchgznkdbznfc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y29hd3BiY2hnem5rZGJ6bmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTAwNzEsImV4cCI6MjA4NjQyNjA3MX0.p7ZW9SNDM7aQ98IyeHTc6ayn0DuFMDUmY89n0nfL3yk";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function inspect() {
  console.log("=== RELAY LOGS PENDING ===");
  const { data: logs, error: lErr } = await supabase
    .from("relay_logs")
    .select("*")
    .or("status.eq.pending,status.is.null");
  
  if (lErr) console.error("lErr:", lErr);
  console.log("Pending logs count:", logs?.length);
  console.log("Logs:", JSON.stringify(logs, null, 2));

  const reportIds = (logs || []).map((l) => l.report_id).filter(Boolean);
  if (reportIds.length > 0) {
    console.log("\n=== REPORTS ===");
    const { data: reports, error: rErr } = await supabase
      .from("reports")
      .select("*")
      .in("id", reportIds);
    if (rErr) console.error("rErr:", rErr);
    console.log("Reports:", JSON.stringify(reports, null, 2));

    console.log("\n=== NOTIFICATIONS ===");
    const { data: notifs, error: nErr } = await supabase
      .from("notifications")
      .select("*")
      .in("report_id", reportIds);
    if (nErr) console.error("nErr:", nErr);
    console.log("Notifications:", JSON.stringify(notifs, null, 2));
  }
}

inspect();
