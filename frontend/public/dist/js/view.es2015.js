/**
 * Observable pattern implementation.
 * Supports topics as String or an Array.
 */
class Observable {
  constructor() {
    this._observers = [];
  }

  subscribe(topic, observer) {
    this._op('_sub', topic, observer);
  }

  unsubscribe(topic, observer) {
    this._op('_unsub', topic, observer);
  }

  unsubscribeAll(topic) {
    if (!this._observers[topic]) {
      return;
    }
    delete this._observers[topic];
  }

  publish(topic, message) {
    this._op('_pub', topic, message);
  }

  /**
   * Internal methods
   */
  _op(op, topic, value) {
    if (Array.isArray(topic)) {
      topic.forEach((t) => {
        this[op](t, value);
      });
    }
    else {
      this[op](topic, value);
    }
  }

  _sub(topic, observer) {
    this._observers[topic] || (this._observers[topic] = []);
    if(observer && this._observers[topic].indexOf(observer) === -1) {
      this._observers[topic].push(observer);
    }
  }

  _unsub(topic, observer) {
    if (!this._observers[topic]) {
      return;
    }
    var index = this._observers[topic].indexOf(observer);
    if (~index) {
      this._observers[topic].splice(index, 1);
    }
  }

  _pub(topic, message) {
    if (!this._observers[topic]) {
      return;
    }
    for (var i = this._observers[topic].length - 1; i >= 0; i--) {
      this._observers[topic][i](message)
    }
  }
}

class SiftView {
  constructor() {
    this._resizeHandler = null;
    this._proxy = parent;
    this.controller = new Observable();
    this._registerMessageListeners();
  }

  publish(topic, value) {
   this._proxy.postMessage({
      method: 'notifyController',
      params: {
        topic: topic,
        value: value } },
      '*');
  }

  _registerMessageListeners() {
    window.addEventListener('message', (e) => {
      let method = e.data.method;
      let params = e.data.params;
      if(method === 'notifyView') {
        this.controller.publish(params.topic, params.value);
      }
      else if(this[method]) {
        this[method](params);
      }
      else {
        console.warn('[SiftView]: method not implemented: ', method);
      }
    }, false);
  }
}

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var loglevel = createCommonjsModule(function (module) {
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(commonjsGlobal, function () {
    "use strict";
    var noop = function() {};
    var undefinedType = "undefined";

    function realMethod(methodName) {
        if (typeof console === undefinedType) {
            return false; // We can't build a real method without a console to log to
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // these private functions always need `this` to be set properly

    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }
    }

    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public API
       *
       */

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Package-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    return defaultLogger;
}));
});

var loglevel$1 = (loglevel && typeof loglevel === 'object' && 'default' in loglevel ? loglevel['default'] : loglevel);

var index$2 = createCommonjsModule(function (module) {
'use strict';
var toString = Object.prototype.toString;

module.exports = function (x) {
	var prototype;
	return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};
});

var require$$0$2 = (index$2 && typeof index$2 === 'object' && 'default' in index$2 ? index$2['default'] : index$2);

var index$1 = createCommonjsModule(function (module, exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = range;

var _isPlainObj = require$$0$2;

var _isPlainObj2 = _interopRequireDefault(_isPlainObj);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Parse `opts` to valid IDBKeyRange.
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
 *
 * @param {Object} opts
 * @return {IDBKeyRange}
 */

function range(opts) {
  var IDBKeyRange = commonjsGlobal.IDBKeyRange || commonjsGlobal.webkitIDBKeyRange;
  if (opts instanceof IDBKeyRange) return opts;
  if (typeof opts === 'undefined' || opts === null) return null;
  if (!(0, _isPlainObj2.default)(opts)) return IDBKeyRange.only(opts);
  var keys = Object.keys(opts).sort();

  if (keys.length === 1) {
    var key = keys[0];
    var val = opts[key];

    switch (key) {
      case 'eq':
        return IDBKeyRange.only(val);
      case 'gt':
        return IDBKeyRange.lowerBound(val, true);
      case 'lt':
        return IDBKeyRange.upperBound(val, true);
      case 'gte':
        return IDBKeyRange.lowerBound(val);
      case 'lte':
        return IDBKeyRange.upperBound(val);
      default:
        throw new TypeError('"' + key + '" is not valid key');
    }
  } else {
    var x = opts[keys[0]];
    var y = opts[keys[1]];
    var pattern = keys.join('-');

    switch (pattern) {
      case 'gt-lt':
        return IDBKeyRange.bound(x, y, true, true);
      case 'gt-lte':
        return IDBKeyRange.bound(x, y, true, false);
      case 'gte-lt':
        return IDBKeyRange.bound(x, y, false, true);
      case 'gte-lte':
        return IDBKeyRange.bound(x, y, false, false);
      default:
        throw new TypeError('"' + pattern + '" are conflicted keys');
    }
  }
}
module.exports = exports['default'];
});

