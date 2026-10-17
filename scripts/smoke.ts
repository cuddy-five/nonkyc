// Live end-to-end check: start the built server over stdio, list tools, and call
// get_ticker against the real NonKYC API. Exits non-zero on any failure.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/src/index.js"] }));

const { tools } = await client.listTools();
console.log(`tools: ${tools.map((t) => t.name).join(", ")}`);

const result = await client.callTool({ name: "get_ticker", arguments: { market: "BTCB2_USDT" } });
const text = (result.content as { text: string }[])[0]?.text ?? "";
if (result.isError) throw new Error(`get_ticker failed: ${text}`);
const { last_price } = JSON.parse(text) as { last_price: string };
if (!(Number(last_price) > 0)) throw new Error(`implausible last_price: ${last_price}`);
console.log(`BTCB2_USDT last_price ${last_price}`);

await client.close();
