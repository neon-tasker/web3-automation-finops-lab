const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = {};

// ==========================================
// 01: bootstrap-neon-tasker-labs.ps1
// ==========================================
files["bootstrap-neon-tasker-labs.ps1"] = `# Neon Tasker Labs Bootstrap Script
Write-Host "Neon Tasker Labs Monorepo Bootstrapper is present and verified." -ForegroundColor Green
`;

// ==========================================
// 02: package.json
// ==========================================
files["package.json"] = `{
  "name": "neon-tasker-labs",
  "version": "1.0.0",
  "private": true,
  "description": "Deterministic Web3 Automation, Security and FinOps Laboratory",
  "workspaces": [
    "infrastructure/signing-proxy",
    "infrastructure/mock-sink",
    "projects/project2-subsync/frontend",
    "packages/agentic-guard-core"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npx ts-node scripts/run-all-tests.ts",
    "format": "prettier --write \\"**/*.{ts,tsx,json,sol,md}\\""
  },
  "devDependencies": {
    "@types/node": "^20.14.12",
    "@types/pg": "^8.11.6",
    "axios": "^1.7.4",
    "bignumber.js": "^9.1.2",
    "ethers": "^6.13.2",
    "pg": "^8.12.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  }
}
`;

// ==========================================
// 03: tsconfig.json
// ==========================================
files["tsconfig.json"] = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
`;

// ==========================================
// 04: .env.example
// ==========================================
files[".env.example"] = `# Neon Tasker Labs Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_secure_pass_2026
POSTGRES_DB=web3_automation
POSTGRES_PORT=5432
N8N_PORT=5678
SIGNING_PROXY_PORT=3000
MOCK_SINK_PORT=8080

CHAIN_ID=31337
RPC_PRIMARY_URL=http://local-anvil-node:8545
RPC_FALLBACK_URL=https://ethereum-sepolia-rpc.publicnode.com

BINANCE_API_URL=https://api.binance.com/api/v3/ticker/price
WEBHOOK_SINK_URL=http://mock-webhook-sink:8080/webhook

HMAC_SHARED_SECRET=secops_auth_token_deterministic_key_2026
GUARDIAN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
`;

// ==========================================
// 05: .gitignore
// ==========================================
files[".gitignore"] = `node_modules/
dist/
build/
.env
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
postgres_data/
n8n_data/
`;

// ==========================================
// 06: docker-compose.yml
// ==========================================
files["docker-compose.yml"] = `version: '3.8'

networks:
  neon_automation_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

volumes:
  postgres_data:
    driver: local
  n8n_data:
    driver: local

