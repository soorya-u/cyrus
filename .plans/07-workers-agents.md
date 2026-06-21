# Plan: Workers, Runners & Agent Adapters (07)

**Depends on**: 05

## Concepts from Omnigent
- Runner: long-lived process that owns execution for environments/threads.
- Agent composition: pluggable agents via adapters/bridges.
- Session ownership: runner holds ACP session IDs, context, checkpoints.
- Explicit ownership, not auto-migration.

## Map to Cyrus
- Runner == Worker (apps/cli)
- Worker runs on any device (UI+Worker or Worker-only).
- Worker owns:
  - AgentRuntime instances
  - Local Turso execution DB
  - ACP / SDK / CLI / Python subprocess sessions
  - Repository working dirs

## AgentRuntime Interface (TypeScript)
```ts
export interface AgentRuntime {
  start(): Promise<void>;
  stop(): Promise<void>;
  resume(sessionId: string): Promise<void>;
  prompt(req: PromptRequest): AsyncIterable<AgentEvent>;
  // later: approve, cancel, etc.
}
```

## Adapter Pattern
- packages/agents/claude-acp/
- packages/agents/codex-cli/
- packages/agents/gemini-sdk/
- Each exports a class implementing AgentRuntime.
- Worker loads configured agents from capabilities.

## Worker Lifecycle (CLI)
1. Load/create DeviceIdentity (keypair).
2. Bootstrap: WS connect to server, register device pubkey, get room peers.
3. Advertise WorkerCapabilities.
4. Heartbeats.
5. On PromptRequest (from any UI via P2P):
   - Find/create local session for thread.
   - Delegate to AgentRuntime.prompt().
   - Stream AgentEvents back via WebRTC DataChannel to observers.
6. Local persistence of full events/state.

## Local DB on Worker (Turso)
- Full messages, tool calls, diffs, checkpoints.
- packages/local-db or just in cli using @libsql/client.

## Session Sharing
- UI devices request to "observe" thread → worker streams events.
- No central session store.

## ACP Integration (defer heavy)
- Use or adapt t3code's effect-acp if it fits (Bun/TS friendly?).
- Or simple stdio bridge first.

## CLI Commands (initial)
- cyrus worker start --name "Laptop X"
- cyrus worker register (or auto on start)
- cyrus agent list (from capabilities)

## Capabilities
```ts
interface WorkerCapabilities {
  workerId: string;
  hostname: string;
  agents: { name: string; models: string[] }[];
}
```

## Verification
- CLI starts, registers as worker for user.
- Web/Mobile sees the worker in "available workers".
- Creating thread with that worker as owner.
- (Later) prompt flows through.

## Risks
- Key management for device identity.
- Local file paths for repos (portable?).
- Process supervision for long-running agents.
