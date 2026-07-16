# Thread-scoped streaming: unary chat, ThreadEventBus, client overlay

_Decided 2026-07-10._

The `chat` RPC is a unary turn-start command returning `{ threadId, turnId }`; all live chunks — including the sender's own — flow through each peer's single `subscribe()` stream, fanned out by a `ThreadEventBus` that delivers only to peers watching that thread and keeps a bounded in-memory replay log per active turn (delta-first eviction) for peers that start watching mid-turn. Clients hold live chunks in an overlay store separate from the durable snapshot, deduped by `seq` against the snapshot watermark, and `sendMessage` resolves by observing `turn_completed` on the overlay rather than holding an RPC open.

## Considered options

- Keeping `chat` as a streaming RPC — rejected: long-held connections, and a second ingress path racing `subscribe()`.
- A durable per-thread log (Kafka-style) for replay — rejected: the database already holds durable events; in-memory retention until turn end suffices.
- Per-thread subscribe streams — rejected: filtering belongs in `publish()`, one stream per peer.
