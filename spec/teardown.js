require('dotenv').config();
const client = require('../src/lib/db.client');
const q = require('q');
const deferred = q.defer();

client.query(`DROP DATABASE ${process.env.DB_SCHEMA}`).then(function() {
  deferred.resolve(true);
  client.close();
});

module.exports = deferred.promise;
