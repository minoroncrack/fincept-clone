# Fincept Trump Bridge — Setup

## Architecture

```
ruflo-trump-scanner  →  ntfy.sh  →  this bridge  →  Fincept Terminal
     (ruflo-clone)       (cloud)    (fincept-clone)   (localhost:3001)
```

OR directly via webhook:

```
ruflo-trump-scanner  →  POST localhost:7433/signal  →  Fincept Terminal
```

## Step 1: Start Fincept Terminal

Make sure the Fincept Terminal MCP bridge is running:
```bash
# Fincept Terminal must be open with MCP bridge enabled
claude mcp add fincept-terminal localhost:3001
```

## Step 2: Install and start the bridge

```bash
cd plugins/fincept-trump-bridge
npm install

# With ntfy (same topic as your ruflo scanner)
NTFY_TOPIC=trump-scanner-mason2011 node src/bridge.mjs
```

You'll see:
```
[bridge] Connecting to Fincept MCP at ws://localhost:3001...
[bridge] Webhook receiver listening on http://localhost:7433/signal
[bridge] Subscribing to ntfy.sh/trump-scanner-mason2011...
[bridge] Trump Trade Scanner → Fincept bridge running.
```

## Step 3: Wire ruflo scanner to also POST to bridge

In ruflo-clone's scanner `.env`, add:
```bash
# Send to both ntfy AND local Fincept bridge
ALERT_WEBHOOK_URL=http://localhost:7433/signal
NTFY_TOPIC=trump-scanner-mason2011
```

Now every scanner alert goes to:
- Your phone (ntfy)
- Fincept Terminal (bridge WebSocket)
- Console log

## Step 4: In Fincept Terminal

Open the custom panels view and create:
- **"Trump Signals"** panel — filtered to `signalType: political`
- **"Gov Contracts"** panel — filtered to `signalType: contract`

See `src/fincept-panel.md` for the recommended column layout.

## Running both together

```bash
# Terminal 1: ruflo scanner
cd ruflo-clone/plugins/ruflo-trump-scanner
npm run scan

# Terminal 2: fincept bridge
cd fincept-clone/plugins/fincept-trump-bridge
NTFY_TOPIC=trump-scanner-mason2011 node src/bridge.mjs

# Fincept Terminal: running separately on your desktop
```

Or with pm2:
```bash
pm2 start ruflo-clone/plugins/ruflo-trump-scanner/scripts/scan-loop.mjs --name trump-scanner
pm2 start fincept-clone/plugins/fincept-trump-bridge/src/bridge.mjs --name fincept-bridge \
  --env NTFY_TOPIC=trump-scanner-mason2011
pm2 save
```
