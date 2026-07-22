# Verification Loop

Use this loop after making changes. Verification is complete only when the evidence exercises the behavior that changed; a successful typecheck alone is not evidence for a cross-process or UI behavior.

## Choose the verification depth

Start narrow, then move outward until the changed behavior has been observed:

1. Run formatting, typechecking, and the nearest unit tests.
2. Run package integration tests when persistence, processes, or adapters changed.
3. Run the full local stack for changes that cross the database, signaling server, controller, worker, agent runtime, or browser.
4. Use deployment and CI tools only when the failure is remote or cannot be reproduced locally.

Do not run the full stack for documentation-only changes. Do not claim an E2E pass unless the browser/controller, server, and worker were connected and the changed user flow was exercised.

## Preferred: managed E2E harness

The harness under `tests/e2e/` is the repeatable default. It:

- uses a Neon database from `DATABASE_URL`;
- pushes the schema when needed;
- starts the signaling server on `127.0.0.1:8787`;
- starts the web controller on `127.0.0.1:5173` when required;
- creates a unique email/password account;
- completes the real CLI device authorization flow;
- starts a worker with an isolated `CYRUS_HOME`; and
- stops processes and removes temporary auth files afterward.

Authenticate Neon and select the existing `test` branch for E2E (not `dev` or `production`):

```sh
neonctl me
neonctl branches get test
export DATABASE_URL="$(neonctl connection-string test --pooled)"
```

If the repository is not linked to the correct Neon project, use `neonctl link` first. Never guess a project id and never point verification at a production branch.

Run the full suite from the repository root:

```sh
DATABASE_URL="$DATABASE_URL" bun db:push
DATABASE_URL="$DATABASE_URL" bun test:e2e
```

For a faster tracer bullet, run only the nearest scenario from the repository root:

```sh
DATABASE_URL="$DATABASE_URL" NODE_ENV=testing \
  vitest run --root tests/e2e scenarios/<scenario>.test.ts
```

The canonical programmatic authentication flow is implemented in `tests/e2e/harness/auth.ts`. Reuse it instead of inventing test-only auth bypasses.

## Manual full-stack loop

Use the manual loop when developing interactively or diagnosing a failing E2E scenario. Start each long-running process in its own terminal and preserve its logs.

### 1. Neon database

Use the shared development branch:

```sh
neonctl branches get dev
export DATABASE_URL="$(neonctl connection-string dev --pooled)"
DATABASE_URL="$DATABASE_URL" bun db:push
```

Useful database probes:

```sh
neonctl psql dev
neonctl operations list
```

`neonctl branches schema-diff <branch> ^parent` only works when that branch has a parent. The shared `dev` branch currently has no parent, so use a branch that does (for example `neonctl branches schema-diff test ^parent`) or compare two named branches explicitly.

Use unique test users and records so concurrent verification sessions do not collide. Do not reset or delete the `dev` branch as part of verification.

### 2. Signaling server

The server is the Cloudflare Worker in `apps/server/`. Local Wrangler loads bindings from the repo-root `.dev.vars` symlink (→ `apps/server/.env`). Put the variables from `apps/server/.env.example` there. Shell exports alone do not configure the Worker; edit that file (or pass Wrangler `--env-file`).

For local email/password auth, `NODE_ENV` must not be `production`. Use `development` for interactive manual work; use `testing` when matching the E2E harness.

At minimum, local URLs in `apps/server/.env` must agree with the web controller:

```sh
# apps/server/.env (also used via .dev.vars)
DATABASE_URL=<neonctl connection-string for the branch you intend>
NODE_ENV=development
PRODUCTION_URL=http://localhost:5173
WEB_APP_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Set the remaining Better Auth and OAuth variables from `apps/server/.env.example`; local placeholder OAuth values are sufficient when the email/password test flow is used.

Then start the server from the repository root:

```sh
bun dev:server
```

Wrangler listens on port `8787` by default. Wait for readiness:

```sh
curl -fsS http://localhost:8787/health
```

The response must be HTTP 200 with `{"ok":true}`. A 503 is usually a database configuration or schema problem.

### 3. Web controller

The controller is in `apps/web/`. Ensure `apps/web/.env` has `VITE_SERVER_URL=http://localhost:8787` (or export the same value). From the repository root:

```sh
bun dev:web
```

Vite should serve `http://localhost:5173`. Confirm it responds before continuing:

