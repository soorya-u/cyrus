## Project

Cyrus is a cross-platform app for controlling AI coding agents (Claude Code, Codex, and others) that run across a user's own devices — desktop, mobile, web, laptops, and servers.

## Coding Criterias

- This Project is still in development, so no backward compatibility is required.
- This project highly values "error as values" than exceptions. So always prefer "`better-result` library to get error as values.

## Agent skills

### Issue tracker

Issues are tracked as GitHub Issues on `soorya-u/cyrus` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
