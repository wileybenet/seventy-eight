require('dotenv').config();
const style = require('ansi-styles');
const { spawn } = require('child_process');
const coverTests = process.argv[2] === 'coverage';

console.log(`running JASMINE`);
let jasmine = null;

if (coverTests) {
  jasmine = spawn('istanbul', ['cover', 'jasmine']);
} else {
  jasmine = spawn('jasmine');
}

jasmine.stdout.on('data', data => {
  console.log(`${data}`);
});
jasmine.stderr.on('data', data => {
  console.error(`${data}`);
});

jasmine.on('close', code => {
  if (code === 0) {
    console.log(`${style.green.open} ✓   All tests passing${style.green.close}`);
    console.log(``);
  }
  process.exit(code); // eslint-disable-line no-process-exit
});
