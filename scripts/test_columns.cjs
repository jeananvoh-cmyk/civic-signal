const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://uycoawpbchgznkdbznfc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y29hd3BiY2hnem5rZGJ6bmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTAwNzEsImV4cCI6MjA4NjQyNjA3MX0.p7ZW9SNDM7aQ98IyeHTc6ayn0DuFMDUmY89n0nfL3yk";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const cols = [
  "id", "created_at", "commune", "location", "quartier", "custom_quartier",
  "address_text", "landmark", "description", "category", "service_type",
  "report_category", "verifications", "urgency", "meter_number", "contract_type",
  "latitude", "longitude", "user_id"
];

async function testCols() {
  const validCols = [];
  for (const c of cols) {
    const { error } = await supabase.from("reports").select(c).limit(1);
    if (error) {
      console.log(`❌ Column '${c}' INVALID:`, error.message);
    } else {
      console.log(`✅ Column '${c}' VALID`);
      validCols.push(c);
    }
  }
  console.log("\nAll valid columns:", validCols.join(", "));
}

testCols();
