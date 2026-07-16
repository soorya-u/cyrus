# One lazily-spawned subprocess per agent, idle shutdown, crash respawn

_Decided 2026-07-02._

The worker keeps at most one subprocess per enabled agent, spawned on first use (never at worker startup), multiplexing many ACP sessions, and terminated after 30 minutes of inactivity. On crash the worker respawns on next use and recovers committed sessions via `session/resume` (preferred) or `session/load`. Rejected: spawn-at-startup (wastes resources on unused agents), one subprocess per thread (unnecessary per the ACP spec), never shutting idle processes down (a background worker can't leak), and fail-hard on crash.
