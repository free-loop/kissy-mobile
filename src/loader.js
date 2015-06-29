    // <style>pre{-moz-tab-size:4;-webkit-tab-size:4;tab-size:4;}</style>
// <style>td {border-top:1px solid #ccc} table {border-collapse: collapse;}</style>

// Loader API
// ==========
//
// ### How to use
// ---
// 用法同KISSY Seed
//
//     //定義模塊
//     KISSY.add('pkg/mod1', function(S, Dep) {
//         return {
//             name: 'mod1'
//         };
//     }, {
//         requires: [
//             'dep1'
//         ]
//     })
//
//     //使用模塊
//     KISSY.use('pkg/mod1', function(S, Mod1) {
//         alert(Mod1.name);
//     });
//
// ### API Delete
// ---
//
// **未列出的API與KISSY保持用法一致 (包括 CMD, Combo, download CSS, etc. )**
//
// | API                  | KISSY                | KISSY-MINI           |
// | -------------------- |:--------------------:|:--------------------:|
// | getScript            | YES                  | NO                   |
// | importStyle          | YES                  | NO                   |
//
//
//
// ### API Differences
// ---
// － package config不支持 **group** 參數
//
// － package config不支持 **suffix** 參數

;(function(root) {

/* cache KISSY object */
var S = root.KISSY;

var Env      = S.Env,
    Config   = S.Config,
    config   = S.config,
    log      = S.log;

var mix        = S.mix,
    map        = S.map,
    each       = S.each,
    isObject   = S.isObject,
    isArray    = S.isArray,
    isString   = S.isString,
    isFunction = S.isFunction,
    startsWith = S.startsWith,
    endsWith   = S.endsWith,
    getScript  = S.getScript;

/* cache native object */
var doc      = root.document,
    ua       = root.navigator.userAgent,
    loc      = root.location,
    href     = loc.href,
    protocol = loc.protocol;

var substring     = function(str, start, end) {
    return str.substring(start, end);
},  indexOf    = function(str, value, index) {
    return str.indexOf(value, index);
},  slice      = function(str, start, end) {
    return str.slice(start, end);
},  charAt     = function(str, index) {
    return str.charAt(index);
},  split      = function(str, flag) {
    return str.split(flag);
},  replace    = function(str, reg, val) {
    return str.replace(reg, val);
},  toLowerCase = function(str) {
    return str.toLowerCase();
};


var now = Date.now,
    keys = Object.keys,
    reduce = function(arr, fn, initialVal) {
        return arr.reduce(fn, initialVal);
    },
    filter = function(arr, fn) {
        return arr.filter(fn);
    },
    indexOf = function(arr, val) {
        return arr.indexOf(val);
    },
    setImmediate = function(fn)  {
        setTimeout(fn, 0);
    };

var noop  = function() {},
    TRUE  = !0,
    FALSE = !1;

/* Remove .. and . in path array */
function normalizeArray(parts, allowAboveRoot) {
    /* level above root */
    var up = 0,
        i = parts.length - 1,
        newParts = [],
        last;

    for (; i >= 0; i--) {
        last = parts[i];
        if (last !== '.') {
            if (last === '..') {
                up++;
            } else if (up) {
                up--;
            } else {
                newParts[newParts.length] = last;
            }
        }
    }

    /* if allow above root, has to add .. */
    if (allowAboveRoot) {
        for (; up--; up) {
            newParts[newParts.length] = '..';
        }
    }

    newParts = newParts.reverse();

    return newParts;
}

/* Extract the directory portion of a path
* dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
* ref: http://jsperf.com/regex-vs-split/2
*/
var RE_DIRNAME = /[^?#]*\//;

function pathGetDirName(path) {
    var mat = path.match(RE_DIRNAME);
    return mat ? mat[0] : '.';
}

function pathRemoveExt(path) {
    return path.replace(/\.[^\/]+$/, '');
}

var RE_DOT = /\/\.\//g,
    RE_DOUBLE_DOT = /\/[^/]+\/\.\.\//,
    RE_DOUBLE_SLASH = /([^:/])\/\//g;

/* Canonicalize a path */
/* realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c" */
function pathParseRelative(path) {
    /* /a/b/./c/./d ==> /a/b/c/d */
    path = path.replace(RE_DOT, "/");

    /* a/b/c/../../d  ==>  a/b/../d  ==>  a/d */
    while (path.match(RE_DOUBLE_DOT)) {
        path = path.replace(RE_DOUBLE_DOT, "/");
    }

    /* a//b/c  ==>  a/b/c */
    path = path.replace(RE_DOUBLE_SLASH, "$1/");

    return path;
}

function pathResolveRelative(from, to) {
    var resolvedPath = '',
        resolvedPathStr,
        i,
        args = (arguments),
        path,
        absolute = 0;

    for (i = args.length - 1; i >= 0 && !absolute; i--) {
        path = args[i];
        if (!isString(path) || !path) {
            continue;
        }
        resolvedPath = path + '/' + resolvedPath;
        absolute = charAt(path, 0) === '/';
    }

    resolvedPathStr = normalizeArray(filter(split(resolvedPath, '/'), function (p) {
        return !!p;
    }), !absolute).join('/');

    return ((absolute ? '/' : '') + resolvedPathStr) || '.';
}

function pathGetRelative(from, to) {
    from = pathParseRelative(from);
    to = pathParseRelative(to);

    var fromParts = filter(split(from, '/'), function (p) {
            return !!p;
        }),
        path = [],
        sameIndex,
        sameIndex2,
        toParts = filter(split(to, '/'), function (p) {
            return !!p;
        }), commonLength = Math.min(fromParts.length, toParts.length);

    for (sameIndex = 0; sameIndex < commonLength; sameIndex++) {
        if (fromParts[sameIndex] !== toParts[sameIndex]) {
            break;
        }
    }

    sameIndex2 = sameIndex;

    while (sameIndex < fromParts.length) {
        path.push('..');
        sameIndex++;
    }

    path = path.concat(slice(toParts, sameIndex2));

    path = path.join('/');

    return /**@type String  @ignore*/path;
}

/* Normalize an id
*  normalize("path/to/a") ==> "path/to/a.js"
* NOTICE: substring is faster than negative slice and RegExp
*/
function pathNormalizeName(id) {
    var last = id.length - 1,
        lastC = charAt(id, last);

    /* If the uri ends with `#`, just return it without '#' */
    if (lastC === "#") {
        return id.substring(0, last);
    }

    return (endsWith(id, '.js')  ||
            endsWith(id, '.css') ||
            indexOf(id, '?') > 0 ||
            lastC === '/' ) ? id :
                              id + '.js';
}


var RE_ABSOLUTE = /^\/\/.|:\//,
    RE_ROOT_DIR = /^.*?\/\/.*?\//;

function pathNormalizeBase(base) {
    if (!base) { return loaderDir; }
    base = base.replace(/\\/g, '/');
    if (!endsWith(base, '/')) {
        base += '/';
    }

    return pathAddBase(base);
}

function pathAddBase(id, base) {
    var result, baseDir, mat;
        firstC = charAt(id, 0);

    baseDir = base ? pathGetDirName(base) : workDir;

    /* Absolute */
    if (RE_ABSOLUTE.test(id)) {
        result = id;
    }
    /* Relative */
    else if (firstC === ".") {
        result  = pathParseRelative(baseDir + id);
    }
    /* Root */
    else if (firstC === "/") {
        mat = baseDir.match(RE_ROOT_DIR);
        result = mat ? mat[0] + substring(id, 1) : id;
    }
    /* Top-level */
    else {
        result = baseDir + id;
    }

    /* Add default protocol when uri begins with "//" */
    if (startsWith(result, '//')) {
        result = protocol + result;
    }

    return result;
}

function pathAddQuery(path, key, value) {
    return path + ( indexOf(path, '?') > -1 ? '&' : '?' ) + key + '=' + value;
}

var workDir   = pathGetDirName(doc.URL);
var loaderDir = (function() {
    var src = getMiniSrc();
    return src ? pathGetDirName(src) : workDir;
}());

/**
 * @ignore
 * setup data structure for kissy loader
 * @author yiminghe@gmail.com
 */

var Loader = S.Loader = {};

    /** error */
var ERROR = -1,
    /** init */
    INIT  = 0,
    /** loading */
    LOADING = 1,
    /** loaded */
    LOADED = 2,
    /**dependencies are loaded or attached*/
    READY_TO_ATTACH = 3,
    /** attaching */
    ATTACHING = 4,
    /** attached */
    ATTACHED = 5;

/**
 * Loader Status Enum
 * @enum {Number} KISSY.Loader.Status
 */
Loader.Status = {
    /** error */
    ERROR: ERROR,
    /** init */
    INIT: INIT,
    /** loading */
    LOADING: LOADING,
    /** loaded */
    LOADED: LOADED,
    /**dependencies are loaded or attached*/
    READY_TO_ATTACH: READY_TO_ATTACH,
    /** attaching */
    ATTACHING: ATTACHING,
    /** attached */
    ATTACHED: ATTACHED
};

/**
 * @ignore
 * Utils for kissy loader
 * @author yiminghe@gmail.com
 */

/**
 * @class KISSY.Loader.Utils
 * Utils for KISSY Loader
 * @singleton
 * @private
 */

/* http://wiki.commonjs.org/wiki/Packages/Mappings/A */
/* 如果模块名以 / 结尾，自动加 index */
function addIndexAndRemoveJsExt(s) {
    if (isString(s)) {
        return addIndexAndRemoveJsExtFromName(s);
    } else {
        var ret = [],
            i = 0,
            l = s.length;
        for (; i < l; i++) {
            ret[i] = addIndexAndRemoveJsExtFromName(s[i]);
        }
        return ret;
    }
}

function addIndexAndRemoveJsExtFromName(name) {
    /* 'x/' 'x/y/z/' */
    if (charAt(name, name.length - 1) === '/') {
        name += 'index';
    }
    if (endsWith(name, '.js')) {
        name = slice(name, 0, -3);
    }
    return name;
}

function pluginAlias(runtime, name) {
    var index = indexOf(name, '!');
    if (index !== -1) {
        var pluginName = substring(name, 0, index);
        name = substring(name, index + 1);
        S.use(pluginName, {
            sync: true,
            success: function (S, Plugin) {
                if (Plugin.alias) {
                    /* noinspection JSReferencingMutableVariableFromClosure */
                    name = Plugin.alias(runtime, name, pluginName);
                }
            }
        });
    }
    return name;
}



/**
 * Get absolute path of dep module.similar to {@link KISSY.Path#resolve}
 * @param {String} moduleName current module 's name
 * @param {String|String[]} depName dependency module 's name
 * @return {String|String[]} normalized dependency module 's name
 */
function normalDepModuleName(moduleName, depName) {
    var i = 0, l;

    if (!depName) {
        return depName;
    }

    if (isString(depName)) {
        if (startsWith(depName, '../') || startsWith(depName, './')) {
            /* x/y/z -> x/y/ */
            return pathResolveRelative(pathGetDirName(moduleName), depName);
        }

        return pathParseRelative(depName);
    }

    for (l = depName.length; i < l; i++) {
        depName[i] = normalDepModuleName(moduleName, depName[i]);
    }
    return depName;
}

/**
 * create modules info
 * @param runtime Module container, such as KISSY
 * @param {String[]} modNames to be created module names
 */
function createModulesInfo(runtime, modNames) {
    each(modNames, function (m) {
        createModuleInfo(runtime, m);
    });
}

/**
 * create single module info
 * @param runtime Module container, such as KISSY
 * @param {String} modName to be created module name
 * @param {Object} [cfg] module config
 * @return {KISSY.Loader.Module}
 */
function createModuleInfo(runtime, modName, cfg) {
    modName = addIndexAndRemoveJsExtFromName(modName);

    var mods = runtime.Env.mods,
        module = mods[modName];

    if (module) {
        return module;
    }

    /* 防止 cfg 里有 tag，构建 fullpath 需要 */
    mods[modName] = module = new Module(mix({
        name: modName,
        runtime: runtime
    }, cfg));

    return module;
}

/**
 * Get modules exports
 * @param runtime Module container, such as KISSY
 * @param {String[]} modNames module names
 * @return {Array} modules exports
 */
function getModules(runtime, modNames) {
    var mods = [runtime], module,
        unaliasArr,
        allOk,
        m,
        runtimeMods = runtime.Env.mods;

    each(modNames, function (modName) {
        module = runtimeMods[modName];
        if (!module || module.getType() !== 'css') {
            unaliasArr = unalias(runtime, modName);
            allOk = reduce(unaliasArr, function (a, n) {
                m = runtimeMods[n];
                /* allow partial module (circular dependency) */
                return a && m && m.status >= ATTACHING;
            }, true);
            if (allOk) {
                mods.push(runtimeMods[unaliasArr[0]].exports);
            } else {
                mods.push(null);
            }
        } else {
            mods.push(undefined);
        }
    });

    return mods;
}

/**
 * attach modules and their dependency modules recursively
 * @param {String[]} modNames module names
 * @param runtime Module container, such as KISSY
 */
function attachModsRecursively(modNames, runtime) {
    var i,
        l = modNames.length;
    for (i = 0; i < l; i++) {
        attachModRecursively(modNames[i], runtime);
    }
}

function checkModsLoadRecursively(modNames, runtime, stack, errorList, cache) {
    /* for debug. prevent circular dependency */
    stack = stack || [];
    /* for efficiency. avoid duplicate non-attach check */
    cache = cache || {};
    var i,
        s = 1,
        l = modNames.length,
        stackDepth = stack.length;
    for (i = 0; i < l; i++) {
        s = s && checkModLoadRecursively(modNames[i], runtime, stack, errorList, cache);
        stack.length = stackDepth;
    }
    return !!s;
}

function checkModLoadRecursively(modName, runtime, stack, errorList, cache) {
    var mods = runtime.Env.mods,
        status,
        m = mods[modName];
    if (modName in cache) {
        return cache[modName];
    }
    if (!m) {
        cache[modName] = FALSE;
        return FALSE;
    }
    status = m.status;
    if (status === ERROR) {
        errorList.push(m);
        cache[modName] = FALSE;
        return FALSE;
    }
    if (status >= READY_TO_ATTACH) {
        cache[modName] = TRUE;
        return TRUE;
    }
    if (status !== LOADED) {
        cache[modName] = FALSE;
        return FALSE;
    }

    if (indexOf(stack, modName) > -1) {
        /*'find cyclic dependency between mods */
        cache[modName] = TRUE;
        return TRUE;
    }
    stack.push(modName);

    if (checkModsLoadRecursively(m.getNormalizedRequires(),
        runtime, stack, errorList, cache)) {
        m.status = READY_TO_ATTACH;
        cache[modName] = TRUE;
        return TRUE;
    }

    cache[modName] = FALSE;
    return FALSE;
}

/**
 * attach module and its dependency modules recursively
 * @param {String} modName module name
 * @param runtime Module container, such as KISSY
 */
function attachModRecursively(modName, runtime) {
    var mods = runtime.Env.mods,
        status,
        m = mods[modName];
    status = m.status;
    /* attached or circular dependency */
    if (status >= ATTACHING) {
        return;
    }
    m.status = ATTACHING;
    if (m.cjs) {
        /* commonjs format will call require in module code again */
        attachMod(runtime, m);
    } else {
        attachModsRecursively(m.getNormalizedRequires(), runtime);
        attachMod(runtime, m);
    }
}

/**
 * Attach specified module.
 * @param runtime Module container, such as KISSY
 * @param {KISSY.Loader.Module} module module instance
 */
function attachMod(runtime, module) {
    var factory = module.factory,
        exports;

    if (isFunction(factory)) {
        /* compatible and efficiency */
        /* KISSY.add(function(S,undefined){}) */
        var require;
        if (module.requires && module.requires.length) {
            require = function() {
                return module.require.apply(module, arguments);
            };
        }
        /* 需要解开 index，相对路径 */
        /* 但是需要保留 alias，防止值不对应 */
        /* noinspection JSUnresolvedFunction */
        exports = factory.apply(module,
            /* KISSY.add(function(S){module.require}) lazy initialize */
            (module.cjs ? [runtime, require, module.exports, module] : getModules(runtime, module.getRequiresWithAlias())));
        if (exports !== undefined) {
            /* noinspection JSUndefinedPropertyAssignment */
            module.exports = exports;
        }
    } else {
        /* noinspection JSUndefinedPropertyAssignment */
        module.exports = factory;
    }

    module.status = ATTACHED;
}

/**
 * Get module names as array.
 * @param {String|String[]} modNames module names array or  module names string separated by ','
 * @return {String[]}
 */
function getModNamesAsArray(modNames) {
    if (isString(modNames)) {
        modNames = split(replace(modNames, /\s+/g, ''), ',');
    }
    return modNames;
}

/**
 * normalize module names
 * 1. add index : / => /index
 * 2. unalias : core => dom,event,ua
 * 3. relative to absolute : ./x => y/x
 * @param {KISSY} runtime Global KISSY instance
 * @param {String|String[]} modNames Array of module names
 *  or module names string separated by comma
 * @param {String} [refModName]
 * @return {String[]} normalized module names
 */
function normalizeModNames(runtime, modNames, refModName) {
    return unalias(runtime,
        normalizeModNamesWithAlias(runtime, modNames, refModName));
}

/**
 * unalias module name.
 * @param runtime Module container, such as KISSY
 * @param {String|String[]} names moduleNames
 * @return {String[]} unalias module names
 */
function unalias(runtime, names) {
    var ret = [].concat(names),
        i,
        m,
        alias,
        ok = 0,
        j;
    while (!ok) {
        ok = 1;
        for (i = ret.length - 1; i >= 0; i--) {
            if ((m = createModuleInfo(runtime, ret[i])) && ((alias = m.getAlias()) !== undefined)) {
                ok = 0;
                if (typeof alias === 'string') {
                    alias = [alias];
                }
                for (j = alias.length - 1; j >= 0; j--) {
                    if (!alias[j]) {
                        alias.splice(j, 1);
                    }
                }
                ret.splice.apply(ret, [i, 1].concat(addIndexAndRemoveJsExt(alias)));
            }
        }
    }
    return ret;
}

/**
 * normalize module names with alias
 * @param runtime Module container, such as KISSY
 * @param {String[]} modNames module names
 * @param [refModName] module to be referred if module name path is relative
 * @return {String[]} normalize module names with alias
 */
function normalizeModNamesWithAlias(runtime, modNames, refModName) {
    var ret = [], i, l;
    if (modNames) {
        /* 1. index map */
        for (i = 0, l = modNames.length; i < l; i++) {
            if (modNames[i]) {
                ret.push(pluginAlias(runtime, addIndexAndRemoveJsExt(modNames[i])));
            }
        }
    }
    /* 2. relative to absolute (optional) */
    if (refModName) {
        ret = normalDepModuleName(refModName, ret);
    }
    return ret;
}

/**
 * register module with factory
 * @param runtime Module container, such as KISSY
 * @param {String} name module name
 * @param {Function|*} factory module's factory or exports
 * @param [config] module config, such as dependency
 */
function registerModule(runtime, name, factory, config) {
    name = addIndexAndRemoveJsExtFromName(name);

    var mods = runtime.Env.mods,
        module = mods[name];

    if (module && module.factory !== undefined) {
        return;
    }

    /* 没有 use，静态载入的 add 可能执行 */
    createModuleInfo(runtime, name);

    module = mods[name];

    /* 注意：通过 S.add(name[, factory[, config]]) 注册的代码，无论是页面中的代码， */
    /* 还是 js 文件里的代码，add 执行时，都意味着该模块已经 LOADED */
    mix(module, {
        name    : name,
        status  : LOADED,
        factory : factory
    });

    mix(module, config);
}

/**
 * Returns hash code of a string djb2 algorithm
 * @param {String} str
 * @returns {String} hash code
 */
function getHash(str) {
    var hash = 5381,
        i;
    for (i = str.length; --i > -1;) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        /* hash * 33 + char */
    }
    return hash + '';
}

function getRequiresFromFn(fn) {
    var requires = [];
    fn.toString()
        .replace(commentRegExp, '')
        .replace(requireRegExp, function (match, dep) {
            requires.push(getRequireVal(dep));
        });
    return requires;
}


var commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
    requireRegExp = /[^.'"]\s*require\s*\(([^)]+)\)/g;

function getRequireVal(str) {
    var m = str.match(/^\s*["']([^'"\s]+)["']\s*$/);
    return m ? m[1] : '';
}

function forwardSystemPackage(self, property) {
    return property in self ?
        self[property] :
        self.runtime.Config[property];
}

/**
 * @class KISSY.Loader.Package
 * @private
 * This class should not be instantiated manually.
 */
function Package(cfg) {
    mix(this, cfg);
}

Package.prototype = {
    constructor: Package,

    reset: function (cfg) {
        mix(this, cfg);
    },

    /**
     * Tag for package.
     * tag can not contain ".", eg: Math.random() !
     * @return {String}
     */
    getTag: function () {
        return forwardSystemPackage(this, 'tag');
    },

    /**
     * Get package name.
     * @return {String}
     */
    getName: function () {
        return this.name;
    },

    getPath: function () {
        return this.path || (this.path = this.getUri());
    },

    /**
     * get package uri
     */
    getUri: function () {
        return this.uri;
    },

    /**
     * Whether is debug for this package.
     * @return {Boolean}
     */
    isDebug: function () {
        return forwardSystemPackage(this, 'debug');
    },

    /**
     * Get charset for package.
     * @return {String}
     */
    getCharset: function () {
        return forwardSystemPackage(this, 'charset');
    },

    /**
     * Whether modules are combined for this package.
     * @return {Boolean}
     */
    isCombine: function () {
        return forwardSystemPackage(this, 'combine');
    },

    /**
     * Get package group (for combo).
     * @returns {String}
     */
    getGroup: function () {
        return forwardSystemPackage(this, 'group');
    }
};

Loader.Package = Package;

var systemPackage = new Package({
    name: '',
    runtime: S
});

systemPackage.getUri = function () {
    return this.runtime.Config.baseUri;
};

function getPackage(self, modName) {
    var packages = self.Config.packages || {},
        modNameSlash = modName + '/',
        pName = '',
        p;
    for (p in packages) {
        if (startsWith(modNameSlash, p + '/') && p.length > pName.length) {
            pName = p;
        }
    }
    return packages[pName] || systemPackage;
}


/**
 * @class KISSY.Loader.Module
 * @private
 * This class should not be instantiated manually.
 */
function Module(cfg) {
    /**
     * exports of this module
     */
    this.exports = {};

    /**
     * status of current modules
     */
    this.status = INIT;

    /**
     * name of this module
     */
    this.name = undefined;

    /**
     * factory of this module
     */
    this.factory = undefined;

    /**
     * lazy initialize and commonjs module format
     */
    this.cjs = 1;
    mix(this, cfg);
    this.waitedCallbacks = [];
}

Module.prototype = {
    kissy: 1,

    constructor: Module,

    /**
     * resolve module by name.
     * @param {String|String[]} relativeName relative module's name
     * @param {Function|Object} fn KISSY.use callback
     * @returns {String} resolved module name
     */
    use: function (relativeName, fn) {
        relativeName = getModNamesAsArray(relativeName);
        return S.use(normalDepModuleName(this.name, relativeName), fn);
    },

    /**
     * resolve path
     * @param {String} relativePath relative path
     * @returns {KISSY.Uri} resolve uri
     */
    resolve: function (relativePath) {
        return pathAddBase(relativePath, this.getUri());
    },

    /* use by xtemplate include */
    resolveByName: function (relativeName) {
        return normalDepModuleName(this.name, relativeName);
    },

    /**
     * require other modules from current modules
     * @param {String} moduleName name of module to be required
     * @returns {*} required module exports
     */
    require: function (moduleName) {
        return S.require(moduleName, this.name);
    },

    wait: function (callback) {
        this.waitedCallbacks.push(callback);
    },

    notifyAll: function () {
        var callback;
        var len = this.waitedCallbacks.length,
            i = 0;
        for (; i < len; i++) {
            callback = this.waitedCallbacks[i];
            try {
                callback(this);
            } catch (e) {
                /*jshint loopfunc:true*/
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }
        this.waitedCallbacks = [];
    },

    /**
     * Get the type if current Module
     * @return {String} css or js
     */
    getType: function () {
        var v = this.type;
        if (!v) {
            if (endsWith(toLowerCase(this.name), '.css')) {
                v = 'css';
            } else {
                v = 'js';
            }
            this.type = v;
        }
        return v;
    },

    getAlias: function () {
        var name = this.name,
            aliasFn,
            packageInfo,
            alias = this.alias;
        if (!('alias' in this)) {
            packageInfo = this.getPackage();
            if (packageInfo.alias) {
                alias = packageInfo.alias(name);
            }
            if (!alias && (aliasFn = this.runtime.Config.alias)) {
                alias = aliasFn(name);
            }
        }
        return alias;
    },

    /**
     * Get the path uri of current module if load dynamically
     * @return String
     */
    getUri: function () {
        var uri;
        if (!this.uri) {
            /* path can be specified */
            if (this.path) {
                uri = this.path;
            } else {
                var name        = this.name,
                    packageInfo = this.getPackage(),
                    packageUri  = packageInfo.getUri(),
                    packageName = packageInfo.getName(),
                    extname     = '.' + this.getType(),
                    tag         = this.getTag(),
                    min         = '-min', subPath;
                /* name = Path.join(Path.dirname(name), Path.basename(name, extname)); */
                if (packageInfo.isDebug()) {
                    min = '';
                }
                subPath = pathRemoveExt(name) + min + extname;
                if (packageName) {
                    subPath = pathGetRelative(packageName, subPath);
                }
                uri = pathAddBase(subPath, packageUri);

                if (tag) {
                    uri = pathAddQuery(uri, 't', tag + extname);
                }
            }
            this.uri = uri;
        }
        return this.uri;
    },

    /**
     * Get the path of current module if load dynamically
     * @return {String}
     */
    getPath: function () {
        return this.path || (this.path = this.getUri());
    },

    /**
     * Get the name of current module
     * @return {String}
     */
    getName: function () {
        return this.name;
    },

    /**
     * Get the package which current module belongs to.
     * @return {KISSY.Loader.Package}
     */
    getPackage: function () {
        return this.packageInfo ||
            (this.packageInfo = getPackage(this.runtime, this.name));
    },

    /**
     * Get the tag of current module.
     * tag can not contain ".", eg: Math.random() !
     * @return {String}
     */
    getTag: function () {
        return this.tag || this.getPackage().getTag();
    },

    /**
     * Get the charset of current module
     * @return {String}
     */
    getCharset: function () {
        return this.charset || this.getPackage().getCharset();
    },

    /**
     * get alias required module names
     * @returns {String[]} alias required module names
     */
    getRequiresWithAlias: function () {
        var requiresWithAlias = this.requiresWithAlias,
            requires = this.requires;
        if (!requires || !requires.length) {
            return requires || [];
        } else if (!requiresWithAlias) {
            this.requiresWithAlias = requiresWithAlias =
                normalizeModNamesWithAlias(this.runtime, requires, this.name);
        }
        return requiresWithAlias;
    },

    /**
     * Get module objects required by this module
     * @return {KISSY.Loader.Module[]}
     */
    getRequiredMods: function () {
        var runtime = this.runtime;
        return map(this.getNormalizedRequires(), function (r) {
            return createModuleInfo(runtime, r);
        });
    },

    /**
     * Get module names required by this module
     * @return {String[]}
     */
    getNormalizedRequires: function () {
        var normalizedRequires,
            normalizedRequiresStatus = this.normalizedRequiresStatus,
            status = this.status,
            requires = this.requires;
        if (!requires || !requires.length) {
            return requires || [];
        } else if ((normalizedRequires = this.normalizedRequires) &&
            /* 事先声明的依赖不能当做 loaded 状态下真正的依赖 */
            (normalizedRequiresStatus === status)) {
            return normalizedRequires;
        } else {
            this.normalizedRequiresStatus = status;
            this.normalizedRequires = normalizeModNames(this.runtime, requires, this.name);
            return this.normalizedRequires;
        }
    }
};

Loader.Module = Module;

/**
 * @ignore
 * Declare config info for KISSY.
 * @author yiminghe@gmail.com
 */

var PACKAGE_MEMBERS = ['alias', 'debug', 'tag', 'group', 'combine', 'charset'];
mix(Config.fns, {
    packages : function (config) {
        var name,
            Config = this.Config,
            ps = Config.packages = Config.packages || {};
        if (config) {
            each(config, function (cfg, key) {
                /* 兼容数组方式 */
                name = cfg.name || key;
                var path = cfg.base || cfg.path;
                var newConfig = {
                    runtime: S,
                    name: name
                };
                each(PACKAGE_MEMBERS, function (m) {
                    if (m in cfg) {
                        newConfig[m] = cfg[m];
                    }
                });
                if (path) {
                    if (!endsWith(path, '/')) {
                        path += '/';
                    }
                    if (!cfg.ignorePackageNameInUri) {
                        path += name + '/';
                    }
                    newConfig.uri = normalizeBase(path);
                }
                if (ps[name]) {
                    ps[name].reset(newConfig);
                } else {
                    ps[name] = new Package(newConfig);
                }
            });
            return undefined;
        } else if (config === false) {
            Config.packages = {};
            return undefined;
        } else {
            return ps;
        }
    },
    modules: function (modules) {
        var self = this;
        if (modules) {
            each(modules, function (modCfg, modName) {
                var mod = createModuleInfo(self, modName, modCfg);
                if (mod.status === INIT) {
                    mix(mod, modCfg);
                }
            });
        }
    },
    base: function (base) {
        if (!base) {
            return Config.baseUri;
        } else {
            Config.baseUri = normalizeBase(base);
            return undefined;
        }
    }
});


function normalizeBase(base) {

    base = replace(base, /\\/g, '/');
    if (charAt(base, base.length - 1) !== '/') {
        base += '/';
    }
    return pathAddBase(base);
}

/**
 * combo loader for KISSY. using combo to load module files.
 * @ignore
 * @author yiminghe@gmail.com
 */

/* ie11 is a new one! */

function loadScripts(runtime, rss, callback, charset, timeout) {
    var count = rss && rss.length,
        errorList = [],
        successList = [];

    function complete() {
        if (!(--count)) {
            callback(successList, errorList);
        }
    }

    each(rss, function (rs) {
        var mod;
        var config = {
            timeout: timeout,
            success: function () {
                successList.push(rs);
                if (mod && currentMod) {
                    /* standard browser(except ie9) fire load after KISSY.add immediately */
                    registerModule(runtime, mod.name, currentMod.factory, currentMod.config);
                    currentMod = undefined;
                }
                complete();
            },
            error: function () {
                errorList.push(rs);
                complete();
            },
            charset: charset
        };
        if (!rs.combine) {
            mod = rs.mods[0];
            if (mod.getType() === 'css') {
                mod = undefined;
            }
        }

        getScript(rs.path, config);
    });
}




/**
 * @class KISSY.Loader.ComboLoader
 * using combo to load module files
 * @param runtime KISSY
 * @param waitingModules
 * @private
 */
function ComboLoader(runtime, waitingModules) {
    this.runtime = runtime;
    this.waitingModules = waitingModules;
}


var currentMod,
    startLoadModName,
    startLoadModTime,
    groupTag = now();

ComboLoader.groupTag = groupTag;

function checkKISSYRequire(config, factory) {
    /* use require primitive statement */
    /* function(S,require){require('node')} */
    if (!config && isFunction(factory) && factory.length > 1) {
        var requires = getRequiresFromFn(factory);
        if (requires.length) {
            config = config || {};
            config.requires = requires;
        }
    } else {
        /* KISSY.add(function(){},{requires:[]}) */
        if (config && config.requires && !config.cjs) {
            config.cjs = 0;
        }
    }
    return config;
}

ComboLoader.add = function (name, factory, config, runtime, argsLen) {
    /* KISSY.add('xx',[],function(){}); */
    if (argsLen === 3 && isArray(factory)) {
        var tmp = factory;
        factory = config;
        config = {
            requires: tmp,
            cjs: 1
        };
    }
    /* KISSY.add(function(){}), KISSY.add('a'), KISSY.add(function(){},{requires:[]}) */
    if (isFunction(name) || argsLen === 1) {
        config = factory;
        factory = name;
        config = checkKISSYRequire(config, factory);
        /* 其他浏览器 onload 时，关联模块名与模块定义 */
        currentMod = {
            factory: factory,
            config: config
        };
    } else {
        currentMod = undefined;
        config = checkKISSYRequire(config, factory);
        registerModule(runtime, name, factory, config);
    }
};

function getCommonPrefix(str1, str2) {
    str1 = split(str1, /\//);
    str2 = split(str2, /\//);
    var l = Math.min(str1.length, str2.length);
    for (var i = 0; i < l; i++) {
        if (str1[i] !== str2[i]) {
            break;
        }
    }
    return slice(str1, 0, i).join('/') + '/';
}

ComboLoader.prototype = {
    /**
     * load modules asynchronously
     */
    use: function (normalizedModNames) {
        var self = this,
            allModNames,
            comboUrls,
            timeout = Config.timeout,
            runtime = self.runtime;

        allModNames = keys(self.calculate(normalizedModNames));

        createModulesInfo(runtime, allModNames);

        comboUrls = self.getComboUrls(allModNames);

        /* load css first to avoid page blink */
        each(comboUrls.css, function (cssOne) {
            loadScripts(runtime, cssOne, function (success, error) {

                each(success, function (one) {
                    each(one.mods, function (mod) {
                        registerModule(runtime, mod.name, noop);
                        mod.notifyAll();
                    });
                });

                each(error, function (one) {
                    each(one.mods, function (mod) {
                        mod.status = ERROR;
                        mod.notifyAll();
                    });
                });
            }, cssOne.charset, timeout);
        });

        /* jss css download in parallel */
        each(comboUrls.js, function (jsOne) {
            loadScripts(runtime, jsOne, function (success) {

                each(jsOne, function (one) {
                    each(one.mods, function (mod) {
                        if (!mod.factory) {
                            mod.status = ERROR;
                        }
                        mod.notifyAll();
                    });
                });
            }, jsOne.charset, timeout);
        });
    },

    /**
     * calculate dependency
     */
    calculate: function (modNames, cache, ret) {
        var i,
            m,
            mod,
            modStatus,
            self = this,
            waitingModules = self.waitingModules,
            runtime = self.runtime;

        ret = ret || {};
        cache = cache || {};

        for (i = 0; i < modNames.length; i++) {
            m = modNames[i];
            if (cache[m]) {
                continue;
            }
            cache[m] = 1;
            mod = createModuleInfo(runtime, m);
            modStatus = mod.status;
            if (modStatus >= READY_TO_ATTACH) {
                continue;
            }
            if (modStatus !== LOADED) {
                if (!waitingModules.contains(m)) {
                    if (modStatus !== LOADING) {
                        mod.status = LOADING;
                        ret[m] = 1;
                    }
                    /*jshint loopfunc:true*/
                    mod.wait(function (mod) {
                        waitingModules.remove(mod.name);
                        /* notify current loader instance */
                        waitingModules.notifyAll();
                    });
                    waitingModules.add(m);
                }
            }
            self.calculate(mod.getNormalizedRequires(), cache, ret);
        }

        return ret;
    },

    /**
     * get combo mods for modNames
     */
    getComboMods: function (modNames, comboPrefixes) {
        var comboMods = {},
            runtime = this.runtime,

            packageUri, mod, packageInfo, type, typedCombos, mods,
            tag, charset, comboName, packageName;

        each(modNames, function(modName) {
            mod = createModuleInfo(runtime, modName);
            type = mod.getType();

            packageInfo = mod.getPackage();
            packageName = packageInfo.name;
            charset = packageInfo.getCharset();
            tag = packageInfo.getTag();

            packageUri = packageInfo.getUri();
            comboName = packageName;

            /* remove group feature, leave the origin definition code here */
            mod.canBeCombined = packageInfo.isCombine();

            comboPrefixes[packageName] = packageUri;

            typedCombos = comboMods[type] = comboMods[type] || {};
            if (!(mods = typedCombos[comboName])) {
                mods = typedCombos[comboName] = [];
                mods.charset = charset;
                mods.tags = [tag];
            } else {
                if (!(mods.tags.length === 1 && mods.tags[0] === tag)) {
                    mods.tags.push(tag);
                }
            }
            mods.push(mod);
        });

        return comboMods;
    },

    /**
     * Get combo urls
     */
    getComboUrls: function (modNames) {
        var runtime = this.runtime,
            Config = runtime.Config,
            comboPrefix = Config.comboPrefix,
            comboSep = Config.comboSep,
            maxFileNum = Config.comboMaxFileNum,
            maxUrlLength = Config.comboMaxUrlLength;

        var comboPrefixes = {};
        /* {type, {comboName, [modInfo]}}} */
        var comboMods = this.getComboMods(modNames, comboPrefixes);
        /* {type, {comboName, [url]}}} */
        var comboRes = {};

        /* generate combo urls */
        for (var type in comboMods) {
            comboRes[type] = {};
            for (var comboName in comboMods[type]) {
                var currentComboUrls = [];
                var currentComboMods = [];
                var mods = comboMods[type][comboName];
                var tags = mods.tags;
                var tag = tags.length > 1 ? getHash(tags.join('')) : tags[0];

                var suffix = (tag ? '?t=' + encodeURIComponent(tag) + '.' + type : ''),
                    suffixLength = suffix.length,
                    basePrefix = comboPrefixes[comboName].toString(),
                    baseLen = basePrefix.length,
                    prefix = basePrefix + comboPrefix,
                    res = comboRes[type][comboName] = [];

                var l = prefix.length;
                res.charset = mods.charset;
                res.mods = [];

                /*jshint loopfunc:true*/
                var pushComboUrl = function () {
                    res.push({
                        combine: 1,
                        path: prefix + currentComboUrls.join(comboSep) + suffix,
                        mods: currentComboMods
                    });
                };

                for (var i = 0; i < mods.length; i++) {
                    var currentMod = mods[i];
                    res.mods.push(currentMod);
                    var path = currentMod.getPath();
                    if (!currentMod.canBeCombined) {
                        res.push({
                            combine: 0,
                            path: path,
                            mods: [currentMod]
                        });
                        continue;
                    }
                    /* ignore query parameter */
                    var subPath = path.slice(baseLen).replace(/\?.*$/, '');
                    currentComboUrls.push(subPath);
                    currentComboMods.push(currentMod);

                    if (currentComboUrls.length > maxFileNum ||
                        (l + currentComboUrls.join(comboSep).length + suffixLength > maxUrlLength)) {
                        currentComboUrls.pop();
                        currentComboMods.pop();
                        pushComboUrl();
                        currentComboUrls = [];
                        currentComboMods = [];
                        i--;
                    }
                }
                if (currentComboUrls.length) {
                    pushComboUrl();
                }
            }
        }
        return comboRes;
    }
};

Loader.ComboLoader = ComboLoader;

/*
 2013-09-11
 - union simple loader and combo loader

 2013-07-25 阿古, yiminghe
 - support group combo for packages

 2013-06-04 yiminghe@gmail.com
 - refactor merge combo loader and simple loader
 - support error callback

 2012-02-20 yiminghe note:
 - three status
 0: initialized
 LOADED: load into page
 ATTACHED: factory executed
 */

/**
 * @ignore
 * mix loader into KISSY and infer KISSY baseUrl if not set
 * @author yiminghe@gmail.com
 */

function WaitingModules(fn) {
    this.fn = fn;
    this.waitMods = {};
    this.waitModsNum = 0;
}

WaitingModules.prototype = {
    constructor: WaitingModules,

    notifyAll: function () {
        var fn = this.fn;
        if (fn && !this.waitModsNum) {
            this.fn = null;
            fn();
        }
    },

    add: function (modName) {
        this.waitMods[modName] = 1;
        this.waitModsNum++;
    },

    remove: function (modName) {
        delete this.waitMods[modName];
        this.waitModsNum--;
    },

    contains: function (modName) {
        return this.waitMods[modName];
    }
};

Loader.WaitingModules = WaitingModules;

mix(S, {
    /**
     * Registers a module with the KISSY global.
     * @param {String} name module name.
     * it must be set if combine is true in {@link KISSY#config}
     * @param {Function} factory module definition function that is used to return
     * exports of this module
     * @param {KISSY} factory.S KISSY global instance
     * @param {Object} [cfg] module optional config data
     * @param {String[]} cfg.requires this module's required module name list
     * @member KISSY
     *
     *
     *      // dom module's definition
     *      KISSY.add('dom', function(S, xx){
     *          return {css: function(el, name, val){}};
     *      },{
     *          requires:['xx']
     *      });
     */
    add: function (name, factory, cfg) {
        ComboLoader.add(name, factory, cfg, S, arguments.length);
    },
    /**
     * Attached one or more modules to global KISSY instance.
     * @param {String|String[]} modNames moduleNames. 1-n modules to bind(use comma to separate)
     * @param {Function} success callback function executed
     * when KISSY has the required functionality.
     * @param {KISSY} success.S KISSY instance
     * @param success.x... modules exports
     * @member KISSY
     *
     *
     *      // loads and attached overlay,dd and its dependencies
     *      KISSY.use('overlay,dd', function(S, Overlay){});
     */
    use: function (modNames, success) {
        var normalizedModNames,
            loader,
            error,
            sync,
            tryCount = 0,
            finalSuccess,
            waitingModules = new WaitingModules(loadReady);

        if (isObject(success)) {
            sync = success.sync;
            error = success.error;
            success = success.success;
        }

        finalSuccess = function () {
            success.apply(S, getModules(S, modNames));
        };

        modNames = getModNamesAsArray(modNames);
        modNames = normalizeModNamesWithAlias(S, modNames);

        normalizedModNames = unalias(S, modNames);

        function loadReady() {
            ++tryCount;
            var errorList = [],
                start = now(),
                ret;
            ret = checkModsLoadRecursively(normalizedModNames, S, undefined, errorList);

            if (ret) {
                attachModsRecursively(normalizedModNames, S);
                if (success) {
                    if (sync) {
                        finalSuccess();
                    } else {
                        /* standalone error trace */
                        setImmediate(finalSuccess);
                    }
                }
            } else if (errorList.length) {
                if (error) {
                    if (sync) {
                        error.apply(S, errorList);
                    } else {
                        setImmediate(function () {
                            error.apply(S, errorList);
                        });
                    }
                }
            } else {

                waitingModules.fn = loadReady;
                loader.use(normalizedModNames);
            }
        }

        loader = new ComboLoader(S, waitingModules);

        /*  in case modules is loaded statically
            synchronous check
            but always async for loader
        */
        if (sync) {
            waitingModules.notifyAll();
        } else {
            setImmediate(function () {
                waitingModules.notifyAll();
            });
        }
        return S;
    },

    /**
     * get module exports from KISSY module cache
     * @param {String} moduleName module name
     * @param {String} refName internal usage
     * @member KISSY
     * @return {*} exports of specified module
     */
    require: function (moduleName, refName) {
        if (moduleName) {
            var moduleNames = unalias(S, normalizeModNamesWithAlias(S, [moduleName], refName));
            attachModsRecursively(moduleNames, S);
            return getModules(S, moduleNames)[1];
        }
    }
});

Env.mods = {}; /* all added mods */


/*
 2013-06-04 yiminghe@gmail.com
 - refactor merge combo loader and simple loader
 - support error callback
 */

/**
 * @ignore
 * init loader, set config
 */

//get mini.js src
function getMiniSrc() {
    
    //cache
    if (getMiniSrc.miniSrc) { return getMiniSrc.miniSrc; }
    
    var scripts      = doc.scripts,
        len          = scripts.length,
        baseTestReg  = /(mini|mini-full|mini-all)(?:-min)?\.js/i,
        src          = len ? scripts[len - 1].src : '';
    
    while (len-- > 0) {
        if (baseTestReg.test(scripts[len].src)) {
            src = scripts[len].src;
            break;
        }
    }
    
    return (getMiniSrc.miniSrc = src);
}

// 获取kissy mini目录
// relative: ../../kissy/build/mini-full.js -> ../../kissy/build/
// uncombo: http://g.tbcdn.cn/kissy/m/0.2.8/mini-full.js -> http://g.tbcdn.cn/kissy/m/0.2.8/
// combo: http://g.tbcdn.cn/kissy/??m/0.2.8/mini-full.js -> http://g.tbcdn.cn/kissy/m/0.2.8/
// combo: http://g.tbcdn.cn/??a.js,kissy/m/0.2.8/mini-full.js,b.js -> http://g.tbcdn.cn/kissy/m/0.2.8/
function getBaseDir() {
    var src = getMiniSrc() || doc.URL;
    
    try {
        src = src.match(/.*(mini|mini-full|mini-all)(?:-min)?\.js/i)[0].replace(/(\?\?.*,|\?\?)/, '');
    } catch (err) {}
    
    return src.match(/[^?#]*\//)[0];
}

/* will transform base to absolute path */
config({
    debug       : false,
    base        : getBaseDir(),
    comboPrefix : '??',
    comboSep    : ',',
    charset     : 'utf-8',
    lang        : 'zh-cn',
    comboMaxUrlLength: 2000,
    comboMaxFileNum: 40
});

(function(){

	var S = KISSY;
	
	S.config({
		base: 'http://g.tbcdn.cn/kissy/k/1.4.5',
		packages:[
			{
				name:"gallery",
				path:'http://g.tbcdn.cn/kg/',
				charset:"utf-8",
				ignorePackageNameInUri:true
			},
			{
				name:"m",
				path: getBaseDir(),
				charset:"utf-8",
				ignorePackageNameInUri:true
			}
		],
		modules:{
			'core':{
				alias:[
					'm/anim',
					'm/touch',
					'm/lang',
					'm/base',
					'm/ua',
					'm/uri',
					'm/juicer',
					'm/form'
				]
			},
			'anim':{
				alias:['m/anim']
			},
			'touch':{
				alias:['m/touch']
			},
			'lang':{
				alias:['m/lang']
			},
			'base':{
				alias:['m/base']
			},
			'ua':{
				alias:['m/ua']
			},
			'uri':{
				alias:['m/uri']
			},
			'form':{
				alias:['m/form']
			},
			'juicer':{
				alias:['m/juicer']
			}
		}
	});
})();


}(this));