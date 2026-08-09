# Shell input executes without an approval gate

Shell input (issue #161 — a thread's composer entering shell input when `!` is the first character) runs the typed command immediately, with no blocking approval/elicitation step. This deliberately diverges from ADR 0014's ACP host, which never auto-allows agent-requested permissions. The two cases differ in who decided to run the command: an agent tool call is the *agent's* decision, made without the user asking for that exact command at that exact moment, so the approval gate exists to give the user a chance to veto it. Shell input is the opposite — the user typed the exact command themselves in their own paired composer; that act is the authorization, the same way sending a chat prompt needs no separate confirmation to send.

## Considered options

- **Route through the same approval/elicitation flow as agent tool calls** — rejected: it would ask the user to confirm a command they just finished typing, adding friction without adding safety, since the "requester" and the "approver" would be the same person in the same action.
- **Heuristic approval for destructive-looking commands** (`rm`, `sudo`, etc.) — rejected: unreliable pattern-matching for a problem that isn't actually about consent (the user already consented by typing and submitting); it would produce false positives/negatives without changing who is authorizing the run.
