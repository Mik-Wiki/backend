import { Router } from "https://deno.land/x/simple_router@0.8/router.ts";
import { accounts_table, changelog_table, client, pages_table } from "./index.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { MikkiAccountOptions } from "https://deno.land/x/mikki@0.11/mod.ts";

const ri: ResponseInit = {
	headers: {
		"Access-Control-Allow-Origin": "*",
	},
};

async function page_list_handler(req: Request): Promise<Response> {
	return new Response(
		JSON.stringify(
			(await client.pages()).map((e: any) => {
				e.meta.page_id = e.id;
				return e.meta;
			}),
			null,
			4,
		),
		ri,
	);
}

async function page_get_handler(req: Request): Promise<Response> {
	var url = new URL(req.url);
	if (url.searchParams.has("download")) {
		return not_implemented_handler(req);
	}

	var entry = (await client.page(url.searchParams.get("page_id") as string));
	if (!entry) {
		throw new Error("Not found!");
	}

	return new Response(
		encodeURIComponent(JSON.stringify(
			{
				...entry.meta,
				...{
					page_text: entry.text,
					page_id: entry.id,
				},
			},
			null,
			4,
		)),
		ri,
	);
}

async function page_changelog_handler(req: Request): Promise<Response> {
	return new Response(JSON.stringify(await client.changes(), null, 4), ri);
}

async function account_create(req: Request): Promise<Response> {
	var json = await req.json() as MikkiAccountOptions;

	var account = await client.account_create(json);

	return new Response(
		JSON.stringify({
			token: account.token,
		}),
		ri,
	);
}

async function account_check(req: Request): Promise<Response> {
	var token = await req.text();

	if (await client.account_get_token(token)) {
		return new Response(JSON.stringify(true), ri);
	} else {
		return new Response(JSON.stringify(false), ri);
	}
}

async function account_login(req: Request): Promise<Response> {
	var json = await req.json() as MikkiAccountOptions;

	var account = await client.account_check(json);

	return new Response(
		JSON.stringify({
			token: account.token,
		}),
		ri,
	);
}

async function is_editor(token: string) {
	var account = await client.account_get_token(token);

	if (!account) {
		throw new Error("Invalid token!");
	}

	return account.editor;
}

async function page_create_handler(req: Request): Promise<Response> {
	var url = new URL(req.url);

	var page_text = decodeURIComponent(atob(await req.text()));
	var page_title = decodeURIComponent(atob(url.searchParams.get("page_title") as string));
	var token = url.searchParams.get("token");
	if (!token) {
		throw new Error("Missing token!");
	}

	if (!(await is_editor(token))) {
		throw new Error("You cant edit this!");
	}

	var page = await client.page_create(page_title, page_text);

	return new Response(
		encodeURIComponent(JSON.stringify(
			{
				...page.meta,
				...{
					page_text: page_text,
					page_id: page.id,
				},
			},
			null,
			4,
		)),
		ri,
	);
}

async function page_delete_handler(req: Request): Promise<Response> {
	var url = new URL(req.url);

	var page_id = url.searchParams.get("page_id") as string;
	var token = url.searchParams.get("token");
	if (!token) {
		throw new Error("Missing token!");
	}

	if (!(await is_editor(token))) {
		throw new Error("You cant edit this!");
	}

	await client.page_delete(page_id);

	return new Response(
		JSON.stringify(
			{
				success: true,
			},
			null,
			4,
		),
		ri,
	);
}

async function not_implemented_handler(req: Request): Promise<Response> {
	throw new Error("Not implemented!");
}

export function init_routes(router: Router) {
	router.add("/", not_implemented_handler, "GET");

	router.add("/api/v2/wiki/page/create", page_create_handler, "POST");
	router.add("/api/v2/wiki/page/edit", not_implemented_handler, "POST");
	router.add("/api/v2/wiki/page/delete", page_delete_handler, "GET");

	router.add("/api/v2/wiki/page/get", page_get_handler, "GET");
	router.add("/api/v2/wiki/page/list", page_list_handler, "GET");
	router.add("/api/v2/wiki/page/changelog", page_changelog_handler, "GET");

	router.add("/api/v2/acc/create", account_create, "POST");
	router.add("/api/v2/acc/login", account_login, "POST");
	router.add("/api/v2/acc/check", account_check, "POST");
}
