module.exports = function(grunt) {

// Project configuration.
grunt.initConfig({
  pkg: grunt.file.readJSON('package.json'),
  jasmine_node: {
    defaultTimeoutInterval: 100
  }
});

grunt.loadNpmTasks('grunt-jasmine-node');

// Default task(s).
grunt.registerTask('default', ['jasmine_node']);

};