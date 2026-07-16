# Turso's beta database engine for worker-local persistence

_Decided 2026-07-08._

Projects, threads, and conversation entries persist in a local database file under `CYRUS_HOME` (`~/.cyrus`), using the beta `@tursodatabase/database` engine — chosen deliberately over the production-ready `@libsql/client`, `better-sqlite3`, and `node:sqlite` because Cyrus will eventually need the same schema in browser, desktop, and mobile with single-source-of-truth sync, and only the new Turso engine family offers official WASM and React Native bindings plus a CDC-based push/pull sync protocol (libSQL only has read replicas). All driver access is isolated behind store function signatures so an engine swap stays contained; there is no ORM.

## Consequences

- Cyrus-persisted entries are the transcript's source of truth: testing showed ACP `session/load` restores agent reasoning state but never replays transcript content to the client, so transcript storage cannot be delegated to agents (and thread listing never uses ACP `listSessions`).
- We accept beta-status software and missing Drizzle adapters for the WASM/RN variants.
