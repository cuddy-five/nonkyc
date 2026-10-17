import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NonkycClient } from "./nonkyc.js";

export const DEFAULT_MARKET = "BTCB2_USDT";

const market = z
  .string()
  .default(DEFAULT_MARKET)
  .describe("Market as BASE_QUOTE, e.g. BTCB2_USDT, BTCB2_BTC, BTCB2_YEC");

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/** Builds the MCP server. Register every tool here so tests see the same surface as clients. */
export function createServer(client = new NonkycClient()): McpServer {
  const server = new McpServer({ name: "nonkyc-mcp", version: "0.1.0" });

  server.registerTool(
    "get_ticker",
    {
      title: "Get ticker",
      description: "24h ticker for a NonKYC market: last price, bid/ask, high/low, volume, change.",
      inputSchema: { market },
    },
    async ({ market }) => json(await client.getTicker(market)),
  );

  return server;
}
