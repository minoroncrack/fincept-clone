# fincept-clone — Session Bootstrap

Add this repo to every Claude session via the **Repo** field in the Claude Code web UI.

## Fincept Terminal (Data & Analytics Layer)

**Repo**: https://github.com/Fincept-Corporation/FinceptTerminal
**Source mirror**: `minoroncrack/ruflo-clone` → `fincept-terminal/`
**Ruflo plugin**: `minoroncrack/ruflo-clone` → `plugins/ruflo-fincept/`

Fincept Terminal is a Bloomberg-style C++20/Qt6 desktop application — the **data and analytics layer**.
Ruflo agents think and decide; Fincept provides:
- Advanced market analytics (equity research, DCF, 18-module QuantLib suite)
- 37 built-in AI investor agents (Buffett, Graham, Lynch, Munger, Klarman, Marks…)
- 100+ data connectors (FRED, DBnomics, IMF, World Bank, Polygon, Kraken, AkShare)
- Real-time trading execution (16 broker integrations)
- Embedded Python analytics + QuantLib

MCP bridge:
```bash
claude mcp add fincept-terminal localhost:3001
