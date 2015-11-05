var client = require('../lib/db.client');
var path = require('path');
var fs = require('fs');

var sql = fs.readFileSync(path.resolve(__dirname, 'seed.sql')).toString().replace(/\n/g, '');

client.query(sql).then(function() {
  console.log('DATABASE SEEDED');
});