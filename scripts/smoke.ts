// Live end-to-end check: start the built server over stdio, list tools, and call
// get_ticker and get_candles against the real NonKYC API. Exits non-zero on any failure.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/src/index.js"] }));

const { tools } = await client.listTools();
console.log(`tools: ${tools.map((t) => t.name).join(", ")}`);

const tickerResult = await client.callTool({ name: "get_ticker", arguments: { market: "BTCB2_USDT" } });
const tickerText = (tickerResult.content as { text: string }[])[0]?.text ?? "";
if (tickerResult.isError) throw new Error(`get_ticker failed: ${tickerText}`);
const { last_price } = JSON.parse(tickerText) as { last_price: string };
if (!(Number(last_price) > 0)) throw new Error(`implausible last_price: ${last_price}`);
console.log(`BTCB2_USDT last_price ${last_price}`);

const candlesResult = await client.callTool({ name: "get_candles", arguments: { market: "BTCB2_USDT", resolution: 60, count: 2 } });
const candlesText = (candlesResult.content as { text: string }[])[0]?.text ?? "";
if (candlesResult.isError) throw new Error(`get_candles failed: ${candlesText}`);
const candles = JSON.parse(candlesText);
if (!Array.isArray(candles) || candles.length === 0) throw new Error(`No candles returned`);
console.log(`BTCB2_USDT candles:`, candles);

// --- Extended smoke tests for all MCP tools ---

// list_markets
const marketsResult = await client.callTool({ name: "list_markets", arguments: {} });
const marketsText = (marketsResult.content as { text: string }[])[0]?.text ?? "";
if (marketsResult.isError) throw new Error(`list_markets failed: ${marketsText}`);
const markets = JSON.parse(marketsText);
if (!Array.isArray(markets) || markets.length === 0) throw new Error(`No markets returned`);
console.log(`Markets:`, markets.map((m: any) => m.symbol).join(", "));

// get_orderbook
const orderbookResult = await client.callTool({ name: "get_orderbook", arguments: { market: "BTCB2_USDT", depth: 2 } });
const orderbookText = (orderbookResult.content as { text: string }[])[0]?.text ?? "";
if (orderbookResult.isError) throw new Error(`get_orderbook failed: ${orderbookText}`);
const orderbook = JSON.parse(orderbookText);
if (!orderbook.bids?.length || !orderbook.asks?.length) throw new Error(`No bids/asks in orderbook`);
console.log(`Orderbook bids:`, orderbook.bids, "asks:", orderbook.asks);

// get_trades
const tradesResult = await client.callTool({ name: "get_trades", arguments: { market: "BTCB2_USDT", limit: 2 } });
const tradesText = (tradesResult.content as { text: string }[])[0]?.text ?? "";
if (tradesResult.isError) throw new Error(`get_trades failed: ${tradesText}`);
const trades = JSON.parse(tradesText);
if (!Array.isArray(trades) || trades.length === 0) throw new Error(`No trades returned`);
console.log(`Trades:`, trades);

await client.close();
