# One thread = one ACP session, created at bind time; agent locks at first message

_Decided 2026-07-12._

An ACP session is created when the user selects an agent for a thread (`bindAgent`, with the project's real cwd), not on first prompt — the previous "probe session" in the home directory produced wrong cwd-scoped catalog data and orphaned sessions. Draft threads keep the binding in worker memory only and may switch agents freely; on the first user message the worker persists `agentName` + `sessionId` and locks the agent for the thread's lifetime. All catalog operations are thread-scoped reads from the bound session. Committed sessions are recovered after restart from the persisted `sessionId`; draft sessions are never resumed — clients re-bind. The lifecycle is modeled on Zed's external-agent handling.
