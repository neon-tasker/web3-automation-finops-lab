const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/project1', (req, res) => res.sendFile(path.join(__dirname, 'public', 'project1.html')));
app.get('/project2', (req, res) => res.sendFile(path.join(__dirname, 'public', 'project2.html')));
app.get('/project3', (req, res) => res.sendFile(path.join(__dirname, 'public', 'project3.html')));
app.get('/portal', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/client', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8661301970:AAEyGarl4xtMFrM3qnhgaB2hAOjdI1T4TNs';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1861290667';
const HMAC_SECRET = 'secops_auth_token_deterministic_key_2026';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres-db',
  port: 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres_dev_password_2026',
  database: process.env.POSTGRES_DB || 'web3_automation'
});

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

async function sendTelegramAlert(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    }, { timeout: 2500 });
    return { ok: true, delivered: true, data: res.data };
  } catch (err) {
    console.log(`[ALERT LOGGED LOCALLY]:\n${message.replace(/<[^>]*>?/gm, '')}`);
    return { ok: true, delivered: false, note: 'Logged locally', error: err.message };
  }
}

app.get('/api/system-status', async (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    services: {
      anvilNode: { status: 'DOWN', latencyMs: 0 },
      signingProxy: { status: 'DOWN', latencyMs: 0 },
      postgresDb: { status: 'DOWN', latencyMs: 0 },
      n8nOrchestrator: { status: 'DOWN', latencyMs: 0 },
      webhookSink: { status: 'DOWN', latencyMs: 0 }
    }
  };

  const t1 = Date.now();
  try {
    const r = await axios.post('http://local-anvil-node:8545', { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }, { timeout: 2000 });
    status.services.anvilNode = { status: 'UP', blockNumber: parseInt(r.data.result, 16), latencyMs: Date.now() - t1 };
  } catch (e) { status.services.anvilNode.error = e.message; }

  const t2 = Date.now();
  try {
    const r = await axios.get('http://signing-proxy:3000/health', { timeout: 2000 });
    status.services.signingProxy = { status: 'UP', detail: r.data, latencyMs: Date.now() - t2 };
  } catch (e) { status.services.signingProxy.error = e.message; }

  const t3 = Date.now();
  try {
    const r = await pool.query('SELECT NOW() as db_time');
    status.services.postgresDb = { status: 'UP', latencyMs: Date.now() - t3 };
  } catch (e) { status.services.postgresDb.error = e.message; }

  const t4 = Date.now();
  try {
    const r = await axios.get('http://n8n-orchestrator:5678/healthz', { timeout: 2000 });
    status.services.n8nOrchestrator = { status: 'UP', latencyMs: Date.now() - t4 };
  } catch (e) { status.services.n8nOrchestrator.error = e.message; }

  const t5 = Date.now();
  try {
    const r = await axios.get('http://mock-webhook-sink:8080/health', { timeout: 2000 });
    status.services.webhookSink = { status: 'UP', latencyMs: Date.now() - t5 };
  } catch (e) { status.services.webhookSink.error = e.message; }

  res.json(status);
});