var require$$0$1 = (index$1 && typeof index$1 === 'object' && 'default' in index$1 ? index$1['default'] : index$1);

var idbIndex = createCommonjsModule(function (module) {
var parseRange = require$$0$1;

/**
 * Expose `Index`.
 */

module.exports = Index;

/**
 * Initialize new `Index`.
 *
 * @param {Store} store
 * @param {String} name
 * @param {String|Array} field
 * @param {Object} opts { unique: false, multi: false }
 */

function Index(store, name, field, opts) {
  this.store = store;
  this.name = name;
  this.field = field;
  this.opts = opts;
  this.multi = opts.multi || opts.multiEntry || false;
  this.unique = opts.unique || false;
}

/**
 * Get `key`.
 *
 * @param {Object|IDBKeyRange} key
 * @param {Function} cb
 */

Index.prototype.get = function(key, cb) {
  var result = [];
  var isUnique = this.unique;
  var opts = { range: key, iterator: iterator };

  this.cursor(opts, function(err) {
    if (err) return cb(err);
    isUnique ? cb(null, result[0]) : cb(null, result);
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Count records by `key`.
 *
 * @param {String|IDBKeyRange} key
 * @param {Function} cb
 */

Index.prototype.count = function(key, cb) {
  var name = this.store.name;
  var indexName = this.name;

  this.store.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var index = tr.objectStore(name).index(indexName);
    var req = index.count(parseRange(key));
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Create cursor.
 * Proxy to `this.store` for convinience.
 *
 * @param {Object} opts
 * @param {Function} cb
 */

Index.prototype.cursor = function(opts, cb) {
  opts.index = this.name;
  this.store.cursor(opts, cb);
};
});

var require$$0 = (idbIndex && typeof idbIndex === 'object' && 'default' in idbIndex ? idbIndex['default'] : idbIndex);

var index$3 = createCommonjsModule(function (module) {
/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object Error]': return 'error';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val !== val) return 'nan';
  if (val && val.nodeType === 1) return 'element';

  val = val.valueOf
    ? val.valueOf()
    : Object.prototype.valueOf.apply(val)

  return typeof val;
};
});

var require$$2 = (index$3 && typeof index$3 === 'object' && 'default' in index$3 ? index$3['default'] : index$3);

var idbStore = createCommonjsModule(function (module) {
var type = require$$2;
var parseRange = require$$0$1;

/**
 * Expose `Store`.
 */

module.exports = Store;

/**
 * Initialize new `Store`.
 *
 * @param {String} name
 * @param {Object} opts
 */

function Store(name, opts) {
  this.db = null;
  this.name = name;
  this.indexes = {};
  this.opts = opts;
  this.key = opts.key || opts.keyPath || undefined;
  this.increment = opts.increment || opts.autoIncretement || undefined;
}

/**
 * Get index by `name`.
 *
 * @param {String} name
 * @return {Index}
 */

Store.prototype.index = function(name) {
  return this.indexes[name];
};

/**
 * Put (create or replace) `key` to `val`.
 *
 * @param {String|Object} [key] is optional when store.key exists.
 * @param {Any} val
 * @param {Function} cb
 */

Store.prototype.put = function(key, val, cb) {
  var name = this.name;
  var keyPath = this.key;
  if (keyPath) {
    if (type(key) == 'object') {
      cb = val;
      val = key;
      key = null;
    } else {
      val[keyPath] = key;
    }
  }

  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = keyPath ? objectStore.put(val) : objectStore.put(val, key);
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb(null, req.result) };
  });
};

/**
 * Get `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

Store.prototype.get = function(key, cb) {
  var name = this.name;
  this.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.get(key);
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Del `key`.
 *
 * @param {String} key
 * @param {Function} cb
 */

Store.prototype.del = function(key, cb) {
  var name = this.name;
  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.delete(key);
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Count.
 *
 * @param {Function} cb
 */

Store.prototype.count = function(cb) {
  var name = this.name;
  this.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.count();
    req.onerror = cb;
    req.onsuccess = function onsuccess(e) { cb(null, e.target.result) };
  });
};

/**
 * Clear.
 *
 * @param {Function} cb
 */

Store.prototype.clear = function(cb) {
  var name = this.name;
  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var objectStore = tr.objectStore(name);
    var req = objectStore.clear();
    tr.onerror = tr.onabort = req.onerror = cb;
    tr.oncomplete = function oncomplete() { cb() };
  });
};

/**
 * Perform batch operation.
 *
 * @param {Object} vals
 * @param {Function} cb
 */

