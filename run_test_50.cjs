const { execSync } = require('child_process');
try {
  const out = execSync('npx vitest run server.test.ts -t "TEST-F2R3-WS-050" --reporter=verbose', { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.log(e.stdout);
}