```sh
curl -fsSI http://localhost:5173
```

### 4. Authentication and worker

Use a unique address such as `verify-<uuid>@cyrus.test` and a test-only password. Email/password auth is enabled by the local/test server. The exact sign-up, sign-in, device-code claim, approval, and token exchange sequence lives in `tests/e2e/harness/auth.ts`.

For manual CLI verification, isolate worker state:

```sh
cd apps/cli
export CYRUS_HOME="$(mktemp -d -t cyrus-verify-XXXXXX)"
export CLI_PUBLIC_SERVER_URL=http://localhost:8787
bun dev login
```

Open the printed device URL in an authenticated browser and approve the code. The visible device page offers GitHub sign-in. For an email/password test account, use the canonical harness flow described above; it creates the account, establishes the session, claims the device code, and approves it without adding a test-only product path. Then verify and prepare an agent:

```sh
bun dev whoami --email
bun dev agents registry sync
bun dev agents registry
bun dev agents add <registry-id>
bun dev agents doctor --name <registry-id>
```

Start the worker in the foreground so failures stay visible:

```sh
bun dev start
```

Readiness is the log line `connected — waiting for message…`. For a background worker, use `bun dev start --bg`, `bun dev status`, and `bun dev stop`.

### 5. Exercise the browser flow

Use a named Playwright CLI session so subsequent commands share cookies and state:

```sh
playwright-cli -s=cyrus-verify open http://localhost:5173
playwright-cli -s=cyrus-verify snapshot
```

Use snapshot element references with `click`, `fill`, `type`, and `select`. Exercise the actual changed flow, including its failure or retry path when relevant. Collect evidence:

```sh
playwright-cli -s=cyrus-verify console error
playwright-cli -s=cyrus-verify network
playwright-cli -s=cyrus-verify screenshot
playwright-cli -s=cyrus-verify tracing-start
# reproduce the flow
playwright-cli -s=cyrus-verify tracing-stop
```

Do not rely on DOM evaluation when the same behavior can be exercised through visible controls. Close the session when done:

```sh
playwright-cli -s=cyrus-verify close
```

## What to verify end to end

For the changed behavior, check all applicable observations:

- the server health check remains green;
- the controller signs in and discovers the worker;
- the worker reports connected and does not emit unhandled errors;
- requests and responses use the expected control-link operation;
- database state is created or updated exactly once;
- user-visible loading, success, empty, error, and retry states are correct;
- refresh/reconnect behavior preserves durable state;
- abandoned or failed operations leave no leaked sessions, processes, rows, or worktrees; and
- browser console and network logs contain no unexpected failures.

Prefer assertions through public seams: controller RPCs, persisted conversation state, worker logs, and visible browser behavior.

## Remote diagnosis and triage

These tools are escalation paths, not substitutes for local reproduction.

### Vercel web deployments

```sh
vercel whoami
vercel ls
vercel inspect <deployment-url-or-id>
vercel logs <deployment-url>
```

Use these for deployed web build failures, runtime logs, environment mismatch, and deployment metadata.

### Cloudflare signaling server

```sh
wrangler whoami
wrangler deployments list --config wrangler.json
wrangler tail cyrus --config wrangler.json
```

Use these for Worker deployment state, exceptions, Durable Object behavior, and live signaling logs. Do not deploy or rollback unless the task explicitly authorizes it.

### GitHub Actions

```sh
gh pr checks <pr-number>
gh run list --limit 20
gh run view <run-id> --log-failed
gh run watch <run-id>
```

Inspect the first failing job and its logs before rerunning anything. Do not rerun or cancel workflows unless requested.

### Neon

```sh
neonctl branches get dev
neonctl operations list
neonctl psql dev
```

Use Neon inspection for schema drift, failed operations, or data-level root cause analysis. Avoid destructive branch operations during verification.

## Cleanup and evidence

Stop only processes started by the verification session. Prefer graceful shutdown (`Ctrl-C`, `bun dev stop`, `playwright-cli close`) over broad `pkill` commands. Remove temporary `CYRUS_HOME`, cookie jars, traces, screenshots, and test files that are not intended artifacts.

Before reporting completion, record:

- commands run and whether they passed;
- the scenario or visible flow exercised;
- relevant server/worker/browser evidence;
- anything intentionally not run and why; and
- any remaining failure with the earliest useful error, not only its final symptom.
