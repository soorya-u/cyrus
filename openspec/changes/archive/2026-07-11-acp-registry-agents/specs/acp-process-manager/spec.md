## MODIFIED Requirements

### Requirement: Lazy spawn on first use

The worker SHALL NOT spawn agent subprocesses at worker startup. A subprocess SHALL be spawned only when an agent is first required (e.g. first prompt for that agent).

#### Scenario: No subprocess at worker start

- **WHEN** the worker starts and no prompts have been sent
- **THEN** no agent subprocesses are running

#### Scenario: First use spawns subprocess

- **WHEN** an agent is needed and no subprocess exists for that agent
- **THEN** the worker spawns the registry-resolved command (npx, uvx, or cached binary), then calls ACP `initialize` on the subprocess stdio

#### Scenario: Subsequent use reuses subprocess

- **WHEN** an agent subprocess is already running and a new prompt arrives for that agent
- **THEN** the worker reuses the existing subprocess without spawning a new one

### Requirement: Agent availability check

The worker SHALL resolve registry distribution recipes before spawning. Availability checks in doctor SHALL spawn the resolved command and verify ACP `initialize`. The worker SHALL NOT filter `listAgents` by PATH or spawn health.

#### Scenario: Spawn resolution failure

- **WHEN** an enabled agent's registry entry cannot be resolved for the current platform
- **THEN** spawn or doctor checks report unavailability with a descriptive error

#### Scenario: Agent spawn succeeds

- **WHEN** the registry id is valid and the resolved command starts successfully
- **THEN** the worker spawns the resolved command and proceeds with ACP initialization

#### Scenario: listAgents does not filter by availability

- **WHEN** an enabled agent is listed in `agents.yml` but fails doctor checks
- **THEN** `listAgents` still includes that agent with its metadata
