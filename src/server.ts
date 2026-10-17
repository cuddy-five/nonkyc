import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NonkycClient } from "./nonkyc.js";

export const DEFAULT_MARKET = "BTCB2_USDT";

const market = z
  .string()
  .default(DEFAULT_MARKET)
  .describe("Market as BASE_QUOTE, e.g. BTCB2_USDT, BTCB2_BTC, BTCB2_YEC");
const depth = z.number().int().positive().max(1000).default(20).describe("Order book depth (max 1000)");
const limit = z.number().int().positive().max(1000).default(50).describe("Number of trades (max 1000)");
const resolution = z.number().int().positive().default(60).describe("Candle resolution in minutes");
const count = z.number().int().positive().max(1000).default(100).describe("Number of candles (max 1000)");
const base = z.string().optional().describe("Optional base currency filter, e.g. BTCB2");

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

  server.registerTool(
    "list_markets",
    {
      title: "List markets",
      description: "List all available NonKYC markets. Optionally filter by base.",
      inputSchema: { base },
    },
    async ({ base }) => {
      let markets = await client.listMarkets();
      if (base) markets = markets.filter((m) => m.base === base);
      return json(markets);
    },
  );

  server.registerTool(
    "get_orderbook",
    {
      title: "Get order book",
      description: "Order book for a market (bids/asks, up to depth).",
      inputSchema: { market, depth },
    },
    async ({ market, depth }) => json(await client.getOrderbook(market, depth)),
  );

  server.registerTool(
    "get_trades",
    {
      title: "Get trades",
      description: "Recent trades for a market (limit).",
      inputSchema: { market, limit },
    },
    async ({ market, limit }) => json(await client.getTrades(market, limit)),
  );

  server.registerTool(
    "get_candles",
    {
      title: "Get candles",
      description: "OHLCV candles for a market (resolution, count).",
      inputSchema: { market, resolution, count },
    },
    async ({ market, resolution, count }) => json(await client.getCandles(market, resolution, count)),
  );

  return server;
}
