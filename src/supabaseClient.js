import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pomoilhvftehqicjnech.supabase.co";
const supabasePublishableKey = "sb_publishable_Eu3QcHfdla6Hg4j5AvqfJQ_S8WmFyfU";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
