## MODIFIED Requirements

### Requirement: Lazy spawn on first use

The worker SHALL NOT spawn agent subprocesses at worker startup. A subprocess SHALL be spawned only when an agent is first required (e.g. first prompt for that agent).

#### Scenario: No subprocess at worker start

- **WHEN** the worker starts and no prompts have been sent
- **THEN** no agent subprocesses are running

#### Scenario: First use spawns subprocess

- **WHEN** an agent is needed and no subprocess exists for that agent
- **THEN** the worker spawns acpr with the agent's registry id and `--cache-dir ~/.cyrus/acp`, then calls ACP `initialize` on acpr's stdio

#### Scenario: Subsequent use reuses subprocess

- **WHEN** an agent subprocess is already running and a new prompt arrives for that agent
- **THEN** the worker reuses the existing subprocess without spawning a new one

## MODIFIED Requirements

### Requirement: Agent availability check

The worker SHALL resolve the acpr binary path before spawning. Availability checks in doctor SHALL spawn acpr for the registry id and verify ACP `initialize`. The worker SHALL NOT filter `listAgents` by PATH or spawn health.

#### Scenario: acpr binary not found

- **WHEN** acpr cannot be resolved (not extracted, not on PATH in dev mode)
- **THEN** spawn or doctor checks report unavailability with a descriptive error

#### Scenario: Agent spawn via acpr succeeds

- **WHEN** acpr is available and the registry id is valid
- **THEN** the worker spawns `acpr <registryId> --cache-dir ~/.cyrus/acp` and proceeds with ACP initialization

#### Scenario: listAgents does not filter by availability

- **WHEN** an enabled agent is listed in `agents.yml` but fails doctor checks
- **THEN** `listAgents` still includes that agent with its metadata
