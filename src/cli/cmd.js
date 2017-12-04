#!/usr/bin/env node
/* eslint-disable node/shebang */
const { color } = require('../utils');
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

const disconnect = () => {
  if (process.env.CONNECTED_TO_78) {
    require('../seventy.eight').db.close();
  }
};

const cmdOptions = {
  'init': () => require('./commands/sync').init,
  'create-model': () => require('./commands/model').createModel,
  'sync-table': () => require('./commands/sync').syncTable,
  'make-migrations': () => require('./commands/sync').makeMigrations,
  'run-migrations': () => require('./commands/sync').runMigrations,
};

const command = cmdOptions[cmd];

try {
  require('dotenv').config();
} catch (err) {
  console.log(error('Error:'), 'seventy-eight requires a dotenv configuration');
}

if (command) {
  command()(...options).then(msg => {
    console.log(msg);
    disconnect();
  }).catch(err => {
    console.log(error('Error:'), err);
    disconnect();
  });
} else {
  console.log(`${error('Error:')} unknown command '${cmd || '<empty>'}', options:\n${Object.keys(cmdOptions).join('\n')}`);
}
