# Cyrus

Cyrus is a cross-platform app for controlling AI coding agents (Claude Code, Codex, and others) that run across a user's own devices. Metadata is shared through a minimal sync server; agent execution stays local to the device that owns the code.

## Language

### Topology

**Peer**:
Any connected instance in the user's room — a worker or a controller.
_Avoid_: client, device

**Worker**:
The peer — the per-device Cyrus process (`cyrusd`) — that owns local projects and executes agent sessions and git operations.
_Avoid_: daemon, server, host

**Controller**:
A peer that drives workers: the UI apps (web, desktop, mobile).
_Avoid_: client, frontend

**Room**:
The single per-user space in which all of a user's peers meet. One room per user.
_Avoid_: workspace, org, team

**Signaling**:
The room-level connection through the sync server that lets peers discover and dial workers.

**Control link**:
A controller's direct connection to one specific worker, over which all worker RPCs run.
_Avoid_: RTC connection (as a domain term), channel, controller (for the connection)

### Projects and threads

**Project**:
A directory on a worker's device that threads run against.
_Avoid_: repo, workspace, folder

**Thread**:
One conversation with one agent, scoped to a project. A thread exists from its first user message onward; its agent is locked for its lifetime.
_Avoid_: session, chat, conversation (as an entity name), committed thread

**Draft**:
Controller-local composer state before a thread exists: the chosen project, branch or worktree choice, agent and preferences, and the unsent message. A draft never leaves the controller.
_Avoid_: draft thread

**Bind**:
The worker-internal act of making a thread's persisted session live — creating it at the thread's first message or resuming it on demand — yielding that session's catalog.
_Avoid_: attach, connect

**Session binding**:
Whether a thread's ACP session is **live** (in worker memory), **cold** (only its persisted session id remains), or **unbound** (no live or persisted session). Cold sessions are resumed lazily on Bind.
_Avoid_: attached, connected, warm

**Turn**:
One prompt–response cycle within a thread. A turn is running, complete, or interrupted.
_Avoid_: exchange, round

**Effective cwd**:
The directory a thread's agent and git operations run in: the thread's worktree path if set, otherwise the project directory.

### Conversation data

**Conversation entry**:
One durably persisted event in a thread's transcript. The persisted entries — not the agent's own session state — are the transcript's source of truth.
_Avoid_: message row, log line

**Seq**:
The monotonic sequence number assigned to a conversation entry when it is persisted. Seq 0 marks a chunk that will never be persisted.

**Chat chunk**:
A live conversation event delivered to watching peers as a turn runs.

**Ephemeral delta**:
A streamed fragment (token or thought) with seq 0 — broadcast live but never persisted; the completed message is persisted once, in full.
_Avoid_: partial message

**Snapshot**:
The durable transcript a client has fetched for a thread.

**Overlay**:
The client-side store of live chunks layered on top of the snapshot until the durable transcript catches up.
_Avoid_: live cache, buffer (on the client)

**Watermark**:
The highest persisted seq a client's snapshot covers; chunks at or below it are pruned from the overlay.
_Avoid_: cursor

**Watch**:
A peer's registered interest in a thread's live chunks. Only watching peers receive a thread's chunks.
_Avoid_: subscribe (to a thread)

**Replay buffer**:
The worker-held log of an in-flight turn's chunks, replayed to peers that start watching mid-turn and discarded when the turn ends.

**Fold**:
The pure derivation of a conversation view (messages, tool calls, diffs, turn states) from a log of conversation entries.

**Feed**:
The flat, chronological presentation layout (message, thought, tool, diff, and error rows) derived from a folded conversation. Feed entries are presentation-only and never cross the wire.

### Agents

**Agent**:
An ACP-speaking coding agent (e.g. Claude Code, Codex) enabled from the ACP registry.
_Avoid_: provider, model, bot, assistant

**ACP**:
The Agent Client Protocol — the wire protocol Cyrus workers speak to agent subprocesses.

**Session**:
The agent-side ACP conversation, identified by a `sessionId` and its own working directory. One agent subprocess multiplexes many sessions; a committed thread maps to exactly one.

**Host**:
The worker-side ACP callback surface that serves agent requests (permissions, elicitation) and can block a turn while awaiting a user response.

**Registry**:
The public ACP agent registry from which agents are discovered, enabled, and their spawn commands resolved.

**Catalog**:
The option set a bound session reports: models, modes, efforts, personas, capabilities, and available commands.
_Avoid_: config, settings

**Approval**:
A blocking permission request raised by an agent tool call; the turn does not proceed until the user responds or cancels.
_Avoid_: permission prompt

**Elicitation**:
A blocking agent request for structured user input — a form or a URL confirmation — answered from the composer.

**Probe session**:
A short-lived agent session created at a project's directory solely to capture a catalog for drafts, then closed. Never attached to a thread.

**Doctor**:
The health check that spawns an enabled agent and verifies the ACP handshake completes.

### Client UI

**Composer**:
The chat input area: prompt box, agent/model picker, mode/effort/persona controls, prompt queue, and the panel where approvals and elicitations are answered.

**Prompt queue**:
Messages queued per thread while a turn is active, sent sequentially once the turn completes.

**Diff panel**:
The git-backed side panel showing real working-tree changes at the thread's effective cwd — distinct from agent-reported diffs in the feed.
