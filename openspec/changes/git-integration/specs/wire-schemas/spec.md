## ADDED Requirements

### Requirement: Git wire schemas in @cyrus/schemas/rtc/git

The system SHALL define git RPC input/output schemas in `@cyrus/schemas/rtc/git.ts` as Zod schemas exportable from `@cyrus/schemas/rtc/git`.

#### Scenario: Git status schema

- **WHEN** a consumer imports git types from `@cyrus/schemas/rtc/git`
- **THEN** `GitStatusInputSchema`, `GitStatusOutputSchema`, and `GitFileChangeSchema` are available
- **AND** `GitStatusOutputSchema` includes `isRepo`, optional `refName`, `files`, `insertions`, and `deletions`

#### Scenario: Git patch schema

- **WHEN** a consumer imports git patch types
- **THEN** `GitPatchInputSchema` accepts `{ threadId, path? }`
- **AND** `GitPatchOutputSchema` contains `{ patch: string }`

#### Scenario: Git action schemas

- **WHEN** a consumer imports git action types
- **THEN** schemas exist for `listGitRefs`, `checkoutGitRef`, `createGitWorktree`, and `removeGitWorktree` inputs and outputs

### Requirement: ThreadSchema git context fields

`ThreadSchema` in `@cyrus/schemas/rtc/threads` SHALL include optional nullable fields `branch: string | null` and `worktreePath: string | null`.

#### Scenario: Thread wire shape includes git fields

- **WHEN** `ThreadSchema` is parsed for a thread with git context
- **THEN** `branch` and `worktreePath` are accepted as optional nullable strings
- **AND** threads without these fields parse successfully with defaults of null
