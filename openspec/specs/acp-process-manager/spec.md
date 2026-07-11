# ACP Process Manager

## Purpose

Manage long-lived ACP agent subprocesses in the Cyrus worker: lazy spawn, reuse, idle shutdown, crash recovery, and graceful worker shutdown.

## Requirements

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

### Requirement: Idle shutdown after 30 minutes

The worker SHALL terminate an agent subprocess after 30 minutes of inactivity. Inactivity means no prompts sent and no in-flight operations on any session for that agent.

#### Scenario: Idle agent shut down

- **WHEN** an agent subprocess has had no activity for 30 minutes
- **THEN** the worker terminates the subprocess and clears its running state

#### Scenario: Activity resets idle timer

- **WHEN** a prompt is sent to an agent subprocess
- **THEN** the 30-minute inactivity timer for that agent resets

#### Scenario: Respawn after idle shutdown

- **WHEN** a prompt arrives for an agent whose subprocess was shut down due to idle timeout
- **THEN** the worker spawns a new subprocess and attempts session recovery via `session/resume` or `session/load`

### Requirement: One subprocess per agent

The worker SHALL maintain at most one ACP agent subprocess per registered agent name at any time.

### Requirement: Subprocess health tracking

The worker SHALL track each agent subprocess state as one of: `stopped`, `starting`, `ready`, or `crashed`.

#### Scenario: Successful initialization

- **WHEN** spawn completes and ACP `initialize` returns successfully
- **THEN** the agent subprocess state transitions to `ready`

#### Scenario: Subprocess exits unexpectedly

- **WHEN** an agent subprocess exits with a non-zero code while sessions are active
- **THEN** the agent subprocess state transitions to `crashed`

### Requirement: Automatic crash recovery

The worker SHALL automatically respawn a crashed agent subprocess on the next operation that requires it.

#### Scenario: Respawn after crash

- **WHEN** an agent is in `crashed` state and a new prompt arrives for that agent
- **THEN** the worker spawns a new subprocess, re-initializes ACP, and attempts session recovery

### Requirement: Graceful shutdown

The worker SHALL terminate all agent subprocesses on worker shutdown (SIGINT/SIGTERM).

#### Scenario: Worker stops cleanly

- **WHEN** the worker receives SIGTERM
- **THEN** all active agent subprocesses are killed and the worker exits

### Requirement: Agent availability check

Doctor SHALL spawn the registry-resolved command for an enabled agent and verify ACP `initialize`. The worker SHALL NOT filter `listAgents` by PATH or spawn health. Agent startup SHALL use `CYRUS_ACP_TIMEOUT_MS` (default 120s) to accommodate cold npx/uvx installs.

#### Scenario: Spawn resolution failure

- **WHEN** an enabled agent's registry entry cannot be resolved for the current platform
- **THEN** spawn or doctor checks report unavailability with a descriptive error

#### Scenario: Agent spawn succeeds

- **WHEN** the registry id is valid and the resolved command starts successfully
- **THEN** the worker proceeds with ACP initialization

#### Scenario: listAgents does not filter by availability

- **WHEN** an enabled agent is listed in `agents.yml` but fails doctor checks
- **THEN** `listAgents` still includes that agent with its metadata
