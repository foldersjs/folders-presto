var FoldersPresto = new require('../folders-presto');

var prefix = 'folders.io_0:presto_hive';

var config = {
	"user" : "your_username",
	"host" : "your_host",
	"port" : "your_port",
	"catalog" : "hive",
	"schema" : "default"
};

var foldersPresto = new FoldersPresto(prefix, config);

foldersPresto.ls('/', function cb(error, databases) {
	if (error) {
		console.log("error in ls /");
		console.log(error);
	}

	console.log("ls databases success, ", databases);

	foldersPresto.ls('/folders', function cb(error, tables) {
		if (error) {
			console.log("error in ls database folders");
			console.log(error);
		}
		console.log("ls tables success, ", tables);

		foldersPresto.ls('/folders/test', function cb(error, metadata) {
			if (error) {
				console.log('error in ls table metadata');
				console.log(error);
			}

			console.log('ls metadata success, ', metadata);
			foldersPresto.cat('/folders/test/columns', function cb(error,
					columns) {
				if (error) {
					console.log('error in cat table columns');
					console.log(error);
				}

				console.log('cat table columns success, \n', columns);
			});
		})

	});

});
