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
  connectionLimit: 100,
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

function log(str, params) {
  if (params)
    str = mysql.format(str, params);
  var notification = (/^\w+/).exec(str);
  if (!process.env.DEBUG) return (notification ? notification[0].cyan : 'QUERY: null');
  if (process.env.DEBUG) return (str.replace(/( [A-Z]+|[A-Z]+ )/g, function(s, m) { return m.cyan; }));
}
function spinner() {
  var count = 0;
  var spinner = ['\\', '|', '/', '-', '\\', '|', '/', '-'];
  return setInterval(function() {
    process.stdout.write("\r" + spinner[count%8]);
    count++;
  }, 50);
}

exports.schema = schema;

exports.escapeKey = pool.escapeId.bind(pool);
exports.escapeValue = pool.escape.bind(pool);

exports.ping = function(wait, callbackFn) {
  callbackFn = callbackFn || function() {};
  var pingId = setInterval(function() {
    pool.getConnection(function(err, connection) {
      if (err) {
        return callbackFn(err);
      }
      connection.ping(function() {
        if (err) {
          callbackFn(err);
        }
        console.log('connected to mysql:', exports.getDate());
        connection.release();
        callbackFn();
      });
    });
  }, wait || 60000);

  return function() {
    clearInterval(pingId);
  };
};

exports.getClient = function(cbFn) {
  pool.getConnection(function(err, connection) {
    cbFn(connection);
  });
};

exports.formatQuery = function(str, params) {
  var queryString = mysql.format(str, params);
  return queryString;
};

exports.query = function (str, params) {
  var deferred = q.defer();
  pool.getConnection(function(err, connection) {
    if (err)
      return deferred.reject(err);

    var start = new Date();
    console.log(log(str, params));

    var interval = spinner();
    connection.query(str, params, function(err, data) {
      clearInterval(interval);
      if (err){
        deferred.reject(err);
      } else {
        deferred.resolve(data);
        console.log("\r" + Math.round((+(new Date()) - start )/ 1000).toString().green + ' sec'.green);
      }
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
