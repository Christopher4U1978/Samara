const { execSync } = require('child_process');

let passed = 0;
let failed = 0;

console.log("Starting 50 consecutive runs of the SAMARA F2-R3 test suite...");

for (let i = 1; i <= 50; i++) {
   try {
      execSync('npx vitest run server.test.ts', { stdio: 'ignore' });
      passed++;
      process.stdout.write(`Run ${i}: PASS\n`);
   } catch (e) {
      failed++;
      process.stdout.write(`Run ${i}: FAIL\n`);
      console.error(`\nFAILED ON RUN ${i}. Halting.`);
      break;
   }
}

console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
if (failed === 0) {
   console.log("SUCCESS: 50 consecutive runs passed completely. Determinism verified.");
} else {
   process.exit(1);
}
