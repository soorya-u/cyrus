## MODIFIED Requirements

### Requirement: Agent registry file

The CLI SHALL persist enabled agents at `~/.cyrus/agents.yml`, each entry keyed by registry id and specifying `registryId`, `name`, and `icon` URL.

#### Scenario: Empty registry

- **WHEN** no `~/.cyrus/agents.yml` exists
- **THEN** the agent registry is empty until the user adds agents from the ACP registry

#### Scenario: Registered agent loaded

- **WHEN** `agents.yml` contains a valid agent entry
- **THEN** the CLI loads the entry with `registryId`, `name`, and `icon` for listAgents and spawn resolution

### Requirement: Agent config schema validation

The CLI SHALL validate agent configuration against a Zod schema and reject invalid configs with a descriptive error.

#### Scenario: Invalid registry entry

- **WHEN** `agents.yml` contains an entry missing required `registryId` field
- **THEN** the CLI rejects the entry with a validation error on read or write

## MODIFIED Requirements

### Requirement: User-managed registry via CLI

Users SHALL register agents with `cyrusd agents add <registry-id>`. The worker SHALL spawn agents via acpr using the registry id, not user-supplied command recipes.

#### Scenario: Add agent from registry

- **WHEN** user runs `cyrusd agents add claude-acp`
- **THEN** the agent is stored in `agents.yml` with `registryId`, `name`, and `icon` from the cached ACP registry

#### Scenario: Remove agent

- **WHEN** user runs `cyrusd agents rm claude-acp`
- **THEN** the agent is removed from `agents.yml`

## REMOVED Requirements

### Requirement: Environment variable interpolation

**Reason**: agents.yml no longer stores spawn env/command configuration; acpr handles distribution env at spawn time.

**Migration**: Not applicable; env interpolation was not yet implemented in agent entries.
