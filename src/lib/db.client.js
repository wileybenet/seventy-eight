const mysql = require('mysql');
const { sqlHighlight, error: { SQLError } } = require('../utils');
const init = require('./init');

let schema = null;

var pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '3000',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: schema = process.env.DB_SCHEMA || null,
  connectionLimit: 100,
  multipleStatements: true,
});

let totalConnections = 0;

pool.on('connection', function () {
  totalConnections += 1;
  init.log.info(`new connection made: ${totalConnections} active`);
});

pool.on('enqueue', function () {
  init.log.info('waiting for available connection slot');
});

exports.schema = schema;
exports.format = mysql.format.bind(mysql);

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
        init.log.info('connected to mysql:', new Date().toJSON());
        connection.release();
        resolve();
      });
    });
  });
};

const getConnection = () => new Promise((resolve, reject) => {
  pool.getConnection(function(err, connection) {
    if (err) {
      return reject(err);
    }
    resolve({
      query(str, params) {
        return new Promise((res, rej) => {
          connection.query(str, params, (error, data) => {
            if (error) {
              init.log.error({
                code: error.code,
                number: error.errno,
                message: error.sqlMessage,
                sql: error.sql,
              });
              return rej(new SQLError(error.message));
            }
            res(data);
          });
        });
      },
      release() {
        connection.release();
      },
    });
  });
});

exports.getConnection = getConnection;

exports.formatQuery = function(str, params) {
  var queryString = mysql.format(str, params);
  return queryString;
};

exports.query = async (str, params, silent = false) => {
  const conn = await getConnection();
  if (!silent) {
    init.log.info({ sql: sqlHighlight(mysql.format(str, params)) });
  }
  const data = await conn.query(str, params);
  conn.release();
  return data;
};

exports.close = async callbackFn => {
  const connection = await getConnection();
  connection.release();
  pool.end(callbackFn);
};
