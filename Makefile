include secrets.mak

fmt:
	deno fmt --options-use-tabs --options-line-width 1000

deploy:
	cd backend; deployctl deploy --project=mikki --token=$(DEPLOY_TOKEN) --prod ./index.ts

run:
	cd backend; sudo deno run -A index.ts $(SB_URL) $(SB_TOKEN)

create-backup:
	cd backup; deno run -A create.ts $(SB_URL) $(SB_TOKEN)
