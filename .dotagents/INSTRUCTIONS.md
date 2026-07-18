## Project

Cyrus is a cross-platform app for controlling AI coding agents (Claude Code, Codex, and others) that run across a user's own devices — desktop, mobile, web, laptops, and servers.

## Coding standards

Follow the engineering practices in [`docs/guides/CODING_STANDARDS.md`](docs/guides/CODING_STANDARDS.md).
Source-file conventions and naming live in [`docs/guides/STYLE_GUIDE.md`](docs/guides/STYLE_GUIDE.md).
Testing methodology lives in [`docs/guides/TESTING_FRAMEWORK.md`](docs/guides/TESTING_FRAMEWORK.md).
After making changes, follow [`docs/guides/VERIFY_LOOP.md`](docs/guides/VERIFY_LOOP.md) to verify them at the appropriate depth.

## Agent skills

### Issue tracker

Issues are tracked as GitHub Issues on `soorya-u/cyrus` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
