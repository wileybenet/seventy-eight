/**
 * @fileOverview A simple example module that exposes a getClient function.
 *
 * The client is replaced if it is disconnected.
 */

var colors = require('colors'); 
var mysql = require('mysql');
var q = require('q');

var schema;

var pool = mysql.createPool({
  host     : process.env.DB_HOST ||'localhost',
  port     : process.env.DB_PORT ||'8889',
  user     : process.env.DB_USER ||'root',
  password : process.env.DB_PASSWORD ||'root',
  database : (schema = process.env.DB_SCHEMA || null),

  multipleStatements: true
});
var totalConnections = 0;
 
pool.on('connection', function (connection) {
  totalConnections++;
  console.log('new connection made:', totalConnections, 'active');
});

pool.on('enqueue', function () {
  console.log('waiting for available connection slot');
});

exports.schema = schema;

exports.escapeKey = pool.escapeId.bind(pool);
exports.escapeValue = pool.escape.bind(pool);

exports.ping = function() {
  setInterval(function() {
    pool.getConnection(function(err, connection) {
      if (err) throw err;
      connection.ping(function() {
        if (err) throw err;
        console.log('connected to mysql:', exports.getDate());
        connection.release();
      });
    });
  }, 60000);
};

exports.getClient = function(cbFn) {
  pool.getConnection(function(err, connection) {
    cbFn(connection);
  });
};

exports.formatQuery = function(str, params) {
  var queryString = mysql.format(str, params);
  console.log(queryString.replace(/( [A-Z]+|[A-Z]+ )/g, function(s, m) { return m.cyan; }));
  return queryString;
};

exports.query = function (str, params) {
  var deferred = q.defer();
  pool.getConnection(function(err, connection) {
    if (err)
      return deferred.reject(err);

    connection.query(str, params, function(err, data) {
      if (err)
        deferred.reject(err);
      else
        deferred.resolve(data);
      connection.release();
    });
  });
  return deferred.promise;
};

exports.close = function(callbackFn) {
  pool.end(callbackFn);
};

exports.getDate = function(dayShift) {
  var date;
  date = new Date();
  date.setDate(date.getDate() + (dayShift || 0));
  date = date.getUTCFullYear() + '-' +
    ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
    ('00' + date.getUTCDate()).slice(-2) + ' ' +
    ('00' + date.getUTCHours()).slice(-2) + ':' +
    ('00' + date.getUTCMinutes()).slice(-2) + ':' +
    ('00' + date.getUTCSeconds()).slice(-2);

  return date;
};