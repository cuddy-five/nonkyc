# nonkyc-mcp

An MCP server for [NonKYC.io](https://nonkyc.io) market data with technical-analysis
algorithms, focused on **BTCB2** (Bitcoin Blake2b). It is built in the open by four
adversarial AI agents running as GitHub Agentic Workflows; see [AGENTS.md](AGENTS.md).

## Use it

```bash
npm ci && npm run build
```

Add to an MCP client, for example Claude Code:

```bash
claude mcp add nonkyc -- node /path/to/nonkyc/dist/src/index.js
```

Tools so far: `get_ticker`. The [project brief](PROJECT.md) lists what the agents are
building next.

## Watch the agents

- **Actions tab**: runs named `planner #N r1`, `reviewer #N r1 plan`, `implementer #N r1`,
  `verifier #N r1`, `merge #N r0`.
- **The issue**: every role posts a comment with its verdict and a plain-language note.
- **The PR**: reviewer inline comments and review summary.

Start work by labeling an issue `agent` (one at a time). Label the rest `agent-queue`;
each merge starts the oldest queued issue. Set the repository variable
`AGENTS_PAUSED=true` to stop everything. Issues labeled `agent-blocked` need you.

See [docs/agent-loop.md](docs/agent-loop.md) for operating details.
