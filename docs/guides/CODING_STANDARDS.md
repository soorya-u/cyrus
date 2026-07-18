# Coding Standards

These are the engineering practices Cyrus considers fundamental. They describe properties the codebase should preserve across packages and runtimes.

## Compatibility

- Cyrus is under active development. Do not preserve backward compatibility unless a requirement explicitly asks for it.
- Prefer deleting obsolete paths and types over retaining transitional aliases, fallback branches, or dead abstractions.

## Package-first implementation

- Do not reinvent commodity functionality. Before implementing it, check the existing workspace dependencies and the relevant package ecosystem for a maintained solution.
- Prefer installing and using a focused package when it solves the requirement cleanly and is compatible with Cyrus's runtimes, type-safety expectations, domain model, and errors-as-values approach.
- Implement the capability in Cyrus only when available packages are excessive for the requirement, poorly maintained, unsafe, or force abstractions that do not align with the project's model.
- Keep external packages behind a narrow boundary when their API or data model should not become part of Cyrus's domain contracts.

## End-to-end type safety

- Preserve types across storage, worker, control-link, and controller seams. A caller should not need to reconstruct or guess a value's shape.
- Define wire contracts once in `@cyrus/schemas` and derive TypeScript types from those schemas. Do not maintain parallel DTO types by hand.
- Validate untrusted input at the boundary where it enters Cyrus. Once validated, pass the typed value inward instead of repeatedly parsing or casting it.
- Do not use `any` to bypass a contract. Keep `unknown` at untrusted boundaries only, then narrow it before crossing into domain code.
- Prefer types that make invalid states unrepresentable: discriminated unions, required fields for valid states, and distinct types for distinct concepts.
- When a database, RPC, and UI represent the same field, preserve its semantics end to end rather than adding lossy mapping layers.

## Errors are values

- Return recoverable failures as `Result<T, E>` from `better-result`.
- Use a concrete error type or tagged error union for `E`. Do not expose `unknown` from a module interface. Narrow and map unknown external failures at the boundary where they enter Cyrus.
- Define domain failures as `TaggedError` classes in `@cyrus/errors`. Match on tags; never infer error identity by inspecting message text.
- Do not duck-type `Result` values. Give callbacks an explicit Result contract and use `isOk`, `isErr`, `match`, or combinators directly.
- Throw only at designated adapters: oRPC handlers (`throwOrpc`/`orpcOk`) and TanStack query or mutation entrypoints. UI and domain logic keep errors as values.
- Prefer `Result.gen` for multi-step flows when it makes propagation clearer.
- Follow the detailed Cyrus patterns in `shared/errors/USAGE.md`.

## One source of truth

- Keep one canonical representation for each contract, state, or decision.
- Derive views and convenience values from canonical state instead of storing synchronized copies.
- Reuse shared schemas, operation keys, domain errors, and repository methods; do not recreate equivalent definitions in individual apps.
- When a new model supersedes an old one, migrate callers and delete the old representation rather than supporting both indefinitely.
