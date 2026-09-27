const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

// The file was originally structured as:
// import ...
// vi.mock(...)
// describe('SAMARA ...')

// But the tests were appended at the end of the file.
// Let's just strip everything from the end that shouldn't be there.
// And put the imports back at the top.

let lines = testTs.split('\n');

// Find all lines that start with import
let importLines = lines.filter(l => l.startsWith('import '));
let nonImportLines = lines.filter(l => !l.startsWith('import '));

let combined = [...importLines, ...nonImportLines].join('\n');

// Clean up trailing garbage
combined = combined.replace(/}\);\s*}\);\s*$/m, '});\n});\n');

fs.writeFileSync('server.test.ts', combined);
