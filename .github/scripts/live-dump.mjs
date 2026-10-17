// Calls every tool of the built server against the live API and prints Markdown.
// Runs outside the agent sandbox (Node there cannot reach the network); the verifier reads it.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const markets = ["BTCB2_USDT", "BTCB2_BTC"];
const client = new Client({ name: "live-dump", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/src/index.js"] }));

const { tools } = await client.listTools();
console.log(`# Live tool calls\n\nTools: ${tools.map((t) => t.name).join(", ")}\n`);
for (const tool of tools) {
  const props = tool.inputSchema?.properties ?? {};
  const missing = (tool.inputSchema?.required ?? []).filter((k) => k !== "market");
  if (missing.length) {
    console.log(`## ${tool.name}\n\nSkipped: requires ${missing.join(", ")} with no default.\n`);
    continue;
  }
  for (const args of "market" in props ? markets.map((market) => ({ market })) : [{}]) {
    const res = await client.callTool({ name: tool.name, arguments: args });
    const text = res.content.map((c) => c.text ?? "").join("\n");
    const cut = text.length > 4000 ? `${text.slice(0, 4000)}\n… (${text.length} chars)` : text;
    console.log(`## ${tool.name} ${JSON.stringify(args)}${res.isError ? " — ERROR" : ""}\n\n\`\`\`json\n${cut}\n\`\`\`\n`);
  }
}
await client.close();
