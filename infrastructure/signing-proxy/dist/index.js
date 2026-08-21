"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ethers_1 = require("ethers");
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '128kb' }));
const PORT = Number(process.env.PORT) || 3000;
const HMAC_SECRET = process.env.HMAC_SHARED_SECRET || 'secops_auth_token_deterministic_key_2026';
const GUARDIAN_KEY = process.env.GUARDIAN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
class ResilientProviderPool {
    endpoints;
    constructor() {
        this.endpoints = [
            process.env.RPC_PRIMARY_URL || 'http://local-anvil-node:8545',
            process.env.RPC_FALLBACK_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
        ];
    }
    async executeWithFallback(operation) {
        let lastError = null;
        for (const url of this.endpoints) {
            try {
                const provider = new ethers_1.ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
                return await operation(provider);
            }
            catch (err) {
                lastError = err;
            }
        }
        throw new Error(`ALL_RPC_ENDPOINTS_FAILED: ${lastError?.message}`);
    }
}
const rpcPool = new ResilientProviderPool();
const processedIncidents = new Map();
function verifyHMACSafe(payload, signature) {
    if (!signature || typeof signature !== 'string')
        return false;
    const computed = crypto_1.default.createHmac('sha256', HMAC_SECRET).update(JSON.stringify(payload)).digest('hex');
    const bufComputed = crypto_1.default.createHash('sha256').update(computed).digest();
    const bufProvided = crypto_1.default.createHash('sha256').update(signature).digest();
    return crypto_1.default.timingSafeEqual(bufComputed, bufProvided);
}
app.post('/execute-breaker', async (req, res) => {
    try {
        const { targetContract, reason, incidentId, timestamp, signature } = req.body;
        if (!targetContract || !reason || !incidentId || !timestamp || !signature) {
            res.status(400).json({ error: 'MISSING_REQUIRED_PARAMETERS' });
            return;
        }
        const now = Date.now();
        const timeDelta = Math.abs(now - Number(timestamp));
        if (isNaN(timeDelta) || timeDelta > 300000) {
            res.status(401).json({ error: 'TIMESTAMP_OUT_OF_BOUNDS', deltaMs: timeDelta });
            return;
        }
        const canonicalPayload = {
            targetContract: targetContract.toLowerCase(),
            reason,
            incidentId,
            timestamp: Number(timestamp)
        };
        const isValid = verifyHMACSafe(canonicalPayload, signature);
        if (!isValid) {
            res.status(403).json({ error: 'INVALID_HMAC_SIGNATURE' });
            return;
        }
        if (processedIncidents.has(incidentId)) {
            const cached = processedIncidents.get(incidentId);
            res.status(200).json({ status: cached?.status, txHash: cached?.txHash, cached: true });
            return;
        }
        await rpcPool.executeWithFallback(async (provider) => {
            const wallet = new ethers_1.ethers.Wallet(GUARDIAN_KEY, provider);
            const iface = new ethers_1.ethers.Interface(['function emergencyPause(string calldata reason) external']);
            const data = iface.encodeFunctionData('emergencyPause', [reason]);
            try {
                await provider.call({ to: targetContract, data, from: wallet.address });
            }
            catch (simErr) {
                throw new Error(`SIMULATION_REVERTED: ${simErr.message}`);
            }
            const tx = await wallet.sendTransaction({ to: targetContract, data, gasLimit: 150000 });
            const receipt = await tx.wait(1);
            processedIncidents.set(incidentId, { status: 'EXECUTED', txHash: receipt?.hash });
            res.status(200).json({
                status: 'EXECUTED',
                txHash: receipt?.hash,
                blockNumber: receipt?.blockNumber,
                gasUsed: receipt?.gasUsed.toString()
            });
        });
    }
    catch (err) {
        if (err.message?.includes('SIMULATION_REVERTED')) {
            res.status(422).json({ error: 'SIMULATION_REVERTED', message: err.message });
        }
        else {
            res.status(500).json({ error: 'EXECUTION_FAILED', message: err.message });
        }
    }
});
app.get('/health', async (_req, res) => {
    try {
        const blockNumber = await rpcPool.executeWithFallback(async (p) => p.getBlockNumber());
        res.status(200).json({ status: 'OK', blockNumber, timestamp: Date.now() });
    }
    catch (err) {
        res.status(503).json({ status: 'UNHEALTHY', error: err.message });
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Signing Proxy] Listening on port ${PORT}`);
});
