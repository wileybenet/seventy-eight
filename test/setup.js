var { spawn } = require('child_process');
var path = require('path');
var fs = require('fs');
var q = require('q');
var client = require('../src/lib/db.client');

var args = [
  '-u', process.env.DB_USER,
  `-p${process.env.DB_PASSWORD}`,
  '-e', `CREATE DATABASE IF NOT EXISTS ${process.env.DB_SCHEMA}`,
];

var createTable = spawn('mysql', args);
console.log(`creating database ${process.env.DB_SCHEMA}`);

var deferred = q.defer();

var createTableLog = '';

createTable.stdout.on('data', data => {
  createTableLog += data;
});

createTable.stderr.on('data', data => {
  console.log(`create database stderr: ${data}`);
});

createTable.on('close', code => {
  if (code === 0) {
    var sql = fs.readFileSync(path.resolve(__dirname, 'seed.sql')).toString().replace(/\n/g, '');

    client.query(sql).then(function() {
      console.log('DATABASE SEEDED');
      deferred.resolve(true);
    }, function(err) {
      console.log(err);
    });
  } else {
    console.log(`create database failed, error code ${code}`);
  }
});

module.exports = deferred.promise;
