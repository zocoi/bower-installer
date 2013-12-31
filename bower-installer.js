#!/usr/bin/env node

var _       = require('lodash'),
    fileLib = require("node-fs"),
    colors  = require('colors'),
    bower   = require('bower'),
    path    = require('path'),
    utils   = require('./lib/utils'),
    installer = require('./lib/installer');

var basePath = process.cwd(),
    pathSep  = '/',
    cfg;

// Load configuration file
try {
    cfg = require(path.join(basePath,'bower.json')).install;
} catch(e) {
    cfg = require(path.join(basePath,'component.json')).install;
}

if(!cfg || !cfg.path) {
    console.log(("bower-installer error").red + " bower.json must contain a valid install path");
    return;
}

var paths = _.isString(cfg.path) ? {all: cfg.path} : cfg.path;

var installPathFiles =  _.map( paths,
    function(path) {
        return (basePath + pathSep + path);
    });

process.stdout.write('Setting up install paths...');

_.each(installPathFiles, function(file) {
    utils.deleteFolderRecursive(file);
    fileLib.mkdirSync(file, 0755, true);
});

process.stdout.write(("Finished\r\n").green);

process.stdout.write('Running bower install...');

bower.commands
.install()
.on('end', function (installed) {
  process.stdout.write(("Finished\r\n").green);

  bower.commands
    .list({paths: true})
    .on('end', function (data) {
      console.log('Installing: ');

      _.each(data, function(dep, key) {
          if(!cfg.ignore || (cfg.ignore && !_.contains(cfg.ignore, key)) ) {
            if(_.isArray(dep)) {
                _.each(dep, function(subDep) {
                    installer.installDependency(subDep, key, cfg, paths);
                });
            } else {
               installer.installDependency(dep, key, cfg, paths);
            }
          } else {
            console.log(('\tIgnoring: ' + key).yellow);
          }
      });

    })
    .on('error', function(error) {
      console.error(error);
    });

})
.on('error', function(error) {
  process.stdout.write(("Error\r\n").red);
  console.error(error);
});