require('../local/process.env');

const client = require('../src/lib/db.client');
const q = require('q');
const deferred = q.defer();

client.query(`DROP DATABASE ${process.env.DB_SCHEMA}`).then(function() {
  deferred.resolve(true);
  client.close();
}, function(err) {
  console.log(err);
});

module.exports = deferred.promise;
