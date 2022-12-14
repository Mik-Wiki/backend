import { create, ErrorMode, set_logger } from "https://deno.land/x/simple_router@0.8/mod.ts";
import { serve } from "https://deno.land/std@0.152.0/http/mod.ts";
import { init_routes } from "./routes.ts";
import { MikkiClient } from "https://deno.land/x/mikki@0.14/mod.ts";

var SB_URL = Deno.env.get("SB_URL");
if (!SB_URL) {
	SB_URL = Deno.args[0];
}

var SB_TOKEN = Deno.env.get("SB_TOKEN");
if (!SB_TOKEN) {
	SB_TOKEN = Deno.args[1];
}

export var client = new MikkiClient(SB_URL, SB_TOKEN);

async function main() {
	set_logger({
		logger: console.log,
	});

	const { router, reqHandler } = create(ErrorMode.ERROR_JSON);

	init_routes(router);

	serve(reqHandler, {
		port: 80,
		onListen: (params) => {
			console.log("Listening on " + params.hostname + ":" + params.port);
		},
	});
}

main();
