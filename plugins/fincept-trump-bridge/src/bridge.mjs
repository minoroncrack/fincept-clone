#!/usr/bin/env node
/**
 * Fincept Trump Signal Bridge
 *
 * Listens for alerts from the ruflo-trump-scanner (via ntfy.sh webhook or
 * local Unix socket) and forwards them to the Fincept Terminal MCP bridge
 * at localhost:3001 as structured market signal events.
 *
 * Fincept Terminal displays them in the custom "Political Signals" panel
 * alongside your charts and watchlist.
 *
 * Usage:
 *   node src/bridge.mjs
 *
 * Env vars:
 *   FINCEPT_MCP_URL     — default ws://localhost:3001
 *   NTFY_TOPIC          — same topic as ruflo-trump-scanner (to receive alerts)
 *   BRIDGE_PORT         — local HTTP port for receiving webhook alerts (default 7433)
 */

import { WebSocket } from 'ws';
import { createServer } from 'http';

const FINCEPT_URL  = process.env.FINCEPT_MCP_URL ?? 'ws://localhost:3001';
const NTFY_TOPIC   = process.env.NTFY_TOPIC;
const BRIDGE_PORT  = Number(process.env.BRIDGE_PORT ?? 7433);

// --- Fincept MCP connection ---

let fincept = null;
let finceptReady = false;
const queue = [];

function connectFincept() {
  console.log(`[bridge] Connecting to Fincept MCP at ${FINCEPT_URL}...`);
  fincept = new WebSocket(FINCEPT_URL);

  fincept.on('open', () => {
    finceptReady = true;
    console.log('[bridge] Fincept MCP connected.');
    // Flush queued signals
    while (queue.length > 0) sendToFincept(queue.shift());
  });

  fincept.on('close', () => {
    finceptReady = false;
    console.log('[bridge] Fincept MCP disconnected. Reconnecting in 5s...');
    setTimeout(connectFincept, 5000);
  });

  fincept.on('error', err => {
    console.error('[bridge] Fincept WS error:', err.message);
  });
}

function sendToFincept(signal) {
  if (!finceptReady) {
    queue.push(signal);
    return;
  }
  const payload = JSON.stringify({
    type: 'external_signal',
    source: 'trump-trade-scanner',
    ...signal,
  });
  fincept.send(payload);
  console.log(`[bridge] → Fincept: ${signal.title}`);
}

// --- Parse incoming alert text into structured signal ---

function parseAlert(subject, body) {
  const isTrump    = subject.includes('TRUMP TRADE SIGNAL');
  const isContract = subject.includes('CONTRACT');

  // Extract score from subject like "[78/100]"
  const scoreMatch = subject.match(/(\d+)\/100/);
  const score = scoreMatch ? Number(scoreMatch[1]) : 0;

  // Extract tickers from body line "Tickers/ETFs: AAPL, ITA"
  const tickerLine = body.match(/Tickers\/ETFs:\s*(.+)/);
  const tickers = tickerLine
    ? tickerLine[1].split(',').map(t => t.trim()).filter(Boolean)
    : [];

  // Extract company name from contract subject "CONTRACT WIN — Acme Defense — $127M"
  const contractMatch = subject.match(/CONTRACT.*?—\s*(.+?)\s*—/);
  const contractCompany = contractMatch ? contractMatch[1].trim() : null;

  // Extract amount from contract subject
  const amountMatch = subject.match(/\$(\d[\d,]+)/);
  const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : null;

  if (isTrump) {
    return {
      signalType: 'political',
      title: subject,
      score,
      tickers,
      direction: body.includes('BULLISH') ? 'bullish' : body.includes('BEARISH') ? 'bearish' : 'neutral',
      body,
      timestamp: new Date().toISOString(),
      urgency: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
      panel: 'Trump Signals',
    };
  }

  if (isContract) {
    return {
      signalType: 'contract',
      title: subject,
      score: 75,  // contracts are always high-value
      tickers: [],
      company: contractCompany,
      amount: amount ? Number(amount) : null,
      direction: 'bullish',
      body,
      timestamp: new Date().toISOString(),
      urgency: 'high',
      panel: 'Gov Contracts',
    };
  }

  return null;
}

// --- Inbound webhook server (receives from ntfy or ruflo scanner) ---
// ruflo-trump-scanner can POST to http://localhost:7433/signal
// OR ntfy.sh can forward via its webhook feature

const server = createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body);
      const subject = payload.subject ?? payload.title ?? '';
      const text    = payload.body ?? payload.message ?? payload.text ?? '';

      const signal = parseAlert(subject, text);
      if (signal) {
        sendToFincept(signal);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, reason: 'unrecognized alert format' }));
      }
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, reason: e.message }));
    }
  });
});

server.listen(BRIDGE_PORT, () => {
  console.log(`[bridge] Webhook receiver listening on http://localhost:${BRIDGE_PORT}/signal`);
});

// --- ntfy.sh polling (if NTFY_TOPIC set, subscribe via SSE) ---

if (NTFY_TOPIC) {
  console.log(`[bridge] Subscribing to ntfy.sh/${NTFY_TOPIC}...`);

  async function subscribeNtfy() {
    try {
      const resp = await fetch(`https://ntfy.sh/${NTFY_TOPIC}/sse`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);

        // Parse SSE data lines
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.event !== 'message') continue;
            const signal = parseAlert(event.title ?? '', event.message ?? '');
            if (signal) sendToFincept(signal);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      console.error('[bridge] ntfy SSE error:', err.message, '— reconnecting in 10s');
      setTimeout(subscribeNtfy, 10000);
    }
  }

  subscribeNtfy();
}

// --- Boot ---
connectFincept();

console.log('[bridge] Trump Trade Scanner → Fincept bridge running.');
console.log(`  Fincept MCP:  ${FINCEPT_URL}`);
console.log(`  Webhook port: ${BRIDGE_PORT}`);
if (NTFY_TOPIC) console.log(`  ntfy topic:   ${NTFY_TOPIC}`);
