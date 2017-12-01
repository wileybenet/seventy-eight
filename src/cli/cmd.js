#!/usr/bin/env node
/* eslint-disable node/shebang */
const seventyEight = require('../seventy.eight');
const { color } = require('../utils');
const [, , cmd, ...options] = process.argv;

const error = color('red');

const cmdOptions = {
  'create-model': require('./commands/create.model').createModel,
  'sync-table': require('./commands/sync.table').syncTable,
};

const command = cmdOptions[cmd];

if (command) {
  command(...options).then(msg => {
    console.log(msg);
    seventyEight.db.close();
  }).catch(msg => {
    console.error(msg);
    seventyEight.db.close();
  });
} else {
  console.log(`${error('ERROR:')} unknown command '${cmd || '<empty>'}', options:\n${Object.keys(cmdOptions).join('\n')}`);
  seventyEight.db.close();
}
