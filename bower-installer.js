#!/usr/bin/env node

var _ = require('lodash');
var File = require('file-utils').File;
var colors = require('colors');
var bower = require('bower');
var fs = require('fs');
var path = require('path');
var basePath = process.cwd();
var cfg;

// Load configuration file
try {
    cfg = require(path.join(basePath,'bower.json')).install;
} catch(e) {
    cfg = require(path.join(basePath,'component.json')).install;
}
 
if(!cfg || !cfg.path) {
    console.log(("bower-installer error").red + " bower.json must contain a valid install path");
}

var paths = _.isString(cfg.path) ? {all: cfg.path} : cfg.path;

var installPathFiles =  _.map( paths, 
    function(path) {        
        return new File(basePath + '/' + path);
    });   

var installDependency = function(deps, key) {

    deps = cfg.sources && cfg.sources[key] ? cfg.sources[key] : deps;

    if(!_.isArray(deps)) {
        deps = [ deps ];
    }

    _.each(deps, function(dep) {        

        var f_s = dep;
        var f_name = basePath + '/' + f_s;
        var f = new File( f_name );      
        // If the configured paths is a map, use the path for the given file extension  
        var path = paths.all ? paths.all : paths[f.getExtension()];        
        var f_path = basePath + '/' + path + '/' + f.getName();

        // If it is a directory lets try to read from package.json file
        if( fs.lstatSync( f_name ).isDirectory() ) {

            var packagejson = f_name + '/' + "package.json";

            // we want the build to continue as default if case something fails
            try {
                // read package.json file
                var file = fs.readFileSync(packagejson).toString('ascii')

                // parse file
                var filedata = JSON.parse(file);

                // path to file from main property inside package.json
                var mainpath = f_name + '/' + filedata.main;

                // if we have a file reference on package.json to main property and it is a file
                if( fs.lstatSync( mainpath ).isFile() ) {

                    f = new File( mainpath );
                    // Update the output path with the correct file extension
                    path = paths.all ? paths.all : paths[f.getExtension()];  
                    f_path = basePath + '/' + path + '/' + filedata.main;
                }

            }
            catch( error ) {
                // We wont need to show log error, if package.json doesnt exist default to download folder
                // console.log(error);
            }
        }

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


process.stdout.write('Setting up install paths...');

var setup = 0;
_.each(installPathFiles, function(file) {
    (function(file) {
        file.remove(function() {
            file.createDirectory(function() {setup++;});
        });
    })(file);
});

setTimeout(function() {
    if(setup === installPathFiles.length) {
        process.stdout.write(("Finished\r\n").green);
        startInstallations();
    } else {
        setTimeout(arguments.callee, 50);
    }
},50);

function startInstallations() {
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
}
