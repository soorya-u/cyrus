# Style Guide

This guide covers how Cyrus source files and identifiers should be written.
Formatting and import ordering are enforced by the repository tooling.

## Domain language

- Use the canonical terms in [`CONTEXT.md`](../../CONTEXT.md). Do not introduce
  synonyms for concepts already defined there.
- Respect each term's **Avoid** list. For example, a Draft is not a “draft
  thread,” and a Controller is not a “client.”
- Name types, functions, variables, UI copy, tests, and documentation with the
  same domain vocabulary.

## Types and interfaces

- Model distinct concepts with distinct types. Do not fabricate one domain
  object to satisfy an interface for another concept.
- Keep interfaces honest and narrow. Accept only the fields a function or
  component needs instead of a larger object populated with placeholder values.
- Use discriminated unions for mutually exclusive states.
- Keep types private and colocated when only one file or feature uses them.
  Move types to the app or package `types/` directory only when they are shared.
- Name types and interfaces with `PascalCase`; do not prefix interfaces with
  `I`.

## Naming

- Use `camelCase` for functions, variables, parameters, and object fields.
- Use `PascalCase` for components, classes, and types.
- Use `SCREAMING_SNAKE_CASE` for module-level constants that are truly constant.
- Prefix hooks with `use`.
- Name booleans as predicates when practical: `isReady`, `hasAgents`,
  `canSubmit`, `shouldRetry`.
- Use `handle<Event>` for local event handlers and `on<Event>` for callback
  properties exposed to callers.
- Prefer names that describe domain behavior or meaning, not implementation
  mechanics.

## Files

- Use `kebab-case` file and directory names.
- Use `.test.ts` or `.test.tsx` for tests.
- Keep a file focused on one cohesive responsibility. Extract behavior when a
  file accumulates unrelated reasons to change, not merely because it crosses an
  arbitrary line count.
- Colocate feature-private components, hooks, and helpers. Move broadly shared
  hooks and types to the owning app or package's conventional shared directory.