Store.prototype.batch = function(vals, cb) {
  var name = this.name;
  var keyPath = this.key;
  var keys = Object.keys(vals);

  this.db.transaction('readwrite', [name], function(err, tr) {
    if (err) return cb(err);
    var store = tr.objectStore(name);
    var current = 0;
    tr.onerror = tr.onabort = cb;
    tr.oncomplete = function oncomplete() { cb() };
    next();

    function next() {
      if (current >= keys.length) return;
      var currentKey = keys[current];
      var currentVal = vals[currentKey];
      var req;

      if (currentVal === null) {
        req = store.delete(currentKey);
      } else if (keyPath) {
        if (!currentVal[keyPath]) currentVal[keyPath] = currentKey;
        req = store.put(currentVal);
      } else {
        req = store.put(currentVal, currentKey);
      }

      req.onerror = cb;
      req.onsuccess = next;
      current += 1;
    }
  });
};

/**
 * Get all.
 *
 * @param {Function} cb
 */

Store.prototype.all = function(cb) {
  var result = [];

  this.cursor({ iterator: iterator }, function(err) {
    err ? cb(err) : cb(null, result);
  });

  function iterator(cursor) {
    result.push(cursor.value);
    cursor.continue();
  }
};

/**
 * Create read cursor for specific `range`,
 * and pass IDBCursor to `iterator` function.
 * https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor
 *
 * @param {Object} opts:
 *   {IDBRange|Object} range - passes to .openCursor()
 *   {Function} iterator - function to call with IDBCursor
 *   {String} [index] - name of index to start cursor by index
 * @param {Function} cb - calls on end or error
 */

Store.prototype.cursor = function(opts, cb) {
  var name = this.name;
  this.db.transaction('readonly', [name], function(err, tr) {
    if (err) return cb(err);
    var store = opts.index
      ? tr.objectStore(name).index(opts.index)
      : tr.objectStore(name);
    var req = store.openCursor(parseRange(opts.range));

    req.onerror = cb;
    req.onsuccess = function onsuccess(e) {
      var cursor = e.target.result;
      cursor ? opts.iterator(cursor) : cb();
    };
  });
};
});

var require$$1 = (idbStore && typeof idbStore === 'object' && 'default' in idbStore ? idbStore['default'] : idbStore);

var schema$1 = createCommonjsModule(function (module) {
var type = require$$2;
var Store = require$$1;
var Index = require$$0;

/**
 * Expose `Schema`.
 */

module.exports = Schema;

/**
 * Initialize new `Schema`.
 */

function Schema() {
  if (!(this instanceof Schema)) return new Schema();
  this._stores = {};
  this._current = {};
  this._versions = {};
}

/**
 * Set new version.
 *
 * @param {Number} version
 * @return {Schema}
 */

Schema.prototype.version = function(version) {
  if (type(version) != 'number' || version < 1 || version < this.getVersion())
    throw new TypeError('not valid version');

  this._current = { version: version, store: null };
  this._versions[version] = {
    stores: [],      // db.createObjectStore
    dropStores: [],  // db.deleteObjectStore
    indexes: [],     // store.createIndex
    dropIndexes: [], // store.deleteIndex
    version: version // version
  };

  return this;
};

/**
 * Add store.
 *
 * @param {String} name
 * @param {Object} [opts] { key: false }
 * @return {Schema}
 */

Schema.prototype.addStore = function(name, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (this._stores[name]) throw new TypeError('store is already defined');
  var store = new Store(name, opts || {});
  this._stores[name] = store;
  this._versions[this.getVersion()].stores.push(store);
  this._current.store = store;
  return this;
};

/**
 * Drop store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.dropStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  var store = this._stores[name];
  if (!store) throw new TypeError('store is not defined');
  delete this._stores[name];
  this._versions[this.getVersion()].dropStores.push(store);
  return this;
};

/**
 * Add index.
 *
 * @param {String} name
 * @param {String|Array} field
 * @param {Object} [opts] { unique: false, multi: false }
 * @return {Schema}
 */

Schema.prototype.addIndex = function(name, field, opts) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (type(field) != 'string' && type(field) != 'array') throw new TypeError('`field` is required');
  var store = this._current.store;
  if (store.indexes[name]) throw new TypeError('index is already defined');
  var index = new Index(store, name, field, opts || {});
  store.indexes[name] = index;
  this._versions[this.getVersion()].indexes.push(index);
  return this;
};

/**
 * Drop index.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.dropIndex = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  var index = this._current.store.indexes[name];
  if (!index) throw new TypeError('index is not defined');
  delete this._current.store.indexes[name];
  this._versions[this.getVersion()].dropIndexes.push(index);
  return this;
};

/**
 * Change current store.
 *
 * @param {String} name
 * @return {Schema}
 */

Schema.prototype.getStore = function(name) {
  if (type(name) != 'string') throw new TypeError('`name` is required');
  if (!this._stores[name]) throw new TypeError('store is not defined');
  this._current.store = this._stores[name];
  return this;
};

/**
 * Get version.
 *
 * @return {Number}
 */

Schema.prototype.getVersion = function() {
  return this._current.version;
};

/**
 * Generate onupgradeneeded callback.
 *
 * @return {Function}
 */

Schema.prototype.callback = function() {
  var versions = Object.keys(this._versions)
    .map(function(v) { return this._versions[v] }, this)
    .sort(function(a, b) { return a.version - b.version });

  return function onupgradeneeded(e) {
    var db = e.target.result;
    var tr = e.target.transaction;

    versions.forEach(function(versionSchema) {
      if (e.oldVersion >= versionSchema.version) return;

      versionSchema.stores.forEach(function(s) {
        var options = {};

        // Only pass the options that are explicitly specified to createObjectStore() otherwise IE/Edge
        // can throw an InvalidAccessError - see https://msdn.microsoft.com/en-us/library/hh772493(v=vs.85).aspx
        if (typeof s.key !== 'undefined') options.keyPath = s.key;
        if (typeof s.increment !== 'undefined') options.autoIncrement = s.increment;

        db.createObjectStore(s.name, options);
      });

      versionSchema.dropStores.forEach(function(s) {
        db.deleteObjectStore(s.name);
      });

      versionSchema.indexes.forEach(function(i) {
        var store = tr.objectStore(i.store.name);
        store.createIndex(i.name, i.field, {
          unique: i.unique,
          multiEntry: i.multi
        });
      });

      versionSchema.dropIndexes.forEach(function(i) {
        var store = tr.objectStore(i.store.name);
        store.deleteIndex(i.name);
      });
    });
  };
};
});

