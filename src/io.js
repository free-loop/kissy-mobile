// ## IO 模块
//
// **IO的配置項说明：**
//
// timeout 值的單位為秒，與KISSY保持一致。
//
// contentType配置，若未配置值，且滿足以下條件
// 1. data不為空
// 2. type不為get
//
// 此時默認
//
// ```
// Content-Type=application/x-www-form-urlencoded
// ```
//
// **KISSY MINI 删除的 API**
//
//| API                  | KISSY                | KISSY-MINI           |
//| -------------------- |:--------------------:|:--------------------:|
//| setupConfig          | YES                  | NO                   |
//| upload               | YES                  | NO                   |
//| serialize            | YES                  | NO                   |
//| getResponseHeader    | YES                  | NO                   |
//| Promise API          | YES                  | NO                   |
//|&nbsp;|&nbsp;|&nbsp;|
//
// 配置项：
//
//| Setting              | KISSY                | KISSY-MINI           |
//| -------------------- |:--------------------:|:--------------------:|
//| cfg.crossDomain      | YES                  | NO                   |
//| cfg.mimeType         | YES                  | NO                   |
//| cfg.password         | YES                  | NO                   |
//| cfg.username         | YES                  | NO                   |
//| cfg.xdr              | YES                  | NO                   |
//| cfg.xhrFields        | YES                  | NO                   |
//| cfg.form             | YES                  | NO                   |
//|&nbsp;|&nbsp;|&nbsp;|
//
//
// **KISSY VS KISSY-MINI，Ajax实现上的差异**
//
//| KISSY                | KISSY-MINI           | Note                 |
//|:-------------------- |:--------------------:|:--------------------:|
//| 回調函數的第二個參數支持更多的狀態  | 目前只支持  success/error/timeout/abort/parseerror | 更多的錯誤狀態可以通過getNativeXhr()得到原生的xhr對象來獲取。  |
//| jsonp返回多個數據源時，success回調得到的數據是一個包含所有數據源的數組 | 目前只取第一個數據源 | - |
//| IO的別名有S.Ajax/S.io/S.IO | 只有S.IO | - |
//| jsonpCallback支持函數返回全局函數名 | jsonpCallback只支持字符串 | - |
//| 對於url上的參數，會與data參數重新組合 | data附加在url上 | - |
//| cache增加的時間戳KISSY和KISSY MINI是不一致的 | - | - |
//|&nbsp;|&nbsp;|&nbsp;|
//
// 实例代码
//
// ```
// S.IO({
//      type: 'get',
//      url: 'http://www.taobao.com',
//      data: {...},
//      success: function(responseData,statusText,xhr){
//          //...
//      },
//      dataType:'json' // 可取值为'json'/'jsonp'
// });
// ```
//
// 快捷调用方法
// - S.IO.get(url,fn)
// - S.IO.post(url,fn)
// - S.IO.jsonp(url,fn)
// - S.IO.getJSON(url,fn)
// - S.IO.getScript(url,fn) 等同于 S.getScript(url,fn)
// - S.IO.jsonp(url,fn) 等同于 S.jsonp(url,fn)
//
// 具体用法参照[KISSY1.4.0 Ajax文档](http://docs.kissyui.com/1.4/docs/html/guideline/io.html)
;(function(global, S) {

var doc = global.document,
    location = global.location;

function mix(target, source) {
    var k, key;
    for (key in source) {
        if((k = source[key]) !== undefined) {
            target[key] = k;
        }
    }
    return target;
}

function merge(d, n) {
    return mix(mix({}, d), n);
}

function isType(type) {
    return function(obj) {
        return {}.toString.call(obj) == '[object ' + type + ']';
    }
}

var isObject   = isType('Object'),
    isArray    = Array.isArray || isType('Array'),
    isFunction = isType('Function');

function each(obj, iterator, context) {
    var keys = Object.keys(obj), i, len;
    for (i = 0, len = keys.length; i < len; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === false) {
            return;
        }
    }
}

var jsonpID = 1,
    TRUE = !0,
    FALSE = !TRUE,
    NULL = null,
    ABORT = "abort",
    SUCCESS = "success",
    ERROR = "error",
    EMPTY = "",
    getScript = S.getScript,
    noop = function() {};

var transports = {},
    def = {
        type: 'GET',
        async: TRUE,
        serializeArray: TRUE,
        /* whether data will be serialized as String */
        processData: TRUE,
        /* contentType: "application/x-www-form-urlencoded; charset=UTF-8" */
        /* Callback that is executed before request */
        beforeSend: noop,
        /* Callback that is executed if the request succeeds */
        success: noop,
        /* Callback that is executed the the server drops error */
        error: noop,
        /* Callback that is executed on request complete (both: error and success) */
        complete: noop,
        context: NULL,
        /* MIME types mapping */
        accepts: {
            script: 'text/javascript,application/javascript',
            json:   "application/json,text/json",
            xml:    'application/xml,text/xml',
            html:   "text/html",
            text:   'text/plain'
        },
        /* Default timeout */
        timeout: 0,
        cache: TRUE
    };

function presetConfig(cfg) {
    if(!cfg.url) {
        cfg.url = location.toString();
    }

    /* 序列化data參數 */
    if (cfg.processData && isObject(cfg.data)) {
        cfg.data = param(cfg.data, cfg.serializeArray)
    }

    cfg.type = cfg.type.toUpperCase();

    if (cfg.data && cfg.type == 'GET') {
        cfg.url = appendURL(cfg.url, cfg.data)
    }

    if (cfg.cache === FALSE) {
        cfg.url = appendURL(cfg.url, 't=' + Date.now());
    }

    var testURL = /^([\w-]+:)?\/\/([^\/]+)/.test(cfg.url),
        protocol = testURL ? RegExp.$1 : location.protocol;

    cfg.local = protocol == 'file:';

    /* KISSY默認的上下文是config而不是io實例*/
    cfg.context || (cfg.context = cfg);

    return cfg;
}

function fireEvent(type, io) {
    IO.fire(type, {io: io});
}

/**
 * IO異步請求對象
 * @param config
 * @returns IO instance
 * @constructor
 */
function IO(config) {
    var self = this;

    if (!(self instanceof IO)) {
        return new IO(config);
    }
    /* 所有的io類型都先進行數據預處理。 */
    var cfg = presetConfig(merge(def, config)),
        timeout = cfg.timeout;

    self.cfg = cfg;

    fireEvent('start', self);

    /* 根據dataType獲取對應的transport對象。 */
    /* 每個transport實現對應的send、abort方法。 */
    var dataType = cfg.dataType,
        Transport = transports[dataType] || transports[EMPTY];

    var transport = new Transport(self);

    self.transport = transport;

    /* beforeSend回調可以阻止異步請求的發送。*/
    var fnBeforeSend = cfg.beforeSend;
    if(fnBeforeSend && fnBeforeSend.call(cfg.context, self, cfg) === false) {
        self.abort();
        return self;
    }

    fireEvent('send', self);

    if(timeout > 0) {
        self._timer = setTimeout(function() {

            self.abort("timeout");

        }, timeout * 1000);
    }

    try {

        transport.send();

    }catch(ex) {
        self._complete(FALSE, ex.message);
    }

    return self;
}

mix(IO, S.Event.Target);

mix(IO.prototype, {
    abort: function(s) {
        this.transport.abort(s);
    },
    /* 一個IO請求，必然要調用success或者error方法中的一個。*/
    /* 最終都需要調用complete回調方法，在這裡統一控制。*/
    _complete: function(status, statusText) {
        var self = this,
            cfg = self.cfg,
            context = cfg.context,
            param = [self.responseData, statusText, self],
            TYPE = status ? SUCCESS : ERROR,
            COMPLETE = "complete";

        /* IO對象不允許重複執行。*/
        if(self._end) return;
        self._end = TRUE;

        clearTimeout(self._timer);

        cfg[TYPE].apply(context, param);
        fireEvent(TYPE, self);

        cfg[COMPLETE].apply(context, param);
        fireEvent(COMPLETE, self);
    }
});

function setTransport(name, fn) {
    transports[name] = fn;
}

function appendURL(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?');
}

var encode = encodeURIComponent;
function param(o, arr) {
    var rt = [];
    _serialize(rt, o, arr);
    return rt.join("&");
}

function _serialize(rt, o, arr, k) {
    var symbol = arr === true ? encode("[]") : EMPTY;

    each(o, function(val, key) {
        if(k) {
            key = k + symbol;
        }
        if(isArray(val)) {
            _serialize(rt, val, arr, key);
        }else{
            rt.push(key + "=" + encode(val));
        }
    });
}

var XHRNAME = "XMLHttpRequest",
    reBlank = /^\s*$/;

/* 標準的XMLHttpRequest對象 */
function createXHR() {
    return new global[XHRNAME]();
}

/**
 * 基於XMLHttpRequest對象的異步請求處理。
 * @constructor
 */
function xhrTransport(io) {
    this.io = io;
}

mix(xhrTransport.prototype, {
    _init: function() {
        var self = this,
            io = self.io,
            cfg = io.cfg,
            dataType = cfg.dataType,
            mime = cfg.accepts[dataType],
            baseHeaders = {},
            xhr = createXHR();

        /* io.xhr = xhr; */
        io.getNativeXhr = function() {
            return xhr;
        };

        /* 依照大部分庫的做法。 */
        if (!cfg.crossDomain) {
            baseHeaders['X-Requested-With'] = XHRNAME;
        }

        if (mime) {
            baseHeaders['Accept'] = mime;

            if(xhr.overrideMimeType) {
                if (mime.indexOf(',') > -1) {
                    mime = mime.split(',', 2)[0]
                }

                xhr.overrideMimeType(mime)
            }
        }

        /* 附加Content-Type */
        if (cfg.contentType || (cfg.data && cfg.type != 'GET')) {
            baseHeaders['Content-Type'] = cfg.contentType ||
                'application/x-www-form-urlencoded';
        }

        cfg.headers = merge(baseHeaders, cfg.headers || {})

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {

                var result, error = FALSE;

                if ((xhr.status >= 200 &&
                    xhr.status < 300) ||
                    xhr.status == 304 ||
                    (xhr.status == 0 && cfg.local)) {

                    /* 若dataType未設置，則取得結果的時候根據mime信息推斷dataType值，並進行對應的數據處理。*/
                    dataType = dataType || mimeToDataType(xhr.getResponseHeader('Content-Type'));

                    /* 利用xhr對象來獲取數據。*/
                    result = io.responseText = xhr.responseText;
                    io.responseXML = xhr.responseXML;

                    try {
                        if (dataType == 'script') {

                            (1,eval)(result);

                        }else if(dataType == 'xml') {

                            result = xhr.responseXML;

                        }else if (dataType == 'json') {

                            result = reBlank.test(result) ? NULL : parseJSON(result);

                        }
                    } catch (e) { error = e }

                    io.responseData = result;
                    if (error) {
                        io._complete(FALSE, 'parsererror')
                    }else {
                        io._complete(TRUE, SUCCESS);
                    }

                } else {
                    io._complete(FALSE, ERROR)
                }
            }
        };

        xhr.open(cfg.type, cfg.url, cfg.async);

        each(cfg.headers, function(v, k) {
            xhr.setRequestHeader(k, v);
        });

        xhr.send(cfg.data ? cfg.data : NULL);

    },
    abort: function(statusText) {
        var self = this,
            xhr = self.xhr,
            io = self.io;

        if(xhr) {
            xhr.onreadystatechange = noop;
            xhr.abort();
        }

        io._complete(FALSE, statusText || ABORT);
    },
    send: function() {
        this._init();
    }
});

