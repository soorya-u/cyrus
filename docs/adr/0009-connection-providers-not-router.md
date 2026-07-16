# Connection bootstrap lives in shared React providers, not the router

_Decided 2026-07-10._

Signaling and per-worker controller connections are established by a shared `@cyrus/providers` stack (`QueryProvider`, `SignalingProvider`, worker RTC provider) with platform dial functions injected by each app — never dialed in TanStack Router `beforeLoad` or stored in router context. Route-context wiring wasn't type-safe, duplicated lifecycle concerns, and couldn't be reused on mobile (Expo Router has no `beforeLoad`). Context-consumption hooks (`useSignaling`, `useRtc`) are deliberately unexported from `@cyrus/hooks`; apps consume only data hooks (`useProjects`, …), which guarantees non-optional types inside the provider boundary.
