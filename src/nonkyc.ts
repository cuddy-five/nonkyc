// Read-only client for the public NonKYC.io REST API (no key required).
// Every network call goes through `request`, so tests inject a fake fetch.

export const DEFAULT_BASE_URL = "https://api.nonkyc.io/api/v2";

export type Fetch = typeof globalThis.fetch;

export interface ClientOptions {
  baseUrl?: string;
  fetch?: Fetch;
  timeoutMs?: number;
}

/** Ticker as returned by GET /ticker/{ticker_id}. Numbers arrive as strings. */
export interface Ticker {
  ticker_id: string;
  base_currency: string;
  target_currency: string;
  last_price: string;
  base_volume: string;
  target_volume: string;
  usd_volume_est: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
  change_percent: string;
  previous_day_price: string;
}

export class NonkycError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "NonkycError";
  }
}

/** Accepts "BTCB2_USDT", "BTCB2/USDT", or "btcb2-usdt" and returns "BTCB2_USDT". */
export function normalizeTickerId(input: string): string {
  const id = input.trim().toUpperCase().replace(/[/-]/g, "_");
  if (!/^[A-Z0-9]+_[A-Z0-9]+$/.test(id)) {
    throw new NonkycError(`Invalid market "${input}"; expected BASE_QUOTE such as BTCB2_USDT`);
  }
  return id;
}

export interface Market {
  symbol: string;
  base: string;
  quote: string;
  active: boolean;
}

export interface Orderbook {
  bids: [number, number][];
  asks: [number, number][];
}

export interface Trade {
  price: number;
  quantity: number;
  side: "buy" | "sell";
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class NonkycClient {
  private readonly baseUrl: string;
  private readonly fetch: Fetch;
  private readonly timeoutMs: number;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetch = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async request<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const response = await this.fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new NonkycError(`NonKYC ${path} returned HTTP ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  }

  getTicker(market: string): Promise<Ticker> {
    return this.request<Ticker>(`/ticker/${normalizeTickerId(market)}`);
  }

  async listMarkets(): Promise<Market[]> {
    const data = await this.request<any[]>(`/markets`);
    return data.map((m) => ({
      symbol: m.symbol,
      base: m.base,
      quote: m.quote,
      active: Boolean(m.active),
    }));
  }

  async getOrderbook(market: string, depth: number): Promise<Orderbook> {
    const data = await this.request<any>(`/orderbook`, {
      ticker_id: normalizeTickerId(market),
      depth,
    });
    return {
      bids: (data.bids ?? []).map(([p, q]: [string, string]) => [Number(p), Number(q)]),
      asks: (data.asks ?? []).map(([p, q]: [string, string]) => [Number(p), Number(q)]),
    };
  }

  async getTrades(market: string, limit: number): Promise<Trade[]> {
    const data = await this.request<any[]>(`/historical_trades`, {
      ticker_id: normalizeTickerId(market),
      limit,
    });
    return data.map((t) => ({
      price: Number(t.price),
      quantity: Number(t.quantity),
      side: t.side,
      timestamp: Number(t.timestamp),
    }));
  }

  async getCandles(market: string, resolution: number, count: number): Promise<Candle[]> {
    const data = await this.request<any[]>(`/market/candles`, {
      symbol: normalizeTickerId(market).replace("_", "/"),
      resolution,
      countBack: count,
      firstDataRequest: 1,
    });
    return data.map((c) => ({
      time: Number(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    }));
  }
}
