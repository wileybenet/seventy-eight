require('../local/process.env');

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const q = require('q');
const client = require('../src/lib/db.client');

const args = [
  '-u', process.env.DB_USER,
  `-p${process.env.DB_PASSWORD}`,
  '-e', `CREATE DATABASE IF NOT EXISTS ${process.env.DB_SCHEMA}`,
];

const createDB = spawn('mysql', args);
console.log(`creating database ${process.env.DB_SCHEMA}`);

const deferred = q.defer();

createDB.stderr.on('data', data => {
  console.log(`create database stderr: ${data}`);
});

createDB.on('close', code => {
  if (code === 0) {
    const sql = fs.readFileSync(path.resolve(__dirname, 'seed.sql')).toString().replace(/\n/g, ''); // eslint-disable-line no-sync

    client.query(sql).then(function() {
      console.log('DATABASE SEEDED');
      deferred.resolve(true);
      client.close();
    }, function(err) {
      console.log(err);
    });
  } else {
    console.log(`create database failed, error code ${code}`);
  }
});

module.exports = deferred.promise;
