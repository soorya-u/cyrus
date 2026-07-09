## Why

`@cyrus/connections` bundles Zod wire schemas with WebRTC/ORPC runtime code. Packages that only need types (`@cyrus/database`, `@cyrus/utils`) still pull `node-datachannel`, PartySocket, and ORPC client dependencies. This creates unnecessary transitive weight and risks a future `connections → utils` cycle. View schemas already moved to `@cyrus/schemas/view`; wire schemas should follow.

## What Changes

- Move `shared/connections/src/schemas/**` → `shared/schemas/src/rtc/**` and `shared/schemas/src/signaling.ts`
- Add `@cyrus/schemas` package exports for `./rtc/*`, `./signaling`, and new enum modules
- Extract shared enums from `rtc/chat.ts` into `shared/schemas/src/enums/` (`plan.ts`, `permissions.ts`)
- Update ORPC contracts and all consumer imports to `@cyrus/schemas/...`
- Remove `shared/connections/src/schemas/` entirely — no compatibility re-exports
- Drop `@cyrus/connections` from `@cyrus/database` and `@cyrus/utils` package dependencies

## Capabilities

### New Capabilities

- `wire-schemas`: Zod wire/ORPC contract schemas and shared enums live in `@cyrus/schemas` as a zod-only leaf package; `@cyrus/connections` retains runtime only

### Modified Capabilities

- `conversation-view`: Wire schema import paths change from `@cyrus/connections` to `@cyrus/schemas/rtc/*`

## Non-goals

- Changing schema shapes or ORPC contract definitions
- Moving `fold()` out of `@cyrus/utils`
- `forms/` UI validation schemas (future scope)
- Server-side conversation projection endpoints
- Compatibility re-exports from `@cyrus/connections`

## Impact

- `shared/schemas` — new `rtc/`, `signaling.ts`, `enums/plan.ts`, `enums/permissions.ts`; updated `package.json` exports
- `shared/connections` — delete `src/schemas/`; contracts and rtc modules import from `@cyrus/schemas`
- `shared/database`, `shared/utils` — import path updates; drop `@cyrus/connections` dependency
- `apps/web`, `apps/cli`, `apps/server` — import path updates (~21 files)
- Closes GitHub issue #19; continues architectural direction from #10
