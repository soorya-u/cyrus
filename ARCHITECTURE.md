# Cyrus: Distributed Agent Controller

## Vision

Build a cross-platform application that allows a single user to control AI coding agents running across multiple devices.

Supported UI platforms:

- Desktop
- Mobile
- Web

Supported worker devices:

- Laptop X
- Laptop Y
- Server C

Supported agents:

- Claude Code
- Codex
- Future agents

The system should provide:

- Shared thread metadata across all devices.
- Local ownership of execution.
- Real-time event streaming.
- Peer-to-peer communication.
- Continuation of conversations from any device.
- Multiple devices observing the same thread.
- Minimal server dependency.

---

# Core Philosophy

Separate:

1. Human identity
2. Device identity
3. Metadata
4. Execution
5. Transport

Execution should never be centralized.

The architecture should follow:

> Shared metadata, owned execution.

---

# User Model

This application is personal.

Each user owns exactly one room.

Example:

```text
User: soorya

Room:
soorya
```

All devices belonging to the user join the same room.

Examples:

```text
room:soorya

Members:

Desktop
Phone
Laptop X
Laptop Y
Server C
```

No multi-user rooms are required.

---

# Device Roles

A device may be:

## UI only

Examples:

- Phone
- Browser

---

## Worker only

Examples:

- Server C

---

## UI + Worker

Examples:

- Desktop
- Laptop X

Roles are independent from machines.

---

# Technology Stack

## Desktop

Framework:

- Electrobun
- React
- TypeScript

---

## Mobile

Framework:

- Expo
- React Native
- TypeScript

---

## Web

Framework:

- React
- TypeScript

---

## Worker

Runtime:

- Bun executable
- TypeScript

---

## Server

Framework:

- Elysia

Hosted on:

- Vercel

Responsibilities:

- Better Auth
- Device bootstrap
- Presence
- WebSocket signaling

The server must never own execution.

---

# Human Identity

Use:

- Better Auth

Providers:

- GitHub

Human identity is only used for:

- Login
- Device registration

---

# Device Identity

Each device generates its own key pair.

```ts
interface DeviceIdentity {
    deviceId: string;

    publicKey: string;

    privateKey: string;
}
```

Private keys never leave the device.

---

# Device Registry

The server stores:

```ts
interface RegisteredDevice {
    deviceId: string;

    publicKey: string;

    name: string;

    lastSeen: Date;
}
```

The server never stores private keys.

---

# Room Architecture

One user = one room.

Example:

```text
room:soorya(github-username/email)
```

Members:

```text
Desktop
Phone
Laptop X
Laptop Y
Server C
```

All peers belong to the same room.

---

# Networking

Transport:

- WebRTC DataChannels

Responsibilities:

- Prompt delivery
- Event streaming
- Tool calls
- Tool results
- File diffs
- Presence
- Heartbeats
- Approvals

Communication should always be peer-to-peer.

---

# Signaling

Use:

- Elysia
- WebSocket

Example:

```text
/ws
```

Signal messages:

```ts
type SignalMessage =
    | OfferMessage
    | AnswerMessage
    | IceCandidateMessage
    | PresenceMessage;
```

The server only relays messages.

It should not store:

- Threads
- Messages
- Agent state
- Repositories
- Session context

---

# Peer Authentication

Authentication occurs after WebRTC connection.

Challenge:

```ts
{
    type: "auth_challenge",
    nonce: string
}
```

Response:

```ts
{
    type: "auth_response",

    deviceId: string,

    signature: string
}
```

Verification:

```text
Verify(
    signature,
    nonce,
    device.publicKey
)
```

Reject peers that are not members of the room.

---

# Local Database

Use:

- Turso

Tables:

```text
threads
messages
workers
devices
settings
```

Heavy execution state remains local.

---

# Shared Metadata

All devices know:

- Thread list
- Thread titles
- Message summaries
- Worker capabilities
- Available agents
- Models
- Settings

Metadata is synchronized.

Execution state is not.

---

# Thread Ownership

Each thread belongs to one worker.

```ts
interface Thread {
    id: string;

    title: string;

    ownerWorkerId: string;

    agent: string;

    model: string;

    updatedAt: Date;
}
```

---

# Session Ownership

Owner worker maintains:

- ACP session IDs
- Repository paths
- Tool state
- Context
- Checkpoints

These remain local.

---

# Multi-device Viewing

Example:

```text
Claude Code
     ↓
Worker
 /   |   \
Phone Desktop Web
```

Multiple devices may observe the same thread simultaneously.

---

# Worker Responsibilities

Workers are responsible for:

- Agent lifecycle
- Session ownership
- Local persistence
- Event streaming
- WebRTC participation
- Capability advertisement

---

# Worker Capabilities

```ts
interface WorkerCapabilities {
    workerId: string;

    hostname: string;

    online: boolean;

    agents: {
        name: string;

        models: string[];
    }[];
}
```

---

# Agent Architecture

The system should be agent-agnostic.

Define:

```ts
interface AgentRuntime {
    start(): Promise<void>;

    stop(): Promise<void>;

    resume(
        sessionId: string
    ): Promise<void>;

    prompt(
        request: PromptRequest
    ): AsyncIterable<AgentEvent>;
}
```

---

# Agent Implementations

Agents may use:

## ACP

```text
Worker
↓
ACP
↓
Claude Code
```

---

## SDK

```text
Worker
↓
SDK
↓
Agent
```

---

## CLI

```text
Worker
↓
spawn()
↓
Agent CLI
```

---

## Python Bridge

```text
Worker
↓
Python subprocess
↓
Python SDK
```

ACP is an implementation strategy.

It is not the architecture.

---

# Agent Plugins

Examples:

```text
@project/agent-claude-acp

@project/agent-codex-cli

@project/agent-gemini-sdk

@project/agent-ollama
```

Every plugin implements:

```ts
AgentRuntime
```

---

# Event Streaming

Support:

- Assistant messages
- Token streams
- Tool calls
- Tool results
- File diffs
- stdout
- stderr
- Plans
- Approval requests

---

# Event Model

```ts
type AgentEvent =
    | AssistantMessage
    | Token
    | ToolCall
    | ToolResult
    | FileDiff
    | Stdout
    | Stderr
    | Plan
    | ApprovalRequest;
```

---

# Internal Protocol

```ts
type PeerMessage =
    | PromptRequest
    | PromptCancel
    | AgentEvent
    | WorkerCapabilities
    | ThreadMetadata
    | PresenceUpdate
    | Heartbeat;
```

Validation:

- Zod

---

# Worker Communication

All communication uses WebRTC.

Even on the same machine.

Example:

```text
Laptop X

Desktop
    ↕
 WebRTC
    ↕
Worker
```

Avoid localhost-only paths.

All devices should speak the same protocol.

---

# Thread Migration

Migration is explicit.

Example:

```text
Thread 123

Laptop X
 ↓
Export
 ↓
Server C
```

Owner becomes:

```text
Thread 123
Owner = Server C
```

Migration should never be automatic.

---

# Desired Properties

The system should be:

- Cross-platform
- Peer-to-peer
- Low latency
- Offline friendly
- Streaming-first
- Strongly typed
- Event-driven
- Agent agnostic
- Extendable
- Minimal server dependency

---

# Architectural Inspirations

- Omnigent
- T3 Code
- VSCode Remote SSH
- Syncthing
- WireGuard
- Tailscale
- Kubernetes ownership model

The architecture should resemble:

> Shared metadata, owned execution.
