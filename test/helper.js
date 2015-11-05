module.exports = function (path) {
  console.log(process.cwd());
  return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../src/') + path);
};