setTransport(EMPTY, xhrTransport);

var regMimeType = /^(?:text|application)\/(json|javascript|xml|html)/i;
function mimeToDataType(mime) {
    var result = mime && regMimeType.test(mime),
        type = result ? RegExp.$1 : "text";

    return type === "javascript" ? "script" : type;
    /*
    return mime && ( mime == htmlType ? 'html' :
        reJsonType.test(mime) ? 'json' :
            reScriptType.test(mime) ? 'script' :
                reXMLType.test(mime) && 'xml' ) || 'text';
    */
}

function parseJSON(text) {
    return JSON.parse(text);
}

/**
 * 基於script節點的異步請求處理，主要針對jsonp的場景
 * @param io io實例
 * @constructor
 */
function ScriptTransport(io) {
    this.io = io;
}

mix(ScriptTransport.prototype, {
    abort: function(statusText) {
        this._end(FALSE, statusText || ABORT)
    },
    /**
     * 完成請求以後的清理工作。
     * @param status
     * @param statusText
     * @private
     */
    _end: function(status, statusText) {
        var self = this,
            script = self.script,
            io = self.io,
            gvar = self._globalVar;
        /* 不直接刪除，避免有請求返回以後調用導致的報錯。 */
        global[gvar] = function() {
            delete global[gvar];
        };

        if(script) {
            script.src = NULL;
            script.onload = script.onerror = noop;

            script.parentNode.removeChild(script);
        }
        /* 調用io實例的方法，完成io請求狀態 */
        io._complete(status, statusText);
    },
    send: function() {
        var self = this,
            io = self.io,
            cfg = io.cfg,
            callbackName = cfg.jsonp || "callback",
            methodName = cfg.jsonpCallback || "jsonp"+jsonpID ++;

        /* methodName = (S.isFunction(methodName) ? methodName() : methodName) ||
           "jsonp"+jsonpID ++; */

        self._globalVar = methodName;

        /* 添加jsonp的callback參數。 */
        var url = appendURL(cfg.url, callbackName + "=" + methodName);

        global[methodName] = function(data){
            /*
            r = data;
            */
            /* 如果是多個數據的情況下，返回的數據是數組。*/
            /* 跟kissy保持一致。 */
            /*
            if(arguments.length >1) {
                r = makeArray(arguments);
            }
            */
            io.responseData = data;

            self._end(TRUE, SUCCESS);
        };

        /* KISSY.getScript方法支持傳入指定的script節點元素。*/
        self.script = getScript(url, {
            charset: cfg.scriptCharset,
            error: function() {
                self._end(FALSE, ERROR);
            }
        });
    }
});

