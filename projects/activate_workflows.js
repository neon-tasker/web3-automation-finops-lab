const fs = require('fs');
const { execSync } = require('child_process');

try {
  console.log('1. Exporting workflows...');
  execSync('n8n export:workflow --all --output=/tmp/all_raw.json');
  
  const raw = fs.readFileSync('/tmp/all_raw.json', 'utf8');
  const workflows = JSON.parse(raw);
  console.log(`Found ${workflows.length} workflows. Setting active = true...`);

  workflows.forEach(wf => {
    wf.active = true;
  });

  fs.writeFileSync('/tmp/all_active.json', JSON.stringify(workflows, null, 2));
  
  console.log('2. Re-importing active workflows...');
  execSync('n8n import:workflow --input=/tmp/all_active.json');
  console.log('SUCCESS: All workflows imported and activated in-memory!');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
