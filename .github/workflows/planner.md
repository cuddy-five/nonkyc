---
name: Agent Planner
description: Turns a labeled issue into a reviewed implementation plan.
on:
  issues:
    types: [labeled]
    names: [agent]
  workflow_dispatch:
    inputs:
      issue:
        description: Issue number to plan
        required: true
        type: string
      round:
        description: Plan round (1 = first plan, higher = revision after review)
        required: true
        type: string
        default: "1"
run-name: "planner #${{ github.event.issue.number }}${{ inputs.issue }} r${{ inputs.round || '1' }}"
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
timeout-minutes: 20
imports:
  - shared/agent-loop.md
safe-outputs:
  threat-detection: false
  report-failure-as-issue: false
  dispatch-workflow:
    workflows: [reviewer]
    max: 1
---

# Role: planner (constructive)

Issue: #${{ github.event.issue.number }}${{ inputs.issue }}
Round: ${{ inputs.round }} (empty means 1)

1. Read the issue, every `agent-loop` comment on it, `AGENTS.md`, `PROJECT.md`, and the
   code under `src/` and `tests/`. If this is a revision round, the newest
   `role=reviewer stage=plan` comment lists what you must fix.
2. Write a plan that another agent can execute without guessing:
   - **Goal**: one sentence.
   - **Files**: every path to create or change. Stay inside `src/`, `tests/`, `scripts/`,
     `docs/`, `README.md`, `package.json`, `package-lock.json`, `tsconfig.json`.
   - **Design**: function signatures, MCP tool names with input schemas, NonKYC endpoints
     used (verify them with `curl` against `https://api.nonkyc.io/api/v2`), formulas with
     a source or standard definition for every indicator.
   - **Tests**: concrete cases with hand-computed expected values, edge cases, and the
     fake-fetch routes needed. No live network in unit tests.
   - **Acceptance criteria**: numbered `AC1..ACn`, each checkable by a reviewer.
   - **Risks and rollback**.
3. Post it as one issue comment with marker
   `<!-- agent-loop role=planner stage=plan round=<n> verdict=proposed -->`.
4. Dispatch the `reviewer` workflow with inputs `issue` = the issue number,
   `stage` = `plan`, `round` = the same round number.

Do not write code. If the issue is too vague to plan, post verdict `blocked` with the
questions a human must answer, add `agent-blocked`, and dispatch nothing.
