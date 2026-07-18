# Decision Log Skill

Keep important engineering and product decisions beside the code that depends on them.

`decision-log` is an AI-agent skill and a small Node.js helper for recording *why* a choice was made—not just what changed. Each decision is stored as versioned Markdown in the target repository, so it can be reviewed with commits and pull requests.

## What it records

Create a decision record when a future maintainer may reasonably ask, “Why did we do this?” For example:

- choosing an architecture, persistence layer, dependency, API contract, or workflow;
- accepting an important trade-off;
- rejecting a plausible alternative; or
- documenting assumptions that could later become invalid.

Routine formatting and purely mechanical refactors should stay in the Git diff rather than becoming decision records.

Each record includes:

- context;
- the decision;
- consequences and trade-offs;
- alternatives considered;
- assumptions; and
- references to commits, pull requests, issues, or designs.

## Repository layout

```text
decision-log-skill/
├── decision-log/              # Codex skill definition
│   └── SKILL.md
├── scripts/decision-log.mjs   # Record creation and validation helper
└── test/                      # Node.js tests
```

The helper writes decision records to the repository being documented:

```text
your-project/
└── docs/
    └── decisions/
        ├── 001-use-sqlite-for-local-state.md
        └── README.md
```

## Install the skill in Codex

Copy or symlink the `decision-log/` directory into your local Codex skills directory. For example:

```bash
ln -s "$(pwd)/decision-log" "$HOME/.codex/skills/decision-log"
```

Restart Codex after installing it. The skill then triggers when you ask to record, find, review, or summarize a consequential decision.

## Create a record

Create an input file such as `decision.json` in the project whose decision you want to document:

```json
{
  "title": "Use SQLite for local state",
  "context": "The MVP needs portable local persistence without a service dependency.",
  "decision": "Use SQLite for the single-user MVP.",
  "consequences": "Add a migration path before any multi-user deployment.",
  "alternatives": "JSON files were rejected because concurrent updates are unsafe.",
  "assumptions": "The MVP runs as a single local process.",
  "references": ["PR #42", "abc1234"]
}
```

Run the helper from that project:

```bash
node /path/to/decision-log-skill/scripts/decision-log.mjs create decision.json
```

It creates the next sequential record and updates the generated index block in `docs/decisions/README.md`. Existing records are never overwritten.

## Validate records

Check that every record contains the required sections:

```bash
node /path/to/decision-log-skill/scripts/decision-log.mjs validate .
```

## Development

Requires Node.js 22 or newer. No package installation is needed.

```bash
node --test
node --check scripts/decision-log.mjs
```

## Current scope

This first version is deliberately local and Git-native. It does not yet automatically read GitHub pull requests, search across repositories, or provide a web UI. Those can be layered on once the recording workflow proves useful.
