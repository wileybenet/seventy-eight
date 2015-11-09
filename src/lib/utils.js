module.exports = {

  toSnake: function(str) {
    return str.substr(0, 1).toLowerCase() + str.substr(1).replace(/[A-Z]/g, function(match) {
      return '_' + match.toLowerCase();
    });
  },

  toCamel: function(str) {
    return str.replace(/_([a-z])/g, function(full, match) {
      return match.toUpperCase();
    });
  }
  
};