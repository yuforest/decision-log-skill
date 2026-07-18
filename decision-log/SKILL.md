---
name: decision-log
description: Capture durable engineering and product decisions in a repository-local Git decision log. Use when selecting an architecture, library, data model, API contract, workflow, or other consequential approach; when rejecting meaningful alternatives; or when a user asks to record, find, review, or summarize the rationale behind a decision.
---

# Decision Log

Record decisions as versioned Markdown in the target repository. Treat the repository's `docs/decisions/` directory as the source of truth; do not copy secrets, private credentials, or unredacted personal data into a record.

## Decide whether to record

Create a record when the decision would make a future maintainer ask “why did we do this?” Examples include selecting a persistence layer, introducing a dependency, changing a public API, or choosing an operational trade-off.

Do not create records for routine formatting, mechanical refactors, or a choice that can be understood entirely from the diff.

## Capture a decision

1. Inspect existing `docs/decisions/` records before assigning a new number.
2. State the context, the chosen approach, consequences, rejected alternatives, and assumptions. Preserve uncertainty instead of inventing certainty.
3. Link relevant commits, pull requests, issues, designs, or incident reports.
4. Create a sequential `NNN-short-title.md` record. Use `scripts/decision-log.mjs` when it is available; it also updates `docs/decisions/README.md` without replacing surrounding user content.
5. Run `node scripts/decision-log.mjs validate <repository-root>` after editing records.

Use this structure:

```markdown
---
title: "Use SQLite for local state"
status: accepted
date: 2026-07-19
---

## Context

...

## Decision

...

## Consequences

...

## Alternatives considered

...

## Assumptions

...

## References

- PR #42
```

## Find and review

Search record titles and bodies first. Read linked changes when the rationale is incomplete. Summarize the original context, decision, trade-offs, and any assumptions that may no longer hold. Propose a superseding record rather than rewriting historical rationale.

## Create with the bundled script

Create a JSON input file with `title`, `context`, `decision`, `consequences`, `alternatives`, `assumptions`, and a `references` array. From the target repository, run:

```bash
node <skill-path>/scripts/decision-log.mjs create input.json
```

The command refuses to overwrite an existing numbered record. For manual edits, keep the required headings and update the generated index block in `docs/decisions/README.md`.
