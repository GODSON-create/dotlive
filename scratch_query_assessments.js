import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://knmfrqiqzxzodtmmknsy.supabase.co";
const supabaseKey = "sb_publishable_lI4ZRVCtofHShTb8lgE_MQ_upD70DMq";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log("Querying founder_profiles joining profiles...");
  const { data, error } = await supabase
    .from('founder_profiles')
    .select(`
      *,
      profiles (
        name,
        dot_id
      )
    `)
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Data count:", data ? data.length : 0);
    console.log("Data:", JSON.stringify(data, null, 2));
  }
}

testQuery();
