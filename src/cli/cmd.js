#!/usr/bin/env node
/* eslint-disable node/shebang */
const { color } = require('../utils');
const [, , cmd, ...options] = process.argv;

const error = color('red');

const cmdOptions = {
  'create-model': require('./commands/create.model').createModel,
  'sync-table': require('./commands/sync.table').syncTable,
};

const command = cmdOptions[cmd];

if (command) {
  command(...options);
} else {
  console.log(`${error('ERROR:')} unknown command '${cmd}', options:\n${Object.keys(cmdOptions).join('\n')}`);
}
