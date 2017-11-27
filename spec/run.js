require('../local/process.env');
const style = require('ansi-styles');
const { spawn } = require('child_process');

console.log(`running JASMINE`);
const jasmine = spawn('jasmine');

jasmine.stdout.on('data', data => {
  console.log(`${data}`);
});
jasmine.stderr.on('data', data => {
  console.error(`${data}`);
});

jasmine.on('close', code => {
  if (code === 0) {
    console.log(`${style.green.open}##########################################################${style.green.close}`);
    console.log(`${style.green.open}#########                 PASSED                 #########${style.green.close}`);
    console.log(`${style.green.open}##########################################################${style.green.close}`);
  }
  process.exit(code); // eslint-disable-line no-process-exit
});
