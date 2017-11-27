/**
 * @fileOverview A simple example module that exposes a getClient function.
 *
 * The client is replaced if it is disconnected.
 */

var style = require('ansi-styles');
var mysql = require('mysql');
var q = require('q');

var schema;

function color(str, clr) {
  if (str) {
    return style[clr].open + str + style[clr].close;
  }
  return '';
}

var pool = mysql.createPool({
  host     : process.env.DB_HOST || 'localhost',
  port     : process.env.DB_PORT || '3000',
  user     : process.env.DB_USER || 'root',
  password : process.env.DB_PASSWORD || 'root',
  database : (schema = process.env.DB_SCHEMA || null),
  connectionLimit: 100,
  multipleStatements: true
});

var totalConnections = 0;

pool.on('connection', function () {
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
  if (!process.env.DEBUG) return (notification ? color(notification[0], 'cyan') : 'QUERY: null');
  if (process.env.DEBUG) return (str.replace(/( [A-Z_]+|[A-Z_]+ )/g, function(s, m) { return color(m, 'cyan'); }));
}
function spinner() {
  if (!process.env.DEBUG) return function() {};
  var count = 0;
  var spinner = ['\\', '|', '/', '-', '\\', '|', '/', '-'];
  var intval = setInterval(function() {
    process.stdout.write("\r" + spinner[count%8]);
    count++;
  }, 75);
  return function() {
    clearInterval(intval);
  };
}

exports.schema = schema;

exports.escapeKey = pool.escapeId.bind(pool);
exports.escapeValue = value => {
  if (value === 'NULL') {
    return value;
  }
  return pool.escape(value);
};

exports.ping = function() {
  return new Promise((resolve, reject) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        return reject(err);
      }
      connection.ping(function() {
        if (err) {
          reject(err);
        }
        console.log('connected to mysql:', exports.getDate());
        connection.release();
        resolve();
      });
    });
  });
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
    if (err) {
      return deferred.reject(err);
    }

    const start = new Date();
    console.log(log(str, params));

    const interval = spinner();
    connection.query(str, params, function(err, data) {
      interval();
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(data);
        if (!process.env.JASMINE) {
          console.log("\r" + Math.round((+(new Date()) - start )/ 1000).toString().green + ' sec'.green);
        }
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
