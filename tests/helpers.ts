import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { NonkycClient, type Fetch } from "../src/nonkyc.js";
import { createServer } from "../src/server.js";

/** Fake fetch that answers by URL pathname and records every requested URL. */
export function fakeFetch(routes: Record<string, unknown>) {
  const calls: URL[] = [];
  const fetch: Fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    const path = url.pathname.replace(/^\/api\/v2/, "");
    if (!(path in routes)) return new Response("not found", { status: 404 });
    return Response.json(routes[path]);
  };
  return { fetch, calls };
}

/** Connects an MCP client to a server whose NonKYC client uses the given fake routes. */
export async function connect(routes: Record<string, unknown>) {
  const fake = fakeFetch(routes);
  const server = createServer(new NonkycClient({ fetch: fake.fetch }));
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return { client, calls: fake.calls };
}

export function textOf(result: unknown): string {
  const content = (result as { content: { type: string; text: string }[] }).content;
  return content.map((c) => c.text).join("");
}
