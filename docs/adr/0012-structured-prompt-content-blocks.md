# Prompts are structured content blocks; the prompt queue is client-only

_Decided 2026-07-15._

The `chat` message is a non-empty array of content blocks (`text` | `resource`), never a plain string; the worker maps blocks to ACP prompt content, resolving @file paths against the thread's effective cwd (so worktree threads reference worktree files) and passing URLs through for the agent to fetch. The prompt queue — messages composed while a turn is running — is a client-only store that sends sequentially on turn completion; a server-side queue was considered and deferred, keeping the worker's chat surface a simple one-turn-at-a-time command.
