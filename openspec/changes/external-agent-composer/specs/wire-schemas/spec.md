## ADDED Requirements

### Requirement: Structured prompt input

`ChatInputSchema` SHALL support an array of prompt content blocks (text, resource/file, resource/url) in addition to or instead of a plain string message field.

#### Scenario: Backward compatible string

- **WHEN** the client sends a plain string message during transition
- **THEN** the worker treats it as a single text block

### Requirement: Context usage query

The controller SHALL provide optional `getContextUsage({ threadId })` returning usage numbers when the session exposes them.

#### Scenario: Usage returned

- **WHEN** the agent session reports token usage metadata
- **THEN** `getContextUsage` returns used and limit values
