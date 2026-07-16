# Blocking interactive host; any peer may respond, first response wins

_Decided 2026-07-16._

The worker's ACP host never auto-allows permissions (the original default host auto-selected the first allow option). One blocking host serves both `requestPermission` and elicitation through a shared in-memory pending registry: the request is emitted **and persisted** as a conversation entry (so observers joining mid-turn see it), the turn blocks until `respondApproval`/`respondElicitation` arrives, and any connected peer may answer — first response wins, later ones are ignored. Cancelling a turn resolves all pending requests as deny/decline. Permissions and elicitation were merged into one host surface deliberately; shipping them separately would have rewritten the host, pending maps, and respond RPCs twice.
