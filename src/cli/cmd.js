#!/usr/bin/env node
/* eslint-disable node/shebang */
const { color } = require('../utils');
const [, , cmd, ...options] = process.argv;

const error = color('red');

const cmdOptions = {
  'create-model': () => require('./commands/create.model').createModel,
  'sync-table': () => require('./commands/sync.table').syncTable,
};

const command = cmdOptions[cmd];

if (command) {
  command()(...options).then(msg => {
    console.log(msg);
  }).catch(msg => {
    console.log(`${error('Error:')} ${msg}`);
  });
} else {
  console.log(`${error('Error:')} unknown command '${cmd || '<empty>'}', options:\n${Object.keys(cmdOptions).join('\n')}`);
}
