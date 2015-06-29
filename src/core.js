;(function(root) {

var S = {
    version: '0.3.11',
    Env: {
        host: root
    }
};

var arrayProto = Array.prototype,
    class2type = {},
    doc = document;

// **S.map(els,function(items){...})**
//
// 遍历数组，数组结果是在对每个原数组元素调用fn的返回值.
// - els:需要遍历的数组
// - fn:能够根据原数组当前元素返回新数组元素的函数.
//
//  ```
//  S.map(["foot", "goose", "moose"],function(single){
//      return single.replace(/o/g, "e");
//  }); // =>  ["feet", "geese", "meese"]
//  ```
S.map = function(els, cb) {
    var val,
        key,
        ret = [];

    if (!S.isObject(els)) {
        arrayProto.forEach.call(els, function(el, index) {
            val = cb(el, index);
            if (val !== null) {
                ret.push(val);
            }
        });
    } else {
        for (key in els) {
            val = cb(els[key], key);
            if (val !== null) {
                ret.push(val);
            }
        }
    }

    return ret.length > 0 ? arrayProto.concat.apply([], ret) : ret;
};

// **S.each(collection, function(index, item){ ... },ctx)**
//
// 遍历数组中的每一项, 执行回调函数中的方法
// - collection:需要遍历的数组或者对象
// - fn:回调函数，回传三个参数
//  1. 当前项的值
//  2. 索引（index）或者键值（key）
//  3. 数组或者对象
// - ctx: fn的上下文对象，默认为`window`
//
//
//      S.each(['a', 'b', 'c'], function(index, item){
//          console.log('item %d is: %s', index, item)
//      })
//
//      var hash = { name: 'kissy.js', size: 'micro' }
//      S.each(hash, function(key, value){
//          console.log('%s: %s', key, value)
//      })
//
S.each = function(obj, iterator, context) {
    var keys, i, len;
    if (!obj) {
        return obj;
    }
    if (obj.forEach === arrayProto.forEach) {
        obj.forEach(iterator, context);
    } else if (S.isArray(obj)) {
        for (i = 0, len = obj.length; i < len; i++) {
            if (iterator.call(context, obj[i], i, obj) === false) {
                return;
            }
        }
    } else {
        keys = Object.keys(obj);
        for (i = 0, len = keys.length; i < len; i++) {
            if (iterator.call(context, obj[keys[i]], keys[i], obj) === false) {
                return;
            }
        }
    }
    return obj;
};

// **S.mix(receiver , supplier)**
//
// 将 supplier 对象的成员复制到 receiver 对象上.
// - receiver: 属性接受者对象.
// - supplier: 属性来源对象.
function mix(obj) {
    var k;
    S.each(arrayProto.slice.call(arguments, 1), function(source) {
        if (source) {
            for (var prop in source) {
                if((k = source[prop]) !== undefined) {
                    obj[prop] = k;
                }
            }
        }
    });
    return obj;
}

S.mix = mix;

// **S.makeArray(list)**
//
// 把list(任何可以迭代的对象)转换成一个数组，在转换 arguments 对象时非常有用。
//
//  (function(){
//      return S.toArray(arguments).slice(1);
//  })(1, 2, 3, 4); // => [2, 3, 4]
//
S.makeArray = function (o) {
    if (o == null) {
        return [];
    }
    if (S.isArray(o)) {
        return o;
    }
    var lengthType = typeof o.length,
        oType = typeof o;
    if (lengthType !== 'number' ||
            o.alert ||
            oType === 'string' ||
            /* https://github.com/ariya/phantomjs/issues/11478 */
            (oType === 'function' && !( 'item' in o && lengthType === 'number'))) {
                return [o];
            }
    var ret = [];
    for (var i = 0, l = o.length; i < l; i++) {
        ret[i] = o[i];
    }
    return ret;
};

// **S.augment (r, s1, [wl])**
//
// 类的扩充，将 `s1` 的 `prototype` 属性的成员复制到 `r.prototype` 上。`Base` 使用。
// - r: 将要扩充的函数
// - s1: 扩充来源函数或对象. 非函数对象时复制的就是 s 的成员.
// - wl: 属性来源对象的属性白名单, 仅在名单中的属性进行复制.
S.augment = function (r, o, wl) {
    if(o instanceof Function){
        S.mix(r.prototype, o.prototype);
    }
    if(o instanceof Object){
        S.mix(r.prototype, o);
    }
    if(wl instanceof Object){
        S.mix(r.prototype, wl);
    }
    return r;
};

// **S.filter(list, iterator, [context])**
//
// 遍历list中的每个值，返回包含所有通过iterator真值检测的元素值。默认使用原生的filter方法。`Base`使用
//
//  var evens = S.filter([1, 2, 3, 4, 5, 6], function(num){
//      return num % 2 == 0;
//  }); // => [2, 4, 6]
S.filter = function (arr, fn, context) {
    return Array.prototype.filter.call(arr, fn, context || this);
} ;

// **S.clone(input,[filter])**
//
// 创建一个 普通对象 或数组的深拷贝, 并且返回新对象，Base 使用。
// - input: 待深拷贝的对象或数组.
// - filter: 过滤函数, 返回 false 不拷贝该元素. 传入参数为:
//  1. 待克隆值为数组, 参数同 `S.filter()`, 上下文对象为全局 `window`
//  2. 待克隆值为普通对象, 参数为对象的每个键, 每个键对应的值, 当前对象, 上下文对象为当前对象.
S.clone = function (input, filter) {
    var destination = input;

    if(!input) return destination;

    var constructor = input.constructor;
    if (S.inArray(constructor, [Boolean, String, Number, Date, RegExp])) {
        destination = input.valueOf();
    }
    /* ImageData , File, Blob , FileList .. etc */
    else if (S.isArray(input)) {
        destination = filter ? S.filter(input, filter) : input.concat();
    } else if (S.isPlainObject(input)) {
        destination = {};
    }

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
};

// **S.ucfirst(string)**
//
// 将字符串首字母大写，Base使用
S.ucfirst= function (s) {
    s += '';
    return s.charAt(0).toUpperCase() + s.substring(1);
};

// **S.trim(string)**
//
// 去除字符串两端的空白字符. Base使用
S.trim = function (str) {
    return str == null ? '' : String.prototype.trim.call(str);
};

// **S.now()**
//
// 返回当前日期时间，Base 使用
S.now = Date.now;

// **S.reduce(arr,fn,[initialValue])**
//
// 从左向右对每个数组元素调用给定函数，并把返回值累积起来，返回这个累加值，Base使用
// - arr: 需要遍历的数组.
// - fn: 在每个数组元素上执行的函数.
// - initialValue: 对象类型，初次执行 fn 时的第一个参数值，如果不指定则为第一个元素值，后续从第二个元素开始遍历
//
// ```
// S.reduce([0,1,2,3,4],function(p, c, index){
//  return p + c;
// });
// // 首次调用
// p = 0, c = 1, index = 1
// //第二次调用
// p = 1, c = 2, index = 2
// // 第三次调用
// p = 3, c= 3, index = 3
// // 第四次调用
// p = 6, c = 4, index = 4
// // 最终返回：10
// ```
S.reduce = function (arr, callback, initialValue) {
    var len = arr.length;
    if (typeof callback !== 'function') {
        throw new TypeError('callback is not function!');
    }

    /* 如果初始值是空数组，则无返回值，报错 */
    if (len === 0 && arguments.length == 2) {
        throw new TypeError('arguments invalid');
    }

    var k = 0;
    var accumulator;
    if (arguments.length >= 3) {
        accumulator = arguments[2];
    }
    else {
        do {
            if (k in arr) {
                accumulator = arr[k++];
                break;
            }

            /* 如果初始值是空数组，则无返回值，报错 */
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
};

// **S.substitute(str,o)**
//
// 将字符串中的占位符替换为对应的键值。`Base`使用
//
// ```
// str = '{name} is {prop_1} and {prop_2}.',
// obj = {name: 'Jack Bauer',
//          prop_1: 'our lord',
//          prop_2: 'savior'};
//
// S.substitute(str, obj);
//      // => 'Jack Bauer is our lord and savior.'
// ```
S.substitute =  function (str, o, regexp) {
    if (typeof str != 'string' || !o) {
        return str;
    }

    return str.replace(regexp || /\\?\{([^{}]+)\}/g, function (match, name) {
        if (match.charAt(0) === '\\') {
            return match.slice(1);
        }
        return (o[name] === undefined) ? '': o[name];
    });
};

// **S.indexOf (elem,arr)**
//
// 返回元素 elem 在数组 arr 中的序号.
S.indexOf = function(item, arr) {
    return Array.prototype.indexOf.call(arr, item);
};

// **S.inArray (elem,arr)**
//
// 判断元素 elem 是否在数组 arr 中.
S.inArray = function(item, arr) {
    return S.indexOf(item, arr) > - 1;
};

// **S.merge (s1,s2[,...])**
//
// 将多个对象的成员合并到一个新对象上. 参数中, 后面的对象成员会覆盖前面的.
//
// ```
// a = { a: 'a' },
// b = { b: 'b' },
// c = { b: 'b2', c: 'c' };
//
// var o = S.merge(a, b, c);
// S.log(o.a); // => 'a'
// S.log(o.b); // => 'b2'
// S.log(o.c); // => 'c'
// ```
S.merge = function() {
    var args = arrayProto.slice.call(arguments, 0);
    return mix.apply(null, [{}].concat(args));
};

// **S.extend (r,s[,px,sx])**
//
// 让函数对象 r 继承函数对象 s
// - r: 将要继承的子类函数
// - supplier: 继承自的父类函数
// - px: 需要添加/覆盖的原型成员
// - sx: 需要添加/覆盖的静态成员.
S.extend = function(receiver, supplier, protoPros, staticProps) {
    var supplierProto = supplier.prototype,
        receiverProto;

    supplierProto.constructor = supplier;

    receiverProto = Object.create(supplierProto);
    receiverProto.constructor = receiver;
    receiver.prototype = S.mix(receiverProto, receiver.prototype);
    receiver.superclass = supplierProto;

    if (protoPros) {
        S.mix(receiverProto, protoPros);
    }

    if (staticProps) {
        S.mix(receiver, staticProps);
    }

    return receiver;
};

// **S.type(object)**
//
// 返回`object`的类型，如果要判断是否是plainObject（普通对象）需要使用`S.isPlainObject()`方法
//
// ```
// S.type(S.one('div')) // => 'array'
// S.type(Number(2)) // => 'number'
// S.type(S.Node)  // => 'function'
// ```
//
// 如果需要验证是否是Node节点类型，使用**S.Node.isNode()**
S.type = function(obj) {
    return obj == null ?
        String(obj) : class2type[{}.toString.call(obj)] || 'object';
};

// **S.unique (arr)**
//
// 返回一个新数组, 仅包含 arr 去重后的值
//
// ```
// KISSY.unique(['a', 'b', 'a']) => ['a', 'b']
// ```
S.unique = function(array) {
    return arrayProto.filter.call(array, function(item, index) {
        return array.indexOf(item) == index;
    });
};

// **S.isWindow (o)**
//
// 判断参数是否为浏览器 window
S.isWindow = function(obj) {
    return obj && obj == obj.window;
};

// **S.isPlainObject(obj)**
//
// 判断是否是普通对象, 通过 {} 或 new FunctionClass/Object() 创建的, 不包括内置对象以及宿主对象.
//
// ```
// S.isPlainObject({}); // => true
// S.isPlainObject(new Date()); // => false
// S.isPlainObject(document.body); // => false
// ```
S.isPlainObject = function(obj) {
    return S.isObject(obj) && !S.isWindow(obj)
        && Object.getPrototypeOf(obj) == Object.prototype;
};

// 类型诊断函数
//
// **S.isBoolean()**
//
// **S.isNumber()**
//
// **S.isString()**
//
// **S.isFunction()**
//
// **S.isArray()**
//
// **S.isDate()**
//
// **S.isRegExp()**
//
// **S.isObject()**
//
// **S.isError()**
//
// **S.isUndefined()**
//
// **S.isNull()**
['Boolean', 'Number', 'String', 'Function',
    'Array', 'Date', 'RegExp', 'Object',
    'Error'].forEach(function(name) {
    var name2lc = name.toLowerCase();

    class2type['[object ' + name + ']'] = name2lc;

    S['is' + name] = function(obj) {
        return S.type(obj) === name2lc;
    };
});

S.isUndefined = function(o){
    return o === undefined;
};

S.isNull = function(o){
    return o === null;
};

S.isArray = Array.isArray || S.isArray;

// **S.startsWith (str,prefix)**
//
// 判断 str 是否以 prefix 开头
S.startsWith = function(str, prefix) {
    return str.lastIndexOf(prefix, 0) === 0;
};

// **S.endsWith(str,suffix)**
//
// 判断 str 是否以 suffix 结尾
S.endsWith   = function(str, suffix) {
    var ind = str.length - suffix.length;
    return ind >= 0 && str.indexOf(suffix, ind) === ind;
};

var guid = 0;

// **S.guid (prefix)**
//
// 返回全局唯一 id.
S.guid = function(pre) {
    return (pre || '') + guid++;
};

// **S.ready(function(S){...})**
//
// DOM Ready 事件，Ready 后再监听会立即执行回调
//
// 与 DOMContentLoaded 事件此类似的事件还有 avaiable 和 contentready，在 PC 端产品多使用这两个方法来监听某个节点是否可用以及节点内的结构是否构造完整，这两个事件在无线端不常用，这里不提供，只提供 `ready()` 方法
//
// ```
// KISSY.ready(function(S){
//      var $ = S.all;
// });
// ```
S.ready = function(fn){
    if (/complete|loaded|interactive/.test(doc.readyState) && doc.body) fn(S);
    else doc.addEventListener('DOMContentLoaded', function(){ fn(S); }, false);
    return this;
};

(function (S, undefined) {
    /* ios Function.prototype.bind === undefined */
    function bindFn(r, fn, obj) {
        function FNOP() {
        }

        var slice = [].slice,
            args = slice.call(arguments, 3),
            bound = function () {
                var inArgs = slice.call(arguments);
                return fn.apply(
                    this instanceof FNOP ? this :
                        /* fix: y.x=S.bind(fn); */
                        obj || this,
                    (r ? inArgs.concat(args) : args.concat(inArgs))
                );
            };
        FNOP.prototype = fn.prototype;
        bound.prototype = new FNOP();
        return bound;
    }

    S.mix(S, {

        // **S.noop()**
        //
        // 空函数
        noop: function () {
        },

        // **S.bind (fn , context)**
        //
        // 创建一个新函数，该函数可以在固定的上下文以及传递部分固定参数放在用户参数前面给原函数并执行
        // - fn: 需要固定上下文以及固定部分参数的函数
        // - context: 执行 fn 时的 this 值. 如果新函数用于构造器则该参数无用.
        bind: bindFn(0, bindFn, null, 0),
        rbind: bindFn(0, bindFn, null, 1)
    });
})(S);

/**
 * @ignore
 * script/css load across browser
 * @author yiminghe@gmail.com
 */

/**
 * Normal ua is like below:
 * 
 * Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 
   (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25
 * Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 5 Build/JOP40D) AppleWebKit/535.19
   (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19
 *  
 * But we need [\/]{0,1} here, because some mobile's user agent is like below:
 * 
 * Xiaomi_2013061_TD/V1 Linux/3.4.5 Android/4.2.1 Release/09.18.2013
   Browser/AppleWebKit534.30 Mobile Safari/534.30 MBBMS/2.2 System/Android 4.2.1
   XiaoMi/MiuiBrowser/1.0
 * ZTE U970_TD/1.0 Linux/2.6.39 Android/4.0 Release/2.21.2012 Browser/AppleWebKit534.30
 * LenovoA658t_TD/1.0 Android 4.0.3 Release/10.01.2012 Browser/WAP2.0 appleWebkit/534.30 AliApp(AP/8.2.0.071702) AlipayClient/8.2.0.071702
 * 
 * @bugfix http://k3.alibaba-inc.com/issue/5108586?versionId=1030999
 * @bugfix http://k3.alibaba-inc.com/issue/5184999?stat=1.5.0&toPage=1&versionId=1035887
 * @bugfix http://k3.alibaba-inc.com/issue/5123513?stat=1.5.1&toPage=1&versionId=1035887
 */

//版本号前带斜杠：AppleWebKit/535.19
//版本号前不带斜杠：AppleWebKit534.30
//字母大小写：appleWebKit/534.30
//拼写错误：ApplelWebkit/534.30
//Android开头：AndroidWebkit/534.30
//匹配不到的话返回NaN，默认使用poll
var webkit = +navigator.userAgent.replace(/.*Web[kK]it[\/]{0,1}(\d+)\..*/, "$1");
var isOldWebKit = !webkit || webkit < 536;

var /* central poll for link node */
    cssTimer = 0,
    /* node.id:{callback:callback,node:node} */
    monitors = {},
    monitorLen = 0;

function startCssTimer() {
    if (!cssTimer) {
        cssPoll();
    }
}

function isCssLoaded(node, url) {
    var sheet = node.sheet,
        loaded;

    if (isOldWebKit) {
        /* http://www.w3.org/TR/Dom-Level-2-Style/stylesheets.html */
        if (node.sheet) {
            loaded = 1;
        }
    } else if (node.sheet) {
        try {
            var cssRules = node.sheet.cssRules;
            if (cssRules) {
                loaded = 1;
            }
        } catch (ex) {
            /* http://www.w3.org/TR/dom/#dom-domexception-code */
            if (ex.name === 'NS_ERROR_DOM_SECURITY_ERR') {
            /* for old firefox */
                loaded = 1;
            }
        }
    }
    return loaded;
}

function cssPoll() {
    for (var url in monitors) {
        var callbackObj = monitors[url],
            node = callbackObj.node;
        if (isCssLoaded(node, url)) {
            if (callbackObj.callback) {
                callbackObj.callback.call(node);
            }
            delete monitors[url];
            monitorLen--;
        }
    }

    cssTimer = monitorLen ? setTimeout(cssPoll, 30) : 0;
}

/* refer : http://lifesinger.org/lab/2011/load-js-css/css-preload.html */
function pollCss(node, callback) {
    var href = node.href,
        arr;
    arr = monitors[href] = {};
    arr.node = node;
    arr.callback = callback;
    monitorLen++;
    startCssTimer();
}

/*
 References:
 - http://unixpapa.com/js/dyna.html
 - http://www.blaze.io/technical/ies-premature-execution-problem/

 `onload` event is supported in WebKit since 535.23
 - https://bugs.webkit.org/show_activity.cgi?id=38995
 `onload/onerror` event is supported since Firefox 9.0
 - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
 - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events

 monitor css onload across browsers.issue about 404 failure.
 - firefox not ok（4 is wrong）：
 - http://yearofmoo.com/2011/03/cross-browser-stylesheet-preloading/
 - all is ok
 - http://lifesinger.org/lab/2011/load-js-css/css-preload.html
 - others
 - http://www.zachleat.com/web/load-css-dynamically/
 */

/**
 * @ignore
 * getScript support for css and js callback after load
 * @author yiminghe@gmail.com
 */

var jsCssCallbacks = {},
    headNode = doc.getElementsByTagName('head')[0] || doc.documentElement;

/**
 * Load a javascript/css file from the server using a GET HTTP request,
 * then execute it.
 *
 * for example:
 *      @example
 *      getScript(url, success, charset);
 *      // or
 *      getScript(url, {
 *          charset: string
 *          success: fn,
 *          error: fn,
 *          timeout: number
 *      });
 *
 * Note 404/500 status in ie<9 will trigger success callback.
 * If you want a jsonp operation, please use {@link KISSY.IO} instead.
 *
 * @param {String} url resource's url
 * @param {Function|Object} [success] success callback or config
 * @param {Function} [success.success] success callback
 * @param {Function} [success.error] error callback
 * @param {Number} [success.timeout] timeout (s)
 * @param {String} [success.charset] charset of current resource
 * @param {String} [charset] charset of current resource
 * @return {HTMLElement} script/style node
 * @member KISSY
 */
var getScript = function (url, success, charset) {
    /* can not use KISSY.Uri, url can not be encoded for some url */
    /* eg: /??dom.js,event.js , ? , should not be encoded */
    var config = success,
        css = 0,
        error,
        timeout,
        attrs,
        callbacks,
        timer;

    if (S.endsWith(url.toLowerCase(), '.css')) {
        css = 1;
    }

    if (S.isObject(config)) {
        success = config.success;
        error   = config.error;
        timeout = config.timeout;
        charset = config.charset;
        attrs   = config.attrs;
    }

    callbacks = jsCssCallbacks[url] = jsCssCallbacks[url] || [];

    callbacks.push([success, error]);

    if (callbacks.length > 1) {
        return callbacks.node;
    }

    var node = doc.createElement(css ? 'link' : 'script'),
        clearTimer = function () {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
        };

    if (attrs) {
        S.each(attrs, function (v, n) {
            node.setAttribute(n, v);
        });
    }

    if (charset) {
        node.charset = charset;
    }

    if (css) {
        node.href = url;
        node.rel = 'stylesheet';
    } else {
        node.src = url;
        node.async = true;
    }

    callbacks.node = node;

    var end = function (error) {
        var index = error,
            fn;
        clearTimer();
        S.each(jsCssCallbacks[url], function (callback) {
            if ((fn = callback[index])) {
                fn.call(node);
            }
        });
        delete jsCssCallbacks[url];
    };

    var useNative = 'onload' in node;
    /*
        onload for webkit 535.23  Firefox 9.0
        https://bugs.webkit.org/show_activity.cgi?id=38995
        https://bugzilla.mozilla.org/show_bug.cgi?id=185236
        https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
        phantomjs 1.7 == webkit 534.34
    */
    var forceCssPoll = S.Config.forceCssPoll || (isOldWebKit);

    if (css && forceCssPoll && useNative) {
        useNative = false;
    }

    function onload() {
        var readyState = node.readyState;
        if (!readyState ||
            readyState === 'loaded' ||
            readyState === 'complete') {
            node.onreadystatechange = node.onload = null;
            end(0);
        }
    }

    /* 标准浏览器 css and all script */
    if (useNative) {
        node.onload = onload;
        node.onerror = function () {
            node.onerror = null;
            end(1);
        };
    } else if (css) {
        /* old chrome/firefox for css */
        pollCss(node, function () {
            end(0);
        });
    } else {
        node.onreadystatechange = onload;
    }

    if (timeout) {
        timer = setTimeout(function () {
            end(1);
        }, timeout * 1000);
    }

    if (css) {
        /* css order matters so can not use css in head */
        headNode.appendChild(node);
    } else {
        /* can use js in head */
        headNode.insertBefore(node, headNode.firstChild);
    }
    return node;
};

/*
 yiminghe@gmail.com refactor@2012-03-29
 - 考虑连续重复请求单个 script 的情况，内部排队

 yiminghe@gmail.com 2012-03-13
 - getScript
 - 404 in ie<9 trigger success , others trigger error
 - syntax error in all trigger success
 */

mix(S, {
    getScript: getScript
});

var fns    = {},
    config = {
        debug : false,
        fns   : fns
    };

S.Config = config;

// **S.config(configName,configValue)**
//
// 设置或获取 KISSY 配置参数，有三种用法
//
// ```
// config(configJSON) //⇒ void
// config(name,value) //⇒ void，name：参数名，value：参数值
// config(name) //⇒ data，返回参数名的值
// ```
//
// 其中`S.config(configJSON)`的用法参照：
//
//      KISSY.config({
//          // 开启自动 combo 模式
//          combine:true,
//          // kissy 库内置模块的时间戳
//          tag:'2012',
//          // kissy 的基准路径
//          base:'http://x.com/a',
//          packages:{},
//          modules:{}
//      })
//
// 完整参数可以参照[KISSY1.4的loader用法](http://docs.kissyui.com/1.4/docs/html/guideline/loader.html)的config部分
//
// [mini.js](../mini.js)支持完整的KISSY模块规范（KMD），[规范详情移步这里](http://docs.kissyui.com/1.4/docs/html/guideline/kmd.html)
//
// ```
// // 判断是否引用mini版本
// var isMini = S.config('mini');
// ```
S.config = function (configName, configValue) {
    var cfg,
        r,
        self = this,
        fn,
        Config = S.Config,
        configFns = Config.fns;
    if (S.isObject(configName)) {
        S.each(configName, function (configValue, p) {
            fn = configFns[p];
            if (fn) {
                fn.call(self, configValue);
            } else {
                Config[p] = configValue;
            }
        });
    } else {
        cfg = configFns[configName];
        if (configValue === undefined) {
            if (cfg) {
                r = cfg.call(self);
            } else {
                r = Config[configName];
            }
        } else {
            if (cfg) {
                r = cfg.call(self, configValue);
            } else {
                Config[configName] = configValue;
            }
        }
    }
    return r;
};

S.config('mini',true);

var modules = {};

var isString   = S.isString,
    isFunction = S.isFunction;

var RE_DIRNAME = /[^?#]*\//,
    RE_DOT = /\/\.\//g,
    RE_DOUBLE_DOT = /\/[^/]+\/\.\.\//,
    RE_DOUBLE_SLASH = /([^:/])\/\//g;

function parseDirName(name) {
    var mat = name.match(RE_DIRNAME);
    return name ? mat[0] : name + '/';
}

function parseRelativeName(name, refName) {
    if (refName && /^[\.\/]/.test(name)) {
        name = parseDirName(refName) + name;
        /* /a/b/./c/./d ==> /a/b/c/d */
        name = name.replace(RE_DOT, '/');

        /* a/b/c/../../d  ==>  a/b/../d  ==>  a/d */
        while (name.match(RE_DOUBLE_DOT)) {
            name = name.replace(RE_DOUBLE_DOT, '/');
        }

        /* a//b/c  ==>  a/b/c  */
        name = name.replace(RE_DOUBLE_SLASH, '$1/');
    }
    return name;
}

function parseModuleName(name, refName) {
    if (name.charAt(name.length - 1) === '/') {
        name += 'index';
    } else if (/.js$/.test(name)) {
        name = name.slice(0, -3);
    }

    return parseRelativeName(name, refName);
}

function execFnWithModules(fn, modNames, refName)  {
    var args = S.map(modNames || [], function(modName) {
        return S.require(modName, refName);
    });
    return isFunction(fn) ? fn.apply(S, [S].concat(args)) : undefined;
}

function execFnWithCJS(fn) {
    return isFunction(fn) ? fn.apply(S, [S, S.require]) : undefined;
}

// **S.add(name,fn,[cfg])**
//
// KISSY 添加模块/逻辑片段的函数，`config`为配置对象，包括`config.requires`，给出当前模块的依赖模块。模块返回一个对象，通过引用它的时候来调用到。
// - name (string) – 模块名。可选。
// - fn (function) – 模块定义函数
// - config (object) – 模块的一些格外属性, 是JSON对象，包含属性：
// - requires (Array) – 模块的一些依赖
//
// core中的`S.add()`只有基本功能，只支持上面三个参数
//
// 在[mini-full.js](../mini-full.js)中，包含完整的KMD规范的实现的loader。
//
// ```
// // package/a.js
// KISSY.add('a',function(S){
//   return ObjA;
// },{
//   // 当前逻辑依赖一个包内的文件b，一个全局模块base
//   requires:['b','base']
// });
// ```
//
// `add()`方法符合基本的KMD规范，可以参照[KISSY 1.4 Loader的文档](http://docs.kissyui.com/1.4/docs/html/guideline/loader.html)

S.add = function(name, factory, config) {
    if (isString(name)) {
        name = parseModuleName(name);
        modules[name] = {
            factory  : factory,
            requires : config && config.requires
        };
    }
    return S;
};

// **S.require(name,[refName])**
//
// 如果模块已经载入，则可以通过`S.require()`方法来调用这个模块，通常如果use()的模块过多，回调参数需要和模块列表一一对应，最简单的办法就是使用`S.require()`方法
//
// 比如这段代码：
// ```
// // use 的模块太多，用肉眼来对应模块名称？
// S.use('a,b,c,d,e,f,g',function(S,A,B,C,D,E,F,G){
//     // Your code...
// });
//
// // 可以简写为这样
// S.use('a,b,c,d,e,f,g',function(S){
//     var A = S.require('a');
//     var B = S.require('b');
//     var C = S.require('c');
//     // Your code...
// });
// ```
S.require = function(name, refName) {
    var mod;
    if (isString(name)) {
        name = parseModuleName(name, refName);
        mod  = modules[name];
        if (mod) {
            if (!mod.exports) {
                mod.exports = isFunction(mod.factory) ?
                    mod.requires ?
                        execFnWithModules(mod.factory, mod.requires, name) :
                        execFnWithCJS(mod.factory)
                    :
                    mod.factory;
            }
            return mod.exports;
        }
    }
};

// **S.use(names, callback)**
//
// 载入并运行模块,和add一起使用，详细用法参照[KISSY模块规范](http://docs.kissyui.com/1.4/docs/html/kmd.html)（KMD），fn 类型是functio。参数说明：
// - modNames (String) – 以逗号（,）分割的模块名称,例如 `S.use("custommod,custommod2")`
// - callback (function|Object) – 当 modNames 中所有模块载入并执行完毕后执行的函数或者对象描述
//
// 当callback类型为Object时，可传入两个属性：
//
// 1. success (function) : 当 modNames 中所有模块加载完毕后执行的函数
// 2. error (function) : 当前 use 失败时调用的函数，参数为失败的模块对象
//
S.use = function(names, success) {
    /* assign callback functions */
    if (S.isObject(success)) {
        success = success.success;
    }
    /* parse string to array */
    if (isString(names)) {
        names = names.replace(/\s+/g, '').split(',');
    }

    execFnWithModules(success, names);

    return S;
};


// **S.log(msg,[cat,type])**
//
// 输出调试信息
// - msg : 试信息
// - cat : 调试信息类别. 可以取 info, warn, error, dir, time 等 console 对象的方法名, 默认为 log.
// - src : 调试代码所在的源信息
S.log = function(msg, cat, type) {
    var logger = console;
    cat = cat && logger[cat] ? cat : 'log';
    logger[cat](type ? type + ': ' + msg : msg);
};

// **S.error(msg)**
//
// 抛出错误异常
S.error = function(msg) {
    if (S.config('debug')) {
        throw msg instanceof Error ? msg : new Error(msg);
    }
};

root.KISSY = S;


}(this));