var require$$2$1 = (schema$1 && typeof schema$1 === 'object' && 'default' in schema$1 ? schema$1['default'] : schema$1);

var index = createCommonjsModule(function (module, exports) {
var type = require$$2;
var Schema = require$$2$1;
var Store = require$$1;
var Index = require$$0;

/**
 * Expose `Treo`.
 */

exports = module.exports = Treo;

/**
 * Initialize new `Treo` instance.
 *
 * @param {String} name
 * @param {Schema} schema
 */

function Treo(name, schema) {
  if (!(this instanceof Treo)) return new Treo(name, schema);
  if (type(name) != 'string') throw new TypeError('`name` required');
  if (!(schema instanceof Schema)) throw new TypeError('not valid schema');

  this.name = name;
  this.status = 'close';
  this.origin = null;
  this.stores = schema._stores;
  this.version = schema.getVersion();
  this.onupgradeneeded = schema.callback();

  // assign db property to each store
  Object.keys(this.stores).forEach(function(storeName) {
    this.stores[storeName].db = this;
  }, this);
}

/**
 * Expose core classes.
 */

exports.schema = Schema;
exports.cmp = cmp;
exports.Treo = Treo;
exports.Schema = Schema;
exports.Store = Store;
exports.Index = Index;

/**
 * Use plugin `fn`.
 *
 * @param {Function} fn
 * @return {Treo}
 */

Treo.prototype.use = function(fn) {
  fn(this, exports);
  return this;
};

/**
 * Drop.
 *
 * @param {Function} cb
 */

Treo.prototype.drop = function(cb) {
  var name = this.name;
  this.close(function(err) {
    if (err) return cb(err);
    var req = indexedDB().deleteDatabase(name);
    req.onerror = cb;
    req.onsuccess = function onsuccess() { cb() };
  });
};

/**
 * Close.
 *
 * @param {Function} cb
 */

Treo.prototype.close = function(cb) {
  if (this.status == 'close') return cb();
  this.getInstance(function(err, db) {
    if (err) return cb(err);
    db.origin = null;
    db.status = 'close';
    db.close();
    cb();
  });
};

/**
 * Get store by `name`.
 *
 * @param {String} name
 * @return {Store}
 */

Treo.prototype.store = function(name) {
  return this.stores[name];
};

/**
 * Get db instance. It starts opening transaction only once,
 * another requests will be scheduled to queue.
 *
 * @param {Function} cb
 */

Treo.prototype.getInstance = function(cb) {
  if (this.status == 'open') return cb(null, this.origin);
  if (this.status == 'opening') return this.queue.push(cb);

  this.status = 'opening';
  this.queue = [cb]; // queue callbacks

  var that = this;
  var req = indexedDB().open(this.name, this.version);
  req.onupgradeneeded = this.onupgradeneeded;

  req.onerror = req.onblocked = function onerror(e) {
    that.status = 'error';
    that.queue.forEach(function(cb) { cb(e) });
    delete that.queue;
  };

  req.onsuccess = function onsuccess(e) {
    that.origin = e.target.result;
    that.status = 'open';
    that.origin.onversionchange = function onversionchange() {
      that.close(function() {});
    };
    that.queue.forEach(function(cb) { cb(null, that.origin) });
    delete that.queue;
  };
};

/**
 * Create new transaction for selected `stores`.
 *
 * @param {String} type (readwrite|readonly)
 * @param {Array} stores - follow indexeddb semantic
 * @param {Function} cb
 */

Treo.prototype.transaction = function(type, stores, cb) {
  this.getInstance(function(err, db) {
    err ? cb(err) : cb(null, db.transaction(stores, type));
  });
};

/**
 * Compare 2 values using IndexedDB comparision algotihm.
 *
 * @param {Mixed} value1
 * @param {Mixed} value2
 * @return {Number} -1|0|1
 */

function cmp() {
  return indexedDB().cmp.apply(indexedDB(), arguments);
}

/**
 * Dynamic link to `global.indexedDB` for polyfills support.
 *
 * @return {IDBDatabase}
 */

function indexedDB() {
  return commonjsGlobal._indexedDB
    || commonjsGlobal.indexedDB
    || commonjsGlobal.msIndexedDB
    || commonjsGlobal.mozIndexedDB
    || commonjsGlobal.webkitIndexedDB;
}
});

