# Global monotonic seq, persist-before-broadcast, one entry per finished message

_Decided 2026-07-08._

Conversation entries carry a single global monotonic `seq` (native `INTEGER PRIMARY KEY AUTOINCREMENT`), not a per-thread counter — reads are always thread-scoped so gaps don't matter, and a per-thread counter would need its own counter table and transaction. The worker persists an entry (obtaining `seq` via `INSERT … RETURNING`) before broadcasting the corresponding chunk, so peers never observe an event that isn't durable; streamed token/thought deltas are the exception — they broadcast with `seq === 0` and are never persisted, with exactly one entry written per finished message. The raw event is stored as a JSON text column, keeping the schema stable as event variants evolve at the cost of SQL queryability.
