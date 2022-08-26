import { Router } from "https://deno.land/x/simple_router@0.8/router.ts";
import { accounts_table, changelog_table, pages_table } from "./index.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";

const ri: ResponseInit = {
	headers: {
		"Access-Control-Allow-Origin": "*",
	},
};

async function page_list_handler(req: Request): Promise<Response> {
	return new Response(
		JSON.stringify(
			(await pages_table.items().all() as any[]).map((e) => {
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

	if (!url.searchParams.has("page_id")) {
		return new Response("Missing page_id!", ri);
	}

	var entry = (await pages_table.items().get("id", url.searchParams.get("page_id") as string))[0];

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
	function compare(a: any, b: any) {
		if (a.when < b.when) {
			return -1;
		}
		if (a.when > b.when) {
			return 1;
		}
		return 0;
	}
	return new Response(JSON.stringify((await changelog_table.items().all() as any[]).sort(compare), null, 4), ri);
}

async function changelog_log(action: string) {
	return changelog_table.items().add({
		when: new Date().getTime(),
		what: action,
	});
}

async function account_create(req: Request): Promise<Response> {
	var json = await req.json() as {
		password: string;
		username: string;
	};

	var hash = bcrypt.hashSync(json.password);
	var token = String(Math.floor(Math.random() * 10000000000000));

	var user = {
		username: json.username,
		password_hash: hash,
		token: token,
		editor: false,
	};

	if ((await accounts_table.items().get("username", user.username) as any[]).length != 0) {
		throw new Error("User already exsists!");
	}

	await accounts_table.items().add(user);

	return new Response(
		JSON.stringify({
			token: token,
		}),
		ri,
	);
}

async function account_check(req: Request): Promise<Response> {
	var token = await req.text();

	if ((await accounts_table.items().get("token", token) as any[]).length != 0) {
		return new Response(JSON.stringify(true), ri);
	} else {
		return new Response(JSON.stringify(false), ri);
	}
}

async function account_login(req: Request): Promise<Response> {
	var json = await req.json() as {
		password: string;
		username: string;
	};

	var user = (await accounts_table.items().get("username", json.username))[0] as {
		username: string;
		password_hash: string;
		token: string;
		editor: string;
	};

	if (!user) {
		throw new Error("User not found!");
	}

	if (!bcrypt.compareSync(json.password, user.password_hash)) {
		throw new Error("Invalid password!");
	}

	return new Response(
		JSON.stringify({
			token: user.token,
		}),
		ri,
	);
}

async function is_editor(token: string) {
	var user = (await accounts_table.items().get("token", token))[0] as {
		username: string;
		password_hash: string;
		token: string;
		editor: string;
	};

	if (!user) {
		throw new Error("Invalid token!");
	}

	return user.editor;
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

	var meta = {
		page_created: new Date().getTime(),
		page_edited: new Date().getTime(),
		page_title: page_title,
	};

	var id = String(Math.floor(Math.random() * 10000000000000));

	await pages_table.items().add({
		id: id,
		text: page_text,
		meta: meta,
	});

	await changelog_log(`Page ${page_title} created!`);

	return new Response(
		encodeURIComponent(JSON.stringify(
			{
				...meta,
				...{
					page_text: page_text,
					page_id: id,
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

	var page = (await pages_table.items().get("id", page_id))[0];

	await changelog_log(`Page ${page.meta.page_title} deleted!`);

	await pages_table.items().delete("id", page_id);

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