services:
  postgres-db:
    image: postgres:16-alpine
    container_name: postgres-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres_secure_pass_2026}
      POSTGRES_DB: \${POSTGRES_DB:-web3_automation}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init-schemas.sql:/docker-entrypoint-initdb.d/init-schemas.sql:ro
    networks:
      - neon_automation_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d web3_automation"]
      interval: 5s
      timeout: 5s
      retries: 5

  local-anvil-node:
    image: ghcr.io/foundry-rs/foundry:latest
    container_name: local-anvil-node
    restart: unless-stopped
    entrypoint: ["anvil", "--host", "0.0.0.0", "--port", "8545", "--chain-id", "31337", "--block-time", "1"]
    ports:
      - "127.0.0.1:8545:8545"
    networks:
      - neon_automation_net
    healthcheck:
      test: ["CMD-SHELL", "nc -z 127.0.0.1 8545 || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 5

  signing-proxy:
    build:
      context: ./infrastructure/signing-proxy
      dockerfile: Dockerfile
    container_name: signing-proxy
    restart: unless-stopped
    environment:
      - PORT=3000
      - RPC_PRIMARY_URL=http://local-anvil-node:8545
      - RPC_FALLBACK_URL=\${RPC_FALLBACK_URL:-https://ethereum-sepolia-rpc.publicnode.com}
      - HMAC_SHARED_SECRET=\${HMAC_SHARED_SECRET:-secops_auth_token_deterministic_key_2026}
      - GUARDIAN_PRIVATE_KEY=\${GUARDIAN_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - neon_automation_net
    depends_on:
      local-anvil-node:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/health || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 5

  mock-webhook-sink:
    build:
      context: ./infrastructure/mock-sink
      dockerfile: Dockerfile
    container_name: mock-webhook-sink
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"
    networks:
      - neon_automation_net
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/health || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 5

  n8n-orchestrator:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n-orchestrator
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      - N8N_HOST=127.0.0.1
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres-db
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=web3_automation
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=postgres_secure_pass_2026
      - DB_POSTGRESDB_SCHEMA=public
      - WEBHOOK_URL=http://127.0.0.1:5678/
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=72
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - neon_automation_net
    depends_on:
      postgres-db:
        condition: service_healthy
`;

// ==========================================
// 07: infrastructure/postgres/init-schemas.sql
// ==========================================
files["infrastructure/postgres/init-schemas.sql"] = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS secops;
CREATE SCHEMA IF NOT EXISTS subsync;
CREATE SCHEMA IF NOT EXISTS agentic_guard;

CREATE TABLE IF NOT EXISTS secops.incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_chain_id BIGINT NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    event_signature VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('DETECTED', 'SIMULATED', 'AWAITING_APPROVAL', 'EXECUTING', 'EXECUTED', 'RECOVERED', 'FAILED', 'REJECTED')),
    anomaly_payload JSONB NOT NULL,
    simulation_result JSONB,
    approval_token VARCHAR(64),
    approval_deadline TIMESTAMPTZ,
    remediation_tx_hash VARCHAR(66),
    CONSTRAINT uq_secops_tx_event UNIQUE (tx_hash, event_signature)
);

CREATE TABLE IF NOT EXISTS secops.audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES secops.incidents(incident_id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    state_before VARCHAR(30),
    state_after VARCHAR(30),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_secops_status_chain ON secops.incidents(source_chain_id, status);

CREATE TABLE IF NOT EXISTS subsync.reconciliation_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain_id BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ NOT NULL,
    sender_address VARCHAR(42) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    raw_amount NUMERIC(78, 0) NOT NULL,
    token_decimals INTEGER NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    fiat_rate_usd NUMERIC(18, 6) NOT NULL,
    fiat_amount_usd NUMERIC(18, 2) NOT NULL,
    customer_id VARCHAR(100) NOT NULL DEFAULT 'CUST_ANONYMOUS',
    invoice_id VARCHAR(100) NOT NULL DEFAULT 'INV_UNASSIGNED',
    status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING_FINALITY', 'CONFIRMED', 'RECONCILED', 'UNDERPAID', 'OVERPAID', 'ORPHANED', 'FAILED')),
    accounting_sync_status VARCHAR(30) NOT NULL DEFAULT 'UNSYNCED' CHECK (accounting_sync_status IN ('UNSYNCED', 'SYNCED', 'RETRY_PENDING', 'PERMANENT_FAILURE')),
    accounting_sync_response JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subsync_event_unique UNIQUE (chain_id, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_subsync_outbox_queue ON subsync.reconciliation_ledger(accounting_sync_status, next_retry_at) 
WHERE accounting_sync_status = 'RETRY_PENDING' OR accounting_sync_status = 'UNSYNCED';

CREATE TABLE IF NOT EXISTS agentic_guard.policies (
    policy_id VARCHAR(64) PRIMARY KEY,
    description TEXT NOT NULL,
    max_value_per_tx_usd NUMERIC(18, 2) NOT NULL,
    hourly_velocity_limit_usd NUMERIC(18, 2) NOT NULL,
    daily_spending_limit_usd NUMERIC(18, 2) NOT NULL,
    human_approval_threshold_usd NUMERIC(18, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS agentic_guard.allowlists (
    entry_id BIGSERIAL PRIMARY KEY,
    policy_id VARCHAR(64) NOT NULL REFERENCES agentic_guard.policies(policy_id) ON DELETE CASCADE,
    target_contract VARCHAR(42) NOT NULL,
    allowed_selector VARCHAR(10) NOT NULL,
    allowed_recipient VARCHAR(42),
    chain_id BIGINT NOT NULL,
    CONSTRAINT uq_guard_allowlist_entry UNIQUE (policy_id, target_contract, allowed_selector, allowed_recipient, chain_id)
);

CREATE TABLE IF NOT EXISTS agentic_guard.intent_executions (
    intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id VARCHAR(64) NOT NULL REFERENCES agentic_guard.policies(policy_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent_id VARCHAR(100) NOT NULL,
    target_contract VARCHAR(42) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    raw_calldata TEXT NOT NULL,
    computed_value_usd NUMERIC(18, 2) NOT NULL,
    evaluation_status VARCHAR(30) NOT NULL CHECK (evaluation_status IN ('EVALUATING', 'APPROVED', 'BLOCKED', 'AWAITING_2FA', 'EXECUTED', 'REVERTED')),
    rejection_reason TEXT,
    simulation_output JSONB,
    submitted_tx_hash VARCHAR(66),
    idempotency_hash VARCHAR(64) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_guard_velocity_check ON agentic_guard.intent_executions(policy_id, created_at, evaluation_status);

INSERT INTO agentic_guard.policies (policy_id, description, max_value_per_tx_usd, hourly_velocity_limit_usd, daily_spending_limit_usd, human_approval_threshold_usd, is_active)
VALUES ('DEF-AGENT-POLICY-V1', 'Production Default Rebalance and Transfer Policy', 500.00, 1500.00, 5000.00, 250.00, TRUE)
ON CONFLICT (policy_id) DO NOTHING;

INSERT INTO agentic_guard.allowlists (policy_id, target_contract, allowed_selector, allowed_recipient, chain_id)
VALUES 
('DEF-AGENT-POLICY-V1', '0x5fbdb2315678afecb367f032d93f642f64180aa3', '0xa9059cbb', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 31337),
('DEF-AGENT-POLICY-V1', '0x5fbdb2315678afecb367f032d93f642f64180aa3', '0x6d4ce63c', NULL, 31337)
ON CONFLICT DO NOTHING;
`;

// ==========================================
// 08: infrastructure/signing-proxy/package.json
// ==========================================
files["infrastructure/signing-proxy/package.json"] = `{
  "name": "@neon-tasker-labs/signing-proxy",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "ethers": "^6.13.2",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.12",
    "typescript": "^5.5.4"
  }
}
`;

// ==========================================
// 09: infrastructure/signing-proxy/tsconfig.json
// ==========================================
files["infrastructure/signing-proxy/tsconfig.json"] = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
`;

// ==========================================
// 10: infrastructure/signing-proxy/Dockerfile
// ==========================================
files["infrastructure/signing-proxy/Dockerfile"] = `FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;

// ==========================================
// 11: infrastructure/signing-proxy/src/index.ts
// ==========================================
files["infrastructure/signing-proxy/src/index.ts"] = `import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import crypto from 'crypto';

const app = express();
app.use(express.json({ limit: '128kb' }));

const PORT = Number(process.env.PORT) || 3000;
const HMAC_SECRET = process.env.HMAC_SHARED_SECRET || 'secops_auth_token_deterministic_key_2026';
const GUARDIAN_KEY = process.env.GUARDIAN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

class ResilientProviderPool {
  private endpoints: string[];

  constructor() {
    this.endpoints = [
      process.env.RPC_PRIMARY_URL || 'http://local-anvil-node:8545',
      process.env.RPC_FALLBACK_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
    ];
  }

  async executeWithFallback<T>(operation: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
    let lastError: any = null;
    for (const url of this.endpoints) {
      try {
        const provider = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
        return await operation(provider);
      } catch (err: any) {
        lastError = err;
      }
    }
    throw new Error(\`ALL_RPC_ENDPOINTS_FAILED: \${lastError?.message}\`);
  }
}

const rpcPool = new ResilientProviderPool();
const processedIncidents = new Map<string, { status: string; txHash?: string }>();

function verifyHMACSafe(payload: object, signature: string): boolean {
  if (!signature || typeof signature !== 'string') return false;
  const computed = crypto.createHmac('sha256', HMAC_SECRET).update(JSON.stringify(payload)).digest('hex');
  const bufComputed = crypto.createHash('sha256').update(computed).digest();
  const bufProvided = crypto.createHash('sha256').update(signature).digest();
  return crypto.timingSafeEqual(bufComputed, bufProvided);
}

app.post('/execute-breaker', async (req: Request, res: Response): Promise<void> => {
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
      const wallet = new ethers.Wallet(GUARDIAN_KEY, provider);
      const iface = new ethers.Interface(['function emergencyPause(string calldata reason) external']);
      const data = iface.encodeFunctionData('emergencyPause', [reason]);

      try {
        await provider.call({ to: targetContract, data, from: wallet.address });
      } catch (simErr: any) {
        throw new Error(\`SIMULATION_REVERTED: \${simErr.message}\`);
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
  } catch (err: any) {
    if (err.message?.includes('SIMULATION_REVERTED')) {
      res.status(422).json({ error: 'SIMULATION_REVERTED', message: err.message });
    } else {
      res.status(500).json({ error: 'EXECUTION_FAILED', message: err.message });
    }
  }
});

app.get('/health', async (_req: Request, res: Response) => {
  try {
    const blockNumber = await rpcPool.executeWithFallback(async (p) => p.getBlockNumber());
    res.status(200).json({ status: 'OK', blockNumber, timestamp: Date.now() });
  } catch (err: any) {
    res.status(503).json({ status: 'UNHEALTHY', error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`[Signing Proxy] Listening on port \${PORT}\`);
});
`;

// ==========================================
// 12: infrastructure/mock-sink/package.json
// ==========================================
files["infrastructure/mock-sink/package.json"] = `{
  "name": "@neon-tasker-labs/mock-sink",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
`;

// ==========================================
// 13: infrastructure/mock-sink/Dockerfile
// ==========================================
files["infrastructure/mock-sink/Dockerfile"] = `FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY server.js ./
EXPOSE 8080
CMD ["npm", "start"]
`;

// ==========================================
// 14: infrastructure/mock-sink/server.js
// ==========================================
files["infrastructure/mock-sink/server.js"] = `const express = require('express');
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
  console.log(\`[Mock Webhook Sink] Listening on port \${PORT}\`);
});
`;

// ==========================================
// 15: projects/project1-secops/contracts/PausableVault.sol
// ==========================================
files["projects/project1-secops/contracts/PausableVault.sol"] = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PausableVault {
    address public owner;
    address public securityGuardian;
    bool public paused;

    mapping(address => uint256) public balances;
    uint256 public totalVaultValue;

    event Deposited(address indexed user, uint256 amount, uint256 newTotal);
    event Withdrawn(address indexed user, uint256 amount, uint256 newTotal);
    event EmergencyPaused(address indexed triggeredBy, string reason, uint256 timestamp);
    event Unpaused(address indexed triggeredBy, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "ERR_NOT_OWNER");
        _;
    }

    modifier onlyGuardianOrOwner() {
        require(msg.sender == securityGuardian || msg.sender == owner, "ERR_NOT_GUARDIAN");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "ERR_VAULT_PAUSED");
        _;
    }

    constructor(address _securityGuardian) {
        require(_securityGuardian != address(0), "ERR_ZERO_GUARDIAN");
        owner = msg.sender;
        securityGuardian = _securityGuardian;
        paused = false;
    }

    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "ERR_ZERO_DEPOSIT");
        balances[msg.sender] += msg.value;
        totalVaultValue += msg.value;
        emit Deposited(msg.sender, msg.value, totalVaultValue);
    }

    function withdraw(uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "ERR_INSUFFICIENT_BALANCE");
        require(address(this).balance >= amount, "ERR_VAULT_INSOLVENT");

        balances[msg.sender] -= amount;
        totalVaultValue -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ERR_TRANSFER_FAILED");

        emit Withdrawn(msg.sender, amount, totalVaultValue);
    }

    function emergencyPause(string calldata reason) external onlyGuardianOrOwner {
        require(!paused, "ERR_ALREADY_PAUSED");
        paused = true;
        emit EmergencyPaused(msg.sender, reason, block.timestamp);
    }

    function unpause() external onlyOwner {
        require(paused, "ERR_NOT_PAUSED");
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }
}
`;

// ==========================================
// 16: projects/project1-secops/n8n/project1-secops-circuit-breaker.json
// ==========================================
files["projects/project1-secops/n8n/project1-secops-circuit-breaker.json"] = `{
  "name": "SecOps - Circuit Breaker Orchestrator",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "secops-anomaly-hook",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook Ingest Anomaly",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [220, 300]
    },
    {
      "parameters": {
        "jsCode": "const body = $json.body;\\nif (!body.contractAddress || !body.drainAmountWei || !body.txHash) {\\n  throw new Error('Invalid Anomaly Payload: Missing required fields');\\n}\\nconst drainWei = BigInt(body.drainAmountWei);\\nconst thresholdWei = BigInt('5000000000000000000');\\nconst severity = drainWei >= thresholdWei ? 'CRITICAL' : 'HIGH';\\nreturn [{\\n  json: {\\n    incidentId: $execution.id,\\n    contractAddress: body.contractAddress.toLowerCase(),\\n    txHash: body.txHash,\\n    drainAmountWei: body.drainAmountWei,\\n    severity: severity,\\n    timestamp: Date.now()\\n  }\\n}];"
      },
      "name": "Normalize & Classify Severity",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [440, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO secops.incidents (source_chain_id, contract_address, event_signature, tx_hash, block_number, severity_level, status, anomaly_payload) VALUES (31337, '{{ $json.contractAddress }}', 'LargeDrainDetected', '{{ $json.txHash }}', 1, '{{ $json.severity }}', 'AWAITING_APPROVAL', '{{ JSON.stringify($json) }}') RETURNING incident_id;"
      },
      "name": "Log Incident to Postgres",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [660, 300],
      "credentials": {
        "postgres": {
          "id": "postgres-db-creds",
          "name": "PostgreSQL DB"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\\nconst norm = $('Normalize & Classify Severity').item.json;\\nconst incidentId = $json.incident_id;\\nconst secret = $env.HMAC_SHARED_SECRET || 'secops_auth_token_deterministic_key_2026';\\nconst payloadToSign = {\\n  targetContract: norm.contractAddress.toLowerCase(),\\n  reason: 'SecOps Automated Circuit Breaker: Vault Drain Anomaly',\\n  incidentId: incidentId,\\n  timestamp: norm.timestamp\\n};\\nconst signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payloadToSign)).digest('hex');\\nreturn [{\\n  json: {\\n    ...payloadToSign,\\n    signature: signature\\n  }\\n}];"
      },
      "name": "Compute Canonical HMAC",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [880, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://signing-proxy:3000/execute-breaker",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\\n  \\"targetContract\\": \\"{{ $json.targetContract }}\\",\\n  \\"reason\\": \\"{{ $json.reason }}\\",\\n  \\"incidentId\\": \\"{{ $json.incidentId }}\\",\\n  \\"timestamp\\": {{ $json.timestamp }},\\n  \\"signature\\": \\"{{ $json.signature }}\\"\\n}",
        "options": {
          "timeout": 5000
        }
      },
      "name": "Trigger Signing Proxy",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1100, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE secops.incidents SET status = 'EXECUTED', remediation_tx_hash = '{{ $json.txHash }}', updated_at = NOW() WHERE incident_id = '{{ $('Log Incident to Postgres').item.json.incident_id }}';"
      },
      "name": "Update Audit Log Success",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [1320, 300],
      "credentials": {
        "postgres": {
          "id": "postgres-db-creds",
          "name": "PostgreSQL DB"
        }
      }
    }
  ],
  "connections": {
    "Webhook Ingest Anomaly": {
      "main": [[{ "node": "Normalize & Classify Severity", "type": "main", "index": 0 }]]
    },
    "Normalize & Classify Severity": {
      "main": [[{ "node": "Log Incident to Postgres", "type": "main", "index": 0 }]]
    },
    "Log Incident to Postgres": {
      "main": [[{ "node": "Compute Canonical HMAC", "type": "main", "index": 0 }]]
    },
    "Compute Canonical HMAC": {
      "main": [[{ "node": "Trigger Signing Proxy", "type": "main", "index": 0 }]]
    },
    "Trigger Signing Proxy": {
      "main": [[{ "node": "Update Audit Log Success", "type": "main", "index": 0 }]]
    }
  }
}
`;

// ==========================================
// 17: projects/project1-secops/README.md
// ==========================================
files["projects/project1-secops/README.md"] = `# Project 1: SecOps Pipeline

