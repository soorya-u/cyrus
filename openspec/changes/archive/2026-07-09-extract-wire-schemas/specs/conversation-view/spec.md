## MODIFIED Requirements

### Requirement: No client-side wire-to-view rename layer

The system SHALL NOT maintain a separate mapping layer (such as `map-controller.ts`) that renames wire fields to UI aliases. Web and React Native clients SHALL consume `ProjectSchema` and `ThreadSchema` from `@cyrus/schemas/rtc/*`, and view schemas from `@cyrus/schemas/view`.

#### Scenario: Project list uses wire shape

- **WHEN** the web app displays a project from `listProjects`
- **THEN** it uses `project.cwd` and `project.name` without transforming to `path` or other aliases

#### Scenario: Thread list uses wire shape

- **WHEN** the web app displays a thread from `listThreads`
- **THEN** it uses `thread.name` and `thread.agentName` without transforming to `title` or `branch`
