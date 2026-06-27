# Fincept Terminal — Trump Signals Panel

The bridge pushes two signal types into Fincept:

## Signal Schema (sent over MCP WebSocket)

```json
{
  "type": "external_signal",
  "source": "trump-trade-scanner",
  "signalType": "political" | "contract",
  "panel": "Trump Signals" | "Gov Contracts",
  "title": "🚨 TRUMP TRADE SIGNAL [78/100] — ITA, defense",
  "score": 78,
  "tickers": ["ITA", "LMT"],
  "direction": "bullish" | "bearish" | "neutral",
  "urgency": "high" | "medium" | "low",
  "body": "full alert text",
  "timestamp": "2025-06-27T14:23:00Z"
}
```

## Recommended Fincept Panel Setup

### Panel 1: "Trump Signals"
- Data source: `external_signal` where `panel == "Trump Signals"`
- Columns: Time | Score | Tickers | Direction | Urgency | Post Preview
- Sort: newest first
- Color rows: red border for urgency=high, yellow for medium
- Click row → opens full post text in side drawer

### Panel 2: "Gov Contracts"
- Data source: `external_signal` where `panel == "Gov Contracts"`
- Columns: Time | Company | Amount | Sector | State
- Sort: amount descending
- Click row → opens full contract details
- Add to watchlist button → pins company for ticker research

### Watchlist Integration
When a Trump signal arrives with tickers, auto-add them to a
"Trump Watch" watchlist with:
- Entry price at time of signal
- Score annotation on chart
- Auto-remove after 48h if no follow-through

### Chart Annotations
For each bullish signal: overlay a green vertical line on the
affected ticker's chart with the post score as label.
For bearish: red vertical line.
This lets you backtest whether high-score signals actually moved the stock.
