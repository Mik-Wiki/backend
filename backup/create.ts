import { supabaseClient } from "https://deno.land/x/supabase_deno@v1.0.5/mod.ts";

var SB_URL = Deno.env.get("SB_URL");
if (!SB_URL) {
	SB_URL = Deno.args[0];
}

var SB_TOKEN = Deno.env.get("SB_TOKEN");
if (!SB_TOKEN) {
	SB_TOKEN = Deno.args[1];
}

console.log(SB_URL, SB_TOKEN);

var sb = new supabaseClient(SB_URL, SB_TOKEN);

var tables = ["mikki_pages", "mikki_changes", "mikki_accounts"];

var backup: any = {};

for (let i of tables) {
	backup[i] = await sb.tables().get(i).items().all();
}

Deno.writeTextFileSync("backup.json", JSON.stringify(backup, null, "\t"));