var logger = loglevel$1.getLogger('RSStorage:operations');
logger.setLevel('warn');

/**
 * Redsift SDK. Sift Storage module.
 * Based on APIs from https://github.com/CrowdProcess/riak-pb
 *
 * Copyright (c) 2016 Redsift Limited. All rights reserved.
 */

/**
 * SiftView
 */
function registerSiftView(siftView) {
  console.log('[Redsift::registerSiftView]: registered');
}

function throttle(type, name, obj) {
    obj = obj || window;
    let running = false;
    let func = function() {
        if (running) {
            return;
        }
        running = true;
        requestAnimationFrame(function() {
            obj.dispatchEvent(new CustomEvent(name));
            running = false;
        });
    };
    obj.addEventListener(type, func);
}

throttle('scroll', 'optimizedScroll');
throttle('resize', 'optimizedResize');

let style = document.createElement("style");
document.head.appendChild(style);
let sheet = style.sheet;

function updateRange(input, index) {
    let min = input.min || 0;
    let max = input.max || 100;

    let v = Math.ceil(((input.value - min) / (max - min)) * 100);
    try {
        sheet.deleteRule(index);
    } catch (e) {}
    sheet.addRule('input[type=range].rs-index-' + index + '::-webkit-slider-runnable-track', 'background-size:' + v + '% 100%', index);
}

let Sliders = {
    initAllRanges() {
        let r = document.querySelectorAll('input[type=range]');
        for (let i = 0; i < r.length; i++) {
            let input = r[i];

            input.className += " rs-index-" + i;
            updateRange(input, i);
            (function(idx) {
                input.addEventListener('input', function() {
                    updateRange(this, idx);
                });
            })(i);
        }
    },

    setValue(control, value) {
        control.value = value;
        let r = document.querySelectorAll('input[type=range]');
        for (let i = 0; i < r.length; i++) {
            if (r[i] === control) {
                updateRange(control, i);
            }
        }
    }
};

const SCROLL_DURATION$1 = 200;

// Adapted from https://coderwall.com/p/hujlhg/smooth-scrolling-without-jquery
function smooth_scroll_to$1(element, target, duration) {
    target = Math.round(target);
    duration = Math.round(duration);
    if (duration < 0) {
        return Promise.reject('bad duration');
    }
    if (duration === 0) {
        element.scrollTop = target;
        return Promise.resolve('no-duration');
    }

    let start_time = Date.now();
    let end_time = start_time + duration;

    let start_top = element.scrollTop;
    let distance = target - start_top;

    // based on http://en.wikipedia.org/wiki/Smoothstep
    let smooth_step = function(start, end, point) {
        if (point <= start) {
            return 0;
        }
        if (point >= end) {
            return 1;
        }
        let x = (point - start) / (end - start); // interpolation
        return x * x * (3 - 2 * x);
    }

    return new Promise(function(resolve, reject) {
        // This is to keep track of where the element's scrollTop is
        // supposed to be, based on what we're doing
        let previous_top = element.scrollTop;

        let timer = null;
        // This is like a think function from a game loop
        let scroll_frame = function() {
            /*
            // This logic is too fragile
            if(element.scrollTop != previous_top) {
                window.clearInterval(timer);
                reject('interrupted');
                return;
            }
            */
            // set the scrollTop for this frame
            let now = Date.now();
            let point = smooth_step(start_time, end_time, now);
            let frameTop = Math.round(start_top + (distance * point));
            element.scrollTop = frameTop;

            // check if we're done!
            if (now >= end_time) {
                window.clearInterval(timer);
                resolve('done');
                return;
            }

            // If we were supposed to scroll but didn't, then we
            // probably hit the limit, so consider it done; not
            // interrupted.
            if (element.scrollTop === previous_top && element.scrollTop !== frameTop) {
                window.clearInterval(timer);
                resolve('limit');
                return;
            }
            previous_top = element.scrollTop;
        }

        // boostrap the animation process
        timer = setInterval(scroll_frame, 10);
    });
}

