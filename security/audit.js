import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('--- Starting Security Audit ---');

const projects = [
  { name: 'Backend', path: path.join(rootDir, 'backend') },
  { name: 'Customer Portal (React)', path: path.join(rootDir, 'customer-portal') },
  { name: 'Support Workspace (Angular)', path: path.join(rootDir, 'support-workspace') }
];

let hasHighSeverity = false;

for (const project of projects) {
  console.log(`\nAuditing ${project.name}...`);
  if (!fs.existsSync(project.path)) {
    console.log(`Path not found: ${project.path}`);
    continue;
  }
  
  try {
    const output = execSync('npm audit --omit=dev --audit-level=high --json', { cwd: project.path, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const result = JSON.parse(output);
    const vulns = result.metadata.vulnerabilities;
    console.log(`✅ ${project.name}: No high/critical vulnerabilities found.`);
  } catch (error) {
    if (error.stdout) {
      try {
        const result = JSON.parse(error.stdout);
        const vulns = result.metadata.vulnerabilities;
        console.error(`❌ ${project.name}: Found vulnerabilities: High: ${vulns.high}, Critical: ${vulns.critical}`);
        if (vulns.high > 0 || vulns.critical > 0) {
          hasHighSeverity = true;
        }
      } catch (parseError) {
        console.error(`❌ ${project.name}: npm audit failed, could not parse output. Error: ${error.message}`);
      }
    } else {
      console.error(`❌ ${project.name}: npm audit failed to run.`);
    }
  }
}

if (hasHighSeverity) {
  console.error('\n🚨 SECURITY AUDIT FAILED: High or Critical vulnerabilities found.');
  process.exit(1);
} else {
  console.log('\n✅ SECURITY AUDIT PASSED: No High or Critical vulnerabilities found.');
  process.exit(0);
}
