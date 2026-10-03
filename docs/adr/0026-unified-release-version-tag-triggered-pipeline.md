# One release version for server, web and CLI, shipped by a tag-triggered pipeline

_Decided 2026-10-02._

Until now `main` deployed the server to Cloudflare through `deploy.yml` (now `release.yml`), Vercel's Git integration deployed the web app on every push, the CLI had no distribution at all, and every package was `0.0.0`. We replaced that with one **Release**: a single **release version** (the root `package.json` `version`, removed from every other package) shared by the server, the web app and the CLI, shipped only by pushing a `v*` tag. The flow mirrors `soorya-u/dotagents`: a manually dispatched `release-prep` workflow opens a `bot/release-vX.Y.Z` PR bumping the root version; merging it makes `release-tag` cut the annotated tag and explicitly dispatch the release workflow (a tag pushed with `GITHUB_TOKEN` would not trigger it); the release workflow then runs. Release notes are GitHub's generated "What's Changed" list from PR titles, which fits this repo's plain squash-merge titles — conventional commits (release-please) and per-PR change files (changesets) were rejected as too invasive a change for contributors.

Pipeline order is chosen so everything that can fail does so before the first irreversible step: `preflight` (tag equals root version, lint/types/tests) → build the CLI on five native runners into a **draft** GitHub Release → e2e smoke on the linux-x64 asset → `deploy-server` (D1 migrations, Worker, smoke — the only step with irreversible state) → publish the release (draft → latest) → `publish-npm` → `deploy-web` (`vercel deploy --prod`, Vercel builds it; rollback is one command). A failure before `deploy-server` deletes the draft and the tag; after it nothing is auto-deleted and a human rolls forward. The release stays a draft until its assets and checksums are complete because `releases/latest` feeds the installers and `cyrusd upgrade`.

A **prerelease** tag (version containing `-`) runs only the CLI half — no `deploy-server`, no `deploy-web` — so release candidates, including the first run of this untested pipeline, never migrate production. The Vercel Git integration for `main` is switched off in `vercel.json`, making the pipeline the only path to production for the web app.

## Considered options

- Independent per-app versions and path-filtered pipelines — rejected: the apps share `@cyrus/schemas` and the same wire contracts, so one version gives one answer to "what is compatible with what".
- The release workflow commits the bump and tag directly — rejected: a failed push can leave tag and `main` out of sync, and it breaks the day `main` is protected.
- Public release first, cleanup job as safety net (the `dotagents` order) — rejected: installers resolving `latest` would 404 on a half-uploaded release.

## Consequences

- Server and web update the moment a release ships, while installed workers lag until their user runs `cyrusd upgrade`; ADR 0028 makes that skew explicit and enforceable. Server migrations must stay expand/contract.
- Desktop and mobile are out of scope; their own version declarations (`electrobun.config.ts`, `app.json`) are untouched. If they diverge from the root version, ADR 0028's comparison would use the wrong number.
- Setup that cannot live in the repo: `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` secrets, the existing Cloudflare secrets, and a one-time manual first publish of the npm packages before OIDC trusted publishing can be configured.
- PRs opened by `GITHUB_TOKEN` do not run CI, so the release PR is merged without a CI run on it.
