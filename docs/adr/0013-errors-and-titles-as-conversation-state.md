# Failures and titles are thread conversation state, not dashboards

_Decided 2026-07-15._

ACP bind/resume/prompt/subprocess failures persist as `thread_error` conversation events rendered inline in the feed — there is deliberately no per-agent health dashboard in clients; unhealthy agents are simply excluded server-side from `listAgents`. Thread titles are Cyrus-owned: a worker-side generator titles the thread after its first completed turn, agent-pushed ACP title updates may apply on top, and a manual rename always wins (tracked by title source precedence: user > agent > auto). Unsent composer drafts persist client-side only — stale-across-devices is accepted by design rather than syncing drafts through the server.
