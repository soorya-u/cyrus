# better-result in Cyrus

Cyrus treats errors as values, not control flow. We use [better-result](https://better-result.dev) (`^2.9.2`) everywhere a function can fail in a recoverable way. Domain errors live in `@cyrus/errors` as `TaggedError` classes; callers return `Result<T, E>` and propagate with guards, chaining, or generators.

This guide is Cyrus-specific. For the full upstream API, see [better-result.dev](https://better-result.dev).

---

## What the library exports

| Export | Role |
| --- | --- |
| `Result` | Namespace: constructors, guards, combinators, `gen`, `try`, `tryPromise` |
| `Ok`, `Err` | The two result variants (`status: "ok" \| "error"`) |
| `TaggedError` | Factory for tagged error classes (`_tag` discriminant) |
| `isTaggedError` | Type guard for any tagged error |
| `matchError`, `matchErrorPartial` | Exhaustive / partial dispatch on `_tag` |
| `UnhandledException` | Default error when `try` / `tryPromise` catch without a custom handler |
| `Panic`, `isPanic`, `panic` | Unrecoverable defects (callback threw inside Result ops) |
| `ResultDeserializationError` | Invalid input to `deserialize` |
| `InferOk`, `InferErr` | Extract success / error types from a `Result` |
| `SerializedResult`, `SerializedOk`, `SerializedErr` | Plain-object shapes for RPC serialization |

Instance methods exist on both `Ok` and `Err`: `isOk`, `isErr`, `map`, `mapError`, `andThen`, `andThenAsync`, `tryRecover`, `tryRecoverAsync`, `match`, `unwrap`, `unwrapOr`, `tap`, `tapAsync`, `tapError`, `tapErrorAsync`, `tapBoth`, `tapBothAsync`.

---

## Cyrus conventions

### Domain errors: `TaggedError` in `@cyrus/errors`

Every module defines tagged errors with a namespaced `_tag` (`repository.not_found`, `coordinator.agent_locked`, …) and optional `orpcCode` for API boundaries.

```ts
import { TaggedError } from "better-result";
import { errorModules, errorTag } from "./common";

const tags = {
  notFound: errorTag(errorModules.repository, "not_found"),
} as const;

export class RepositoryNotFoundError extends TaggedError(tags.notFound)<{
  entity: string;
  id: string;
}>() {
  get message() {
    return `${this.entity} not found: ${this.id}`;
  }
  get orpcCode() {
    return "NOT_FOUND" as const;
  }
}
```

Helpers like `isModuleError`, `isRepositoryError`, and factory functions (`notFound`, `coordinatorNotFound`, …) keep call sites small. Prefer these over raw strings or untyped `Error`.

### Repository layer: `repo()` wrapper

`shared/database/src/utils/repo.ts` is the canonical pattern for DB code:

```ts
return Result.tryPromise({
  try: fn,
  catch: fromRepoFailure, // maps Drizzle/Zod/unknown → RepositoryError
}).then((result) =>
  result.tapError((error) => log.error({ kind: "repository_error", tag: error._tag, error }))
);
```

Always use the `{ try, catch }` form when you know the failure domain. The bare `Result.tryPromise(fn)` form yields `UnhandledException`, which is only appropriate at leaf boundaries (process checks, clipboard, etc.).

### Coordinator / service layer: manual propagation (today)

`ThreadCoordinator` and similar code propagate with early returns:

```ts
const thread = await getThread(threadId);
if (thread.isErr()) return Result.err(coordinatorRepositoryError(thread.error));
if (!thread.value) return Result.err(coordinatorNotFound("thread", threadId));

const cwd = await this.resolveCwd(threadId);
if (cwd.isErr()) return Result.err(cwd.error);
```

This works and is explicit. It becomes noisy when many steps chain together — see **Result.gen** below.

### Leaf boundaries: `Result.try` / `Result.tryPromise`

Use at the edge where exceptions are expected:

```ts
// Sync: process alive check, git peel, JSON in tests
Result.try(() => process.kill(pid, 0)).isOk();

// Async: file I/O, network, agent runtime
await Result.tryPromise(() => openRepository(cwd));
```

Map foreign failures into domain errors with `.mapError()` or a custom `catch` handler.

### UI / hooks (outside TanStack Query)

When you are not inside a TanStack `queryFn` / `mutationFn`, keep errors as values:

```ts
result.match({
  ok: (value) => setState(value),
  err: (error) => setError(error),
});
```

Do not casually `.unwrap()` in app code — it throws and breaks the errors-as-values model. The two intentional throw boundaries are below.

---

## Boundaries where you must throw

Errors-as-values stop at two edges. Inside domain and service code, return `Result`. At these boundaries, convert to a thrown error so the surrounding framework can do its job.

### 1. oRPC handlers — translate better-result errors via `throwOrpc` / `orpcOk`

CLI controller handlers (`apps/cli/src/handlers/**`) sit on the oRPC boundary. Never return a `Result` (or leave a `TaggedError` unhandled) from a handler. Map every `Err` into an `ORPCError` with `throwOrpc` / `orpcOk` so clients get a typed oRPC failure (`orpcCode` + message).

```ts
import { orpcOk, throwOrpc } from "@cyrus/errors/orpc";

// Prefer orpcOk when the handler is one Result → payload
listThreads: os.listThreads.handler(async ({ input }) => ({
  threads: orpcOk(await listThreads(input.projectId)),
})),

// Or early throw when steps continue after success
const created = orpcOk(await createStoredThread(input.projectId, opts));
return { thread: created };
```

`throwOrpc` / `orpcOk` live in `@cyrus/errors/orpc` and require the error to expose `message` + `orpcCode` (our `TaggedError` classes do). Keep them out of repositories, coordinators, and git helpers — only handlers (and similar RPC entrypoints) throw.

### 2. TanStack Query — throw so retries and `onError` work

In web, mobile, and shared hooks, `queryFn` / `mutationFn` must **reject** (throw) on failure. TanStack Query only retries and fires `onError` for thrown/rejected errors. Returning `Result.err(...)` looks like a successful query with a weird value — no retry, no `onError`, broken `isError` state.

```ts
// queryFn / mutationFn
const result = await someOperation();
if (result.isErr()) throw result.error; // or result.unwrap()
return result.value;
```

Callers can still use `onError` / `isError` / retry config as usual:

```ts
useMutation({
  mutationFn: async (input) => {
    const result = await createThread(input);
    if (result.isErr()) throw result.error;
    return result.value;
  },
  onError: (error) => toast.error(error.message),
  retry: 2,
});
```

Keep `Result` inside the operation; throw only at the Query boundary.

---

## Feature guide (what to use)

### Essential — use daily

| Feature | Use when |
| --- | --- |
| `Result.ok` / `Result.err` | Returning success or a known domain error |
| `Result.isOk` / `Result.isError` (or `.isOk()` / `.isErr()`) | Branching at boundaries |
| `Result.try` / `Result.tryPromise` | Wrapping throwing or rejecting code |
| `Result.tryPromise({ try, catch })` | You know how to map failures (repositories, git, auth) |
| `.mapError(fn)` | Lift `UnhandledException` or lower-layer errors into your module's error type |
| `TaggedError` + `isTaggedError` / `SomeError.is` | Typed, exhaustive domain errors |
| `.tapError` / `.tapBoth` | Logging and tracing without changing the result |

### High value — underused in Cyrus

#### `Result.gen` — the biggest win

`Result.gen` looks like syntactic sugar but removes the repetitive `if (x.isErr()) return Result.err(x.error)` pattern and **preserves a union of all yielded error types** in the return signature.

**Sync:**

```ts
const result = Result.gen(function* () {
  const thread = yield* getThread(threadId);       // Result<Thread, RepositoryError>
  if (!thread) yield* coordinatorNotFound("thread", threadId);
  const cwd = yield* resolveCwd(threadId);        // Result<string, CoordinatorError>
  return Result.ok({ thread, cwd });
});
// Result<{ thread, cwd }, RepositoryError | CoordinatorNotFoundError | CoordinatorError>
```

`yield*` works on:

- `Result<T, E>` — short-circuits on `Err`, unwraps `Ok`
- `TaggedError` instances — same as `yield* Result.err(error)`

**Async** (multi-step coordinator / bind flows):

```ts
const result = await Result.gen(async function* () {
  const thread = yield* Result.await(getThread(threadId));
  const cwd = yield* Result.await(resolveCwd(threadId));
  const catalog = yield* Result.await(catalogForSession(...));
  return Result.ok({ thread, cwd, catalog });
});
```

Use `Result.gen` when a function has **3+ dependent steps** that each return `Result`. Keep simple one-off checks as plain `if (r.isErr())`.

To present a single error type at a public API, normalize after the generator:

```ts
}).mapError((e) => coordinatorRepositoryError(
  isRepositoryError(e) ? e : coordinatorRuntimeError(e.message)
));
```

#### `matchError` — handler dispatch

When a handler receives a tagged error union, prefer exhaustive matching over `if` chains:

```ts
import { matchError } from "better-result";

const message = matchError(error, {
  "coordinator.not_found": (e) => `${e.entity} missing`,
  "coordinator.agent_locked": () => "Agent locked",
  "repository.not_found": (e) => `${e.entity} not found`,
});
```

`matchErrorPartial` plus a fallback is fine at HTTP/UI boundaries where you only handle a subset.

#### `.andThen` / `.andThenAsync` — linear pipelines

When each step takes the **success value** and returns another `Result`:

```ts
return openGitRepository(cwd)
  .andThen((repo) => readHead(repo))
  .mapError(mapOpenError);
```

Prefer `andThen` over `map` when the next step can fail. Prefer `Result.gen` when steps mix validation, early tagged errors, and async.

#### `Result.tryPromise` retry config

For transient network failures (RTC connect, partyserver routing):

```ts
await Result.tryPromise({
  try: () => fetchWithTimeout(url),
  catch: (e) => networkError(e),
}, {
  retry: { times: 3, delayMs: 100, backoff: "exponential", shouldRetry: (e) => e._tag === "network.retryable" },
});
```

Enrich the error in `catch` (e.g. rate-limit flags) so `shouldRetry` stays synchronous.

### Useful occasionally

| Feature | Use when |
| --- | --- |
| `.tryRecover` / `.tryRecoverAsync` | Fallback on a specific error while keeping the same success type |
| `Result.partition` | Batch operations: split `Result[]` into `[values[], errors[]]` |
| `Result.flatten` | Nested `Result<Result<T,E>, E2>` |
| `Result.match` (standalone) | Data-last piping style |

### Skip for Cyrus (low value here)

| Feature | Why we skip it |
| --- | --- |
| `Result.serialize` / `Result.deserialize` | oRPC carries errors via `orpcCode` + message on `TaggedError`; we do not ship raw `Result` objects over the wire. Typed handlers use `@cyrus/errors`, not JSON rehydration. |
| `Result.hydrate` | Deprecated alias of `deserialize`. |
| `.unwrap()` deep in domain code | Throws; use `isErr` + return or `match` instead. Exceptions: oRPC handlers (`throwOrpc`) and TanStack `queryFn` / `mutationFn` (see above). |
| Bare `Result.tryPromise(fn)` in domain code | Leaves `UnhandledException` — map with `catch` or `.mapError`. |
| `panic()` | Only for impossible states; domain failures should be `Result.err` or `TaggedError`. |
| Returning `Result` from oRPC handlers | Clients expect `ORPCError`; use `throwOrpc`. |
| Returning `Result.err` from TanStack `queryFn` / `mutationFn` | Query treats it as success; throw so retries / `onError` run. |

---

## Mental model

```
┌─────────────────────────────────────────────────────────┐
│  Leaf (I/O, native, third-party throws)                 │
│  Result.try / Result.tryPromise + catch or .mapError      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Repository (@cyrus/errors/repository)                  │
│  repo() → Result<T, RepositoryError>                    │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Coordinator / CLI / hooks                            │
│  Result.gen or early-return propagation                 │
│  Map to CoordinatorError / GitError / TurnError         │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Throw boundaries (stop returning Result)               │
│  • oRPC handlers → throwOrpc(taggedError)               │
│  • TanStack queryFn/mutationFn → throw error            │
│  Elsewhere in UI: keep Result + .match / guards         │
└─────────────────────────────────────────────────────────┘
```

**Err** = expected, typed, recoverable domain failure.  
**Panic** = bug in a `.map` / `.andThen` / generator callback (fix the code).  
**UnhandledException** = uncaught throw inside `try`/`tryPromise` without a `catch` handler (map it before crossing module boundaries).  
**Throw** = only at oRPC handlers (`throwOrpc`) and TanStack Query entrypoints — not inside domain logic.

---

## Quick reference

```ts
import {
  Result,
  TaggedError,
  isTaggedError,
  matchError,
  UnhandledException,
} from "better-result";

// Create
Result.ok(value);
Result.err(taggedError);
Result.try(() => fn());
Result.try({ try: () => fn(), catch: toDomainError });
await Result.tryPromise({ try: () => promise(), catch: toDomainError });

// Narrow
if (result.isOk()) result.value;
if (result.isErr()) result.error;
Result.isOk(result);
Result.isError(result);

// Transform
result.map((v) => next);
result.mapError((e) => lift(e));
result.andThen((v) => nextStep(v));
await result.andThenAsync(async (v) => nextStep(v));

// Compose (preferred for multi-step)
const r = Result.gen(function* () {
  const a = yield* stepOne();
  const b = yield* stepTwo(a);
  return Result.ok(b);
});

const r = await Result.gen(async function* () {
  const a = yield* Result.await(stepOneAsync());
  return Result.ok(a);
});

// Observe (no transformation)
result.tapError((e) => log.error(e));

// Extract at boundary (non-Query UI)
result.match({ ok: (v) => v, err: (e) => fallback });
result.unwrapOr(default);

// Throw boundaries
if (result.isErr()) throwOrpc(result.error); // oRPC handler
orpcOk(result); // oRPC handler — unwrap or throw
if (result.isErr()) throw result.error; // TanStack queryFn / mutationFn
```

---

## Adding a new error module

1. Add a module key in `src/common.ts` (`errorModules`).
2. Create `src/<module>.ts` with `TaggedError` classes, union type, `is<Module>Error`, and factories. Include `orpcCode` if the error can surface through oRPC.
3. Return `Result<T, YourError>` from functions in that module.
4. At callers, map into parent-module errors (e.g. `RepositoryError` → `CoordinatorRepositoryError`) or use `Result.gen` to collect unions.
5. At oRPC handlers, convert with `orpcOk` / `throwOrpc` — never return `Result` from the handler.
6. At TanStack `queryFn` / `mutationFn`, throw the error so retries and `onError` work on web/mobile.
7. At CLI commands, consume with `unwrapOrExit` / `exitWithError` (`apps/cli/src/utils/result.ts`) — print message, then `process.exit`.

Current modules: `repository`, `coordinator`, `git`, `turn`, `connection` (RTC/signaling), `fs`.

---

## Further reading

- Upstream docs: [better-result.dev](https://better-result.dev)
- Cyrus agent note: `.dotagents/INSTRUCTIONS.md` (prefer errors-as-values)
- Examples in repo: `shared/database/src/utils/repo.ts`, `apps/cli/src/git/open.ts`, `apps/cli/src/core/threads/coordinator.ts`, `apps/cli/src/handlers/controller/threads.ts` (`throwOrpc`), `shared/utils/src/conversations/fold.ts`
