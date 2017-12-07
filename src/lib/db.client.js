const mysql = require('mysql');
const { color } = require('../utils');

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


const cyan = color('cyan');
// const green = color('green');
let totalConnections = 0;

const log = (str, params) => {
  let formattedStr = str;
  if (params) {
    formattedStr = mysql.format(str, params);
  }
  const notification = (/^\w+/).exec(formattedStr);
  let logString = notification ? cyan(notification[0]) : 'QUERY: null';
  if (process.env.DEBUG) {
    logString = formattedStr.replace(/( [A-Z_]{3,}|[A-Z_]{3,} |[A-Z_]{3,}$)/g, (s, m) => cyan(m));
  }
  if (process.env.NODE_ENV !== 'CLI') {
    console.log(logString);
  }
};

pool.on('connection', function () {
  totalConnections += 1;
  log(`new connection made: ${totalConnections} active`);
});

pool.on('enqueue', function () {
  log('waiting for available connection slot');
});

const spinner = () => {
  if (!process.env.DEBUG) {
    return () => {};
  }
  // const start = new Date();
  let count = 0;
  let interval = null;
  let spinning = false;
  const character = ['\\', '|', '/', '-', '\\', '|', '/', '-'];
  const startSpinning = () => {
    interval = setInterval(() => {
      process.stdout.write(`\r${character[count % 8]}`);
      count += 1;
    }, 75);
    spinning = true;
  };
  const delay = setTimeout(startSpinning, 10000);
  return () => {
    if (spinning) {
      clearInterval(interval);
    } else {
      clearTimeout(delay);
    }
    // log(green(`\r${((Number(new Date()) - start) / 1000).toFixed(3)} sec`));
  };
};

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
        log('connected to mysql:', exports.getDate());
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
              return rej(error);
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
  const connection = await getConnection();
  if (!silent) {
    log(str, params);
  }
  const interval = spinner();
  const data = await connection.query(str, params);
  interval();
  connection.release();
  return data;
};

exports.startTransaction = async () => {
  await exports.query('START TRANSACTION');
};

exports.rollback = async () => {
  await exports.query('ROLLBACK');
};

exports.commit = async () => {
  await exports.query('COMMIT');
};

exports.close = async callbackFn => {
  await getConnection();
  pool.end(callbackFn);
};

exports.getDate = function(dayShift) {
  let date = new Date();
  date.setDate(date.getDate() + (dayShift || 0));
  date = date.getUTCFullYear() + '-' +
    ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
    ('00' + date.getUTCDate()).slice(-2) + ' ' +
    ('00' + date.getUTCHours()).slice(-2) + ':' +
    ('00' + date.getUTCMinutes()).slice(-2) + ':' +
    ('00' + date.getUTCSeconds()).slice(-2);

  return date;
};
