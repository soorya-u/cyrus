## ADDED Requirements

### Requirement: Lazy spawn on first use

The worker SHALL NOT spawn provider subprocesses at worker startup. A subprocess SHALL be spawned only when a provider is first required (e.g. first prompt for that provider).

#### Scenario: No subprocess at worker start

- **WHEN** the worker starts and no prompts have been sent
- **THEN** no provider subprocesses are running

#### Scenario: First use spawns subprocess

- **WHEN** a provider is needed and no subprocess exists for that provider
- **THEN** the worker spawns the provider's configured command with args and env, then calls ACP `initialize`

#### Scenario: Subsequent use reuses subprocess

- **WHEN** a provider subprocess is already running and a new prompt arrives for that provider
- **THEN** the worker reuses the existing subprocess without spawning a new one

### Requirement: Idle shutdown after 30 minutes

The worker SHALL terminate a provider subprocess after 30 minutes of inactivity. Inactivity means no prompts sent and no in-flight operations on any session for that provider.

#### Scenario: Idle provider shut down

- **WHEN** a provider subprocess has had no activity for 30 minutes
- **THEN** the worker terminates the subprocess and clears its running state

#### Scenario: Activity resets idle timer

- **WHEN** a prompt is sent to a provider subprocess
- **THEN** the 30-minute inactivity timer for that provider resets

#### Scenario: Respawn after idle shutdown

- **WHEN** a prompt arrives for a provider whose subprocess was shut down due to idle timeout
- **THEN** the worker spawns a new subprocess and attempts session recovery via `session/resume` or `session/load`

### Requirement: One subprocess per provider

The worker SHALL maintain at most one ACP agent subprocess per enabled provider ID at any time.

### Requirement: Subprocess health tracking

The worker SHALL track each provider subprocess state as one of: `stopped`, `starting`, `ready`, or `crashed`.

#### Scenario: Successful initialization

- **WHEN** spawn completes and ACP `initialize` returns successfully
- **THEN** the provider subprocess state transitions to `ready`

#### Scenario: Subprocess exits unexpectedly

- **WHEN** a provider subprocess exits with a non-zero code while sessions are active
- **THEN** the provider subprocess state transitions to `crashed`

### Requirement: Automatic crash recovery

The worker SHALL automatically respawn a crashed provider subprocess on the next operation that requires it.

#### Scenario: Respawn after crash

- **WHEN** a provider is in `crashed` state and a new prompt arrives for that provider
- **THEN** the worker spawns a new subprocess, re-initializes ACP, and attempts session recovery

### Requirement: Graceful shutdown

The worker SHALL terminate all provider subprocesses on worker shutdown (SIGINT/SIGTERM).

#### Scenario: Worker stops cleanly

- **WHEN** the worker receives SIGTERM
- **THEN** all active provider subprocesses are killed and the worker exits

### Requirement: Provider detection

The worker SHALL implement `detect(provider)` that verifies the provider's command is executable and reachable before advertising it.

#### Scenario: Provider binary not found

- **WHEN** `detect` is called for a provider whose command is not on PATH
- **THEN** detection returns `available: false` with an install hint message

#### Scenario: Provider binary found

- **WHEN** `detect` is called for a provider whose command exists and responds to a version check
- **THEN** detection returns `available: true`
