## Cloudflare Artifacts remote

[Cloudflare Artifacts](https://developers.cloudflare.com/artifacts/) is a git-compatible object storage remote. It's a good choice if you don't want to use GitHub — your vault data stays on Cloudflare's infrastructure and never touches GitHub.

### Prerequisites

* A [Cloudflare account](https://dash.cloudflare.com/sign-up) on the **Workers Paid** plan (required for Artifacts)
* Either `wrangler login` (the CLI runs it for you and requests `artifacts:write`), or `CLOUDFLARE_API_TOKEN` set to an [API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) with **Artifacts › Read** and **Artifacts › Edit**
* If your login can see more than one account, set `CLOUDFLARE_ACCOUNT_ID` (or pick it when prompted)
* `wrangler` CLI — if not installed, the setup wizard falls back to `npx wrangler` automatically

### Setup (automatic)

When you run `npx claude-second-brain` and select **Cloudflare Artifacts** as your remote, the CLI handles everything:

1. Checks wrangler auth (logs you in and requests the `artifacts:write` scope if needed)
2. Resolves your account ID and creates a new Artifacts repo via the [Artifacts REST API](https://developers.cloudflare.com/artifacts/api/rest-api/) (`api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/artifacts/…`)
3. Runs `git remote add origin <remote-url>`
4. Pushes the initial commit
5. Prints a short-lived repo token — **save it**

### Saving your repo token

After setup, the CLI prints a repo token:

```
Save your Artifacts repo token — it expires and you'll need to mint a new one:
  <token>
```

This token is used as the git credential for push and pull. It expires (default TTL: 24 hours). Save it somewhere — you'll need to mint a replacement when it expires.

### Pushing and pulling after setup

Repo tokens expire, so mint a fresh one before each push/pull session:

```bash
# 1. Get your wrangler OAuth token
TOKEN=$(wrangler auth token)

# 2. Mint a new repo token (replace 'my-brain' and 'default' with your repo and namespace)
# (your account ID is the subdomain of the remote: git remote get-url origin)
curl -X POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/artifacts/namespaces/default/tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repo":"my-brain","scope":"write","ttl":86400}'
```

The response contains the token in `result.plaintext`. Use it as a git credential:

```bash
git -c http.extraHeader="Authorization: Bearer <token>" push origin main
git -c http.extraHeader="Authorization: Bearer <token>" pull origin main
```

### Namespace

During setup, the CLI asks for an **Artifacts namespace** (default: `default`). Namespaces scope repos within your Cloudflare account — useful if you manage multiple projects. For personal use, the default is fine.

### If setup fails

If the repo can't be created or the first push fails, the CLI still creates the brain locally but says so in a warning, lists the fix in **Next steps**, and exits non-zero. A `403` / `Authentication error` usually means Artifacts isn't enabled on the account (Workers Paid plan), the token is missing the Artifacts permission, or `CLOUDFLARE_ACCOUNT_ID` points at another account. Fix it, then `csb rm <name>` and re-run, or add any other git remote by hand.
