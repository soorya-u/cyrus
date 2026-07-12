## MODIFIED Requirements

### Requirement: Worker capability advertisement

The worker SHALL advertise enabled agents from `agents.yml` in `listAgents` only when the agent passes a health check (spawn + ACP `initialize` succeeds). The response SHALL include `id`, `name`, and `icon` for each healthy agent.

#### Scenario: Unhealthy agent omitted

- **WHEN** the worker serves `listAgents` and an enabled agent fails doctor/initialize
- **THEN** that agent is omitted from the response

#### Scenario: Healthy agents advertised

- **WHEN** the worker serves `listAgents` and `agents.yml` contains healthy `claude-acp` and unhealthy `codex-acp`
- **THEN** the response includes only `claude-acp` with its display metadata

#### Scenario: Health check cached

- **WHEN** `listAgents` is called multiple times within the configured health cache TTL
- **THEN** the worker reuses recent health results without re-spawning each agent on every request
