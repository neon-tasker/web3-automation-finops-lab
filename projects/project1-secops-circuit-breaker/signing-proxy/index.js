const express = require('express');
const crypto = require('crypto');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.RPC_URL || 'http://local-anvil-node:8545';
const SHARED_SECRET = process.env.HMAC_SHARED_SECRET || 'secops_auth_token_deterministic_key_2026';
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(RELAY_PRIVATE_KEY, provider);

function verifyHMAC(req, res, next) {
  const signature = req.headers['x-hmac-signature'];
  if (!signature) return res.status(401).json({ error: 'Missing HMAC signature' });
  const hmac = crypto.createHmac('sha256', SHARED_SECRET);
  const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
  if (signature !== digest) return res.status(403).json({ error: 'Invalid HMAC signature' });
  next();
}

app.get('/health', (req, res) => res.json({ status: 'OK', proxy: 'Signing-Proxy-EVM' }));

app.post('/execute-remediation', verifyHMAC, async (req, res) => {
  try {
    const { contractAddress } = req.body;
    const iface = new ethers.Interface(['function pauseVault() external']);
    const txData = iface.encodeFunctionData('pauseVault', []);
    const tx = await signer.sendTransaction({ to: contractAddress, data: txData });
    const receipt = await tx.wait(1);
    res.json({ success: true, txHash: receipt.hash, status: 'PAUSED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Signing Proxy listening on port ${PORT}`));
