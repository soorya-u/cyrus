# Agents are external ACP subprocesses resolved from the ACP registry

_Decided 2026-07-02, revised 2026-07-11._

The worker is an ACP (Agent Client Protocol) client speaking stdio JSON-RPC to agent subprocesses it spawns but never installs or manages as packages — the LSP model: the host knows how to run tools, users own them. Agent identity is the ACP registry id; `~/.cyrus/agents.yml` stores metadata only (`registryId`, `name`, `icon`), never spawn recipes, and spawn commands (npx / uvx / binary download) are resolved natively in TypeScript from the cached registry at spawn time.

## Considered options

- Importing each agent's SDK directly — rejected: N SDKs, N auth flows, N event shapes in the worker.
- A `~/.cyrus` bun project with package-managed providers, or a `cyrusd agents install` command — rejected: fights compiled-binary distribution and duplicates the registry's job.
- User-supplied `--cmd`/`--args` spawn recipes (the original `providers.yml`) — superseded: recipes stored at add time drift from registry updates.
- Shelling out to (or FFI-embedding) the `acpr` helper for resolution — rejected in the shipped implementation in favor of native TS resolution in `core/registry`.
