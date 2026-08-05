# Ephemeral chunks carry a bus-stamped (seq, sub) key; the bus never buffers them for replay

_Decided 2026-08-05. Supersedes the ephemeral-delta claims in [0005](./0005-global-seq-and-persist-before-broadcast.md) (`seq === 0` for streamed deltas) and [0008](./0008-thread-scoped-streaming-and-overlay.md) (delta-first eviction from the replay log, dedup by seq against the watermark)._

Streamed token/thought deltas broadcast with a flat `seq === 0`, carrying no ordering information, and the worker's per-turn replay log included them alongside persisted chunks (evicted delta-first under size pressure). A peer reconnecting mid-turn got the whole replay log resent, deltas included, with no way to dedupe them — and since the client merges repeat deltas by concatenation, a reconnect could double streamed text. `ThreadEventBus.publish` now stamps each ephemeral chunk with `seq` set to the thread's last known persisted seq and an incrementing `sub`, giving it a real position relative to persisted history instead of a sentinel; the bus no longer buffers ephemeral chunks in the replay log at all — only persisted chunks are replayed to peers that start watching mid-turn, so a delta can never be redelivered. Because every chunk a client holds is now trustworthy in `(seq, sub)` order end to end, `fold()` and `deriveFeed()` no longer re-sort by wall-clock `createdAt` to compensate.

## Considered options

- Predicting the persisted `seq` a delta's finished message will eventually get, so ephemeral chunks could anchor to their own future position — rejected: `seq` is a single autoincrement column shared across all threads, so the value isn't knowable until the row is actually inserted.
- Keeping delta replay and pushing dedup onto clients (e.g. by `turnId` + `messageId` + delta index) — rejected: fixes the bug once at the source (the bus) instead of in every client.
