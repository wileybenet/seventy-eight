#!/usr/bin/env node
/* eslint-disable node/shebang */
const { color, log, indent } = require('../utils');
// program
//   .command('setup [env]')
//   .description('run setup commands for all envs')
//   .option("-s, --setup_mode [mode]", "Which setup mode to use")
//   .action(function(env, options){
//     var mode = options.setup_mode || "normal";
//     env = env || 'all';
//     console.log('setup for %s env(s) with %s mode', env, mode);
//   });
const [, , cmd, ...options] = process.argv;

process.env.NODE_ENV = 'CLI';

const error = color('red');
const logG = log('green');
const logR = log('red');

const disconnect = () => {
  if (process.env.CONNECTED_TO_78) {
    const seventyEight = require('../seventy.eight');
    seventyEight.db.close();
  }
  console.log(``);
};

const cmdOptions = {
  'init': () => require('./commands/sync').init,
  'create-model': () => require('./commands/model').createModel,
  // 'sync-table': () => require('./commands/sync').syncTable,
  'sync-data': () => require('./commands/sync').syncData,
  'make-migrations': () => require('./commands/sync').makeMigrations,
  'run-migrations': () => require('./commands/sync').runMigrations,
};

const command = cmdOptions[cmd];

console.log(``);

try {
  require('dotenv').config();
} catch (err) {
  logR(error('Error:'), 'seventy-eight requires a dotenv configuration');
}

if (command) {
  command()(...options).then(msg => {
    logG(msg);
    disconnect();
  }).catch(err => {
    logR(error('Error:'), err || err);
    disconnect();
  });
} else {
  logR(error('Error:'), `unknown command '${cmd || '<empty>'}', options:${indent}  ${Object.keys(cmdOptions).join(`${indent}  `)}`);
}
