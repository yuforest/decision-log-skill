#!/usr/bin/env node
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join, resolve } from "node:path";

const REQUIRED_SECTIONS = [
  "Context",
  "Decision",
  "Consequences",
  "Alternatives considered",
  "Assumptions",
  "References",
];

const INDEX_START = "<!-- decision-log:index:start -->";
const INDEX_END = "<!-- decision-log:index:end -->";

export function slugify(value) {
  const slug = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "decision";
}

function yamlString(value) {
  return JSON.stringify(value);
}

function normalizeText(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeReferences(value) {
  if (!Array.isArray(value)) {
    throw new Error("references must be an array.");
  }

  return value.map((reference) => normalizeText(reference, "reference"));
}

function recordMarkdown(input, number) {
  const references = input.references.length === 0
    ? "- None"
    : input.references.map((reference) => `- ${reference}`).join("\n");

  return `---
title: ${yamlString(input.title)}
status: accepted
date: ${new Date().toISOString().slice(0, 10)}
---

# ${String(number).padStart(3, "0")}. ${input.title}

## Context

${input.context}

## Decision

${input.decision}

## Consequences

${input.consequences}

## Alternatives considered

${input.alternatives}

## Assumptions

${input.assumptions}

## References

${references}
`;
}

async function findNextNumber(decisionsDirectory) {
  const entries = await readdir(decisionsDirectory, { withFileTypes: true });
  const numbers = entries
    .filter((entry) => entry.isFile())
    .map((entry) => /^(\d+)-.+\.md$/u.exec(entry.name)?.[1])
    .filter((number) => number !== undefined)
    .map(Number);

  return (numbers.length === 0 ? 0 : Math.max(...numbers)) + 1;
}

async function readIfPresent(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function indexBlock(records) {
  const rows = records.length === 0
    ? "_No decisions recorded yet._"
    : records.map(({ file, title }) => `- [${file.slice(0, 3)}. ${title}](./${file})`).join("\n");

  return `${INDEX_START}
## Decision records

${rows}
${INDEX_END}`;
}

async function updateIndex(decisionsDirectory) {
  const entries = await readdir(decisionsDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^(\d+)-.+\.md$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
  const records = await Promise.all(files.map(async (file) => {
    const content = await readFile(join(decisionsDirectory, file), "utf8");
    const title = /^title:\s*"(.*)"$/mu.exec(content)?.[1] ?? basename(file, ".md");
    return { file, title };
  }));
  const indexPath = join(decisionsDirectory, "README.md");
  const existing = await readIfPresent(indexPath);
  const block = indexBlock(records);
  const next = existing === null
    ? `# Decision log\n\n${block}\n`
    : existing.includes(INDEX_START) && existing.includes(INDEX_END)
      ? existing.replace(new RegExp(`${INDEX_START}[\\s\\S]*?${INDEX_END}`, "u"), block)
      : `${existing.trimEnd()}\n\n${block}\n`;

  await writeFile(indexPath, next, "utf8");
}

export async function createDecision({
  repositoryRoot,
  title,
  context,
  decision,
  consequences,
  alternatives,
  assumptions,
  references,
}) {
  const input = {
    title: normalizeText(title, "title"),
    context: normalizeText(context, "context"),
    decision: normalizeText(decision, "decision"),
    consequences: normalizeText(consequences, "consequences"),
    alternatives: normalizeText(alternatives, "alternatives"),
    assumptions: normalizeText(assumptions, "assumptions"),
    references: normalizeReferences(references),
  };
  const decisionsDirectory = join(resolve(repositoryRoot), "docs", "decisions");
  await mkdir(decisionsDirectory, { recursive: true });
  const number = await findNextNumber(decisionsDirectory);
  const file = `${String(number).padStart(3, "0")}-${slugify(input.title)}.md`;
  const recordPath = join(decisionsDirectory, file);

  await writeFile(recordPath, recordMarkdown(input, number), { encoding: "utf8", flag: "wx" });
  await updateIndex(decisionsDirectory);
  return { recordPath, number };
}

export async function validateDecisionLog(repositoryRoot) {
  const decisionsDirectory = join(resolve(repositoryRoot), "docs", "decisions");
  try {
    await access(decisionsDirectory, constants.R_OK);
  } catch {
    return { ok: true, errors: [] };
  }

  const entries = await readdir(decisionsDirectory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && /^(\d+)-.+\.md$/u.test(entry.name));
  const errors = [];
  for (const entry of files) {
    const content = await readFile(join(decisionsDirectory, entry.name), "utf8");
    for (const section of REQUIRED_SECTIONS) {
      const matcher = new RegExp(`^## ${section}\\n\\n(?!\\s*(?:##|$))`, "mu");
      if (!matcher.test(content)) {
        errors.push(`${entry.name}: missing non-empty ${section} section.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

async function main(arguments_) {
  const [command, argument] = arguments_;
  if (command === "validate") {
    const result = await validateDecisionLog(argument ?? process.cwd());
    if (!result.ok) {
      console.error(result.errors.join("\n"));
      process.exitCode = 1;
    }
    return;
  }
  if (command === "create" && argument) {
    const input = JSON.parse(await readFile(resolve(argument), "utf8"));
    const result = await createDecision({ repositoryRoot: process.cwd(), ...input });
    console.log(JSON.stringify(result));
    return;
  }

  console.error("Usage: decision-log.mjs create <input.json> | validate [repository-root]");
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await main(process.argv.slice(2));
}
