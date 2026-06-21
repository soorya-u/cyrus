# Plan: Networking & Signaling (08)

**Depends on**: 04, 05, 07

## Server Signaling (apps/server)
- WebSocket endpoint /ws
- Message types (Zod):
  - Offer, Answer, IceCandidate (for WebRTC)
  - Presence (join/leave room)
  - Heartbeat
- Server is dumb relay only. No decryption, no storage of thread events.
- Auth: after WS connect, require better-auth session or device token for workers?

## Peer Authentication (post WebRTC)
- After DataChannel open:
  - auth_challenge { nonce }
  - auth_response { deviceId, signature }
- Verify with registered publicKey.
- Reject non-room members.

## WebRTC (all peers)
- Use simple-peer or native WebRTC APIs (Bun has? via polyfill or cloudflare? For desktop/mobile native, web: browser).
- DataChannels for:
  - PromptRequest / Cancel
  - AgentEvent stream (token, tool, diff, etc.)
  - ThreadMetadata updates (light)
  - Capabilities
  - Heartbeats
- Even localhost peers use WebRTC (no special casing).

## Bootstrap Flow
1. UI or CLI gets list of peers (from server presence or registered devices).
2. Initiator creates offer via signaling.
3. Direct P2P established.
4. Auth challenge on channel.
5. Then bidirectional PeerMessage.

## Offline / Local
- Workers can run standalone.
- When peers come online, reconnect via signaling + WebRTC.
- Local Turso keeps working.

## Presence
- Server tracks lastSeen for devices/workers.
- Broadcast to room members on change.
- UI shows "Laptop X online (worker)" etc.

## Minimal TURN/STUN later if needed for NAT.

## Implementation Order
- Basic WS signaling server (echo rooms by user).
- Client WS in web + cli (using native ws or elysia ws client?).
- Then integrate WebRTC lib (choose: peerjs? simple-peer? @koush/wrtc for node? For bun research).
- Auth handshake.
- Send first Prompt over data channel (stub).

## Packages?
- Consider packages/signaling or just live in apps/server + shared types in packages/contracts.

## Verification
- Two workers "connect" via signaling logs.
- Offer/answer/ice exchanged.
- DataChannel opens, auth succeeds.
- Metadata or heartbeat message delivered.
