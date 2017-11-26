require('../local/process.env');
const { spawn } = require('child_process');

console.log(`running JASMINE`);
const jasmine = spawn('jasmine');

jasmine.stdout.on('data', data => {
  console.log(`${data}`);
});

jasmine.on('close', code => {
  process.exit(code); // eslint-disable-line no-process-exit
});
