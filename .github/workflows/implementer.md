---
name: Agent Implementer
description: Executes the approved plan and opens or updates the pull request.
on:
  workflow_dispatch:
    inputs:
      issue:
        description: Issue number to implement
        required: true
        type: string
      round:
        description: 1 opens the PR; higher rounds fix review or verification findings
        required: true
        type: string
run-name: "implementer #${{ inputs.issue }} r${{ inputs.round }}"
concurrency:
  job-discriminator: ${{ github.run_id }}
if: vars.AGENTS_PAUSED != 'true'
permissions:
  contents: read
  issues: read
  pull-requests: read
  copilot-requests: write
engine:
  id: copilot
  model: gpt-4.1
timeout-minutes: 40
checkout:
  ref: ${{ inputs.round == '1' && github.ref || format('agent/issue-{0}', inputs.issue) }}
  fetch-depth: 0
  fetch: ["*"]
imports:
  - shared/agent-loop.md
safe-outputs:
  threat-detection: false
  report-failure-as-issue: false
  create-pull-request:
    title-prefix: "[agent] "
    labels: [agent-pr]
    draft: false
    preserve-branch-name: true
    allowed-branches: ["agent/issue-*"]
    auto-close-issue: true
    fallback-as-issue: false
    github-token-for-extra-empty-commit: none
    protected-files:
      policy: blocked
      exclude: [package.json, package-lock.json, README.md, tsconfig.json]
  push-to-pull-request-branch:
    target: "*"
    required-title-prefix: "[agent] "
    github-token-for-extra-empty-commit: none
    protected-files:
      policy: blocked
      exclude: [package.json, package-lock.json, README.md, tsconfig.json]
---

# Role: implementer (constructive)

Issue: #${{ inputs.issue }} · Round: ${{ inputs.round }}

1. Read the issue, the newest `role=planner stage=plan` comment that a reviewer approved,
   `AGENTS.md`, and `PROJECT.md`. In rounds above 1, also read the newest reviewer or
   verifier findings (issue comments and PR review comments) and address every one.
2. Round 1: run `git checkout -b agent/issue-${{ inputs.issue }}` first. Later rounds are
   already on that branch. Implement exactly the approved plan. Follow the existing patterns: pure functions in
   `src/analysis/`, network only through `NonkycClient` in `src/nonkyc.ts`, tools
   registered in `src/server.ts`, tests in `tests/` using the fake fetch helper.
3. Run `npm ci` (or `npm install <pkg>` if the plan adds a dependency) and `npm test`
   until green. Commit with a clear message.
4. Round 1: create a pull request from branch `agent/issue-${{ inputs.issue }}` with a body
   that lists each acceptance criterion and how the change meets it, and `Fixes #${{ inputs.issue }}`.
   Rounds above 1: find the open PR for that branch with the GitHub tools and push to it.
5. Post a short issue comment with marker `role=implementer stage=code` and
   verdict `submitted`, summarizing what changed for the overseer.

Do not dispatch anything; the `Agent Handoff` workflow starts the reviewer once your PR exists.
Never edit `.github/`, `AGENTS.md`, or `PROJECT.md`. If the plan cannot work as written,
post verdict `blocked` with the reason and add `agent-blocked` instead of improvising.
