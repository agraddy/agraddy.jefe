var async = require('async');
var fs = require('fs');
var homedir = require('homedir');
var path = require('path');

var args = process.argv.slice(2);
var command;

if(args.length) {
	command = args[0];

	// Go through current directory and every parent directory
	// Process in serial order, nor parallel
	// alias for npm run - is there anything to run?
	//
	// Maybe check local jefedirs
	// Then local node_modules
	// Then local node_modules/.bin
	// Then check parent jefedirs
	// Then parent node_modules?
	//
	//
	// jefedir
	// jefedir/node_modules // Add a checkDirectory argument to also look inside node_modules
	// .jefedir
	// .jefedir/node_modules
	// _jefedir
	// _jefedir/node_modules
	// node_modules
	// ~/jefedir - Use home directory module?
	// ~/jefedir/node_modules
	// ~/.jefedir
	// ~/.jefedir/node_modules
	// ~/_jefedir
	// ~/_jefedir/node_modules

	async.series([
			loop.bind(null, './', 'node_modules'),
			loop.bind(null, './', 'jefedir'),
			loop.bind(null, './', '.jefedir'),
			loop.bind(null, './', '_jefedir'),

			loop.bind(null, homedir(), 'jefedir'),
			loop.bind(null, homedir(), '.jefedir'),
			loop.bind(null, homedir(), '_jefedir')
		], function(foundPackage) {
			if(foundPackage) {
				require(foundPackage).jefe(args.slice(1)); // Eventually pass args
			} else {
				console.log('No package found.');
			}
	});

	/*
	loop('./', 'jefedir', function(foundPackage) {
		if(foundPackage) {
			// In the bin, also put the jefe() call
			require(foundPackage).jefe(); // Eventually pass args
			// OR
			//require(foundPackage)(); // Return a function, eventually pass args
		} else {
			console.log('No package found.');
		}
	});
	*/

	function checkDirectory(input, cb) {
		var i;
		var json;
		var found = false;
		var foundPackage = '';
		fs.readdir(input, function(err, files) {
			async.eachSeries(files, function(file, cb2) {
				fs.stat(path.join(input, file, 'package.json') , function(err, stats) {
					if(stats && stats.isFile()) {
						json = require(path.resolve(input, file, 'package.json'));
						if(json.jefe == command) {
							foundPackage = path.resolve(input, file);
							found = true;
							cb2(true);
						} else {
							cb2();
						}
					} else {
						if(file == 'node_modules') {
							fs.readdir(path.join(input, file), function(err, files2) {
								async.eachSeries(files2, function(file2, cb3) {
									fs.stat(path.join(input, file, file2, 'package.json') , function(err, stats) {
										if(stats && stats.isFile()) {
											json = require(path.resolve(input, file, file2, 'package.json'));
											if(json.jefe == command) {
												foundPackage = path.resolve(input, file, file2);
												found = true;
												cb3(true);
											} else {
												cb3();
											}
										} else {
											cb3();
										}
									});
								}, function(err) {
									if(err) {
										cb2(foundPackage);
									} else {
										cb2(null);
									}
								});
							});
						} else {
							cb2();
						}
					}
				});
			}, function(err) {
				if(err) {
					cb(foundPackage);
				} else {
					cb(null);
				}
			});
		});
	}

	// Loop through directories going one level up each time
	// Look for the type of directory passed in
	function loop(dir, type, cb) {
		fs.stat(dir, function(err, stats) {
			// Check if the special type of directory exists
			fs.stat(path.join(dir, type), function(err, stats) {
				if(stats && stats.isDirectory()) {
					// Examine subdirectories and their package.json files
					checkDirectory(path.join(dir, type), function(foundPackage) {
						if(foundPackage) {
							cb(foundPackage);
						} else {
							loop(path.join(dir, '../'), type, cb);
						}
					});
				} else {
					if(path.resolve(dir) !== '/') {
						loop(path.join(dir, '../'), type, cb);
					} else {
						// No more parents - reached the end
						cb();
					}
				}
			});
		});
	}

} else {
	console.log('No command supplied.');
}