function clickFor$1(to, offset) {
    return function(evt) {
        let target = document.getElementById(to);
        if (target === undefined) {
            return true;
        }
        offset = offset || 0;
        let delta = getAbsoluteBoundingRect$1(target).top + offset;
        smooth_scroll_to$1(document.body, delta, SCROLL_DURATION$1).catch(function(e) {
            console.error(e);
        });
        evt.preventDefault();
        return false;
    }
}

let scrollNodes$1 = [];

function throttle$1(type, name, obj) {
    obj = obj || window;
    let running = false;
    let func = function() {
        if (running) {
            return;
        }
        running = true;
        requestAnimationFrame(function() {
            obj.dispatchEvent(new CustomEvent(name));
            running = false;
        });
    };
    obj.addEventListener(type, func);
}

function onScroll$1() {
    let pos = window.scrollY;
    scrollNodes$1.forEach(function(params) {
        let node = params[0];
        let current = params[1];
        let cls = params[2];
        let extents = params[4];

        let state = false;
        for (let i = 0; i < extents.length; i++) {
            let extent = extents[i];
            state = (pos > extent.start && pos < extent.end);
            if (state) {
                break;
            }
        }

        if (state === current) {
            return;
        }
        params[1] = state;
        if (state) {
            node.classList.add(cls);
        } else {
            node.classList.remove(cls);
        }
    });
}

function getAbsoluteBoundingRect$1(el) {
    let doc = document,
        win = window,
        body = doc.body,

        // pageXOffset and pageYOffset work everywhere except IE <9.
        offsetX = win.pageXOffset !== undefined ? win.pageXOffset :
        (doc.documentElement || body.parentNode || body).scrollLeft,
        offsetY = win.pageYOffset !== undefined ? win.pageYOffset :
        (doc.documentElement || body.parentNode || body).scrollTop,

        rect = el.getBoundingClientRect();

    if (el !== body) {
        let parent = el.parentNode;

        // The element's rect will be affected by the scroll positions of
        // *all* of its scrollable parents, not just the window, so we have
        // to walk up the tree and collect every scroll offset. Good times.
        while (parent !== body) {
            offsetX += parent.scrollLeft;
            offsetY += parent.scrollTop;
            parent = parent.parentNode;
        }
    }

    return {
        bottom: rect.bottom + offsetY,
        height: rect.height,
        left: rect.left + offsetX,
        right: rect.right + offsetX,
        top: rect.top + offsetY,
        width: rect.width
    };
}

function updateRegions$1() {
    scrollNodes$1.forEach(function(params) {
        let target = params[0].getBoundingClientRect();
        let overlap = params[3];

        let nodes = document.querySelectorAll(overlap);
        let all = [];
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            let ext = getAbsoluteBoundingRect$1(node);
            all.push({
                start: ext.top - target.height,
                end: ext.bottom
            });
        }
        params[4] = all;
    });
}

let Scroll$1 = {
    initSmooth(selector, offset) {
        let nodes = document.querySelectorAll(selector);
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            let href = node.attributes.href;
            if (href === undefined || href.length === 0) {
                continue;
            }
            let to = href.nodeValue.toString();
            if (to.substr(0, 1) !== '#') {
                continue;
            }

            node.addEventListener('click', clickFor$1(to.substr(1), offset), false);
        }
    },
    toggleClass(selector, cls, overlap) {
        let nodes = document.querySelectorAll(selector);
        if (nodes.length > 0) {
            window.addEventListener('optimizedResize', updateRegions$1);
            window.addEventListener('optimizedScroll', onScroll$1);
        }
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            let param = [node, null, cls, overlap, []];

            // check for this node
            let found = false;
            for (let ii = 0; i < scrollNodes$1.length; i++) {
                if (scrollNodes$1[ii][0] == node) {
                    scrollNodes$1[ii] = param;
                    found = true;
                    break;
                }
            }
            if (!found) {
                scrollNodes$1.push(param);
            }
        }
        updateRegions$1();
        onScroll$1();
    },
    updateRegions: updateRegions$1
};

throttle$1('scroll', 'optimizedScroll');
throttle$1('resize', 'optimizedResize');

let style$1 = document.createElement("style");
document.head.appendChild(style$1);
let sheet$1 = style$1.sheet;

// NOTE: redsift-bundler doe snot support the import of string templates yet
// import heroTmpl from '../templates/hero.tmpl';

