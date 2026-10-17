# Operating the agent loop

## Pieces

| File | Kind | Job |
|---|---|---|
| `.github/workflows/planner.md` | gh-aw agent | Triggered by label `agent` or dispatch; posts a plan; dispatches the reviewer. |
| `.github/workflows/reviewer.md` | gh-aw agent | `stage=plan` or `stage=code`; approves forward or sends back with `round+1`. |
| `.github/workflows/implementer.md` | gh-aw agent | Round 1 opens PR `agent/issue-N`; later rounds push fixes to it. |
| `.github/workflows/verifier.md` | gh-aw agent | Clean `npm ci`, `npm test`, `npm run smoke`, live tool calls; dispatches merge or implementer. |
| `.github/workflows/handoff.yml` | Actions | Every 5 minutes (and after first-hop runs), checks the newest loop run of each open `agent` issue: dispatches the reviewer after the implementer; blocks the issue on a failed run or on a role that ended without handing off. |
| `.github/workflows/merge.yml` | Actions | Refuses `.github/`, `AGENTS.md`, `PROJECT.md` changes; runs `npm test`; squash-merges; closes the issue; starts the next `agent-queue` issue. |
| `.github/workflows/shared/agent-loop.md` | gh-aw import | Tools, network allowlist, shared safe outputs and loop rules. |

Each `.md` workflow compiles to a `.lock.yml` that Actions runs. After editing a `.md`:

```bash
gh aw compile          # regenerate every .lock.yml
```

`gh aw compile` validates the frontmatter and writes the lock files. With no argument
it compiles every workflow; `gh aw compile reviewer` compiles one. `gh aw validate`
checks without writing.

## Why the routing looks like this

- Agents cannot push to or merge `main` themselves: gh-aw's `merge-pull-request` refuses the
  default branch. `merge.yml` is a plain workflow holding `contents: write`.
- PRs and labels created with `GITHUB_TOKEN` do not trigger other workflows, but
  `workflow_dispatch` does. Every hop is therefore a dispatch, and `merge.yml` re-runs
  the tests itself, since `ci.yml` does not fire on agent PRs.
- The implementer cannot know its PR number when it finishes (gh-aw creates the PR in a
  later job), so `handoff.yml` waits for the whole run to end and then routes.
- Runs started by `GITHUB_TOKEN` do not emit `workflow_run`, so `handoff.yml` cannot rely
  on it after the first hop. It sweeps on a 5-minute schedule instead; GitHub may delay
  scheduled runs, so a stage can take a few extra minutes to start.
- Agent comments come from `github-actions[bot]`. The GitHub MCP integrity filter hides
  those by default, so the shared import sets `min-integrity: none`.
- Threat detection is disabled (owner's choice), which halves premium requests per run.

## Commands

```bash
gh workflow run planner.lock.yml -f issue=12 -f round=1      # start or restart planning
gh workflow run reviewer.lock.yml -f issue=12 -f stage=code -f round=2
gh run list --limit 20                                        # what is running
gh run watch                                                  # follow one run live
gh aw logs implementer                                        # download agent logs and usage
gh aw audit <run-id>                                          # explain one run
gh variable set AGENTS_PAUSED --body true                     # halt; --body false to resume
```

`gh workflow run <file> -f key=value` dispatches a workflow; `-f` passes one input per
flag. `gh run watch` with no ID asks which run to follow. `gh aw logs` takes a workflow
name and downloads recent runs into `.github/aw/logs/` (git-ignored). Add `-c 5` to
limit the count.

## Cost

Copilot engine billed as premium requests through `permissions.copilot-requests: write`;
no secret needed. Roughly one request per agent run: one task is about 4–5 runs when
nothing bounces, plus 2 per fix round.

## Models

Actions calls Copilot with the workflow's `GITHUB_TOKEN`. On this plan that token reaches
only `gpt-4.1`; every other model returns `400 The requested model is not supported`, even
models the owner's local Copilot CLI can use. `fallback-models` does not help: the harness
does not retry after `model_not_supported`. To test a model:

```bash
gh workflow run model-probe.lock.yml -f model=gpt-5.4
```

To run agents as the owner instead (same models as the local CLI), add a fine-grained
PAT with the **Copilot Requests** permission as secret `COPILOT_GITHUB_TOKEN`, then remove
`copilot-requests: write` from each agent's `permissions:` and recompile. Without that
permission gh-aw reads the secret instead of `GITHUB_TOKEN`. Then re-probe and pin models
per role.

## Recovering

1. Read the newest `verdict=blocked` comment on the issue and the linked run.
2. Fix the cause (edit the issue, answer the question, or change a workflow and recompile).
3. Remove `agent-blocked` and re-dispatch the stage that stopped (commands above).