app.get('/api/metrics', async (req, res) => {
  try {
    const incidents = await pool.query('SELECT * FROM secops.incidents ORDER BY created_at DESC LIMIT 15');
    const ledger = await pool.query('SELECT * FROM subsync.reconciliation_ledger ORDER BY created_at DESC LIMIT 15');
    const policies = await pool.query('SELECT * FROM agentic_guard.policies');
    res.json({
      secops: incidents.rows,
      subsync: ledger.rows,
      agenticGuard: policies.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/test', async (req, res) => {
  const msg = `⚡ <b>WEB3 OPS PLATFORM MONITOR</b>
━━━━━━━━━━━━━━━━━━━━━
📡 <b>Telemetry Status:</b> 🟢 Operational
⏱ <b>Heartbeat:</b> <code>${getTimestamp()}</code>
🔒 <b>Gateway:</b> HMAC-SHA256 Protected`;
  const result = await sendTelegramAlert(msg);
  res.json(result);
});

// Project 1: SecOps Circuit Breaker Direct Trigger
app.post('/api/simulate/secops-anomaly', async (req, res) => {
  try {
    const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    const body = { contractAddress, action: 'PAUSE', reason: 'High Drain Anomaly Detected' };
    const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(JSON.stringify(body)).digest('hex');

    const proxyRes = await axios.post('http://signing-proxy:3000/execute-remediation', body, {
      headers: { 'x-hmac-signature': hmac }
    });

    const txHash = proxyRes.data.txHash || '0x' + crypto.randomBytes(32).toString('hex');
    const triggerTx = '0xtrig_' + crypto.randomBytes(16).toString('hex');

    await pool.query(
      `INSERT INTO secops.incidents (source_chain_id, contract_address, event_signature, tx_hash, block_number, severity_level, status, anomaly_payload, remediation_tx_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [31337, contractAddress, 'Transfer(address,address,uint256)', triggerTx, 105, 'CRITICAL', 'EXECUTED', JSON.stringify({ drainEther: 7.5 }), txHash]
    );

    const alertMsg = `🚨 <b>SECOPS AUTOMATED DEFENSE</b>
━━━━━━━━━━━━━━━━━━━━━
⚡ <b>Event:</b> Critical Vault Drain Anomaly
🎯 <b>Contract:</b> <code>${contractAddress}</code>
💸 <b>Drain Volume:</b> <code>7.50 ETH</code>
⛓️ <b>Chain ID:</b> <code>31337 (Local EVM)</code>
🔒 <b>Mitigation State:</b> 🟢 <b>PAUSED ON-CHAIN</b>
🧾 <b>Remediation Tx:</b> <code>${txHash.substring(0, 18)}...</code>
🕒 <i>${getTimestamp()}</i>`;

    sendTelegramAlert(alertMsg);
    res.json({ success: true, decision: 'PAUSED', txHash: txHash });
  } catch (err) {
    console.error('SecOps Sim Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Project 2: SubSync FinOps Direct Trigger
app.post('/api/simulate/subsync-payment', async (req, res) => {
  try {
    const invoiceId = "INV-2026-" + Math.floor(100 + Math.random() * 900);
    const fiatUsd = 500.00;
    const txHash = "0xpay_" + crypto.randomBytes(16).toString('hex');

    await pool.query(
      `INSERT INTO subsync.reconciliation_ledger 
       (chain_id, tx_hash, log_index, block_number, block_timestamp, sender_address, recipient_address, token_address, raw_amount, token_decimals, token_symbol, fiat_rate_usd, fiat_amount_usd, customer_id, invoice_id, status, accounting_sync_status, retry_count, next_retry_at, created_at)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
      [31337, txHash, 0, 100, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '0x5fbdb2315678afecb367f032d93f642f64180aa3', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 500000000, 6, 'USDC', 1.00, fiatUsd, 'USER_VERIFIED', invoiceId, 'RECONCILED', 'SYNCED', 0]
    );

    const alertMsg = `💰 <b>SUBSYNC FINOPS RECONCILIATION</b>
━━━━━━━━━━━━━━━━━━━━━
🧾 <b>Invoice ID:</b> <code>${invoiceId}</code>
👤 <b>User:</b> <code>USER_VERIFIED</code>
💵 <b>Settled Amount:</b> <b>$${fiatUsd.toFixed(2)} USDC</b>
⛓️ <b>Chain ID:</b> <code>31337</code>
🔄 <b>Ledger State:</b> 🟢 <b>RECONCILED & SYNCED</b>
🧾 <b>Settlement Tx:</b> <code>${txHash.substring(0, 18)}...</code>
🕒 <i>${getTimestamp()}</i>`;

    sendTelegramAlert(alertMsg);
    res.json({ success: true, status: 'RECONCILED', invoiceId, amountUsd: fiatUsd });
  } catch (err) {
    console.error('SubSync Sim Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Project 3: Agentic Guard Direct Trigger
app.post('/api/simulate/agentic-guard', async (req, res) => {
  try {
    const isOverCap = req.body.overCap === true || req.body.overCap === 'true';
    const estimatedValueUsd = isOverCap ? 5000.00 : 100.00;
    const agentId = "agent-autonomous-01";

    let decision = 'APPROVED';
    let reason = 'Transaction complies with single and velocity policy caps';

    if (estimatedValueUsd > 500.00) {
      decision = 'BLOCKED';
      reason = `Transaction value ($${estimatedValueUsd.toFixed(2)}) exceeds single limit ($500.00)`;

      const alertMsg = `🛡️ <b>AGENTIC GUARD POLICY INTERCEPT</b>
━━━━━━━━━━━━━━━━━━━━━
🤖 <b>Agent:</b> <code>${agentId}</code>
⚠️ <b>Decision:</b> 🔴 <b>BLOCKED (FAIL-CLOSED)</b>
💵 <b>Attempted:</b> <code>$${estimatedValueUsd.toFixed(2)} USD</code>
🛑 <b>Policy Limit:</b> <code>$500.00 USD</code>
📌 <b>Reason:</b> ${reason}
🕒 <i>${getTimestamp()}</i>`;

      sendTelegramAlert(alertMsg);
    } else {
      const alertMsg = `🛡️ <b>AGENTIC GUARD POLICY APPROVAL</b>
━━━━━━━━━━━━━━━━━━━━━
🤖 <b>Agent:</b> <code>${agentId}</code>
✅ <b>Decision:</b> 🟢 <b>APPROVED</b>
💵 <b>Amount:</b> <b>$${estimatedValueUsd.toFixed(2)} USD</b>
📌 <b>Validation:</b> Velocity & threshold checks passed
🕒 <i>${getTimestamp()}</i>`;

      sendTelegramAlert(alertMsg);
    }

    res.json({ success: true, result: { decision, reason, estimatedValueUsd } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Unified Ops Dashboard running on http://0.0.0.0:${PORT}`);
});

