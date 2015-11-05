var client = require('../src/lib/db.client');
var path = require('path');
var fs = require('fs');
var q = require('q');
var deferred = q.defer();

var sql = fs.readFileSync(path.resolve(__dirname, 'purge.sql')).toString().replace(/\n/g, '');

client.query(sql).then(function() {
  console.log('DATABASE PURGED');
  client.close();
  deferred.resolve(true);
});

module.exports = deferred.promise;