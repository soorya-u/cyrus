# Every peer declares its version when joining the room, and the server enforces a per-role minimum

_Decided 2026-10-02._

With one release version (ADR 0026) and workers that only upgrade when their user runs `cyrusd upgrade` (ADR 0027), server and web routinely run ahead of installed workers, and nothing in the join flow could detect it. `version` is now a field of the signaling declaration — the same `onSignalingEvent` input that already carries `name` and `role` — that **every** peer declares, controllers (web, desktop, mobile) included, so the same mechanism covers future outdated native apps. It rides the declaration rather than the login session (where `workerName` lives, ADR 0023) because it is declared on every connect and so stays correct after an in-place upgrade, and because the declaration is the step that actually joins the room. `DeviceInfo` carries it to the other peers via `peer-joined` and `listPeers`, so a controller can display or compare any peer's version.

`onSignalingEvent` rejects a peer whose declared version is below the **minimum version** for its role with a dedicated `UPGRADE_REQUIRED` error naming the minimum; each client handles it its own way (the CLI prints an upgrade instruction and exits, the web app asks to reload, native apps show the error and the user updates the app). The minimums are a per-role constant in `shared/constants`, bumped by hand in the same PR that introduces a breaking change — a reviewed diff instead of an env var that can drift or name a version that does not exist. Comparison uses major.minor.patch only, so a prerelease CLI (`0.1.0-rc.1`) can still join the production server. Every app declares `RELEASE_VERSION`, which `shared/constants` reads straight from the root `package.json` (through the repo-wide `~` root alias), so a build from source declares the checkout's version with no build-time injection and no special dev case; the minimums start at `0.0.0`, so nothing is gated until a breaking change raises one. A peer built before the handshake omits the field; the schema reads it as `0.0.0`, so such a peer (a worker from an earlier build, or a web tab left open across this release) reaches the minimum check and gets `UPGRADE_REQUIRED` once a minimum is raised, rather than an opaque schema-validation failure. A worker already connected is not kicked when the minimum rises; it is checked on its next connect. `preflight` fails a release whose own version is below either minimum.

## Considered options

- A convention only ("server stays compatible with the previous minor"), handshake as a follow-up — rejected: unenforced compatibility rules drift.
- A `workerVersion` session field next to `workerName` — rejected: stale after any in-place upgrade and not on the join path.
- Minimum as a Worker env var — rejected: still needs a deploy, is not reviewed with the breaking change, and can drift.
- A pairwise rule (this web version needs workers ≥ X) — deferred until a real breaking change needs it.

## Consequences

- Desktop and mobile must send a version now, even though they are outside the release pipeline; they get it from `RELEASE_VERSION` like every other peer. `@cyrus/connections` stays free of `@cyrus/constants` (its import boundary), so each app passes the version into `connectSignaling`.
- The server must still tolerate one generation of older peers between a breaking change and the minimum bump; migrations stay expand/contract.