setTransport("jsonp", ScriptTransport);

function factory(t, dt) {
    return function(url, data, callback, dataType, type) {
        /* data 参数可省略 */
        if (isFunction(data)) {
            dataType = callback;
            callback = data;
            data = NULL;
        }

        return IO({
            type: t || type,
            url: url,
            data: data,
            success: callback,
            dataType: dt || dataType
        });
    };
}

/* 定義快捷方法 */
// Ajax API
//
// **S.IO.get(url,callback)**
//
// **S.IO.post(url,callback)**
//
// **S.IO.jsonp(url,callback)**
//
// **S.IO.getJSON(url,callback)**
//
// **S.IO.getScript(url,callback)** 同 **S.getScript(url,callback)**
mix(IO, {
    get: factory("get"),
    post: factory("post"),
    jsonp: factory(NULL, "jsonp"),
    getJSON: factory(NULL, "json"),
    getScript: getScript
});

// **S.IO.jsonp(url,callback)** 同 **S.jsonp()**
//
// **S.getScript (url , config)**
//
// 动态加载目标地址的资源文件，第二个参数可以是配置对象，也可以是回调函数
//
// 如果是配置对象，参数可以是：
// - charset：编码类型
// - success：成功的回调函数
// - error：失败的回调函数
//
// ```
// S.getScript(url , { success : success , charset : charset });
// S.getScript(url, function(){...});
//
// ```
mix(S, {
    IO: IO,
    jsonp: IO.jsonp
});

/* KMD封裝 */
S.add('io', function() {
    return IO;
});


})(this, KISSY);