class RedsiftHero {
  constructor(el, opts) {
    this.locators = {
      hero: '.hero',
      heroContainer: '.hero__container',
      heroContent: '.hero__content',
      heroHeader: '.hero__header',
      heroHeaderContent: '.hero__header__content',
      heroStickyHeader: '.hero-sticky-header',
      heroStickyHeaderActive: '.hero-sticky-header--active',
      scrollDownArrow: '#smooth'
    }

    this.downArrowHtml = '<div class="down-arrow"></div>';
    this.hasStickyHeader = false;

    // TODO: replace with string import of template when support is added in redsift-bundler!
    const heroTmpl = `
      <div class="hero">
          <div class="hero__header">
              <h3 class="hero__header__content"><!-- yields header --></h3>
          </div>
          <div class="hero__container">
              <div class="hero__content"><!-- yields content --></div>
          </div>
      </div>
    `;

    this._setupElement(el, heroTmpl, opts);
  }

  setHeader(text) {
    this.$headerContent.innerHTML = text;
  }

  setBgClass(bgClass) {
    this.$hero.className += ` ${bgClass}`;
  }

  enableStickyHeader(flag, triggerElSelector) {
      // NOTE: Do NOT use cached element here. For the first run these elements
      // are only cached after this feature is handled!

      if (flag) {
          let $header = document.querySelector(this.locators.heroHeader),
              $hero = document.querySelector(this.locators.hero);

          if ($header) {
            $header.classList.remove(this.locators.heroHeader.substr(1));
            $header.classList.add(this.locators.heroStickyHeader.substr(1));
            $hero.parentNode.parentNode.appendChild($header);
          } // else the sticky-header is already present on the page

          if (triggerElSelector && triggerElSelector != '') {
              try {
                  // TODO: change toggleClass signature to provide element list instead of selector
                  //       for '.content' to be more flexible (i.e. provide first element after hero
                  //       without having to know the name)
                  Scroll$1.toggleClass(
                      this.locators.heroStickyHeader,
                      this.locators.heroStickyHeaderActive.substr(1),
                      // FIXXME: replace hardcoded '.content' with something appropriate (based on aboves TODO)!
                      triggerElSelector
                  );
              } catch (err) {
                  console.log('[redsift-ui/hero] Error enabling sticky header. Did you specify a valid element name for the "sticky-header" attribute?');
              }
          }

          this.hasStickyHeader = true;
      } else {
          let $header = document.querySelector(this.locators.heroStickyHeader),
              $hero = document.querySelector(this.locators.hero);

          if ($header) {
              $header.classList.add(this.locators.heroHeader.substr(1));
              $header.classList.remove(this.locators.heroStickyHeader.substr(1));
              $hero.insertBefore($header, $hero.firstChild);

              // TODO: remove toggleClass callback!

              this.hasStickyHeader = false;
          }
      }
  }

  enableScrollFeature(flag, scrollTarget) {
    if (flag) {
      this.$scrollFeature = this._createScrollFeatureElement(scrollTarget);
      this.$container.appendChild(this.$scrollFeature);

      let offset = this._getStickyHeaderHeight();
      Scroll$1.initSmooth(this.locators.scrollDownArrow, -offset);
    } else if (this.$scrollFeature && this.$scrollFeature.parentNode) {
      this.$scrollFeature.parentNode.removeChild(this.$scrollFeature);
    }
  }

  //----------------------------------------------------------
  // Private API:
  //----------------------------------------------------------

  _setupElement(el, heroTmpl, opts) {
    // Get the user provided inner block of the element, replace the elements
    // content with the hero tree and insert the content at the correct place.
    let userTmpl = el.innerHTML;
    el.innerHTML = heroTmpl;

    let content = document.querySelector(this.locators.heroContent);
    content.innerHTML = userTmpl;

    // NOTE: handle sticky header before caching, as this.$header is set
    // differently depending this feature:
    if (opts.hasStickyHeader) {
      this.enableStickyHeader(true, opts.stickyHeaderTrigger);
    }

    this._cacheElements(opts.hasStickyHeader);

    if (opts.header) {
      this.setHeader(opts.header);
    }

    if (opts.bgClass) {
      this.setBgClass(opts.bgClass);
    }

    if (opts.scrollTarget) {
      this.enableScrollFeature(true, opts.scrollTarget);
    }
  }

  _createScrollFeatureElement(scrollTarget) {
    let a = document.createElement('a');

    a.id = this.locators.scrollDownArrow.substr(1);
    a.href = scrollTarget;
    a.innerHTML = this.downArrowHtml;

    // FIXXME: If the arrow is on the same height as the header it is not
    // clickable due to the z-index.

    return a;
  }

  _getStickyHeaderHeight() {
      let height = 0;

      try {
          if (this.hasStickyHeader) {
              height = this.$header.getBoundingClientRect().height
          }
      } catch (err) {
          console.log('[redsift-ui/hero] Error enabling sticky header. Did you specify a valid element name for the "sticky-header" attribute?');
      }
  }

