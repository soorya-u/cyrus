## Context

The web chat UI wires real data (#9) but uses first-pass visuals: `WorkLog` wraps tool rows in a "Turn activity" group, `ToolRow` expands to raw JSON, `AssistantLoading` says "Thinking" while also serving as a pre-stream wait indicator, and `ChatFeed` hand-rolls scroll-to-bottom with `ScrollArea`. The composer shows four separate `Select` triggers without agent icons in the trigger.

t3code (`pingdotgg/t3code`) provides the reference: flat `SimpleWorkEntryRow` per tool, `WorkingTimelineRow` with elapsed timer for the whole turn, combined `ProviderModelPicker`, and no outer work-log group header.

shadcn/ui shipped chat primitives (June 2026): `MessageScroller`, `Message`, `Bubble`, `Marker`, plus `shimmer` and `scroll-fade` utilities via `shadcn/tailwind.css`.

## Goals / Non-Goals

**Goals:**

- Match t3code interaction patterns for timeline, composer, and empty states
- Adopt shadcn chat primitives where they replace hand-rolled code
- Three-tier workspace navigation: worker → project → thread, each with a proper empty state
- Segregate "working" (turn-level status) from "thinking" (reasoning content)

**Non-goals:**

- RN/mobile parity
- Turn-fold collapsed history
- shadcn registry `snippet` component (not in new-york-v4 registry)

## Decisions

### 1. Working indicator: Marker + shimmer, whole turn

Use shadcn `Marker` with `MarkerContent className="shimmer"` showing "Working for {elapsed}s". Visible while `turn.state === "running"`, not gated on first-byte arrival. Self-ticking timer via ref (t3code `WorkingTimer` pattern) to avoid per-second React commits.

**Alternative considered:** Pre-stream-only "Cooking" indicator — rejected; user chose t3code whole-turn behavior.

### 2. Flat feed entries, no WorkLog wrapper

Refactor `deriveFeed` to emit `tool` and `diff` entry types (or render `ToolRow`/`DiffRow` directly). Remove `WorkLog` collapsible shell and "N tools · M diffs" header. Each row is individually collapsible.

**Tool expand:** Parse `kind`, `title`, `rawInput`, `rawOutput` for human-readable preview. If nothing parseable, row is non-expandable with a `// TODO` for fallback UX (no JSON dump).

### 3. MessageScroller replaces ScrollArea + manual scroll

Wrap feed in `MessageScrollerProvider` → `MessageScroller` → `MessageScrollerItem` per row. Removes double-rAF scroll hacks; gains auto-follow, jump-to-latest, and open-at-bottom on existing threads.

### 4. Message + Bubble for chat messages

- User: `Message align="end"` + `Bubble variant="default"`
- Assistant: `Message align="start"` + `Bubble variant="ghost"` (full-width prose)

Copy button and timestamp move to `MessageFooter`.

### 5. Combined Agent+Model picker (t3-style)

Single popover: agent sidebar (icons from `listAgents`) + model list (`getModels`). Effort/Persona stay as secondary controls; tuck into `⋯` compact menu below ~620px (`composerFooterLayout` pattern from t3code).

### 6. Breadcrumb in thread header

Replace `workerId… / projectId…` UUID label with `Breadcrumb`: project name (link) → thread name (current page). Resolve project name from `useControllerThreads().projects`.

### 7. Empty states and route structure

| Route | Behavior |
|-------|----------|
| `/workers/` | `EmptyWorkspace` + install snippet |
| `/workers/$workerId/` | `EmptyProject` + "Add project" CTA |
| `/workers/$workerId/p/` | redirect → `/workers/$workerId` |
| `/workers/$workerId/p/$projectId/` | `EmptyThread` |
| `/workers/$workerId/p/$projectId/t/` | redirect → `/workers/$workerId/p/$projectId` |
| `/workers/.../t/$threadId` | `ThreadWorkspace` |

Install snippet: local component with npm/shell tabs and copy button (shadcnblocks-style, not registry `snippet`).

## Risks / Trade-offs

- **[Risk] Route tree out of sync** — New index routes require TanStack Router regen (`routeTree.gen.ts`). → Run dev/build to regenerate; verify `check:types` passes.
- **[Risk] MessageScroller + composer overlay** — Composer is absolutely positioned over feed. → Keep `pb-56` padding on scroller content; test jump-to-latest button doesn't hide behind composer.
- **[Risk] Tool presentation gaps** — Not all ACP tools have parseable fields. → Non-expandable rows + TODO; no JSON fallback in v1.
- **[Risk] Install URL placeholder** — `curl -fsSL https://cyrus.dev/install.sh` may not exist yet. → Use placeholder; update when publish pipeline lands.

## Migration Plan

1. Install shadcn primitives and wire CSS (done partially)
2. Empty states + routes (done partially — components exist, wiring pending)
3. Timeline redesign (feed flatten, tool rows, working marker, MessageScroller)
4. Messages (Bubble) and composer (combined picker)
5. Thread header breadcrumb
6. Delete `thread-empty-state.tsx` after route wiring complete
7. `bun check:types` + manual smoke test on worker/project/thread navigation

## Open Questions

- Final install command URLs for workspace empty state (npm package name, curl script host)
- Whether deleting a thread should navigate to project empty state (`/p/$projectId`) instead of worker index
