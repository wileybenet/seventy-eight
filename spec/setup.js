require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const q = require('q');
const client = require('../src/lib/db.client');
const skipCreateDatabase = process.env.CI_BUILD;
const mysqlCLI = process.env.MYSQL_NAME || 'mysql';
const deferred = q.defer();


const createDatabase = () => new Promise((resolve, reject) => {
  const args = [
    '-u', process.env.DB_USER,
    `-p${process.env.DB_PASSWORD}`,
    '-h', process.env.DB_HOST,
    '-P', process.env.DB_PORT,
    '-e', `CREATE DATABASE IF NOT EXISTS ${process.env.DB_SCHEMA}`,
  ];
  const createDB = spawn(mysqlCLI, args);

  createDB.stderr.on('data', data => {
    console.log(`create database stderr: ${data}`);
  });

  createDB.on('close', code => {
    if (code === 0) {
      resolve();
    } else {
      console.log(`create database failed, error code ${code}`);
      reject();
    }
  });
});

const seedDatabase = () => new Promise((resolve, reject) => {
  const sql = fs.readFileSync(path.resolve(__dirname, 'seed.sql')).toString().replace(/\n/g, ''); // eslint-disable-line no-sync

  client.query(sql).then(function() {
    console.log('DATABASE SEEDED');
    resolve(true);
    client.close();
  }, function(err) {
    console.log(err);
    reject();
  });
});

if (skipCreateDatabase) {
  console.log(`skipping db creation`);
  seedDatabase().then(deferred.resolve).catch(console.error);
} else {
  console.log(`creating database ${process.env.DB_SCHEMA}`);
  createDatabase().then(seedDatabase).then(deferred.resolve).catch(console.error);
}

module.exports = deferred.promise;
