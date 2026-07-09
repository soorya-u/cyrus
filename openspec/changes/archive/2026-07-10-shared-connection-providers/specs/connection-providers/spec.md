## ADDED Requirements

### Requirement: Signaling provider bootstraps workspace connection

The system SHALL provide a `SignalingProvider` React component that establishes a signaling session for the authenticated workspace using an injected platform dial function and TanStack Query.

#### Scenario: Successful signaling connection

- **WHEN** `SignalingProvider` mounts with a valid authenticated session and the dial function succeeds
- **THEN** the provider renders its children
- **AND** internal `useSignaling()` returns `{ session, orpc }` for the active signaling connection

#### Scenario: Signaling connection pending

- **WHEN** the signaling query is in a pending state
- **THEN** the provider renders a loading fallback instead of children

#### Scenario: Signaling connection failure

- **WHEN** the signaling dial function throws or the query enters an error state
- **THEN** the provider renders an error UI with a retry action
- **AND** children do not mount

#### Scenario: Signaling retry

- **WHEN** the user activates retry on the signaling error UI
- **THEN** the provider re-attempts the signaling dial via query refetch

### Requirement: Query provider unifies client setup

The system SHALL provide `createQueryClient({ onError })` and `QueryProvider` in `@cyrus/providers`, replacing duplicated web and mobile query-client configuration.

#### Scenario: Platform-specific error handling

- **WHEN** web creates a query client with an `onError` callback that shows a toast
- **THEN** query errors are handled by that callback without duplicating `QueryClient` construction logic

#### Scenario: Mobile error handling

- **WHEN** mobile creates a query client with an `onError` callback that logs via evlog
- **THEN** query errors are handled by that callback using the same shared `createQueryClient` factory

### Requirement: Router does not own query client

TanStack Router context SHALL NOT include `queryClient`.

#### Scenario: Web router context

- **WHEN** web creates the TanStack Router instance
- **THEN** `queryClient` is not passed in router context
- **AND** all query access goes through `QueryClientProvider` / `useQueryClient()`

### Requirement: Worker connection provider bootstraps controller RTC

The system SHALL provide an `RtcProvider` React component in `@cyrus/providers` that establishes a controller RTC connection to a specific worker, depending on an active signaling session from `SignalingProvider`.

#### Scenario: Successful worker connection

- **WHEN** `RtcProvider` mounts with a `workerId` and the dial function succeeds
- **THEN** the provider renders its children
- **AND** internal `useRtc()` returns `{ connection, orpc }` for the active controller connection

#### Scenario: Worker connection pending

- **WHEN** the controller query is in a pending state
- **THEN** the provider renders a loading fallback instead of children

#### Scenario: Worker connection failure

- **WHEN** the controller dial function throws or the query enters an error state
- **THEN** the provider renders an error UI with a retry action
- **AND** children do not mount

#### Scenario: Worker connection retry

- **WHEN** the user activates retry on the worker error UI
- **THEN** the provider re-attempts the controller dial via query refetch

#### Scenario: Worker id change

- **WHEN** the `workerId` prop changes
- **THEN** the previous controller connection is closed
- **AND** a new connection is established for the new worker

### Requirement: Connection hooks are type-safe inside provider boundaries

Internal context consumption hooks in `@cyrus/hooks/src/contexts/` SHALL return non-optional types when called inside the correct provider tree. These hooks SHALL NOT be exported from the `@cyrus/hooks` package.

#### Scenario: Internal hook called inside provider

- **WHEN** an internal `useRtc()` is called inside `RtcProvider` after a successful connection
- **THEN** the return type is `RtcConnectionValue` with no `undefined` union

#### Scenario: Internal hook called outside provider

- **WHEN** internal `useRtc()` is called outside `RtcProvider`
- **THEN** the hook throws an error identifying the missing provider

#### Scenario: Apps use data hooks not context hooks

- **WHEN** an app component needs controller data
- **THEN** it imports exported data hooks from `@cyrus/hooks` (e.g. `useProjects`)
- **AND** does not import internal context hooks from `contexts/`

### Requirement: Connection lifecycle cleanup

Providers SHALL close underlying connections when unmounting or when the scoped identifier changes.

#### Scenario: Signaling provider unmount

- **WHEN** `SignalingProvider` unmounts
- **THEN** the signaling session socket and event stream are closed

#### Scenario: Worker provider unmount

- **WHEN** `RtcProvider` unmounts
- **THEN** the controller RTC connection is closed

### Requirement: Providers package exports providers only

`@cyrus/providers` SHALL export `QueryProvider`, `SignalingProvider`, and `RtcProvider`. Apps decide where to mount them.

#### Scenario: Web mounts providers in route layouts

- **WHEN** web workspace and worker routes render
- **THEN** they mount `SignalingProvider` and `RtcProvider` from `@cyrus/providers` in layout components

#### Scenario: Mobile mounts providers in expo layouts

- **WHEN** mobile workspace layout renders
- **THEN** it mounts the same providers from `@cyrus/providers`

### Requirement: Platform dial functions are injected

Shared connection providers SHALL NOT import platform-specific connection code directly.

#### Scenario: Web platform

- **WHEN** web mounts `SignalingProvider` and `RtcProvider`
- **THEN** each provider receives dial functions from `apps/web` that use web RTC primitives

#### Scenario: Mobile platform

- **WHEN** mobile mounts the same providers
- **THEN** each provider receives dial functions from `apps/mobile` that use native RTC primitives

### Requirement: Connection data hooks are router-independent

Shared data hooks that depend on controller or signaling RPC SHALL consume connection context hooks, not router context.

#### Scenario: Projects hook

- **WHEN** `useProjects()` is called inside `RtcProvider`
- **THEN** it uses internal `useRtc()` from `hooks/src/contexts/`
- **AND** does not import `@tanstack/react-router`

### Requirement: Mobile uses Expo color themes

Mobile SHALL NOT use a custom `AppThemeProvider` for theme switching.

#### Scenario: Theme context removed

- **WHEN** mobile app renders
- **THEN** `apps/mobile/contexts/app-theme-context.tsx` is not used
- **AND** theming relies on Expo color theme support

### Requirement: Web routes do not bootstrap connections in beforeLoad

Web workspace and worker routes SHALL mount connection providers in layout components instead of dialing in `beforeLoad`.

#### Scenario: Workspace route

- **WHEN** a user navigates to any `/_workspace/*` route
- **THEN** `SignalingProvider` in the workspace layout handles signaling bootstrap
- **AND** no signaling dial occurs in route `beforeLoad`

#### Scenario: Worker route

- **WHEN** a user navigates to `/_workspace/workers/$workerId/*`
- **THEN** `RtcProvider` in the worker layout handles controller bootstrap
- **AND** no controller dial occurs in route `beforeLoad`
