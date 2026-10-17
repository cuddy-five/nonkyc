---
name: Model Probe
description: Checks whether a Copilot model is usable from Actions on this plan.
on:
  workflow_dispatch:
    inputs:
      model:
        description: Model id to probe
        required: true
        type: string
run-name: "probe ${{ inputs.model }}"
concurrency:
  group: "probe-${{ github.run_id }}"
  job-discriminator: ${{ github.run_id }}
permissions:
  contents: read
engine:
  id: copilot
  model: ${{ inputs.model }}
timeout-minutes: 8
tools:
  bash: false
  cli-proxy: false
  github: false
safe-outputs:
  threat-detection: false
  report-failure-as-issue: false
---

Reply with the single word OK and call the `noop` tool.
