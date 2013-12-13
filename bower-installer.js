#!/usr/bin/env node

var _ = require('lodash');
var fileLib = require("node-fs");
var colors = require('colors');
var bower = require('bower');
var fs = require('fs');
var path = require('path');
var pathLib = path;
var basePath = process.cwd();
var cfg;
var pathSep = '/';
var glob = require('glob');

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
        return (basePath + pathSep + path);
    });

var installDependency = function(deps, key) {
    var base, other;

    // Look for an overriden source
    if(cfg.sources && cfg.sources[key]){
        // local path, so should work
        deps = cfg.sources[key];
    }
    else {
        deps = deps.split(',');
    }

    // Check for mapping which will map old file names to new ones
    if(deps.mapping) {
      deps = deps.mapping;
    }

    // Ensure we always are dealing with an array
    if(!_.isArray(deps)) {
        deps = [ deps ];
    }

    // Install each dependency
    _.each(deps, function(dep) {

      // If the file is an object, it is for mapping (renaming) the source
      // file to a new filename in the destination. Because of this, it 
      // does not make sense to do a file glob, just immediately install 
      // the file
      if(_.isObject(dep)) {
        installFile(dep, key);
      } else {
        glob(dep, function(err, files) {
          if(err) {
            console.log(('Error globbing \t' + key + ' : ' + dep).red);
            console.log(('\t\t' + err).red);
          } else {
            _.each(files, function(f) {
              installFile(f, key);
            });
          }
        });
      }
    });
};

function installFile(f, key) {
  var f_s,  // The path for the file to be moved
      f_name, // The full path for the file to be moved
      path,   // The path for the new file location
      f_name_new; // The new file name, if we are mapping to a new name

    // If the dependency is an object, it must 
    // be a mapping, so configure things to rename
    // the file
    if(_.isObject(f)){
      for(var dep_key in f) {
        f_s = dep_key;
        f_name_new = f[f_s];
      }
    } else {
      f_s = f;
    }

    // If the file path doesn't include the current location, add it
    f_name = f_s.indexOf(basePath) === 0 ? f_s : basePath + pathSep + f_s;

    // If the configured paths is a map, use the path for the given file extension
    if( paths.all ) {
        path = paths.all + pathSep + key;
        if (!fileLib.existsSync( pathLib.normalize(basePath + pathSep + path))) {
            fileLib.mkdirSync(pathLib.normalize(basePath + pathSep + path), 0755);
        }
    } else {
        // Determine the path by the file extension type
        path = paths[getExtension(f_name)];
    }


    var name = f_name_new ? f_name_new : pathLib.basename(f_name);
    var f_path = basePath + pathSep + path + pathSep + name;
    
    // If it is a directory lets try to read from package.json file
    if( fs.lstatSync( f_name ).isDirectory() ) {

        var packagejson = f_name + pathSep + "package.json";

        // we want the build to continue as default if case something fails
        try {
            // read package.json file
            var file = fs.readFileSync(packagejson).toString('ascii')

            // parse file
            var filedata = JSON.parse(file);

            // path to file from main property inside package.json
            var mainpath = f_name + pathSep + filedata.main;

            // if we have a file reference on package.json to main property and it is a file
            if( fs.lstatSync( mainpath ).isFile() ) {

                f_name = mainpath;
                // Update the output path with the correct file extension
                if( !paths.all ) {
                    path = paths[getExtension(mainpath)];
                }
                f_path = basePath + pathSep + path + pathSep + filedata.main;
            }

        }
        catch( error ) {
            // We wont need to show log error, if package.json doesnt exist default to download folder
            // console.log(error);
        }
    }

    copyFile(f_name, f_path, function(error) {
        if(!error) {
            console.log(('\t' + key + ' : ' + f_path).green);
        } else {
            console.log(('Error\t' + f + ' : ' + f_path).red);
            console.log('\t\t' + error);
        }
    });

}

process.stdout.write('Setting up install paths...');

_.each(installPathFiles, function(file) {
    deleteFolderRecursive(file);
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
                    installDependency(subDep, key);
                });
            } else {
               installDependency(dep, key);
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



function deleteFolderRecursive(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

function getExtension(filename) {
    return path.extname(filename||'').slice(1);
}

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}
