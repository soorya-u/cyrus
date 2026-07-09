## 1. Enum modules in @cyrus/schemas

- [x] 1.1 Create `shared/schemas/src/enums/plan.ts` with `PlanEntryPrioritySchema`, `PlanEntryStatusSchema`, and inferred types
- [x] 1.2 Create `shared/schemas/src/enums/permissions.ts` with `PermissionOptionKindSchema` and inferred type
- [x] 1.3 Add `./rtc/*` and `./signaling` exports to `shared/schemas/package.json` (verify `./enums/*` already covers new enum files)

## 2. Move wire schemas to @cyrus/schemas

- [x] 2.1 Move `shared/connections/src/schemas/rtc/*.ts` → `shared/schemas/src/rtc/`
- [x] 2.2 Move `shared/connections/src/schemas/signaling.ts` → `shared/schemas/src/signaling.ts`
- [x] 2.3 Update `rtc/chat.ts` to import plan and permission enums from `@cyrus/schemas/enums/plan` and `@cyrus/schemas/enums/permissions`; remove inline enum definitions
- [x] 2.4 Fix internal cross-imports within `rtc/` modules (e.g. `./common`, `./chat` relative paths)

## 3. Update @cyrus/connections internals

- [x] 3.1 Update `contracts/controller.ts`, `contracts/worker.ts`, `contracts/signaling.ts` to import from `@cyrus/schemas/rtc/*` and `@cyrus/schemas/signaling`
- [x] 3.2 Update `rtc/peer.ts`, `rtc/dial.ts`, `rtc/session.ts`, `rtc/worker/index.ts` to import from `@cyrus/schemas`
- [x] 3.3 Delete `shared/connections/src/schemas/` directory entirely

## 4. Update schema-only consumers

- [x] 4.1 Update `shared/database/src/repositories/{projects,threads,conversations}.ts` imports to `@cyrus/schemas/rtc/*`
- [x] 4.2 Add `@cyrus/schemas` and remove `@cyrus/connections` from `shared/database/package.json`
- [x] 4.3 Update `shared/utils/src/fold.ts` imports to `@cyrus/schemas/rtc/*`
- [x] 4.4 Remove `@cyrus/connections` from `shared/utils/package.json`

## 5. Update app consumers

- [x] 5.1 Update `apps/web` imports (~10 files) from `@cyrus/connections/schemas/*` to `@cyrus/schemas/rtc/*` or `@cyrus/schemas/signaling`
- [x] 5.2 Update `apps/cli` imports (~7 files) to `@cyrus/schemas/rtc/*`
- [x] 5.3 Update `apps/server/src/handlers/signaling.ts` to import from `@cyrus/schemas/signaling`

## 6. Verification

- [x] 6.1 Grep confirms zero remaining `@cyrus/connections/schemas` imports
- [x] 6.2 Run `bun check:types` across monorepo
- [x] 6.3 Run `bun check` (Biome) and fix any lint issues
