var presto = require('presto-client');
// //https://prestodb.io/docs/current/sql.html
var assert = require('assert');
var Readable = require('stream').Readable;
var tableFormatter = require('markdown-table');

var DEFAULT_PRESTO_PREFIX = "/folders.io_0:presto/";

var FoldersPresto = function(prefix, options) {
	assert.equal(typeof (options), 'object',
			"argument 'options' must be a object");

	if (prefix && prefix.length && prefix.substr(-1) != '/')
		prefix += '/';
	this.prefix = prefix || DEFAULT_HDFS_PREFIX;

	this.configure(options);
};

module.exports = FoldersPresto;

FoldersPresto.prototype.configure = function(options) {

	this.host = options.host;
	this.port = options.port;
	this.user = options.user;
	this.catalog = options.catalog || 'hive';
	this.schema = options.schema || 'default';

	this.client = new presto.Client({
		host : this.host,
		port : this.port,
		user : this.user,
		catalog : this.catalog,
		schema : this.schema
	});
}

FoldersPresto.prototype.features = FoldersPresto.features = {
	cat : true,
	ls : true,
	write : false,
	server : false
};

FoldersPresto.isConfigValid = function(config, cb) {
	assert.equal(typeof (config), 'object',
			"argument 'config' must be a object");

	assert.equal(typeof (cb), 'function', "argument 'cb' must be a function");

	var checkConfig = config.checkConfig;
	if (checkConfig == false) {
		return cb(null, config);
	}

	// TODO check access credentials and test conn if needed.

	return cb(null, config);
};

// remove the prefix from path if exist
FoldersPresto.prototype.getPrestoPath = function(path, prefix) {
	path = (path == '/' ? null : path.slice(1));

	if (path == null) {
		return null;
	}

	var parts = path.split('/');
	var prefixPath = parts[0];
	if (prefix && prefix[0] == '/')
		prefixPath = '/' + prefixPath;
	prefixPath = prefixPath + '/';

	// if the path start with the prefix, remove the prefix string.
	if (prefixPath == prefix) {
		parts = parts.slice(1, parts.length);
	}

	var out = {};
	if (parts.length > 0)
		out.database = parts[0];
	if (parts.length > 1)
		out.table = parts[1];
	if (parts.length > 2)
		out.tableMetadata = parts[2];

	return out;
}

/**
 * list db metadata in folders.io format
 * 
 * @param uri,
 *            the uri for db. /${database}/${table}/ eg:
 *            <li>'/' , show the root path, show the databases/schemas</li>
 *            <li>'/test-db', show all the tables in database 'test-db' </li>
 *            <li>'/test-db/test-table', show the metadata of table we support
 *            'test-table' in database 'test-db';</li>
 *            all the path could also start with {prefix},
 *            '/folders.io_0:presto/test-db'
 * @param cb,
 *            callback function(err, result) function. result will be a file
 *            info array. [{}, ... {}] <br>
 *            a example file information <code>
 *            { 
 *               name: 'default',
 *               fullPath: 'default',
 *               meta: {},
 *               uri: 'folders.io_0:presto_hive/default',
 *               size: 0,
 *               extension: '+folder',
 *               modificationTime: 0
 *            }
 *            </code>
 */
FoldersPresto.prototype.ls = function(path, cb) {
	path = this.getPrestoPath(path, this.prefix);
	console.log("presto path after parse, ", path);
	if (path == null || !path.database) {
		console.log("database name not specified, ls root");
		showDatabases(this.client, this.prefix, cb);
	} else if (!path.table) {
		console.log("table name not specified, ls database ", path.database);
		showTables(this.client, this.prefix, path.database, cb);
	} else {
		console.log("show metadata of table, we currently just support column");
		showTableMetas(this.prefix, path.database + '/' + path.table, cb);
	}
};

FoldersPresto.prototype.cat = function(path, cb) {
	path = this.getPrestoPath(path, this.prefix);
	console.log("presto path after parse, ", path);
	if (path == null || !path.database || !path.table || !path.tableMetadata) {
		var error = "please specify the the database,table and metadata you want in path";
		console.log(error);
		cb(error, null);
	}

	if (path.tableMetadata == 'columns.md') {
		showTableColumns(this.client, this.prefix, path.database, path.table,
				cb)
	} else {
		// NOTES, now supported now
		cb("not supported yet", null);
	}
}

var showDatabases = function(client, prefix, cb) {
	// SHOW SCHEMAS [ FROM catalog ]
	client.execute('SHOW SCHEMAS', function(error, data, columns) {
		if (error) {
			console.log('show shemas error', error);
			cb(error, null);
		}

		// console.log({'data': data, 'columns':columns});

		cb(null, dbAsFolders(prefix, data));

	});
};

var dbAsFolders = function(prefix, dbs) {
	var out = [];
	for (var i = 0; i < dbs.length; i++) {
		var db = dbs[i];
		var o = {
			name : db[0]
		};
		o.fullPath = o.name;
		o.meta = {};
		o.uri = prefix + o.fullPath;
		o.size = 0;
		o.extension = '+folder';
		// o.type = "text/plain";
		o.modificationTime = 0;
		out.push(o);
	}
	return out;
}

var showTables = function(client, prefix, dbName, cb) {
	// SHOW TABLES [ FROM dbName ]
	client.execute('SHOW TABLES FROM ' + dbName,
			function(error, data, columns) {

				if (error) {
					console.log('show TABLES error', error);
					cb(error, null);
				}

				cb(null, tbAsFolders(prefix, dbName, data));
			});
};

var tbAsFolders = function(prefix, dbName, tbs) {
	var out = [];
	for (var i = 0; i < tbs.length; i++) {
		var table = tbs[i];
		var o = {
			name : table[0]
		};
		o.fullPath = dbName + '/' + o.name;
		o.meta = {};
		o.uri = prefix + o.fullPath;
		o.size = 0;
		o.extension = '+folder';
		// o.type = "text/plain";
		o.modificationTime = 0;
		out.push(o);
	}
	return out;
}

var showTableMetas = function(prefix, path, cb) {

	// var metadatas = ['columns', 'schemas', 'records'];
	var metadatas = ['columns'];

	var out = [];
	for (var i = 0; i < metadatas.length; i++) {
		var o = {
			name : metadatas[i] + '.md'
		};
		o.fullPath = path + '/' + o.name;
		o.meta = {};
		o.uri = prefix + o.fullPath;
		// FIXME can't get the size.
		o.size = 0;
		o.extension = 'md';
		o.type = "text/markdown";
		o.modificationTime = 0;
		out.push(o);
	}

	cb(null, out);
};

var showTableColumns = function(client, prefix, dbName, tbName, cb) {
	// SHOW COLUMNS FROM dbName.tbName
	client.execute('SHOW COLUMNS FROM ' + dbName + '.' + tbName, function(
			error, data, columns) {

		if (error) {
			console.log('SHOW COLUMNS error', error);
			cb(error, null);
		}

		// convert the title of columns.
		var title = [];
		for (var i = 0; i < columns.length; i++) {
			title.push(columns[i].name);
		}
		// insert the titils line before the first row
		data.unshift(title);

		// format the columns data include the title into markdown table
		var formattedColumnsData = tableFormatter(data);// ,{'align': 'c'}

		// create a readable stream
		var stream = new Readable();
		stream.push(formattedColumnsData);
		stream.push(null);

		cb(null, {
			'stream' : stream,
			'size' : formattedColumnsData.length,
			'name' : dbName + '.' + tbName + '.columns.md'
		});
	});
};
