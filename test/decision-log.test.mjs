import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createDecision,
  slugify,
  validateDecisionLog,
} from "../scripts/decision-log.mjs";

test("slugify creates a stable lowercase filename slug", () => {
  assert.equal(slugify("Use SQLite for local storage!"), "use-sqlite-for-local-storage");
  assert.equal(slugify("  AIの判断ログ  "), "aiの判断ログ");
});

test("createDecision writes the record and updates the index", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "decision-log-"));

  const result = await createDecision({
    repositoryRoot,
    title: "Use SQLite for local storage",
    context: "The MVP needs portable local persistence.",
    decision: "Use SQLite.",
    consequences: "Add a migration path before multi-user deployment.",
    alternatives: "JSON files — rejected because concurrent updates are unsafe.",
    assumptions: "The MVP is single-user.",
    references: ["PR #42", "abc1234"],
  });

  assert.match(result.recordPath, /docs\/decisions\/001-use-sqlite-for-local-storage\.md$/);
  const record = await readFile(result.recordPath, "utf8");
  const index = await readFile(join(repositoryRoot, "docs/decisions/README.md"), "utf8");
  assert.match(record, /status: accepted/);
  assert.match(record, /PR #42/);
  assert.match(index, /001.*Use SQLite for local storage/);
});

test("createDecision preserves existing records and uses the next number", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "decision-log-"));
  const decisionsDirectory = join(repositoryRoot, "docs/decisions");
  await mkdir(decisionsDirectory, { recursive: true });
  await writeFile(join(decisionsDirectory, "001-existing.md"), "existing", "utf8");

  const result = await createDecision({
    repositoryRoot,
    title: "Existing",
    context: "context",
    decision: "decision",
    consequences: "consequences",
    alternatives: "alternatives",
    assumptions: "assumptions",
    references: [],
  });

  assert.match(result.recordPath, /002-existing\.md$/);
  assert.equal(await readFile(join(decisionsDirectory, "001-existing.md"), "utf8"), "existing");
});

test("validateDecisionLog reports a missing required section", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "decision-log-"));
  const decisionsDirectory = join(repositoryRoot, "docs/decisions");
  await mkdir(decisionsDirectory, { recursive: true });
  await writeFile(
    join(decisionsDirectory, "001-incomplete.md"),
    "---\ntitle: Incomplete\nstatus: accepted\n---\n\n## Context\nText\n",
    "utf8",
  );

  const result = await validateDecisionLog(repositoryRoot);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Decision/);
});
