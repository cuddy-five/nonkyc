---
name: Agent Verifier
description: Re-derives evidence on a reviewed PR and releases it to the merge workflow.
on:
  workflow_dispatch:
    inputs:
      issue:
        description: Issue number whose PR to verify
        required: true
        type: string
      round:
        description: Round of the work being verified
        required: true
        type: string
run-name: "verifier #${{ inputs.issue }} r${{ inputs.round }}"
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
  args: ["--allow-all-urls"]
timeout-minutes: 25
checkout:
  ref: agent/issue-${{ inputs.issue }}
  fetch-depth: 0
steps:
  - name: Call every tool live, outside the sandbox
    run: |
      out=/tmp/gh-aw/agent/live.md
      mkdir -p /tmp/gh-aw/agent
      { npm ci && npm run build || echo "BUILD FAILED"
        echo "# npm run smoke"; node dist/scripts/smoke.js 2>&1 || echo "SMOKE FAILED (exit $?)"
        node .github/scripts/live-dump.mjs 2>&1 || echo "LIVE DUMP FAILED (exit $?)"
      } > "$out" 2>&1
      grep -E '^## |FAILED|ERROR' "$out" || true
imports:
  - shared/agent-loop.md
safe-outputs:
  threat-detection: false
  report-failure-as-issue: false
  dispatch-workflow:
    workflows: [merge, implementer]
    max: 1
---

# Role: verifier (skeptical)

Issue: #${{ inputs.issue }} · Round: ${{ inputs.round }}

Trust nothing that earlier roles claimed. The branch `agent/issue-${{ inputs.issue }}` is
checked out. Re-derive the evidence yourself:

1. From a clean tree run `npm ci && npm test` as one command.
2. Read `/tmp/gh-aw/agent/live.md`. A step outside the sandbox built this branch, ran
   `npm run smoke`, and called every tool against `BTCB2_USDT` and `BTCB2_BTC` on the live
   API. Any `FAILED` or `ERROR` there is a failure of the PR. Check outputs are plausible:
   prices positive, numbers parsed (not strings), indicator values within their defined
   range (e.g. RSI in 0..100), array lengths matching inputs, no NaN.
3. Spot-check at least one value against the raw API with `curl`, and recompute one
   indicator independently if the PR adds one.
4. Check every acceptance criterion in the approved plan.

Do not run `npm run smoke` yourself; it cannot reach the network from the sandbox.

Call `add_comment` once on the issue with marker `role=verifier stage=verify`, listing
each check, the command you ran, and pass/fail.

- All pass: verdict `pass`, then call the `merge` tool with input `issue`.
- Any fail: verdict `fail` with reproducible findings, then call the `implementer` tool
  with `issue` and `round` = current round + 1 (unless round is 3: block instead).
