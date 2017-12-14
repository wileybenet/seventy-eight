class SeventyEightError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class NotFoundError extends SeventyEightError {
  constructor(message = 'record does not exist') {
    super(message, 404);
  }
}

class NotImplementedError extends SeventyEightError {
  constructor(message = 'functionality not implemented') {
    super(message, 501);
  }
}

class SQLError extends SeventyEightError {
  constructor(message) {
    super(message, 500);
  }
}

module.exports = {
  SeventyEightError,
  NotFoundError,
  NotImplementedError,
  SQLError,
};
