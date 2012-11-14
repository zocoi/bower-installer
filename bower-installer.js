#!/usr/bin/env node

var _ = require('lodash');
var File = require('file-utils').File;
var colors = require('colors');
var bower = require('bower');
var fs = require('fs');
var path = require('path');
var basePath = process.cwd();
var cfg = require(path.join(basePath,'component.json')).install;
 
if(!cfg || !cfg.path) {
    console.log(("bower-installer error").red + " component.json must contain a valid install path");
}

var installPath = new File(basePath + '/' + cfg.path);

var installDependency = function(deps, key) {

    deps = cfg.sources && cfg.sources[key] ? cfg.sources[key] : deps;

    if(!_.isArray(deps)) {
        deps = [ deps ];
    }

    _.each(deps, function(dep) {

        var f_s = dep;
        var f = new File( basePath + '/' + f_s ); 
        var f_path = basePath + '/' + cfg.path + '/' + f.getName();

        f.copy( f_path, function(error, copied) {
            if(!error && copied) {
                console.log(('\t' + key + ' : ' + f_path).green);
            } else {
                console.log(('Error\t' + dep + ' : ' + f_path).red); 
                console.log('\t\t' + error);
            }
        });

    });
};

installPath.remove(function() {
    installPath.createDirectory();
});

bower.commands
  .list({paths: true})
  .on('data', function (data) {
    console.log('Installing: ');

    _.each(data, function(dep, key) {

        if(_.isArray(dep)) {
            _.each(dep, function(subDep) {
                installDependency(subDep, key); 
            });
        } else {
           installDependency(dep, key); 
        }
    });

  });

