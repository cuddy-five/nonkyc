import assert from "node:assert/strict";
import { test } from "node:test";
import { NonkycError, normalizeTickerId } from "../src/nonkyc.js";
import { connect, textOf } from "./helpers.js";

const ticker = { ticker_id: "BTCB2_USDT", last_price: "644.74", bid: "644.68", ask: "645.16" };
const markets = [
  { symbol: "BTCB2_USDT", base: "BTCB2", quote: "USDT", active: true },
  { symbol: "BTCB2_BTC", base: "BTCB2", quote: "BTC", active: true },
  { symbol: "YEC_USDT", base: "YEC", quote: "USDT", active: false },
];
const orderbook = {
  bids: [["644.00", "1.5"], ["643.50", "2.0"]],
  asks: [["645.00", "1.2"], ["646.00", "0.8"]],
};
const trades = [
  { price: "644.5", quantity: "0.1", side: "buy", timestamp: "1700000000" },
  { price: "644.7", quantity: "0.2", side: "sell", timestamp: "1700000001" },
];
const candles = [
  { time: "1700000000", open: "640", high: "650", low: "638", close: "645", volume: "10" },
  { time: "1700000600", open: "645", high: "648", low: "642", close: "646", volume: "8" },
];

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

test("list_markets returns all markets and filters by base", async () => {
  const { client } = await connect({ "/markets": markets });
  const all = await client.callTool({ name: "list_markets", arguments: {} });
  assert.deepEqual(JSON.parse(textOf(all)), markets);
  const filtered = await client.callTool({ name: "list_markets", arguments: { base: "BTCB2" } });
  assert.deepEqual(JSON.parse(textOf(filtered)), markets.filter((m) => m.base === "BTCB2"));
});

test("get_orderbook parses bids/asks as numbers", async () => {
  const { client } = await connect({ "/orderbook": orderbook });
  const result = await client.callTool({ name: "get_orderbook", arguments: { market: "BTCB2_USDT", depth: 2 } });
  assert.deepEqual(JSON.parse(textOf(result)), {
    bids: [[644, 1.5], [643.5, 2]],
    asks: [[645, 1.2], [646, 0.8]],
  });
});

test("get_trades parses trades as numbers and handles sides", async () => {
  const { client } = await connect({ "/historical_trades": trades });
  const result = await client.callTool({ name: "get_trades", arguments: { market: "BTCB2_USDT", limit: 2 } });
  assert.deepEqual(JSON.parse(textOf(result)), [
    { price: 644.5, quantity: 0.1, side: "buy", timestamp: 1700000000 },
    { price: 644.7, quantity: 0.2, side: "sell", timestamp: 1700000001 },
  ]);
});

test("get_candles parses candles as numbers", async () => {
  const { client } = await connect({ "/market/candles": candles });
  const result = await client.callTool({ name: "get_candles", arguments: { market: "BTCB2_USDT", resolution: 60, count: 2 } });
  assert.deepEqual(JSON.parse(textOf(result)), [
    { time: 1700000000, open: 640, high: 650, low: 638, close: 645, volume: 10 },
    { time: 1700000600, open: 645, high: 648, low: 642, close: 646, volume: 8 },
  ]);
});

test("tools report API errors as tool errors", async () => {
  const { client } = await connect({});
  for (const name of ["list_markets", "get_orderbook", "get_trades", "get_candles"]) {
    const result = await client.callTool({ name, arguments: { market: "BTCB2_USDT" } });
    assert.equal(result.isError, true);
    assert.match(textOf(result), /HTTP 404/);
  }
});

test("input validation: rejects bad market, depth, limit, resolution, count", async () => {
  const { client } = await connect({ "/markets": markets, "/orderbook": orderbook, "/historical_trades": trades, "/market/candles": candles });
  // Bad market
  let result = await client.callTool({ name: "get_orderbook", arguments: { market: "BTCB2" } });
  assert.equal(result.isError, true);
  // Bad depth
  result = await client.callTool({ name: "get_orderbook", arguments: { market: "BTCB2_USDT", depth: -1 } });
  assert.equal(result.isError, true);
  // Bad limit
  result = await client.callTool({ name: "get_trades", arguments: { market: "BTCB2_USDT", limit: 0 } });
  assert.equal(result.isError, true);
  // Bad resolution
  result = await client.callTool({ name: "get_candles", arguments: { market: "BTCB2_USDT", resolution: 0, count: 2 } });
  assert.equal(result.isError, true);
  // Bad count
  result = await client.callTool({ name: "get_candles", arguments: { market: "BTCB2_USDT", resolution: 60, count: 0 } });
  assert.equal(result.isError, true);
});
