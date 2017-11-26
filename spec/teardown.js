require('../local/process.env');

const client = require('../src/lib/db.client');
const path = require('path');
const fs = require('fs');
const q = require('q');
const deferred = q.defer();

const sql = fs.readFileSync(path.resolve(__dirname, 'purge.sql')).toString().replace(/\n/g, '').trim(); // eslint-disable-line no-sync

client.query(sql).then(function() {
  console.log('DATABASE DROPPED');
  deferred.resolve(true);
  client.close();
}, function(err) {
  console.log(err);
});

module.exports = deferred.promise;
