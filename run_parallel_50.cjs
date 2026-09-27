const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function runWorker(workerId, runs) {
    for(let i=0; i<runs; i++) {
        try {
            await execAsync('npx vitest run server.test.ts');
            console.log(`Worker ${workerId} Run ${i+1}: PASS`);
        } catch(e) {
            console.error(`Worker ${workerId} Run ${i+1}: FAIL`);
            process.exit(1);
        }
    }
}

async function main() {
    const promises = [];
    for(let i=0; i<5; i++) {
        promises.push(runWorker(i+1, 10)); 
    }
    await Promise.all(promises);
    console.log("SUCCESS: 50 runs completed across 5 parallel workers. 50/50 PASSED. DETERMINISM VERIFIED.");
}
main();
