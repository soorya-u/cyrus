# Sidebar Project Dialogs

## Purpose

Imperative, promise-based create/rename/delete dialogs for projects in the sidebar, invoked via `react-call` instead of component-local open state.

## Requirements

### Requirement: Rename Project Dialog

The system SHALL provide a rename-project dialog invocable as an imperative call that resolves with the trimmed new name, or `null` if cancelled, without requiring the caller to manage the dialog's open/closed state.

#### Scenario: User confirms a rename

- **WHEN** the caller invokes the rename dialog with a project's current name and the user edits the input, then confirms
- **THEN** the call resolves with the trimmed new name and the dialog closes

#### Scenario: User cancels a rename

- **WHEN** the user dismisses the rename dialog via the Cancel button, the Escape key, or a backdrop click
- **THEN** the call resolves with `null` and no rename is applied

#### Scenario: Confirm is disabled for an empty name

- **WHEN** the rename input is empty or contains only whitespace
- **THEN** the confirm action is disabled and the call remains unresolved until the user enters a non-empty value or cancels

### Requirement: Delete Project Dialog

The system SHALL provide a delete-project confirmation dialog invocable as an imperative call that resolves with a boolean indicating whether the user confirmed the deletion, given the project's name and thread count as call-time input.

#### Scenario: User confirms deletion

- **WHEN** the caller invokes the delete dialog with a project's name and thread count, and the user clicks the destructive confirm action
- **THEN** the call resolves with `true` and the dialog closes

#### Scenario: User cancels deletion

- **WHEN** the user dismisses the delete dialog via Cancel, the Escape key, or a backdrop click
- **THEN** the call resolves with `false` and no deletion occurs

### Requirement: New Project Dialog

The system SHALL provide a new-project dialog invocable as an imperative call that resolves with the chosen project name and path, or `null` if cancelled, replacing the previous parent-controlled `open`/`onOpenChange` wiring.

#### Scenario: User creates a project

- **WHEN** the caller invokes the new-project dialog and the user selects or enters a path and submits
- **THEN** the call resolves with `{ name, path }` and the dialog closes

#### Scenario: User cancels project creation

- **WHEN** the user dismisses the new-project dialog without submitting
- **THEN** the call resolves with `null` and no project is created

### Requirement: Single Dialog Root Per Type

The system SHALL mount exactly one root instance of each project dialog (new, rename, delete) regardless of which workspace route is active, so that invoking a dialog's call function works consistently across all workspace pages.

#### Scenario: Dialog is invokable from any workspace page

- **WHEN** the user is on any page nested under the workspace layout (workers list, a specific worker, or settings) and triggers a project dialog
- **THEN** exactly one instance of that dialog opens, backed by a single mounted root shared across all workspace pages
