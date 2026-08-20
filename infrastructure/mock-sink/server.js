const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const receivedDispatches = [];
const dlqEntries = [];

app.post('/webhook', (req, res) => {
  const payload = req.body;
  if (!payload || !payload.eventType) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  const exists = receivedDispatches.some(d => d.ledgerId && d.ledgerId === payload.ledgerId);
  if (exists) {
    return res.status(200).json({ status: 'ACK_DUPLICATE', ledgerId: payload.ledgerId });
  }

  receivedDispatches.push({ ...payload, receivedAt: new Date().toISOString() });
  res.status(200).json({ status: 'PROCESSED', ledgerId: payload.ledgerId });
});

app.get('/api/ledger', (_req, res) => {
  res.status(200).json(receivedDispatches);
});

app.post('/dlq', (req, res) => {
  dlqEntries.push({ ...req.body, loggedAt: new Date().toISOString() });
  res.status(200).json({ status: 'RECORDED_IN_DLQ' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', totalDispatches: receivedDispatches.length, dlqCount: dlqEntries.length });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Mock Webhook Sink] Listening on port ${PORT}`);
});
