/*

Lang 模块
combined files : 

m/lang

*/
KISSY.add('m/lang',function(S) {

    var TRUE = true,
        FALSE = false,
        Obj = Object,
        guid = 0,
        class2type = {},
        htmlEntities = {
            '&amp;': '&',
            '&gt;': '>',
            '&lt;': '<',
            '&#x60;': '`',
            '&#x2F;': '/',
            '&quot;': '"',
            /*jshint quotmark:false*/
            '&#x27;': "'"
        },
        reverseEntities = {},
        escapeReg,
        unEscapeReg,
    // - # $ ^ * ( ) + [ ] { } | \ , . ?
        escapeRegExp = /[\-#$\^*()+\[\]{}|\\,.?\s]/g;

    //function.js
    // ios Function.prototype.bind === undefined
    function bindFn(r, fn, obj) {
        function FNOP() {}

        var slice = [].slice,
        args = slice.call(arguments, 3),
        bound = function() {
            var inArgs = slice.call(arguments);
            return fn.apply(
            this instanceof FNOP ? this:
            // fix: y.x=S.bind(fn);
            obj || this, (r ? inArgs.concat(args) : args.concat(inArgs)));
        };
        FNOP.prototype = fn.prototype;
        bound.prototype = new FNOP();
        return bound;
    }

    ['Boolean', 'Number', 'String', 'Function', 'Array', 'Date', 'RegExp', 'Object', 'Error'].forEach(function(name) {
        var name2lc = name.toLowerCase();

        class2type['[object ' + name + ']'] = name2lc;

        S['is' + name] = function(obj) {
            return S.type(obj) === name2lc;
        };
    });

    (function () {
        for (var k in htmlEntities) {
            reverseEntities[htmlEntities[k]] = k;
        }
    })();

    function getEscapeReg() {
        if (escapeReg) {
            return escapeReg;
        }
        var str = '';
        S.each(htmlEntities, function (entity) {
            str += entity + '|';
        });
        str = str.slice(0, -1);
        escapeReg = new RegExp(str, 'g');
        return escapeReg;
    }

    function getUnEscapeReg() {
        if (unEscapeReg) {
            return unEscapeReg;
        }
        var str = '';
        S.each(reverseEntities, function (entity) {
            str += entity + '|';
        });
        str += '&#(\\d{1,5});';
        unEscapeReg = new RegExp(str, 'g');
        return unEscapeReg;
    }

    S.mix(S, {
        escapeHtml: function (str) {
            return (str + '').replace(getEscapeReg(), function (m) {
                return reverseEntities[m];
            });
        },
        unEscapeHtml: function (str) {
            return str.replace(getUnEscapeReg(), function (m, n) {
                return htmlEntities[m] || String.fromCharCode(+n);
            });
        },
        fromUnicode: function (str) {
            return str.replace(/\\u([a-f\d]{4})/ig, function (m, u) {
                return  String.fromCharCode(parseInt(u, 16));
            });
        },
        // array.js
        inArray: function(item, arr) {
            return S.indexOf(item, arr) > - 1;
        },
        indexOf: function(item, arr) {
            return Array.prototype.indexOf.call(arr, item);
        },
        forEach:function(){
            return S.each.apply(this,arguments);
        },
        each: function(object, fn, context) {
            if (object) {
                var key, val, keys, i = 0,
                length = object && object.length,
                // do not use typeof obj == 'function': bug in phantomjs
                isObj = length === undefined || S.type(object) === 'function';

                context = context || null;

                if (isObj) {
                    keys = S.keys(object);
                    for (; i < keys.length; i++) {
                        key = keys[i];
                        // can not use hasOwnProperty
                        if (fn.call(context, object[key], key, object) === FALSE) {
                            break;
                        }
                    }
                } else {
                    for (val = object[0];
                    i < length; val = object[++i]) {
                        if (fn.call(context, val, i, object) === FALSE) {
                            break;
                        }
                    }
                }
            }
            return object;
        },

        /**
         * Returns the index of the last item in the array
         * that contains the specified value, -1 if the
         * value isn't found.
         * @method
         * @param item individual item to be searched
         * @param {Array} arr the array of items where item will be search
         * @return {number} item's last index in array
         * @member KISSY
         */
        lastIndexOf: function(item, arr) {
            return Array.prototype.lastIndexOf.call(arr, item);
        },

        /**
         * Returns a copy of the array with the duplicate entries removed
         * @param a {Array} the array to find the subset of unique for
         * @param [override] {Boolean} if override is TRUE, S.unique([a, b, a]) => [b, a].
         * if override is FALSE, S.unique([a, b, a]) => [a, b]
         * @return {Array} a copy of the array with duplicate entries removed
         * @member KISSY
         */
        unique: function(a, override) {
            var b = a.slice();
            if (override) {
                b.reverse();
            }
            var i = 0,
            n, item;

            while (i < b.length) {
                item = b[i];
                while ((n = S.lastIndexOf(item, b)) !== i) {
                    b.splice(n, 1);
                }
                i += 1;
            }

            if (override) {
                b.reverse();
            }
            return b;
        },

        /**
         * Executes the supplied function on each item in the array.
         * Returns a new array containing the items that the supplied
         * function returned TRUE for.
         * @member KISSY
         * @method
         * @param arr {Array} the array to iterate
         * @param fn {Function} the function to execute on each item
         * @param [context] {Object} optional context object
         * @return {Array} The items on which the supplied function returned TRUE.
         * If no items matched an empty array is returned.
         */
        filter: function(arr, fn, context) {
            return Array.prototype.filter.call(arr, fn, context || this);
        },

        /**
         * Executes the supplied function on each item in the array.
         * Returns a new array containing the items that the supplied
         * function returned for.
         * @method
         * @param arr {Array} the array to iterate
         * @param fn {Function} the function to execute on each item
         * @param [context] {Object} optional context object
         * refer: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/map
         * @return {Array} The items on which the supplied function returned
         * @member KISSY
         */
        map: function(arr, fn, context) {
            return Array.prototype.map.call(arr, fn, context || this);
        },

        /**
         * Executes the supplied function on each item in the array.
         * Returns a value which is accumulation of the value that the supplied
         * function returned.
         *
         * @param arr {Array} the array to iterate
         * @param callback {Function} the function to execute on each item
         * @param initialValue {number} optional context object
         * refer: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/reduce
         * @return {Array} The items on which the supplied function returned
         * @member KISSY
         */
        reduce: function(arr, callback, initialValue) {
            var len = arr.length;
            if (typeof callback !== 'function') {
                throw new TypeError('callback is not function!');
            }

            // no value to return if no initial value and an empty array
            if (len === 0 && arguments.length === 2) {
                throw new TypeError('arguments invalid');
            }

            var k = 0;
            var accumulator;
            if (arguments.length >= 3) {
                accumulator = initialValue;
            } else {
                do {
                    if (k in arr) {
                        accumulator = arr[k++];
                        break;
                    }

                    // if array contains no values, no initial value to return
                    k += 1;
                    if (k >= len) {
                        throw new TypeError();
                    }
                }
                while (TRUE);
            }

            while (k < len) {
                if (k in arr) {
                    accumulator = callback.call(undefined, accumulator, arr[k], k, arr);
                }
                k++;
            }

            return accumulator;
        },

        /**
         * Tests whether all elements in the array pass the test implemented by the provided function.
         * @method
         * @param arr {Array} the array to iterate
         * @param callback {Function} the function to execute on each item
         * @param [context] {Object} optional context object
         * @member KISSY
         * @return {Boolean} whether all elements in the array pass the test implemented by the provided function.
         */
        every: function(arr, fn, context) {
            return Array.prototype.every.call(arr, fn, context || this);
        },

        /**
         * Tests whether some element in the array passes the test implemented by the provided function.
         * @method
         * @param arr {Array} the array to iterate
         * @param callback {Function} the function to execute on each item
         * @param [context] {Object} optional context object
         * @member KISSY
         * @return {Boolean} whether some element in the array passes the test implemented by the provided function.
         */
        some: function(arr, fn, context) {
            return Array.prototype.some.call(arr, fn, context || this);
        },
        /**
         * Converts object to a TRUE array.
         * // do not pass form.elements to this function ie678 bug
         * @param o {object|Array} array like object or array
         * @return {Array} native Array
         * @member KISSY
         */
        makeArray: function(o) {
            if (o == null) {
                return [];
            }
            if (S.isArray(o)) {
                return o;
            }
            var lengthType = typeof o.length,
            oType = typeof o;
            // The strings and functions also have 'length'
            if (lengthType !== 'number' ||
            // select element
            // https://github.com/kissyteam/kissy/issues/537
            typeof o.nodeName === 'string' ||
            // window
            /*jshint eqeqeq:false*/
            (o != null && o == o.window) || oType === 'string' ||
            // https://github.com/ariya/phantomjs/issues/11478
            (oType === 'function' && ! ('item' in o && lengthType === 'number'))) {
                return [o];
            }
            var ret = [];
            for (var i = 0, l = o.length; i < l; i++) {
                ret[i] = o[i];
            }
            return ret;
        },
        toArray: function(o) {
            return S.makeArray(o);
        },
        // escape.js
        /**
         * Creates a serialized string of an array or object.
         *
         * for example:
         *     @example
         *     {foo: 1, bar: 2}    // -> 'foo=1&bar=2'
         *     {foo: 1, bar: [2, 3]}    // -> 'foo=1&bar=2&bar=3'
         *     {foo: '', bar: 2}    // -> 'foo=&bar=2'
         *     {foo: undefined, bar: 2}    // -> 'foo=undefined&bar=2'
         *     {foo: TRUE, bar: 2}    // -> 'foo=TRUE&bar=2'
         *
         * @param {Object} o json data
         * @param {String} [sep='&'] separator between each pair of data
         * @param {String} [eq='='] separator between key and value of data
         * @param {Boolean} [serializeArray=true] whether add '[]' to array key of data
         * @return {String}
         * @member KISSY
         */
        param: function(o, sep, eq, serializeArray) {
            sep = sep || '&';
            eq = eq || '=';
            if (serializeArray === undefined) {
                serializeArray = TRUE;
            }
            var buf = [],
            key,
            i,
            v,
            len,
            val;

            var encode = function(str) {
                return encodeURIComponent(String(str));
            }, isValidParamValue = function(val) {
                var t = typeof val;
                return val == null || (t !== 'object' && t !== 'function');
            };

            for (key in o) {

                val = o[key];
                key = encode(key);


                // val is valid non-array value
                if (isValidParamValue(val)) {
                    buf.push(key);
                    if (val !== undefined) {
                        buf.push(eq, encode(val + ''));
                    }
                    buf.push(sep);
                } else if (S.isArray(val) && val.length) {
                    // val is not empty array
                    for (i = 0, len = val.length; i < len; ++i) {
                        v = val[i];
                        if (isValidParamValue(v)) {
                            buf.push(key, (serializeArray ? encode('[]') : ''));
                            if (v !== undefined) {
                                buf.push(eq, encode(v + ''));
                            }
                            buf.push(sep);
                        }
                    }
                }
                // ignore other cases, including empty array, Function, RegExp, Date etc.
            }
            buf.pop();
            return buf.join('');
        },

        /**
         * Parses a URI-like query string and returns an object composed of parameter/value pairs.
         *
         * for example:
         *      @example
         *      'section=blog&id=45'        // -> {section: 'blog', id: '45'}
         *      'section=blog&tag=js&tag=doc' // -> {section: 'blog', tag: ['js', 'doc']}
         *      'tag=ruby%20on%20rails'        // -> {tag: 'ruby on rails'}
         *      'id=45&raw'        // -> {id: '45', raw: ''}
         * @param {String} str param string
         * @param {String} [sep='&'] separator between each pair of data
         * @param {String} [eq='='] separator between key and value of data
         * @return {Object} json data
         * @member KISSY
         */
        unparam: function(str, sep, eq) {
            if (typeof str !== 'string' || ! (str = S.trim(str))) {
                return {};
            }
            sep = sep || '&';
            eq = eq || '=';
            var ret = {},
            eqIndex,
            pairs = str.split(sep),
            key,
            val,
            i = 0,
            len = pairs.length;

            var decode = function(str) {
                return decodeURIComponent(str.replace(/\+/g, ' '));
            };

            for (; i < len; ++i) {
                eqIndex = pairs[i].indexOf(eq);
                if (eqIndex === - 1) {
                    key = decode(pairs[i]);
                    val = undefined;
                } else {
                    // remember to decode key!
                    key = decode(pairs[i].substring(0, eqIndex));
                    val = pairs[i].substring(eqIndex + 1);
                    try {
                        val = decode(val);
                    } catch(e) {}
                    if (S.endsWith(key, '[]')) {
                        key = key.substring(0, key.length - 2);
                    }
                }
                if (key in ret) {
                    if (S.isArray(ret[key])) {
                        ret[key].push(val);
                    } else {
                        ret[key] = [ret[key], val];
                    }
                } else {
                    ret[key] = val;
                }
            }
            return ret;
        },
        /**
         * empty function
         * @member KISSY
         */
        noop: function() {},
        /**
         * Creates a new function that, when called, itself calls this function in the context of the provided this value,
         * with a given sequence of arguments preceding any provided when the new function was called.
         * refer: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
         * @param {Function} fn internal called function
         * @param {Object} obj context in which fn runs
         * @param {*...} var_args extra arguments
         * @member KISSY
         * @return {Function} new function with context and arguments
         */
        bind: bindFn(0, bindFn, null, 0),

        /**
         * Creates a new function that, when called, itself calls this function in the context of the provided this value,
         * with a given sequence of arguments preceding any provided when the new function was called.
         * refer: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
         * @param {Function} fn internal called function
         * @param {Object} obj context in which fn runs
         * @param {*...} var_args extra arguments
         * @member KISSY
         * @return {Function} new function with context and arguments
         */
        rbind: bindFn(0, bindFn, null, 1),
        // lang.js
        /**
         * Creates a deep copy of a plain object or array. Others are returned untouched.
         * @param input
         * @member KISSY
         * @param {Function} [filter] filter function
         * @return {Object} the new cloned object
         * refer: http://www.w3.org/TR/html5/common-dom-interfaces.html#safe-passing-of-structured-data
         */
        clone: function(input, filter) {
            var destination = input;

            if(!input) return destination;

            var constructor = input.constructor;
            if (S.inArray(constructor, [Boolean, String, Number, Date, RegExp])) {
                destination = input.valueOf();
            }
            // ImageData , File, Blob , FileList .. etc
            else if (S.isArray(input)) {
                destination = filter ? S.filter(input, filter) : input.concat();
            } else if (S.isPlainObject(input)) {
                destination = {};
            }

            // clone it
            if(S.isArray(input)){
                for (var i = 0; i < destination.length; i++) {
                    destination[i] = S.clone(destination[i], filter);
                }
            } else if (S.isPlainObject(input)){
                for (k in input) {
                    if (!filter || (filter.call(input, input[k], k, input) !== false)){
                        destination[k] = S.clone(input[k], filter);
                    }
                }
            }
            return destination;
        },

        /**
         * Gets current date in milliseconds.
         * @method
         * refer:  https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/now
         * http://j-query.blogspot.com/2011/02/timing-ecmascript-5-datenow-function.html
         * http://kangax.github.com/es5-compat-table/
         * @member KISSY
         * @return {Number} current time
         */
        now: Date.now,
        /**
         * Get all the property names of o as array
         * @param {Object} o
         * @return {Array}
         * @member KISSY
         */
        keys: Obj.keys,

        /**
         * Copies all the properties of s to r.
         * @method
         * @param {Object} r the augmented object
         * @param {Object} s the object need to augment
         * @param {Boolean|Object} [ov=TRUE] whether overwrite existing property or config.
         * @param {Boolean} [ov.overwrite=TRUE] whether overwrite existing property.
         * @param {String[]|Function} [ov.whitelist] array of white-list properties
         * @param {Boolean}[ov.deep=false] whether recursive mix if encounter object.
         * @param {String[]|Function} [wl] array of white-list properties
         * @param [deep=false] {Boolean} whether recursive mix if encounter object.
         * @return {Object} the augmented object
         * @member KISSY
         *
         * for example:
         *     @example
         *     var t = {};
         *     S.mix({x: {y: 2, z: 4}}, {x: {y: 3, a: t}}, {deep: TRUE}) => {x: {y: 3, z: 4, a: {}}}, a !== t
         *     S.mix({x: {y: 2, z: 4}}, {x: {y: 3, a: t}}, {deep: TRUE, overwrite: false}) => {x: {y: 2, z: 4, a: {}}}, a !== t
         *     S.mix({x: {y: 2, z: 4}}, {x: {y: 3, a: t}}, 1) => {x: {y: 3, a: t}}
         */
        mix: function(r, s, ov, wl, deep) {
            var k;
            Array.prototype.slice.call(arguments, 1).forEach(function(source) {
                if (source) {
                    for (var prop in source) {
                        if ((k = source[prop]) !== undefined) {
                            r[prop] = k;
                        }
                    }
                }
            });
            return r;
        },

        /**
         * Returns a new object containing all of the properties of
         * all the supplied objects. The properties from later objects
         * will overwrite those in earlier objects. Passing in a
         * single object will create a shallow copy of it.
         * @param {...Object} varArgs objects need to be merged
         * @return {Object} the new merged object
         * @member KISSY
         */
        merge: function() {
            var args = Array.prototype.slice.call(arguments, 0);
            return S.mix.apply(null, [{}].concat(args));
        },

        /**
         * Applies prototype properties from the supplier to the receiver.
         * @param   {Object} r received object
         * @param   {...Object} varArgs object need to  augment
         *          {Boolean} [ov=TRUE] whether overwrite existing property
         *          {String[]} [wl] array of white-list properties
         * @return  {Object} the augmented object
         * @member KISSY
         */
        augment: function(r, o, wl) {
            if (o instanceof Function) {
                S.mix(r.prototype, o.prototype);
            }
            if (o instanceof Object) {
                S.mix(r.prototype, o);
            }
            if (wl instanceof Object) {
                S.mix(r.prototype, wl);
            }
            return r;
        },

        /**
         * Utility to set up the prototype, constructor and superclass properties to
         * support an inheritance strategy that can chain constructors and methods.
         * Static members will not be inherited.
         * @param r {Function} the object to modify
         * @param s {Function} the object to inherit
         * @param {Object} [px] prototype properties to add/override
         * @param {Object} [sx] static properties to add/override
         * @return r {Object}
         * @member KISSY
         */
        extend: function(receiver, supplier, protoPros, staticProps) {
            var supplierProto = supplier.prototype,
            receiverProto;

            // in case parent does not set constructor
            // eg: parent.prototype={};
            supplierProto.constructor = supplier;

            // add prototype chain
            receiverProto = Object.create(supplierProto);
            receiverProto.constructor = receiver;
            receiver.prototype = S.mix(receiverProto, receiver.prototype);
            receiver.superclass = supplierProto;

            // add prototype overrides
            if (protoPros) {
                S.mix(receiverProto, protoPros);
            }

            // add object overrides
            if (staticProps) {
                S.mix(receiver, staticProps);
            }

            return receiver;
        },

        type: function(obj) {
            return obj == null ? String(obj) : class2type[{}.toString.call(obj)] || 'object';
        },

        unique: function(array) {
            return Array.prototype.filter.call(array, function(item, index) {
                return array.indexOf(item) == index;
            });
        },

        isWindow: function(obj) {
            return obj && obj == obj.window;
        },

        isPlainObject: function(obj) {
            return S.isObject(obj) && ! S.isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype;
        },

        isArray: Array.isArray || S.isArray,

        startsWith: function(str, prefix) {
            return str.lastIndexOf(prefix, 0) === 0;
        },

        endsWith: function(str, suffix) {
            var ind = str.length - suffix.length;
            return ind >= 0 && str.indexOf(suffix, ind) === ind;
        },

        // string.js
        ucfirst: function(s) {
            s += '';
            return s.charAt(0).toUpperCase() + s.substring(1);
        },

        trim: function(str) {
            return str == null ? '': String.prototype.trim.call(str);
        },
        substitute: function(str, o, regexp) {
            if (typeof str != 'string' || ! o) {
                return str;
            }

            return str.replace(regexp || /\\?\{([^{}]+)\}/g, function(match, name) {
                if (match.charAt(0) === '\\') {
                    return match.slice(1);
                }
                return (o[name] === undefined) ? '': o[name];
            });
        },

        guid: function (pre) {
            return (pre || '' ) + guid++;
        },

        stamp: function (o, readOnly, marker) {
            marker = marker || '__~ks_stamped';
            var guid = o[marker];
            if (guid) {
                return guid;
            } else if (!readOnly) {
                try {
                    guid = o[marker] = S.guid(marker);
                }
                catch (e) {
                    guid = undefined;
                }
            }
            return guid;
        }

    });

});