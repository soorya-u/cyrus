# Shared metadata, owned execution

Cyrus controls coding agents across a user's devices, so something must be shared — but agent execution, source code, and git state never leave the device that owns them. Only minimal metadata syncs through the server (Cloudflare Workers + Durable Objects); everything execution-shaped lives on the worker (`cyrusd`), and peers reach it directly over per-worker connections. Any feature that would require the server to see code, transcripts-as-authority, or run agents is out of scope by design.
