import assert from "node:assert/strict";
import { test } from "node:test";
import { NonkycError, normalizeTickerId } from "../src/nonkyc.js";
import { connect, textOf } from "./helpers.js";

const ticker = { ticker_id: "BTCB2_USDT", last_price: "644.74", bid: "644.68", ask: "645.16" };

test("get_ticker defaults to BTCB2_USDT and returns the API payload", async () => {
  const { client, calls } = await connect({ "/ticker/BTCB2_USDT": ticker });
  const result = await client.callTool({ name: "get_ticker", arguments: {} });
  assert.deepEqual(JSON.parse(textOf(result)), ticker);
  assert.equal(calls[0]?.pathname, "/api/v2/ticker/BTCB2_USDT");
});

test("get_ticker reports API failures as tool errors", async () => {
  const { client } = await connect({});
  const result = await client.callTool({ name: "get_ticker", arguments: { market: "BTCB2_BTC" } });
  assert.equal(result.isError, true);
  assert.match(textOf(result), /HTTP 404/);
});

test("normalizeTickerId accepts common separators and rejects junk", () => {
  assert.equal(normalizeTickerId("btcb2/usdt"), "BTCB2_USDT");
  assert.equal(normalizeTickerId("BTCB2-BTC"), "BTCB2_BTC");
  assert.throws(() => normalizeTickerId("BTCB2"), NonkycError);
});