  // TODO: implement generic caching functionality, e.g. this.querySelector(selector, useCache)
  _cacheElements(hasStickyHeader) {
    this.$hero = document.querySelector(this.locators.hero);
    if (hasStickyHeader) {
      this.$header = document.querySelector(this.locators.heroStickyHeader);
    } else {
      this.$header = document.querySelector(this.locators.heroHeader);
    }
    this.$headerContent = document.querySelector(this.locators.heroHeaderContent);
    this.$container = document.querySelector(this.locators.heroContainer);
    this.$content = document.querySelector(this.locators.heroContent);
    this.$scrollFeature = undefined;
  }
}

class RedsiftHeroWebComponent extends HTMLElement {

  //----------------------------------------------------------------------------
  // Lifecycle:
  //----------------------------------------------------------------------------

  attachedCallback() {
    let stickyHeaderTrigger = this.stickyHeader;

    this.rsHero = new RedsiftHero(this, {
      hasStickyHeader: this.hasStickyHeader,
      stickyHeaderTrigger: stickyHeaderTrigger,
      header: this.header,
      bgClass: this.bgClass,
      scrollTarget: this.scrollTarget
    });
  }

  attributeChangedCallback(attributeName, oldValue, newValue) {
    if (attributeName === 'scroll-target') {
      if (!newValue) {
        this.rsHero.enableScrollFeature(false);
      }

      if (newValue && !oldValue) {
        this.rsHero.enableScrollFeature(true, this.scrollTarget);
      }
    }

    if (attributeName === 'sticky-header') {
      if (this.hasStickyHeader) {
        if (!newValue || newValue == '') {
          console.log('[redsift-ui] WARNING: No selector specified with "sticky-header" attribute. No "hero-sticky-header--active" class will be added!');
        }
        this.rsHero.enableStickyHeader(true, this.stickyHeader);
      } else {
        this.rsHero.enableStickyHeader(false);
      }
    }
  }

  //----------------------------------------------------------------------------
  // Attributes:
  //----------------------------------------------------------------------------

  get header() {
    return this.getAttribute('header');
  }

  set header(val) {
    this.setAttribute('header', val);
  }

  get bgClass() {
    return this.getAttribute('bg-class');
  }

  set bgClass(val) {
    this.setAttribute('bg-class', val);
  }

  get hasStickyHeader() {
    let a = this.getAttribute('sticky-header');
    if (a == '' || a) {
      return true;
    }

    return false;
  }

  get stickyHeader() {
      return this.getAttribute('sticky-header');
  }

  set stickyHeader(val) {
    return this.setAttribute('sticky-header', val);
  }

  get scrollTarget() {
    return this.getAttribute('scroll-target');
  }

  set scrollTarget(val) {
    return this.setAttribute('scroll-target', val);
  }
}

var registerHeroElement = () => {
    try {
        document.registerElement('rs-hero', RedsiftHeroWebComponent);
    } catch (e) {
        console.log('[redsift-ui] Element already exists: ', e);
    }
}

(function() {
  if ('registerElement' in document
      && 'import' in document.createElement('link')
      && 'content' in document.createElement('template')) {
    // platform is good!
    // register the element per default:
    registerHeroElement();
  } else {
    // polyfill the platform!
    var e = document.createElement('script');
    e.src = 'https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/0.7.22/CustomElements.js';
    document.body.appendChild(e);

    window.addEventListener('WebComponentsReady', function(e) {
      // register the element per default:
      registerHeroElement();
    });
  }
})();

/**
 * Counter Sift. Frontend view entry point.
 */
class MyView extends SiftView {
  constructor() {
    // You have to call the super() method to initialize the base class.
    super();
    Sliders.initAllRanges();
    this.sliderId = '#wpmSlider';
    this.wpmValueId = '#wpmValue';

    window.addEventListener('load', this.sliderHandler.bind(this))
  }

  // for more info: https://docs.redsift.com/docs/client-code-siftview
  presentView(got) {
    console.log('tldr: presentView: ', got);
    Sliders.setValue(document.querySelector(this.sliderId), got.data.wpmSetting)
    document.querySelector(this.wpmValueId).innerHTML = got.data.wpmSetting;
  };

  willPresentView(value) {
    console.log('tldr: willPresentView: ', value);
  };


  sliderHandler(){
    var slider = document.querySelector(this.sliderId)
    var wpmValue = document.querySelector(this.wpmValueId)
    slider.addEventListener('input', function(e){
      wpmValue.innerHTML = e.target.value;
    });
    slider.addEventListener('change', function(e){
      this.publish('wpm', e.target.value);
      wpmValue.innerHTML = e.target.value;
    }.bind(this));
  }

}

registerSiftView(new MyView(window));

export default MyView;