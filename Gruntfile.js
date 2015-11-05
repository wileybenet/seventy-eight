module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-jasmine-node');
  
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jasmine_node: {
      specNameMatcher: 'spec'
    }
  });
  
  grunt.registerTask('test', 'jasmine_node');

};