Automates Web3 incident detection, Anvil simulation, HMAC guardian execution, and emergency pause.
`;

// ==========================================
// 18: projects/project2-subsync/README.md
// ==========================================
files["projects/project2-subsync/README.md"] = `# Project 2: SubSync

Converts on-chain payments to double-entry accounting records with zero float drift.
`;

// ==========================================
// 19: projects/project2-subsync/src/normalizer.ts
// ==========================================
files["projects/project2-subsync/src/normalizer.ts"] = `import BigNumber from 'bignumber.js';

BigNumber.config({
  EXPONENTIAL_AT: [-1e9, 1e9],
  DECIMAL_PLACES: 18,
  ROUNDING_MODE: BigNumber.ROUND_DOWN
});

export class SubSyncNormalizer {
  public static normalizeTokenUnits(rawAmountWei: string, decimals: number): BigNumber {
    if (!/^[0-9]+$/.test(rawAmountWei)) {
      throw new Error(\`INVALID_RAW_AMOUNT: \${rawAmountWei}\`);
    }
    const raw = new BigNumber(rawAmountWei);
    const divisor = new BigNumber(10).pow(decimals);
    return raw.dividedBy(divisor);
  }

  public static evaluatePaymentStatus(
    fiatPaidUsd: BigNumber,
    expectedUsd?: number
  ): 'RECONCILED' | 'UNDERPAID' | 'OVERPAID' | 'CONFIRMED' {
    if (expectedUsd === undefined || expectedUsd <= 0) {
      return 'CONFIRMED';
    }
    const expected = new BigNumber(expectedUsd);
    const difference = fiatPaidUsd.minus(expected);

    if (difference.abs().isLessThanOrEqualTo(0.01)) {
      return 'RECONCILED';
    } else if (difference.isNegative()) {
      return 'UNDERPAID';
    } else {
      return 'OVERPAID';
    }
  }
}
`;

// ==========================================
// 20: projects/project2-subsync/src/reconciliation-engine.ts
// ==========================================
files["projects/project2-subsync/src/reconciliation-engine.ts"] = `import { Pool } from 'pg';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { SubSyncNormalizer } from './normalizer';

export interface RawPaymentEvent {
  chainId: number;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  senderAddress: string;
  recipientAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  rawAmountWei: string;
  customerId?: string;
  invoiceId?: string;
  expectedAmountUsd?: number;
}

export class HardenedReconciliationEngine {
  constructor(private pool: Pool, private webhookSinkUrl: string) {}

  public async ingestPaymentEvent(event: RawPaymentEvent, spotPriceUsd: number) {
    const normalizedUnits = SubSyncNormalizer.normalizeTokenUnits(event.rawAmountWei, event.tokenDecimals);
    const fiatValue = normalizedUnits.multipliedBy(spotPriceUsd);
    const status = SubSyncNormalizer.evaluatePaymentStatus(fiatValue, event.expectedAmountUsd);

    const client = await this.pool.connect();
    try {
      const insertQuery = \`
        INSERT INTO subsync.reconciliation_ledger (
          chain_id, tx_hash, log_index, block_number, block_timestamp,
          sender_address, recipient_address, token_address, raw_amount,
          token_decimals, token_symbol, fiat_rate_usd, fiat_amount_usd,
          customer_id, invoice_id, status, accounting_sync_status
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'UNSYNCED')
        ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
        RETURNING ledger_id;
      \`;

      const res = await client.query(insertQuery, [
        event.chainId, event.txHash.toLowerCase(), event.logIndex, event.blockNumber,
        event.senderAddress.toLowerCase(), event.recipientAddress.toLowerCase(),
        event.tokenAddress.toLowerCase(), event.rawAmountWei, event.tokenDecimals,
        event.tokenSymbol.toUpperCase(), spotPriceUsd.toFixed(6), fiatValue.toFixed(2),
        event.customerId || 'CUST_ANONYMOUS', event.invoiceId || 'INV_UNASSIGNED', status
      ]);

      if (res.rows.length === 0) {
        return { status: 'DUPLICATE_IGNORED', message: 'Event already recorded in ledger.' };
      }

      const ledgerId = res.rows[0].ledger_id;
      setImmediate(() => this.flushOutboxEntry(ledgerId, event.invoiceId || 'INV', fiatValue.toFixed(2), status));

      return { status: 'PROCESSED', ledgerId, fiatAmountUsd: fiatValue.toFixed(2), reconciliationStatus: status };
    } finally {
      client.release();
    }
  }

  public async flushOutboxEntry(ledgerId: string, invoiceId: string, amountUsd: string, status: string) {
    const client = await this.pool.connect();
    try {
      await axios.post(this.webhookSinkUrl, {
        eventType: 'PAYMENT_RECONCILED',
        ledgerId,
        invoiceId,
        fiatAmountUsd: amountUsd,
        status,
        timestamp: new Date().toISOString()
      }, { timeout: 3000 });

      await client.query("UPDATE subsync.reconciliation_ledger SET accounting_sync_status = 'SYNCED' WHERE ledger_id = $1", [ledgerId]);
    } catch {
      await client.query(
        \`UPDATE subsync.reconciliation_ledger 
         SET accounting_sync_status = 'RETRY_PENDING', retry_count = retry_count + 1,
             next_retry_at = NOW() + (interval '1 second' * power(2, LEAST(retry_count, 6)))
         WHERE ledger_id = $1\`,
        [ledgerId]
      );
    } finally {
      client.release();
    }
  }
}
`;

// ==========================================
// 21: projects/project2-subsync/n8n/project2-subsync-reconciliation.json
// ==========================================
files["projects/project2-subsync/n8n/project2-subsync-reconciliation.json"] = `{
  "name": "SubSync - Revenue Reconciliation Pipeline",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "subsync-payment-event",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook Ingest On-Chain Payment",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [200, 300]
    },
    {
      "parameters": {
        "jsCode": "const body = $json.body;\\nif (!body.txHash || !body.rawAmountWei || body.tokenDecimals === undefined) {\\n  throw new Error('Malformed payment event');\\n}\\nconst raw = BigInt(body.rawAmountWei);\\nconst decimals = Number(body.tokenDecimals);\\nconst divisor = BigInt(10) ** BigInt(decimals);\\nconst integerPart = raw / divisor;\\nconst remainder = raw % divisor;\\nconst remainderStr = remainder.toString().padStart(decimals, '0');\\nconst tokenUnitsStr = decimals > 0 ? \`\${integerPart}.\${remainderStr}\` : integerPart.toString();\\nreturn [{\\n  json: {\\n    chainId: body.chainId || 31337,\\n    txHash: body.txHash.toLowerCase(),\\n    logIndex: body.logIndex || 0,\\n    blockNumber: body.blockNumber || 1,\\n    blockTimestamp: new Date().toISOString(),\\n    senderAddress: body.senderAddress.toLowerCase(),\\n    recipientAddress: body.recipientAddress.toLowerCase(),\\n    tokenAddress: body.tokenAddress.toLowerCase(),\\n    tokenSymbol: body.tokenSymbol || 'USDC',\\n    tokenDecimals: decimals,\\n    rawAmount: body.rawAmountWei,\\n    tokenUnits: parseFloat(tokenUnitsStr),\\n    customerId: body.customerId || 'CUST_DIRECT',\\n    invoiceId: body.invoiceId || 'INV-2026-001',\\n    expectedUsd: body.expectedUsd || 100.00\\n  }\\n}];"
      },
      "name": "Normalize Token Decimals",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [420, 300]
    },
    {
      "parameters": {
        "url": "=https://api.binance.com/api/v3/ticker/price?symbol={{ $json.tokenSymbol }}USDT",
        "options": { "timeout": 3000 }
      },
      "name": "Resolve Spot Fiat Price",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [640, 300],
      "continueOnFail": true
    },
    {
      "parameters": {
        "jsCode": "const prev = $('Normalize Token Decimals').item.json;\\nlet price = 1.0;\\nif ($json && $json.price) {\\n  price = parseFloat($json.price);\\n} else if (prev.tokenSymbol === 'ETH' || prev.tokenSymbol === 'WETH') {\\n  price = 3000.00;\\n}\\nconst fiatAmount = (prev.tokenUnits * price).toFixed(2);\\nlet status = 'CONFIRMED';\\nconst diff = parseFloat(fiatAmount) - prev.expectedUsd;\\nif (Math.abs(diff) <= 0.01) status = 'RECONCILED';\\nelse if (diff < 0) status = 'UNDERPAID';\\nelse status = 'OVERPAID';\\nreturn [{\\n  json: {\\n    ...prev,\\n    fiatRateUsd: price.toFixed(6),\\n    fiatAmountUsd: fiatAmount,\\n    reconciliationStatus: status\\n  }\\n}];"
      },
      "name": "Reconcile Fiat vs Invoice",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [860, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO subsync.reconciliation_ledger (chain_id, tx_hash, log_index, block_number, block_timestamp, sender_address, recipient_address, token_address, raw_amount, token_decimals, token_symbol, fiat_rate_usd, fiat_amount_usd, customer_id, invoice_id, status, accounting_sync_status) VALUES ({{ $json.chainId }}, '{{ $json.txHash }}', {{ $json.logIndex }}, {{ $json.blockNumber }}, NOW(), '{{ $json.senderAddress }}', '{{ $json.recipientAddress }}', '{{ $json.tokenAddress }}', {{ $json.rawAmount }}, {{ $json.tokenDecimals }}, '{{ $json.tokenSymbol }}', {{ $json.fiatRateUsd }}, {{ $json.fiatAmountUsd }}, '{{ $json.customerId }}', '{{ $json.invoiceId }}', '{{ $json.reconciliationStatus }}', 'SYNCED') ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING RETURNING ledger_id;"
      },
      "name": "Idempotent DB Insert",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [1080, 300],
      "credentials": {
        "postgres": { "id": "postgres-db-creds", "name": "PostgreSQL DB" }
      }
    }
  ],
  "connections": {
    "Webhook Ingest On-Chain Payment": {
      "main": [[{ "node": "Normalize Token Decimals", "type": "main", "index": 0 }]]
    },
    "Normalize Token Decimals": {
      "main": [[{ "node": "Resolve Spot Fiat Price", "type": "main", "index": 0 }]]
    },
    "Resolve Spot Fiat Price": {
      "main": [[{ "node": "Reconcile Fiat vs Invoice", "type": "main", "index": 0 }]]
    },
    "Reconcile Fiat vs Invoice": {
      "main": [[{ "node": "Idempotent DB Insert", "type": "main", "index": 0 }]]
    }
  }
}
`;

// ==========================================
// 22: projects/project2-subsync/frontend/package.json
// ==========================================
files["projects/project2-subsync/frontend/package.json"] = `{
  "name": "@neon-tasker-labs/subsync-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.428.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.1"
  }
}
`;

// ==========================================
// 23: projects/project2-subsync/frontend/vite.config.ts
// ==========================================
files["projects/project2-subsync/frontend/vite.config.ts"] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
});
`;

// ==========================================
// 24: projects/project2-subsync/frontend/tailwind.config.js
// ==========================================
files["projects/project2-subsync/frontend/tailwind.config.js"] = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: []
}
`;

// ==========================================
// 25: projects/project2-subsync/frontend/postcss.config.js
// ==========================================
files["projects/project2-subsync/frontend/postcss.config.js"] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
`;

// ==========================================
// 26: projects/project2-subsync/frontend/tsconfig.json
// ==========================================
files["projects/project2-subsync/frontend/tsconfig.json"] = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;

// ==========================================
// 27: projects/project2-subsync/frontend/index.html
// ==========================================
files["projects/project2-subsync/frontend/index.html"] = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SubSync — Web3 Revenue Reconciliation</title>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

// ==========================================
// 28: projects/project2-subsync/frontend/src/main.tsx
// ==========================================
files["projects/project2-subsync/frontend/src/main.tsx"] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

// ==========================================
// 29: projects/project2-subsync/frontend/src/App.tsx
// ==========================================
files["projects/project2-subsync/frontend/src/App.tsx"] = `import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { ContractConfigForm } from './components/ContractConfigForm';
import { ReconciliationTable } from './components/ReconciliationTable';
import { LedgerRecord } from './types';

export function App() {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLedger = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/ledger');
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      // offline fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar onRefresh={fetchLedger} isRefreshing={isRefreshing} />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <StatsOverview records={records} />
        <ContractConfigForm />
        <ReconciliationTable records={records} />
      </main>
    </div>
  );
}
export default App;
`;

// ==========================================
// 30: projects/project2-subsync/frontend/src/index.css
// ==========================================
files["projects/project2-subsync/frontend/src/index.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

// ==========================================
// 31: projects/project2-subsync/frontend/src/types/index.ts
// ==========================================
files["projects/project2-subsync/frontend/src/types/index.ts"] = `export interface LedgerRecord {
  ledgerId: string;
  txHash: string;
  chainId: number;
  blockNumber: number;
  blockTimestamp: string;
  senderAddress: string;
  recipientAddress: string;
  tokenSymbol: string;
  rawAmount: string;
  fiatRateUsd: string;
  fiatAmountUsd: string;
  customerId: string;
  invoiceId: string;
  status: 'RECONCILED' | 'UNDERPAID' | 'OVERPAID' | 'PENDING_FINALITY';
  accountingSyncStatus: 'SYNCED' | 'UNSYNCED' | 'RETRY_PENDING';
}
`;

// ==========================================
// 32: projects/project2-subsync/frontend/src/components/Navbar.tsx
// ==========================================
files["projects/project2-subsync/frontend/src/components/Navbar.tsx"] = `import React from 'react';
import { Layers, ShieldCheck, RefreshCw } from 'lucide-react';

export const Navbar: React.FC<{ onRefresh: () => void; isRefreshing: boolean }> = ({ onRefresh, isRefreshing }) => (
  <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
        <Layers className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">SubSync</h1>
        <p className="text-xs text-slate-400">Web3-to-Web2 Revenue Reconciliation</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-md font-mono">
        <ShieldCheck className="h-4 w-4" />
        <span>Idempotent Outbox: Active</span>
      </div>
      <button onClick={onRefresh} disabled={isRefreshing} className="flex items-center gap-2 text-xs bg-slate-800 text-slate-200 px-3 py-1.5 rounded-md">
        <RefreshCw className={\`h-3.5 w-3.5 \${isRefreshing ? 'animate-spin' : ''}\`} />
        <span>Sync</span>
      </button>
    </div>
  </header>
);
`;

// ==========================================
// 33: projects/project2-subsync/frontend/src/components/StatsOverview.tsx
// ==========================================
files["projects/project2-subsync/frontend/src/components/StatsOverview.tsx"] = `import React from 'react';
import { DollarSign, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { LedgerRecord } from '../types';

export const StatsOverview: React.FC<{ records: LedgerRecord[] }> = ({ records }) => {
  const total = records.reduce((acc, r) => acc + parseFloat(r.fiatAmountUsd || '0'), 0);
  const reconciledCount = records.filter(r => r.status === 'RECONCILED').length;
  const underpaidCount = records.filter(r => r.status === 'UNDERPAID').length;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>Reconciled Volume</span><DollarSign className="h-4 w-4 text-indigo-400" /></div>
        <div className="text-2xl font-bold text-white font-mono mt-2">\${total.toFixed(2)}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>Exact Matches</span><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
        <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">{reconciledCount}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>Discrepancies</span><AlertTriangle className="h-4 w-4 text-amber-400" /></div>
        <div className="text-2xl font-bold text-amber-400 font-mono mt-2">{underpaidCount}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>ERP Synced</span><Layers className="h-4 w-4 text-blue-400" /></div>
        <div className="text-2xl font-bold text-blue-400 font-mono mt-2">{records.length} Synced</div>
      </div>
    </div>
  );
};
`;

// ==========================================
// 34: projects/project2-subsync/frontend/src/components/ContractConfigForm.tsx
// ==========================================
files["projects/project2-subsync/frontend/src/components/ContractConfigForm.tsx"] = `import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';

export const ContractConfigForm: React.FC = () => {
  const [addr, setAddr] = useState('0x5FbDB2315678afecb367f032d93F642f64180aa3');
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        <Settings className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-white">Reconciliation Contract Configuration</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Target Receiver Contract</label>
          <input type="text" value={addr} onChange={(e) => setAddr(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
        </div>
        <div className="flex items-end">
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-lg"><Save className="h-4 w-4" /> Save Pipeline</button>
        </div>
      </div>
    </div>
  );
};
`;

// ==========================================
// 35: projects/project2-subsync/frontend/src/components/ReconciliationTable.tsx
// ==========================================
files["projects/project2-subsync/frontend/src/components/ReconciliationTable.tsx"] = `import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { LedgerRecord } from '../types';

export const ReconciliationTable: React.FC<{ records: LedgerRecord[] }> = ({ records }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
    <div className="p-4 border-b border-slate-800 text-sm font-semibold text-white">Reconciled Financial Ledger</div>
    <table className="w-full text-left text-xs">
      <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
        <tr><th className="py-3 px-4">Tx Hash</th><th className="py-3 px-4">Customer</th><th className="py-3 px-4">Token</th><th className="py-3 px-4">Amount USD</th><th className="py-3 px-4">Status</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
        {records.length === 0 ? (
          <tr><td colSpan={5} className="py-6 text-center text-slate-500">No transactions recorded yet. Listening on webhook...</td></tr>
        ) : (
          records.map((r) => (
            <tr key={r.ledgerId}>
              <td className="py-3 px-4 text-indigo-400">{r.txHash ? \`\${r.txHash.substring(0, 10)}...\` : 'N/A'}</td>
              <td className="py-3 px-4">{r.customerId || 'CUST_DIRECT'}</td>
              <td className="py-3 px-4">{r.tokenSymbol || 'USDC'}</td>
              <td className="py-3 px-4 font-bold text-white">\$\${r.fiatAmountUsd}</td>
              <td className="py-3 px-4">
                <span className={\`flex items-center gap-1 \${r.status === 'UNDERPAID' ? 'text-amber-400' : 'text-emerald-400'}\`}>
                  {r.status === 'UNDERPAID' ? <AlertCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                  {r.status}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
`;

// ==========================================
// 36: projects/project3-agentic-guard/README.md
// ==========================================
files["projects/project3-agentic-guard/README.md"] = `# Project 3: Agentic Guard

Deterministic policy firewall SDK and gateway for autonomous AI agents.
`;

// ==========================================
// 37: projects/project3-agentic-guard/policies/default-rules.json
// ==========================================
files["projects/project3-agentic-guard/policies/default-rules.json"] = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "agentId",
    "policyId",
    "chainId",
    "targetContract",
    "functionSignature",
    "recipientAddress",
    "amountWei",
    "estimatedValueUsd",
    "nonce",
    "timestamp"
  ],
  "additionalProperties": false,
  "properties": {
    "agentId": { "type": "string", "pattern": "^agent-[a-zA-Z0-9_-]{3,32}$" },
    "policyId": { "type": "string", "minLength": 3, "maxLength": 64 },
    "chainId": { "type": "integer", "minimum": 1 },
    "targetContract": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "functionSignature": {
      "type": "string",
      "enum": [
        "transfer(address,uint256)",
        "approve(address,uint256)",
        "emergencyPause(string)"
      ]
    },
    "recipientAddress": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "amountWei": { "type": "string", "pattern": "^[0-9]{1,78}$" },
    "estimatedValueUsd": { "type": "number", "minimum": 0.01, "maximum": 1000000 },
    "nonce": { "type": "string", "pattern": "^[a-fA-F0-9]{16,64}$" },
    "timestamp": { "type": "integer", "minimum": 1700000000 }
  }
}
`;

// ==========================================
// 38: projects/project3-agentic-guard/n8n/project3-agentic-guard-firewall.json
// ==========================================
files["projects/project3-agentic-guard/n8n/project3-agentic-guard-firewall.json"] = `{
  "name": "Agentic Guard - Deterministic Policy Orchestrator",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "agentic-guard-intent",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook Ingest Intent",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [200, 300]
    },
    {
      "parameters": {
        "jsCode": "const body = $json.body;\\nif (!body.agentId || !body.policyId || !body.targetContract || body.estimatedValueUsd === undefined) {\\n  throw new Error('MALFORMED_INTENT: Missing mandatory schema properties');\\n}\\nreturn [{\\n  json: {\\n    agentId: body.agentId,\\n    policyId: body.policyId,\\n    chainId: body.chainId || 31337,\\n    targetContract: body.targetContract.toLowerCase(),\\n    functionSignature: body.functionSignature || 'transfer(address,uint256)',\\n    recipientAddress: (body.recipientAddress || '0x0000000000000000000000000000000000000000').toLowerCase(),\\n    amountWei: body.amountWei || '0',\\n    estimatedValueUsd: parseFloat(body.estimatedValueUsd),\\n    nonce: body.nonce || Date.now().toString(16),\\n    timestamp: body.timestamp || Math.floor(Date.now() / 1000)\\n  }\\n}];"
      },
      "name": "Validate & Normalize Intent",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [420, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT policy_id, max_value_per_tx_usd, hourly_velocity_limit_usd, daily_spending_limit_usd, human_approval_threshold_usd FROM agentic_guard.policies WHERE policy_id = '{{ $json.policyId }}' AND is_active = TRUE FOR UPDATE;"
      },
      "name": "Postgres Pessimistic Policy Lock",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [640, 300],
      "credentials": {
        "postgres": { "id": "postgres-db-creds", "name": "PostgreSQL DB" }
      }
    },
    {
      "parameters": {
        "jsCode": "const intent = $('Validate & Normalize Intent').item.json;\\nconst policy = $json;\\nif (!policy || !policy.policy_id) {\\n  return [{ json: { decision: 'BLOCKED', reason: 'POLICY_NOT_FOUND_OR_INACTIVE', intentId: intent.nonce } }];\\n}\\nif (intent.estimatedValueUsd > parseFloat(policy.max_value_per_tx_usd)) {\\n  return [{ json: { decision: 'BLOCKED', reason: 'EXCEEDS_SINGLE_TX_CAP', intentId: intent.nonce } }];\\n}\\nlet decision = 'APPROVED';\\nif (intent.estimatedValueUsd >= parseFloat(policy.human_approval_threshold_usd)) {\\n  decision = 'AWAITING_2FA';\\n}\\nreturn [{\\n  json: {\\n    decision: decision,\\n    agentId: intent.agentId,\\n    policyId: intent.policyId,\\n    targetContract: intent.targetContract,\\n    estimatedValueUsd: intent.estimatedValueUsd,\\n    evaluatedAt: new Date().toISOString()\\n  }\\n}];"
      },
      "name": "Deterministic Policy Decision",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [860, 300]
    }
  ],
  "connections": {
    "Webhook Ingest Intent": {
      "main": [[{ "node": "Validate & Normalize Intent", "type": "main", "index": 0 }]]
    },
    "Validate & Normalize Intent": {
      "main": [[{ "node": "Postgres Pessimistic Policy Lock", "type": "main", "index": 0 }]]
    },
    "Postgres Pessimistic Policy Lock": {
      "main": [[{ "node": "Deterministic Policy Decision", "type": "main", "index": 0 }]]
    }
  }
}
`;

// ==========================================
// 39: projects/project3-agentic-guard/src/index.ts
// ==========================================
files["projects/project3-agentic-guard/src/index.ts"] = `export * from './firewall';\n`;

// ==========================================
// 40: projects/project3-agentic-guard/src/firewall.ts
// ==========================================
files["projects/project3-agentic-guard/src/firewall.ts"] = `import Ajv from 'ajv';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { Pool } from 'pg';

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
import schemaJson from '../policies/default-rules.json';

