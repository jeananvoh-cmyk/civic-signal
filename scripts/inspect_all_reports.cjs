const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://uycoawpbchgznkdbznfc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y29hd3BiY2hnem5rZGJ6bmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTAwNzEsImV4cCI6MjA4NjQyNjA3MX0.p7ZW9SNDM7aQ98IyeHTc6ayn0DuFMDUmY89n0nfL3yk";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function inspectAllReports() {
  console.log("=== ALL REPORTS IN DB ===");
  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  
  if (error) {
    console.error("error:", error);
  } else {
    console.log("Reports count:", reports?.length);
    console.log("Sample report keys:", Object.keys(reports[0] || {}));
    console.log(JSON.stringify(reports, null, 2));
  }
}

inspectAllReports();
