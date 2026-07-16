# @cyrus/schemas is a zod-only leaf package with no re-exports

_Decided 2026-07-09._

All shared Zod schemas (wire `rtc/*`, `signaling`, `view/`, `enums/`) live in `@cyrus/schemas`, which depends on `zod` and nothing else; `@cyrus/connections` keeps only runtime (WebRTC, PartySocket, ORPC). Schema-only consumers like `@cyrus/database` and `@cyrus/utils` were pulling `node-datachannel` and PartySocket transitively, and the `utils → connections` edge risked a dependency cycle. Compatibility re-exports from `@cyrus/connections` were rejected because they hide the dependency graph and let new code import from the wrong package — consumers import from `@cyrus/schemas` directly or not at all.
