## Context

`@cyrus/connections` currently holds both Zod wire schemas (`src/schemas/rtc/*`, `signaling.ts`) and connection runtime (WebRTC, PartySocket, ORPC client). The prior `consolidate-view-schemas` change moved client-derived view types to `@cyrus/schemas/view` and shared tool enums to `@cyrus/schemas/enums/tools`. Wire schemas remain in connections, forcing schema-only consumers (`database`, `utils`) to depend on the full connections package.

Nine schema files and ~21 external import sites need updating. Internal connections code (contracts, rtc modules) uses relative `../schemas/` imports.

## Goals / Non-Goals

**Goals:**

- `@cyrus/schemas` becomes the zod-only leaf for all shared schema concerns (enums, view, rtc wire, signaling)
- Drop `@cyrus/connections` from `@cyrus/database` and `@cyrus/utils`
- Extract inline enums from `rtc/chat.ts` into `@cyrus/schemas/enums/plan` and `@cyrus/schemas/enums/permissions`
- One-pass migration with no compatibility re-exports

**Non-Goals:**

- Schema shape changes or ORPC contract definition changes
- `forms/` UI validation schemas
- Moving `fold()` out of `@cyrus/utils`
- Extracting `DeviceRoleSchema` from `signaling.ts` (stays local; only used by signaling wire shapes)

## Decisions

### 1. Target package layout

**Decision:** Mirror the issue #19 layout under `shared/schemas/src/`:

```text
enums/
  tools.ts        (existing)
  plan.ts         (new — PlanEntryPriority, PlanEntryStatus)
  permissions.ts  (new — PermissionOptionKind)
view/             (existing)
rtc/              (moved from connections)
  chat.ts, threads.ts, projects.ts, catalog.ts, dir.ts, agents.ts, hello.ts, common.ts
signaling.ts      (moved from connections)
```

**Rationale:** Consistent with view-schema migration pattern. `rtc/` prefix distinguishes wire/ORPC contract shapes from client-derived `view/`.

### 2. Package exports

**Decision:** Extend `@cyrus/schemas/package.json` exports:

```json
"./rtc/*": "./src/rtc/*.ts",
"./signaling": "./src/signaling.ts",
"./enums/*": "./src/enums/*.ts"
```

(`./enums/*` and `./view` already partially exist.)

**Rationale:** Matches existing `./enums/*` glob pattern; consumers import `@cyrus/schemas/rtc/chat` directly.

### 3. Enum file grouping

**Decision:** One topic per enum file, following `enums/tools.ts`:

| File | Schemas |
|------|---------|
| `enums/plan.ts` | `PlanEntryPrioritySchema`, `PlanEntryStatusSchema` |
| `enums/permissions.ts` | `PermissionOptionKindSchema` |

Each file exports `z.infer` types alongside schemas.

**Rationale:** User decision — shared primitives belong in `enums/`, not inline in wire modules. Grouping by domain (plan vs permissions) keeps files small and discoverable.

**Alternatives considered:**
- Single `enums/chat.ts` — rejected; plan and permissions are distinct ACP concerns
- Barrel `enums/index.ts` — rejected; existing pattern uses direct `./enums/*` exports

### 4. No re-exports from connections

**Decision:** Delete `connections/src/schemas/` entirely. No shim exports.

**Rationale:** Re-exports hide the dependency graph and let new code import from the wrong package. Mechanical import rewrite is ~21 files — manageable in one PR.

### 5. Dependency cleanup scope

**Decision:** Remove `@cyrus/connections` from both `@cyrus/database` and `@cyrus/utils`. Add `@cyrus/schemas` to `@cyrus/database` if not already transitive.

**Rationale:** Both packages are schema-only consumers today. Breaking the `utils → connections` edge prevents future cycles if connections runtime needs utils.

### 6. Internal connections imports

**Decision:** Contracts (`controller.ts`, `worker.ts`, `signaling.ts`) and rtc modules (`peer.ts`, `dial.ts`, `session.ts`, `worker/index.ts`) switch from relative `../schemas/` to `@cyrus/schemas/rtc/*` and `@cyrus/schemas/signaling`.

**Rationale:** Consistent import style; connections already depends on `@cyrus/schemas`.

## Risks / Trade-offs

- **[Risk] Missed import sites** → Mitigation: grep for `@cyrus/connections/schemas` and `schemas/rtc` relative paths; `bun check:types` across monorepo
- **[Risk] Database loses transitive zod if utils dep changes** → Mitigation: add `@cyrus/schemas` as direct dep on `@cyrus/database`
- **[Risk] Re-export type aliases in database repos** → Mitigation: update `export type { Project }` re-exports to point at `@cyrus/schemas/rtc/projects`

## Migration Plan

1. Create `enums/plan.ts` and `enums/permissions.ts`; update `package.json` exports
2. Move schema files to `shared/schemas/src/rtc/` and `signaling.ts`
3. Update `rtc/chat.ts` to import enums from `@cyrus/schemas/enums/*`
4. Update connections contracts and rtc internals to import from `@cyrus/schemas`
5. Rewrite all external consumer imports (~21 files)
6. Delete `shared/connections/src/schemas/`
7. Drop `@cyrus/connections` from `database` and `utils` package.json; add `@cyrus/schemas` to `database`
8. Run `bun check:types` and `bun check`

Rollback: revert single PR; no DB or runtime behavior changes.

## Open Questions

- None — scope confirmed with user.
