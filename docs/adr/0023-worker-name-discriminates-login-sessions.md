# Login sessions gain a nullable `workerName` to discriminate workers from controllers

_Decided 2026-08-06._

Better-auth's `session` table is shared by every peer type — browser sign-in, the desktop OAuth webview, the mobile Expo client, and the CLI worker (`cyrusd`) via the OAuth Device Authorization grant — with no way to tell them apart short of guessing from `userAgent`. The device-authorization grant is exclusively how `cyrusd` logs in today (no other peer type uses it), so we add a nullable `workerName` field to `session` via `authOptions.session.additionalFields` (backed by a `worker_name` D1 column, generated through the existing `auth:generate` → `db:generate` pipeline) and treat its presence as the discriminator: absent means a controller session (web/desktop/mobile), present means a worker session, holding that worker's display name. A separate boolean was considered and rejected as redundant — the name itself is both the flag and the label the UI needs.

The CLI pushes its locally-generated name (`getOrCreate("name", generateName)`) to the server via better-auth's built-in `updateSession` endpoint. No custom API route is needed: better-auth's client exposes every registered server route — including core, non-plugin ones — through a dynamic path proxy, and `updateSession` already accepts arbitrary `additionalFields` on the caller's own session, authenticated the same way the CLI's other bearer-token calls already are.

Both write sites — `login()` and `rename()` — treat a failed push as a hard failure of the whole command, not a warning: `login()` must not leave a token stored whose session lacks a synced `workerName`, and `rename()` must not update local config unless the server accepted the new name. This keeps local CLI config and the server's session row strictly in lock-step rather than allowing eventual-consistency drift that would show a stale or missing worker badge in the UI.

The active-sessions UI splits into two sections (Controllers, Workers) filtered on this field, rather than inferring worker-ness heuristically from user-agent parsing — a heuristic would silently break if the CLI's HTTP client's default `User-Agent` ever changed.
