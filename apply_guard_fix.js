const fs = require('fs');
const { execSync } = require('child_process');

try {
  // Export active workflow directly
  execSync('n8n export:workflow --id=U4F7paDJRp8qexbi --output=/tmp/guard_source.json', { stdio: 'inherit' });
  const raw = fs.readFileSync('/tmp/guard_source.json', 'utf8');
  const data = JSON.parse(raw);
  const wf = Array.isArray(data) ? data[0] : data;

  // 1. Safe Postgres Query with Default Fallback Row
  const pgNode = wf.nodes.find(n => n.name === 'Postgres Pessimistic Policy Lock');
  if (pgNode) {
    pgNode.parameters.query = "SELECT COALESCE(p.policy_id, 'NONE') AS policy_id, COALESCE(p.max_value_per_tx_usd, 0) AS max_value_per_tx_usd, COALESCE(p.hourly_velocity_limit_usd, 0) AS hourly_velocity_limit_usd, COALESCE(p.daily_spending_limit_usd, 0) AS daily_spending_limit_usd, COALESCE(p.human_approval_threshold_usd, 0) AS human_approval_threshold_usd, COALESCE((SELECT json_agg(LOWER(a.target_contract)) FROM agentic_guard.allowlists a WHERE a.policy_id = p.policy_id), '[]'::json) AS allowed_contracts FROM (SELECT '{{ $json.policyId }}' AS req_policy_id) req LEFT JOIN agentic_guard.policies p ON p.policy_id = req.req_policy_id AND p.is_active = TRUE;";
  }

  // 2. Safe Deterministic Decision Logic
  const decNode = wf.nodes.find(n => n.name === 'Deterministic Policy Decision');
  if (decNode) {
    decNode.parameters.jsCode = [
      "const intent = $('Validate & Normalize Intent').item.json;",
      "const policy = $json;",
      "if (!policy || policy.policy_id === 'NONE') {",
      "  return [{ json: { decision: 'BLOCKED', reason: 'POLICY_NOT_FOUND_OR_INACTIVE', intentId: intent.nonce } }];",
      "}",
      "const allowedList = policy.allowed_contracts || [];",
      "if (allowedList.length > 0 && !allowedList.includes(intent.targetContract.toLowerCase())) {",
      "  return [{ json: { decision: 'BLOCKED', reason: 'UNAUTHORIZED_TARGET_CONTRACT', intentId: intent.nonce, targetContract: intent.targetContract } }];",
      "}",
      "if (intent.estimatedValueUsd > parseFloat(policy.max_value_per_tx_usd)) {",
      "  return [{ json: { decision: 'BLOCKED', reason: 'EXCEEDS_SINGLE_TX_CAP', intentId: intent.nonce } }];",
      "}",
      "let decision = 'APPROVED';",
      "if (intent.estimatedValueUsd >= parseFloat(policy.human_approval_threshold_usd)) {",
      "  decision = 'AWAITING_2FA';",
      "}",
      "return [{",
      "  json: {",
      "    decision: decision,",
      "    agentId: intent.agentId,",
      "    policyId: intent.policyId,",
      "    targetContract: intent.targetContract,",
      "    estimatedValueUsd: intent.estimatedValueUsd,",
      "    evaluatedAt: new Date().toISOString()",
      "  }",
      "}];"
    ].join('\n');
  }

  wf.active = true;
  fs.writeFileSync('/tmp/guard_ready.json', JSON.stringify([wf], null, 2), 'utf8');

  // Import and publish cleanly
  execSync('n8n import:workflow --input=/tmp/guard_ready.json', { stdio: 'inherit' });
  execSync('n8n publish:workflow --id=U4F7paDJRp8qexbi', { stdio: 'inherit' });
  console.log('WORKFLOW_PERMANENT_PATCH_SUCCESS');
} catch (err) {
  console.error('PATCH_FAILED:', err);
  process.exit(1);
}
