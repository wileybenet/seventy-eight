require('dotenv').config();
const client = require('../src/lib/db.client');

client.query(`DROP DATABASE ${process.env.DB_SCHEMA}`).then(function() {
  client.close();
});
