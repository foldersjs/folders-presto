Folders
=============

This node.js package implements the folders.io synthetic file system.

This Folders Module is based on ['Presto'](https://prestodb.io/) open source distributed SQL query engine,
Module can be installed via "npm install folders-presto".

Example:

Installation (use --save to save to package.json)

```sh
npm install folders-presto
```


##Presto

Basic Usage

### Configuration

In order to Presto access, specify the following args.

```json
{
  "user" : "your_username",
  "host" : "your_host",
  "port" : "your_port",
  "catalog" : "hive",
  "schema" : "default"
}
```

### Constructor

Provider constructor, could pass the special option/param in the config param.

```js
var prefix = 'folders.io_0:presto_hive';

var config = {
  "user" : "your_username",
  "host" : "your_host",
  "port" : "your_port",
  "catalog" : "hive",
  "schema" : "default"
};

var foldersPresto = new FoldersPresto(prefix, config);
```

### ls

ls the database, tables as folders.

```js
/**
 * list db metadata in folders.io format
 * 
 * @param uri,
 *   the uri for db. /${database}/${table}/ eg:
 *     '/' , show the root path, show the databases/schemas
 *     '/test-db', show all the tables in database 'test-db' 
 *     '/test-db/test-table', show the metadata of table we support 'test-table' in database 'test-db';
 *   all the path could also start with {prefix}, '/folders.io_0:presto/test-db'
 * @param cb,
 *   callback function(err, result) function. result will be a file info array. [{}, ... {}] 
 *   a example file information 
 *   { 
 *     name: 'default',
 *     fullPath: 'default',
 *     meta: {},
 *     uri: 'folders.io_0:presto_hive/default',
 *     size: 0,
 *     extension: '+folder',
 *     modificationTime: 0
 *   }
 */
FoldersPresto.prototype.ls = function(path, cb);

foldersPresto.ls('/', function cb(error, databases) {
  if (error) {
    console.log("error in ls /");
    console.log(error);
  }

  console.log("ls databases success, ", databases);
 }
```

### cat

cat columns metadata of table ( maybe support cat records <code>'/{database}/{table}/records'</code> in the future) 

```js
/**
 * @param uri, the file uri to cat 
 * @param cb, callback  function(err, result) function.
 *    example for result.
 *    {
 *      stream: .., // a readable 'request' stream
 *      size : .. , // file size
 *      name: path
 *    }
 *
 * cat(uri,cb) 
 */
 
foldersPresto.cat('/folders/test/columns', function cb(error,columns) {
    if (error) {
       console.log('error in cat table columns');
       console.log(error);
    }

    console.log('cat table columns success, \n', columns);
 });
```