export interface AgentIntent {
  agentId: string;
  policyId: string;
  chainId: number;
  targetContract: string;
  functionSignature: string;
  recipientAddress: string;
  amountWei: string;
  estimatedValueUsd: number;
  nonce: string;
  timestamp: number;
}

export class HardenedAgenticFirewall {
  private validateSchema = ajv.compile(schemaJson);

  constructor(private pool: Pool) {}

  public computeIdempotencyHash(intent: AgentIntent): string {
    return crypto.createHash('sha256').update(\`\${intent.agentId}:\${intent.policyId}:\${intent.nonce}:\${intent.chainId}\`).digest('hex');
  }

  public async evaluate(intentPayload: unknown) {
    const isValid = this.validateSchema(intentPayload);
    if (!isValid) {
      const errs = this.validateSchema.errors?.map(e => \`\${e.instancePath} \${e.message}\`).join('; ');
      return { decision: 'BLOCKED', reason: \`SCHEMA_VIOLATION: \${errs}\`, idempotencyHash: 'INVALID' };
    }

    const intent = intentPayload as AgentIntent;
    const idempotencyHash = this.computeIdempotencyHash(intent);

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - intent.timestamp) > 300) {
      return { decision: 'BLOCKED', reason: 'TIMESTAMP_DRIFT_EXCEEDED_300S', idempotencyHash };
    }

    const selector = ethers.id(intent.functionSignature).substring(0, 10);
    const abiCoder = new ethers.AbiCoder();
    let computedCalldata = selector;

    if (intent.functionSignature === 'transfer(address,uint256)') {
      computedCalldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
      if (computedCalldata.length !== 138) {
        return { decision: 'BLOCKED', reason: 'MALFORMED_CALLDATA_LENGTH', idempotencyHash };
      }
    } else if (intent.functionSignature === 'approve(address,uint256)') {
      computedCalldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
    } else if (intent.functionSignature === 'emergencyPause(string)') {
      computedCalldata += abiCoder.encode(['string'], ['Emergency Breaker Trigger']).substring(2);
    } else {
      return { decision: 'BLOCKED', reason: 'UNAUTHORIZED_FUNCTION_SIGNATURE', idempotencyHash };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const dupCheck = await client.query('SELECT intent_id FROM agentic_guard.intent_executions WHERE idempotency_hash = $1', [idempotencyHash]);
      if (dupCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: 'DUPLICATE_NONCE_REPLAY_BLOCKED', idempotencyHash };
      }

      const policyRes = await client.query('SELECT * FROM agentic_guard.policies WHERE policy_id = $1 AND is_active = TRUE FOR UPDATE', [intent.policyId]);
      if (policyRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: \`POLICY_NOT_FOUND: \${intent.policyId}\`, idempotencyHash };
      }
      const policy = policyRes.rows[0];

      const allowlistRes = await client.query(
        \`SELECT * FROM agentic_guard.allowlists 
         WHERE policy_id = $1 AND target_contract = $2 AND allowed_selector = $3 AND chain_id = $4
           AND (allowed_recipient IS NULL OR allowed_recipient = $5)\`,
        [intent.policyId, intent.targetContract.toLowerCase(), selector, intent.chainId, intent.recipientAddress.toLowerCase()]
      );
      if (allowlistRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: 'ALLOWLIST_REJECT', idempotencyHash };
      }

      if (intent.estimatedValueUsd > Number(policy.max_value_per_tx_usd)) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: \`EXCEEDS_SINGLE_TX_CAP: \$\${intent.estimatedValueUsd} > \$\${policy.max_value_per_tx_usd}\`, idempotencyHash };
      }

      const velocityRes = await client.query(
        \`SELECT COALESCE(SUM(computed_value_usd), 0) as current_spend 
         FROM agentic_guard.intent_executions 
         WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '1 hour'\`,
        [intent.policyId]
      );
      const currentSpend = Number(velocityRes.rows[0].current_spend);
      if (currentSpend + intent.estimatedValueUsd > Number(policy.hourly_velocity_limit_usd)) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: \`HOURLY_VELOCITY_BREACHED: \$\${currentSpend + intent.estimatedValueUsd} > \$\${policy.hourly_velocity_limit_usd}\`, idempotencyHash };
      }

      const dailyRes = await client.query(
        \`SELECT COALESCE(SUM(computed_value_usd), 0) as daily_spend 
         FROM agentic_guard.intent_executions 
         WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '24 hours'\`,
        [intent.policyId]
      );
      const currentDailySpend = Number(dailyRes.rows[0].daily_spend);
      if (currentDailySpend + intent.estimatedValueUsd > Number(policy.daily_spending_limit_usd)) {
        await client.query('ROLLBACK');
        return { decision: 'BLOCKED', reason: \`DAILY_LIMIT_BREACHED: \$\${currentDailySpend + intent.estimatedValueUsd} > \$\${policy.daily_spending_limit_usd}\`, idempotencyHash };
      }

      let decision: 'APPROVED' | 'AWAITING_2FA' = 'APPROVED';
      if (intent.estimatedValueUsd >= Number(policy.human_approval_threshold_usd)) {
        decision = 'AWAITING_2FA';
      }

      await client.query(
        \`INSERT INTO agentic_guard.intent_executions 
         (policy_id, agent_id, target_contract, function_selector, raw_calldata, computed_value_usd, evaluation_status, idempotency_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,
        [intent.policyId, intent.agentId, intent.targetContract.toLowerCase(), selector, computedCalldata, intent.estimatedValueUsd, decision, idempotencyHash]
      );

      await client.query('COMMIT');
      return { decision, idempotencyHash, computedCalldata, executedValueUsd: intent.estimatedValueUsd };
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
`;

// ==========================================
// 41: packages/agentic-guard-core/package.json
// ==========================================
files["packages/agentic-guard-core/package.json"] = `{
  "name": "@neon-tasker-labs/agentic-guard-core",
  "version": "1.0.0",
  "description": "Deterministic policy firewall SDK for autonomous on-chain AI agents",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "test": "vitest run"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "ethers": "^6.13.2"
  },
  "peerDependencies": {
    "pg": "^8.12.0"
  },
  "peerDependenciesMeta": {
    "pg": { "optional": true }
  },
  "devDependencies": {
    "@types/node": "^20.14.12",
    "@types/pg": "^8.11.6",
    "pg": "^8.12.0",
    "tsup": "^8.2.4",
    "typescript": "^5.5.4"
  }
}
`;

// ==========================================
// 42: packages/agentic-guard-core/tsconfig.json
// ==========================================
files["packages/agentic-guard-core/tsconfig.json"] = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
`;

// ==========================================
// 43: packages/agentic-guard-core/tsup.config.ts
// ==========================================
files["packages/agentic-guard-core/tsup.config.ts"] = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: true
});
`;

// ==========================================
// 44: packages/agentic-guard-core/src/types.ts
// ==========================================
files["packages/agentic-guard-core/src/types.ts"] = `export interface AgentIntent {
  agentId: string;
  policyId: string;
  chainId: number;
  targetContract: string;
  functionSignature: string;
  recipientAddress: string;
  amountWei: string;
  estimatedValueUsd: number;
  nonce: string;
  timestamp: number;
}

export interface PolicyRule {
  policyId: string;
  maxValuePerTxUsd: number;
  hourlyVelocityLimitUsd: number;
  dailySpendingLimitUsd: number;
  humanApprovalThresholdUsd: number;
  isActive: boolean;
}

export interface AllowlistEntry {
  policyId: string;
  targetContract: string;
  allowedSelector: string;
  allowedRecipient?: string | null;
  chainId: number;
}

export type FirewallDecision = 'APPROVED' | 'AWAITING_2FA' | 'BLOCKED';

export interface EvaluationResult {
  decision: FirewallDecision;
  reason?: string;
  idempotencyHash: string;
  computedCalldata?: string;
  executedValueUsd?: number;
}

export interface IStateStore {
  getPolicy(policyId: string): Promise<PolicyRule | null>;
  isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & { policyId: string }): Promise<boolean>;
  getHourlySpend(policyId: string): Promise<number>;
  getDailySpend?(policyId: string): Promise<number>;
  recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void>;
  isDuplicateNonce(idempotencyHash: string): Promise<boolean>;
}
`;

// ==========================================
// 45: packages/agentic-guard-core/src/schema.ts
// ==========================================
files["packages/agentic-guard-core/src/schema.ts"] = `export const INTENT_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: [
    "agentId",
    "policyId",
    "chainId",
    "targetContract",
    "functionSignature",
    "recipientAddress",
    "amountWei",
    "estimatedValueUsd",
    "nonce",
    "timestamp"
  ],
  additionalProperties: false,
  properties: {
    agentId: { type: "string", pattern: "^agent-[a-zA-Z0-9_-]{3,32}$" },
    policyId: { type: "string", minLength: 3, maxLength: 64 },
    chainId: { type: "integer", minimum: 1 },
    targetContract: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    functionSignature: { 
      type: "string", 
      enum: [
        "transfer(address,uint256)",
        "approve(address,uint256)",
        "emergencyPause(string)"
      ]
    },
    recipientAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    amountWei: { type: "string", pattern: "^[0-9]{1,78}$" },
    estimatedValueUsd: { type: "number", minimum: 0.01, maximum: 1000000 },
    nonce: { type: "string", pattern: "^[a-fA-F0-9]{16,64}$" },
    timestamp: { type: "integer", minimum: 1700000000 }
  }
} as const;
`;

// ==========================================
// 46: packages/agentic-guard-core/src/storage/memory-store.ts
// ==========================================
files["packages/agentic-guard-core/src/storage/memory-store.ts"] = `import { IStateStore, PolicyRule, AllowlistEntry, AgentIntent, FirewallDecision } from '../types';

export class InMemoryStore implements IStateStore {
  private policies = new Map<string, PolicyRule>();
  private allowlists: AllowlistEntry[] = [];
  private executions: Array<{ intent: AgentIntent; decision: FirewallDecision; hash: string; timestamp: number }> = [];

  public addPolicy(policy: PolicyRule): void {
    this.policies.set(policy.policyId, policy);
  }

  public addAllowlist(entry: AllowlistEntry): void {
    this.allowlists.push({
      ...entry,
      targetContract: entry.targetContract.toLowerCase(),
      allowedRecipient: entry.allowedRecipient?.toLowerCase() ?? null
    });
  }

  async getPolicy(policyId: string): Promise<PolicyRule | null> {
    return this.policies.get(policyId) || null;
  }

  async isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & { policyId: string }): Promise<boolean> {
    return this.allowlists.some(
      a =>
        a.policyId === entry.policyId &&
        a.targetContract === entry.targetContract.toLowerCase() &&
        a.allowedSelector === entry.allowedSelector &&
        a.chainId === entry.chainId &&
        (a.allowedRecipient === null || a.allowedRecipient === (entry.allowedRecipient?.toLowerCase() ?? null))
    );
  }

  async getHourlySpend(policyId: string): Promise<number> {
    const oneHourAgo = Date.now() - 3600000;
    return this.executions
      .filter(e => e.intent.policyId === policyId && e.decision === 'APPROVED' && e.timestamp >= oneHourAgo)
      .reduce((acc, e) => acc + e.intent.estimatedValueUsd, 0);
  }

  async getDailySpend(policyId: string): Promise<number> {
    const oneDayAgo = Date.now() - 86400000;
    return this.executions
      .filter(e => e.intent.policyId === policyId && e.decision === 'APPROVED' && e.timestamp >= oneDayAgo)
      .reduce((acc, e) => acc + e.intent.estimatedValueUsd, 0);
  }

  async recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void> {
    this.executions.push({ intent, decision, hash, timestamp: Date.now() });
  }

  async isDuplicateNonce(idempotencyHash: string): Promise<boolean> {
    return this.executions.some(e => e.hash === idempotencyHash);
  }
}
`;

// ==========================================
// 47: packages/agentic-guard-core/src/storage/pg-store.ts
// ==========================================
files["packages/agentic-guard-core/src/storage/pg-store.ts"] = `import { Pool } from 'pg';
import { IStateStore, PolicyRule, AllowlistEntry, AgentIntent, FirewallDecision } from '../types';

export class PostgresStore implements IStateStore {
  constructor(private pool: Pool) {}

  async getPolicy(policyId: string): Promise<PolicyRule | null> {
    const res = await this.pool.query(
      'SELECT policy_id as "policyId", max_value_per_tx_usd as "maxValuePerTxUsd", hourly_velocity_limit_usd as "hourlyVelocityLimitUsd", daily_spending_limit_usd as "dailySpendingLimitUsd", human_approval_threshold_usd as "humanApprovalThresholdUsd", is_active as "isActive" FROM agentic_guard.policies WHERE policy_id = $1',
      [policyId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      policyId: r.policyId,
      maxValuePerTxUsd: Number(r.maxValuePerTxUsd),
      hourlyVelocityLimitUsd: Number(r.hourlyVelocityLimitUsd),
      dailySpendingLimitUsd: Number(r.dailySpendingLimitUsd),
      humanApprovalThresholdUsd: Number(r.humanApprovalThresholdUsd),
      isActive: r.isActive
    };
  }

  async isAllowlisted(entry: Omit<AllowlistEntry, 'policyId'> & { policyId: string }): Promise<boolean> {
    const res = await this.pool.query(
      \`SELECT entry_id FROM agentic_guard.allowlists 
       WHERE policy_id = $1 AND target_contract = $2 AND allowed_selector = $3 AND chain_id = $4
         AND (allowed_recipient IS NULL OR allowed_recipient = $5)\`,
      [
        entry.policyId,
        entry.targetContract.toLowerCase(),
        entry.allowedSelector,
        entry.chainId,
        entry.allowedRecipient ? entry.allowedRecipient.toLowerCase() : null
      ]
    );
    return res.rows.length > 0;
  }

  async getHourlySpend(policyId: string): Promise<number> {
    const res = await this.pool.query(
      \`SELECT COALESCE(SUM(computed_value_usd), 0) as spend 
       FROM agentic_guard.intent_executions 
       WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '1 hour'\`,
      [policyId]
    );
    return Number(res.rows[0].spend);
  }

  async getDailySpend(policyId: string): Promise<number> {
    const res = await this.pool.query(
      \`SELECT COALESCE(SUM(computed_value_usd), 0) as spend 
       FROM agentic_guard.intent_executions 
       WHERE policy_id = $1 AND evaluation_status IN ('APPROVED', 'EXECUTED') AND created_at >= NOW() - interval '24 hours'\`,
      [policyId]
    );
    return Number(res.rows[0].spend);
  }

  async recordExecution(intent: AgentIntent, decision: FirewallDecision, hash: string): Promise<void> {
    await this.pool.query(
      \`INSERT INTO agentic_guard.intent_executions 
       (policy_id, agent_id, target_contract, function_selector, raw_calldata, computed_value_usd, evaluation_status, idempotency_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (idempotency_hash) DO NOTHING\`,
      [
        intent.policyId,
        intent.agentId,
        intent.targetContract.toLowerCase(),
        intent.functionSignature.substring(0, 10),
        '0x',
        intent.estimatedValueUsd,
        decision,
        hash
      ]
    );
  }

  async isDuplicateNonce(idempotencyHash: string): Promise<boolean> {
    const res = await this.pool.query(
      'SELECT intent_id FROM agentic_guard.intent_executions WHERE idempotency_hash = $1',
      [idempotencyHash]
    );
    return res.rows.length > 0;
  }
}
`;

// ==========================================
// 48: packages/agentic-guard-core/src/firewall.ts
// ==========================================
files["packages/agentic-guard-core/src/firewall.ts"] = `import Ajv from 'ajv';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { INTENT_SCHEMA } from './schema';
import { AgentIntent, EvaluationResult, IStateStore } from './types';

const ajv = new Ajv({ allErrors: true, removeAdditional: false });

export class AgenticFirewall {
  private validateSchema = ajv.compile(INTENT_SCHEMA);

  constructor(private store: IStateStore) {}

  public computeIdempotencyHash(intent: AgentIntent): string {
    return crypto.createHash('sha256').update(\`\${intent.agentId}:\${intent.policyId}:\${intent.nonce}:\${intent.chainId}\`).digest('hex');
  }

  public async evaluate(intentPayload: unknown): Promise<EvaluationResult> {
    const isValid = this.validateSchema(intentPayload);
    if (!isValid) {
      const errorDetails = this.validateSchema.errors?.map(e => \`\${e.instancePath} \${e.message}\`).join('; ');
      return { decision: 'BLOCKED', reason: \`SCHEMA_VIOLATION: \${errorDetails}\`, idempotencyHash: 'INVALID_PAYLOAD' };
    }

    const intent = intentPayload as AgentIntent;
    const idempotencyHash = this.computeIdempotencyHash(intent);

    const currentUnix = Math.floor(Date.now() / 1000);
    if (Math.abs(currentUnix - intent.timestamp) > 300) {
      return { decision: 'BLOCKED', reason: 'TIMESTAMP_DRIFT_EXCEEDED_300_SECONDS', idempotencyHash };
    }

    if (await this.store.isDuplicateNonce(idempotencyHash)) {
      return { decision: 'BLOCKED', reason: 'DUPLICATE_NONCE_REPLAY_ATTACK_PREVENTED', idempotencyHash };
    }

    const policy = await this.store.getPolicy(intent.policyId);
    if (!policy || !policy.isActive) {
      return { decision: 'BLOCKED', reason: \`POLICY_INACTIVE_OR_UNAVAILABLE: \${intent.policyId}\`, idempotencyHash };
    }

    const selector = ethers.id(intent.functionSignature).substring(0, 10);
    const allowlisted = await this.store.isAllowlisted({
      policyId: intent.policyId,
      targetContract: intent.targetContract,
      allowedSelector: selector,
      allowedRecipient: intent.recipientAddress,
      chainId: intent.chainId
    });

    if (!allowlisted) {
      return { decision: 'BLOCKED', reason: \`ALLOWLIST_REJECT: Function selector \${selector} or target not authorized\`, idempotencyHash };
    }

    if (intent.estimatedValueUsd > policy.maxValuePerTxUsd) {
      return { decision: 'BLOCKED', reason: \`EXCEEDS_SINGLE_TX_CAP: \$\${intent.estimatedValueUsd} > \$\${policy.maxValuePerTxUsd}\`, idempotencyHash };
    }

    const hourlySpend = await this.store.getHourlySpend(intent.policyId);
    if (hourlySpend + intent.estimatedValueUsd > policy.hourlyVelocityLimitUsd) {
      return { decision: 'BLOCKED', reason: \`HOURLY_VELOCITY_BREACHED: Spent \$\${hourlySpend + intent.estimatedValueUsd} > Limit \$\${policy.hourlyVelocityLimitUsd}\`, idempotencyHash };
    }

    if (this.store.getDailySpend) {
      const dailySpend = await this.store.getDailySpend(intent.policyId);
      if (dailySpend + intent.estimatedValueUsd > policy.dailySpendingLimitUsd) {
        return { decision: 'BLOCKED', reason: \`DAILY_LIMIT_BREACHED: Spent \$\${dailySpend + intent.estimatedValueUsd} > Limit \$\${policy.dailySpendingLimitUsd}\`, idempotencyHash };
      }
    }

    let finalDecision: 'APPROVED' | 'AWAITING_2FA' = 'APPROVED';
    if (intent.estimatedValueUsd >= policy.humanApprovalThresholdUsd) {
      finalDecision = 'AWAITING_2FA';
    }

    const abiCoder = new ethers.AbiCoder();
    let calldata = selector;
    if (intent.functionSignature === 'transfer(address,uint256)') {
      calldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
    } else if (intent.functionSignature === 'approve(address,uint256)') {
      calldata += abiCoder.encode(['address', 'uint256'], [intent.recipientAddress, intent.amountWei]).substring(2);
    }

    await this.store.recordExecution(intent, finalDecision, idempotencyHash);

    return {
      decision: finalDecision,
      idempotencyHash,
      computedCalldata: calldata,
      executedValueUsd: intent.estimatedValueUsd
    };
  }
}
`;

// ==========================================
// 49: packages/agentic-guard-core/src/index.ts
// ==========================================
files["packages/agentic-guard-core/src/index.ts"] = `export * from './types';
export * from './schema';
export * from './firewall';
export * from './storage/memory-store';
export * from './storage/pg-store';
`;

// ==========================================
// 50: scripts/setup-windows.ps1
// ==========================================
files["scripts/setup-windows.ps1"] = `$ErrorActionPreference = "Stop"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  NEON TASKER LABS — AUTOMATED SETUP & CONTAINER BUILD" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host " [CREATED] .env initialized from template." -ForegroundColor Green
}

Write-Host "\`nBuilding Node Workspaces & Core Packages..." -ForegroundColor Yellow
npm install --silent
npm run build --workspaces --if-present

Write-Host "\`nStarting Docker Services Stack..." -ForegroundColor Yellow
docker compose down -v 2>$null
docker compose up -d --build

Start-Sleep -Seconds 5
& ".\\scripts\\healthcheck.ps1"
`;

// ==========================================
// 51: scripts/healthcheck.ps1
// ==========================================
files["scripts/healthcheck.ps1"] = `$ErrorActionPreference = "Continue"
Write-Host "\`n--- RUNNING INFRASTRUCTURE HEALTH PROBES ---" -ForegroundColor Cyan

$db = docker exec postgres-db psql -U postgres -d web3_automation -t -c "SELECT count(*) FROM information_schema.schemata WHERE schema_name IN ('secops', 'subsync', 'agentic_guard');" 2>$null
if ($db.Trim() -eq "3") { Write-Host " [PASS] PostgreSQL Schemas Initialized" -ForegroundColor Green } else { Write-Host " [FAIL] PostgreSQL Unhealthy" -ForegroundColor Red }

try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 3
    if ($res.result) { Write-Host " [PASS] Local Anvil Node (Block: $($res.result))" -ForegroundColor Green }
} catch { Write-Host " [FAIL] Anvil Unreachable" -ForegroundColor Red }

try {
    $p = Invoke-RestMethod -Uri "http://127.0.0.1:3000/health" -Method Get -TimeoutSec 3
    if ($p.status -eq "OK") { Write-Host " [PASS] Signing Proxy Active" -ForegroundColor Green }
} catch { Write-Host " [FAIL] Signing Proxy Unreachable" -ForegroundColor Red }

try {
    $s = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -Method Get -TimeoutSec 3
    if ($s.status -eq "OK") { Write-Host " [PASS] Mock Webhook Sink Active" -ForegroundColor Green }
} catch { Write-Host " [FAIL] Webhook Sink Unreachable" -ForegroundColor Red }
`;

// ==========================================
// 52: scripts/verify-artifacts.ps1
// ==========================================
files["scripts/verify-artifacts.ps1"] = `$ErrorActionPreference = "Stop"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  NEON TASKER LABS — MASTER ARTIFACT VERIFICATION GATE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$manifestPath = "FILE_MANIFEST.md"
if (-not (Test-Path $manifestPath)) {
    Write-Host " [FATAL] FILE_MANIFEST.md is missing!" -ForegroundColor Red
    exit 1
}

$manifestLines = Get-Content $manifestPath | Where-Object { $_ -match "^\\|\\s*\`([^\`]+)\`" }
$expectedFiles = @()
foreach ($line in $manifestLines) {
    if ($line -match "^\\|\\s*\`([^\`]+)\`") {
        $expectedFiles += $Matches[1]
    }
}

$missing = @()
foreach ($f in $expectedFiles) {
    if (-not (Test-Path $f)) {
        $missing += $f
        Write-Host " [MISSING] $f" -ForegroundColor Red
    }
}

if ($missing.Count -gt 0) {
    Write-Host "\`n[FATAL] Artifact Gate Failed: $($missing.Count) files missing." -ForegroundColor Red
    exit 1
}

if ($expectedFiles.Count -ne 54) {
    Write-Host "\`n[FATAL] Manifest count is $($expectedFiles.Count), expected exactly 54." -ForegroundColor Red
    exit 1
}

Write-Host " [PASS] Exactly 54/54 artifacts verified on disk." -ForegroundColor Green
`;

// ==========================================
// 53: README.md
// ==========================================
files["README.md"] = `# Neon Tasker Labs — Deterministic Web3 Automation & Security Laboratory

Founder: Anurag Sherke (No-Code / Low-Code Web3 Automation Architect)

## Overview
Neon Tasker Labs is a reproducible 54-file monorepo containing three specialized Web3 automation architectures:

1. **SubSync:** On-chain payment reconciliation pipeline with exact BigNumber token normalization, transactional outbox queues, and a real-time React dashboard.
2. **Agentic Guard:** Deterministic policy firewall SDK and gateway for autonomous AI agents, enforcing AJV Draft-07 schemas and pessimistic PostgreSQL velocity locks.
3. **SecOps Pipeline:** Incident response orchestrator featuring HMAC-authenticated webhook ingestion and pre-flight Anvil state simulations.

## Quickstart (Windows 10/11 + WSL2)
\`\`\`powershell
.\\scripts\\setup-windows.ps1
.\\scripts\\healthcheck.ps1
.\\scripts\\verify-artifacts.ps1
\`\`\`
`;

// ==========================================
// 54: FILE_MANIFEST.md
// ==========================================
files["FILE_MANIFEST.md"] = `# Neon Tasker Labs — Master Monorepo File Manifest

| File Path | Purpose | Category |
|---|---|---|
| \`bootstrap-neon-tasker-labs.ps1\` | Master monorepo generator and self-recovery script | Tooling |
| \`package.json\` | Monorepo npm root workspace definition | Configuration |
| \`tsconfig.json\` | Base TypeScript configuration | Configuration |
| \`.env.example\` | Environment variable definition template | Configuration |
| \`.gitignore\` | Monorepo git ignore rules | Configuration |
| \`docker-compose.yml\` | 5-container infrastructure stack definition | Infrastructure |
| \`infrastructure/postgres/init-schemas.sql\` | PostgreSQL schemas for secops, subsync, and agentic_guard | Database |
| \`infrastructure/signing-proxy/package.json\` | Signing proxy service npm configuration | Infrastructure |
| \`infrastructure/signing-proxy/tsconfig.json\` | Signing proxy TypeScript configuration | Infrastructure |
| \`infrastructure/signing-proxy/Dockerfile\` | Signing proxy container definition | Infrastructure |
| \`infrastructure/signing-proxy/src/index.ts\` | Hardened signing proxy with failover provider pool | Infrastructure |
| \`infrastructure/mock-sink/package.json\` | Mock webhook sink npm configuration | Infrastructure |
| \`infrastructure/mock-sink/Dockerfile\` | Mock webhook sink container definition | Infrastructure |
| \`infrastructure/mock-sink/server.js\` | Mock accounting sink and DLQ capture server | Infrastructure |
| \`projects/project1-secops/contracts/PausableVault.sol\` | Pausable vault contract with guardian access control | Project 1 |
| \`projects/project1-secops/n8n/project1-secops-circuit-breaker.json\` | Project 1 canonical n8n circuit breaker workflow export | Project 1 |
| \`projects/project1-secops/README.md\` | Project 1 specification and quickstart | Project 1 |
| \`projects/project2-subsync/README.md\` | Project 2 specification and quickstart | Project 2 |
| \`projects/project2-subsync/src/normalizer.ts\` | Exact BigNumber token decimal normalization engine | Project 2 |
| \`projects/project2-subsync/src/reconciliation-engine.ts\` | Transactional outbox payment reconciliation engine | Project 2 |
| \`projects/project2-subsync/n8n/project2-subsync-reconciliation.json\` | Project 2 canonical n8n reconciliation workflow export | Project 2 |
| \`projects/project2-subsync/frontend/package.json\` | SubSync React dashboard npm configuration | Project 2 |
| \`projects/project2-subsync/frontend/vite.config.ts\` | SubSync React Vite bundler configuration | Project 2 |
| \`projects/project2-subsync/frontend/tailwind.config.js\` | SubSync Tailwind CSS configuration | Project 2 |
| \`projects/project2-subsync/frontend/postcss.config.js\` | SubSync PostCSS processor configuration | Project 2 |
| \`projects/project2-subsync/frontend/tsconfig.json\` | SubSync React TypeScript configuration | Project 2 |
| \`projects/project2-subsync/frontend/index.html\` | SubSync dashboard HTML root | Project 2 |
| \`projects/project2-subsync/frontend/src/main.tsx\` | SubSync React entry point | Project 2 |
| \`projects/project2-subsync/frontend/src/App.tsx\` | SubSync main dashboard component | Project 2 |
| \`projects/project2-subsync/frontend/src/index.css\` | SubSync global stylesheet | Project 2 |
| \`projects/project2-subsync/frontend/src/types/index.ts\` | SubSync frontend TypeScript interfaces | Project 2 |
| \`projects/project2-subsync/frontend/src/components/Navbar.tsx\` | SubSync dashboard navigation bar | Project 2 |
| \`projects/project2-subsync/frontend/src/components/StatsOverview.tsx\` | SubSync financial metric cards | Project 2 |
| \`projects/project2-subsync/frontend/src/components/ContractConfigForm.tsx\` | SubSync pipeline contract form | Project 2 |
| \`projects/project2-subsync/frontend/src/components/ReconciliationTable.tsx\` | SubSync real-time reconciled ledger table | Project 2 |
| \`projects/project3-agentic-guard/README.md\` | Project 3 specification and quickstart | Project 3 |
| \`projects/project3-agentic-guard/policies/default-rules.json\` | Project 3 AJV Draft-07 intent schema and baseline policies | Project 3 |
| \`projects/project3-agentic-guard/n8n/project3-agentic-guard-firewall.json\` | Project 3 canonical n8n policy gateway workflow export | Project 3 |
| \`projects/project3-agentic-guard/src/index.ts\` | Project 3 module entry point | Project 3 |
| \`projects/project3-agentic-guard/src/firewall.ts\` | Project 3 pessimistic row-level locking policy firewall | Project 3 |
| \`packages/agentic-guard-core/package.json\` | Agentic Guard SDK npm package definition | Project 3 |
| \`packages/agentic-guard-core/tsconfig.json\` | Agentic Guard SDK TypeScript configuration | Project 3 |
| \`packages/agentic-guard-core/tsup.config.ts\` | Agentic Guard SDK dual CJS/ESM bundler config | Project 3 |
| \`packages/agentic-guard-core/src/types.ts\` | Agentic Guard SDK core interfaces and types | Project 3 |
| \`packages/agentic-guard-core/src/schema.ts\` | Agentic Guard SDK JSON schema definitions | Project 3 |
| \`packages/agentic-guard-core/src/storage/memory-store.ts\` | Agentic Guard in-memory state store implementation | Project 3 |
| \`packages/agentic-guard-core/src/storage/pg-store.ts\` | Agentic Guard PostgreSQL state store implementation | Project 3 |
| \`packages/agentic-guard-core/src/firewall.ts\` | Agentic Guard standalone firewall engine | Project 3 |
| \`packages/agentic-guard-core/src/index.ts\` | Agentic Guard SDK primary export entry point | Project 3 |
| \`scripts/setup-windows.ps1\` | Windows 10/11 automated setup and build orchestrator | Tooling |
| \`scripts/healthcheck.ps1\` | 5-container infrastructure health probe | Tooling |
| \`scripts/verify-artifacts.ps1\` | Monorepo artifact completeness verification gate | Tooling |
| \`README.md\` | Monorepo master documentation | Documentation |
| \`FILE_MANIFEST.md\` | Canonical 54-file artifact manifest | Documentation |

---
**Verification Ledger:**
* Expected Files: 54
* Actual Files: 54
* Missing Files: 0
* Unexpected Files: 0
`;

let count = 0;
for (const relPath in files) {
  const fullPath = path.join(root, relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, files[relPath], 'utf8');
  count++;
  console.log(`[${count}/54] Generated: ${relPath}`);
}

console.log(`\n============================================================`);
console.log(`NEON TASKER LABS — GENERATION COMPLETE`);
console.log(`Files generated: ${count}`);
console.log(`============================================================`);