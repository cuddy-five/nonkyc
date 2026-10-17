# Project brief: NonKYC MCP

## Outcome

An MCP server that lets an AI assistant query NonKYC.io and turn raw market data into
trading insight, centred on **BTCB2** (Bitcoin Blake2b fork, "XBT"). It reports what the
data says; it never places orders.

## Users

The owner, asking an assistant questions such as "Is BTCB2 overbought?", "Where is the
liquidity in the BTCB2/USDT book?", or "Is BTCB2 cheaper on the BTC pair than USDT?"

## Data source

Public NonKYC REST API, base `https://api.nonkyc.io/api/v2`, no key required. Verified
2026-10-16:

| Endpoint | Returns |
|---|---|
| `GET /ticker/{BASE_QUOTE}` | 24h ticker: last, bid, ask, high, low, volumes, change % |
| `GET /tickers` | All tickers |
| `GET /markets` | All markets (base, quote, active) |
| `GET /market/getbysymbol/{BASE_QUOTE}` | Market detail incl. decimals, best bid/ask |
| `GET /asset/getbyticker/{TICKER}` | Asset metadata and status flags |
| `GET /orderbook?ticker_id=BTCB2_USDT&depth=N` | Bids and asks as `[price, qty]` strings |
| `GET /historical_trades?ticker_id=BTCB2_USDT&limit=N` | Trades with price, volumes, side, timestamp |
| `GET /market/candles?symbol=BTCB2/USDT&resolution=60&countBack=N&firstDataRequest=1` | OHLCV bars (`resolution` in minutes) |

BTCB2 markets: `BTCB2_USDT`, `BTCB2_BTC`, `BTCB2_YEC`. Numbers arrive as strings.

## Required capabilities

1. Market data tools: markets, ticker, order book, recent trades, candles.
2. Fundamental analysis algorithms (pure functions with tests):
   - Trend: SMA, EMA, MACD.
   - Momentum: RSI (Wilder), stochastic oscillator, rate of change.
   - Volatility: Bollinger Bands, ATR, realized (log-return) volatility.
   - Volume and flow: VWAP, OBV, buy/sell trade-flow imbalance.
   - Liquidity: spread, depth within ±x%, order-book imbalance, slippage for a size.
   - Risk: returns, max drawdown, Sharpe and Sortino ratios.
   - Cross-market: implied BTCB2 price across USDT and BTC pairs and the spread.
3. An `analyze_market` tool that combines the above into a plain-language report with the
   numbers behind each statement.

## Constraints

- Read-only. No API keys, no trading endpoints.
- Node 24, TypeScript, `@modelcontextprotocol/sdk` v1, zod.
- Unit tests never hit the network; `npm run smoke` is the only live check.

## Acceptance for every task

`npm test` and `npm run smoke` pass, and each new tool is callable over stdio.

## Owner decisions

- Agents may merge verified PRs into `main` without a human click.
- Security review is out of scope for this project.
- Repository is public.
