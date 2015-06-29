// ## Event 模块
// 
// **Event 用法：**
//
// 1.直接使用
//
// ```
//  var $ = KISSY.Node.all;
//  $('body').on('click', function(ev){
//      console.log(ev)
//  });
// ```
//
// 2.普通对象的自定义事件
//
//  ```
//  var a = {}, S = KISSY;
//  S.mix(a, S.Event.Target);
//  a.on('my_event', function(ev){
//      console.log(ev)
//  });
//  a.fire('my_event', {"data1": 1, "data2": 2});
//  ```
// **未列出的Event API與KISSY保持用法一致**
//
//| API                      | KISSY                | KISSY-MINI           |
//| --------------------     |:--------------------:|:--------------------:|
//| Event.Object             | YES                  | NO                   |
//| Event.Target.publish     | YES                  | NO                   |
//| Event.Target.addTarget   | YES                  | NO                   |
//| Event.Target.removeTarget| YES                  | NO                   |
//| mouseenter               | YES                  | NO                   |
//| mouseleave               | YES                  | NO                   |
//| mousewheel               | YES                  | NO                   |
//| gestures                 | YES                  | `Import touch.js*`   |
//| &nbsp;|&nbsp;|&nbsp;| 
//
// **与 zeptojs 对比，有以下差异：**
//
// 1. 去除对鼠标兼容事件的支持，包括 mouseenter/mouseleave；
// 2. 提供对普通对象的自定义事件支持，需提前混入 S.Event.Target
//
// **与 KISSY 对比，有以下差异：**
//
// 1. 仅支持链式调用，不支持 Event.on 语法；
// 2. 自定义事件不支持冒泡等属性和方法；
// 3. 触控事件需额外引入 touch.js；
// 4. 回调返回的 event 对象是兼容处理后的原生事件对象，不再提供 ev.originalEvent

(function(S){

S.Event || (S.Event = {});
var $ = S.all,
    Node = S.node,
    _eid = 1,
    isFunction = function(obj){
        return typeof obj == 'function';
    },
    /* 简化 S.mix */
    mix = function(target, source) {
        for (var key in source) {
            target[key] = source[key];
        }
    },
    /* 简化 S.each */
    each = function(obj, iterator, context) {
        Object.keys(obj).map(function(name){
            iterator.call(context, obj[name], name, obj);
        });
    },
    slice = [].slice,
    handlers = [],
    focusinSupported = 'onfocusin' in window,
    /* 焦点事件代理 */
    focusEvent = {
        focus: 'focusin',
        blur: 'focusout'
    },
    specialEvents = {
        "click": "MouseEvent"
    },
    eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
    };

/**
 * 生成返回布尔值函数的方法
 * @param  {[type]} trueOrFalse [description]
 * @return {[type]}             [description]
 */
// returnBool(trueOrFalse)
//
// 内部方法，生成返回布尔值函数的方法
function returnBool(trueOrFalse) {
   return function(){ return trueOrFalse; };
}

/**
 * 生成和 DOM 绑定的唯一 id
 * @param  {[type]} element [description]
 * @return {[type]}         [description]
 */
// eid(element)
//
// 内部方法，生成和 DOM 绑定的唯一 id
function eid(element) {
    return element._eid || (element._eid = _eid++);
}

/**
 * 解析事件字符串
 * @param  {String} event 原始的事件类型字符串
 * @return {Object}       解析后得到的事件类型对象
 */
// parse(event)
//
// 内部方法，解析事件字符串
function parse(event) {
    var parts = event.split('.');
    return {
        e : parts[0],
        ns: parts.slice(1).join(' ')
    };
}

/**
 * 根据事件类型 ns 生成匹配正则，用于判断是否在同一个分组
 * @param  {String} ns [description]
 * @return {RegExp}    [description]
 */
// matcherFor(ns)
//
// 内部方法，根据事件类型 ns 生成匹配正则，用于判断是否在同一个分组
function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |S)');
}

/**
 * 获得指定的 Handler
 * @param  {[type]}   element  [description]
 * @param  {[type]}   event    [description]
 * @param  {Function} fn       [description]
 * @param  {[type]}   selector [description]
 * @return {[type]}            [description]
 */
// findHandlers(el,event,fn)
//
// 内部方法，获得指定的 Handler
function findHandlers(element, event, fn, selector, scope) {
    var evt = parse(event);
    if (evt.ns) var matcher = matcherFor(evt.ns);
    return (handlers[eid(element)] || []).filter(function(handler) {
        return handler &&
            (!evt.e || handler.e == evt.e) &&
            (!evt.ns || matcher.test(handler.ns)) &&
            (!fn || handler.fn === fn) &&
            (!selector || handler.sel == selector) &&
            (!scope || handler.scope === scope);
    });
}

/**
 * 获得是否捕获事件状态，焦点事件一律捕获
 * @param  {[type]}  handler        [description]
 * @param  {[type]}  captureSetting [description]
 * @return {Boolean}                [description]
 */
// isCapture(handler,capture)
//
// 内部方法，获得是否捕获事件状态，焦点事件一律捕获
function isCapture(handler, capture) {
    return handler.del &&
        (!focusinSupported && (handler.e in focusEvent)) || !!capture;
}

/**
 * 将焦点事件统一为真实事件，但 firefox 因为不支持 focusinout 所以不会被转换
 * @param  {[type]} type [description]
 * @return {[type]}      [description]
 */
// eventCvt(type)
//
// 内部方法，将焦点事件统一为真实事件，但 firefox 因为不支持 focusinout 所以不会被转换
function eventCvt(type) {
    return (focusinSupported && focusEvnet[type]) || type;
}

/**
 * 复制原事件对象，并作为原事件对象的代理
 * @param  {[type]} event [description]
 * @return {[type]}       [description]
 */
// createProxy(event)
//
// 内部方法，复制原事件对象，并作为原事件对象的代理
function createProxy(event) {
    var key, proxy = {
            originalEvent: event
        };
    for (key in event)
        if (event[key] !== undefined) proxy[key] = event[key];
    return compatible(proxy, event);
}
S.Event.createProxy = createProxy;

/**
 * 针对三个事件属性做兼容
 * @param  {[type]} event  [description]
 * @param  {[type]} source [description]
 * @return {[type]}        [description]
 */
// compatible(event,source)
//
// 内部方法，针对三个事件属性做兼容
function compatible(event, source) {
    if (source || !event.isDefaultPrevented) {
        source || (source = event);
        each(eventMethods, function(predicate,name) {
            var sourceMethod = source[name];
            event[name] = function() {
                this[predicate] = returnBool(true);
                return sourceMethod && sourceMethod.apply(source, arguments);
            };
            event[predicate] = returnBool(false);
        });

        event.halt = function(){
            this.preventDefault();
            this.stopPropagation();
        };

        if (source.defaultPrevented !== undefined ? source.defaultPrevented :
            'returnValue' in source ? source.returnValue === false :
            source.getPreventDefault && source.getPreventDefault())
            event.isDefaultPrevented = returnBool(true);
    }
    return event;
}

/**
 * 生成原生事件对象
 * @param  {[type]} type  [description]
 * @param  {[type]} props [description]
 * @return {[type]}       [description]
 */
// createEvent(type,props)
//
// 内部方法，生成原生事件对象
function createEvent(type, props) {
    var event = document.createEvent(specialEvents[type] || 'Events'),
        bubbles = true;
    if (props) {
        for (var name in props) {
            name == 'bubbles' ? (bubbles = !!props[name]) : (event[name] = props[name]);
        }
    }
    event.initEvent(type, bubbles, true);
    return compatible(event);
}

/**
 * 添加事件绑定的主函数
 * @param {[type]}   element   [description]
 * @param {[type]}   events    [description]
 * @param {Function} fn        [description]
 * @param {[type]}   data      [description]
 * @param {[type]}   selector  [description]
 * @param {[type]}   delegator [description]
 * @param {[type]}   capture   [description]
 */
// add(el,event,fn)
//
// 内部方法，添加事件绑定的主函数
function add(element, events, fn, selector, delegator, scope) {
    var id = eid(element),
        set = (handlers[id] || (handlers[id] = []));
    if (events == 'ready') return S.ready(fn);
    events.split(/\s/).map(function(event) {
        var handler = parse(event);
        handler.fn = fn;
        handler.sel = selector;
        handler.del = delegator;
        handler.scope = scope;
        var callback = delegator || fn;
        handler.proxy = function(e) {
            e = compatible(e);
            if (e.isImmediatePropagationStopped && e.isImmediatePropagationStopped()) return;
            var result = callback.apply(scope || element, e._args == undefined ? [e] : [e].concat(e._args));
            if (result === false) {
                e.preventDefault();
                e.stopPropagation();
            }
            return result;
        };
        handler.i = set.length;
        set.push(handler);
        element.addEventListener(eventCvt(handler.e), handler.proxy, isCapture(handler));
        /* 自定义 DOM 事件处理，初始化*/
        if(typeof event !== 'undefined' && event in S.Event.Special){
            S.Event.Special[event].setup.apply(S.one(element,[handler.scope]));
        }
    });
}

/**
 * 移除事件绑定的主函数
 * @param  {[type]}   element  [description]
 * @param  {[type]}   events   [description]
 * @param  {Function} fn       [description]
 * @param  {[type]}   selector [description]
 * @param  {[Object]} scope    [description]
 * @return {[type]}            [description]
 */
// remove(el,event,fn)
//
// 内部方法，移除事件绑定的主函数
function remove(element, events, fn, selector, scope) {
    var id = eid(element),
        removeHandlers = function(set) {
            set.map(function(handler){
                delete handlers[id][handler.i];
                element.removeEventListener(eventCvt(handler.e), handler.proxy, isCapture(handler));
                /* 自定义 DOM 事件处理，销毁*/
                if(typeof event !== 'undefined' && event in S.Event.Special){
                    S.Event.Special[event].teardown.apply(S.one(element));
                }
            });
        };
    if(events) {
        events.split(/\s/).map(function(event) {
            removeHandlers(findHandlers(element, event, fn, selector, scope));
        });
    }
    else removeHandlers(handlers[id] || []);
}

/**
 * 主要绑定函数，包括 delegate 的处理方法
 * @param  {[type]}   event    [description]
 * @param  {[type]}   selector [description]
 * @param  {Function} callback [description]
 * @param  {[type]}   scope    [description]
 * @return {[type]}            [description]
 */
// **S.Node.on(event,selector,callback,[scope])**
//
// 事件绑定
//
// ```
// S.Event.on('click','div',function(e){...})
// ```
//
// 可以使用`els.on('click',callback)`
//
// **el.on(eventType,callback)**
//
// 在元素上进行事件绑定，el也可以是Node列表，比如
//
// ```
// S.one('div').on('click',function(){
//      alert('ok');
// });
// ```
Node.on = function(event, selector, callback, scope) {
    var delegator, _this = this;

    /* selector 为空的情况，即非 delegator */
    if (isFunction(selector)) {
        scope = callback;
        callback = selector;
        selector = undefined;
    }

    /* 阻止默认事件，kissy 不支持此方式 */
    if (callback === false) callback = returnFalse;

    _this.each(function(element) {
        /* delegate 处理逻辑 */
        if (selector) delegator = function(e) {
            var evt, match, matches = element.all(selector);
            if(!matches || !matches.length) return;
            match = matches.filter(function(el){
                return (el == e.target) || ($(el).contains(e.target));
            })[0];
            if (match && match !== element[0]) {
                evt = createProxy(e);
                evt.currentTarget = match;
                evt.liveFired = element[0];
                return callback.apply(scope || match, [evt].concat(slice.call(arguments, 1)));
            }
        };

        add(element[0], event, callback, selector, delegator, scope);
    });

    return _this;
};

/**
 * 取消事件绑定的主函数
 * @param  {[type]}   event    [description]
 * @param  {[type]}   selector [description]
 * @param  {Function} callback [description]
 * @param  {[type]}   scope    [description]
 * @return {[type]}            [description]
 */
// **S.Node.detach(event,selector,callback,[scope])**
//
// 取消事件绑定，推荐直接调用**els.detach('click',callback)**
//
// **el.detach(eventType,callback)**
//
// 取消元素事件，el也可以是Node列表。
Node.detach = function(event, selector, callback, scope) {
    var _this = this;

    if (isFunction(selector)) {
        scope = callback;
        callback = selector;
        selector = undefined;
    }

    _this.each(function(element) {
        remove(element[0], event, callback, selector, scope);
    });

    return _this;
};

/**
 * delegate 主函数，只是 Node.on 的别名
 * @param  {[type]}   event    [description]
 * @param  {[type]}   selector [description]
 * @param  {Function} callback [description]
 * @param  {[type]}   scope    [description]
 * @return {[type]}            [description]
 */
// **S.Node.delegate(event,selector,function(){...},[scope])**
//
// 事件委托，推荐直接调用**el.delegate('event',selector,callback,scop)**
//
// **el.delegate(eventType,callback,scope)**
//
// 针对当前节点执行事件委托，scope 为委托的节点或选择器
Node.delegate = function(event, selector, callback, scope) {
    return this.on(event, selector, callback, scope);
};

/**
 * undelegate 主函数，只是 Node.detach 的别名
 * @param  {[type]}   event    [description]
 * @param  {[type]}   selector [description]
 * @param  {Function} callback [description]
 * @param  {[type]}   scope    [description]
 * @return {[type]}            [description]
 */
// **S.Node.undelegate(event,selector,function(){...},[scope])**
//
// 解除事件委托，是`Node.detach`的别名，推荐直接调用**el.undelegate()**
//
// **el.undelegate(eventType,selector,callback,scope)**
//
// 针对当前节点执行解除事件委托，scope 为委托的节点或选择器
Node.undelegate = function(event, selector, callback, scope) {
    return this.detach(event, selector, callback, scope);
};


/**
 * 执行符合匹配的 dom 节点的相应事件的事件处理器
 * @param  {String} events [description]
 * @param  {Object} props  模拟处理原生事件的一些信息
 * @return {[type]}       [description]
 */
// **S.Node.fire(event,props)**
//
// 执行符合匹配的 dom 节点的相应事件的事件处理器，推荐直接调用
//
// ```
// el.fire('click')
// ```
//
// **el.fire(eventType,props)**
//
// 触发节点元素的`eventType`事件，el.fire 函数继承自 `S.Node.fire(event,props)`
// - eventType: 事件类型
// - props：触发事件的时候传入的回传参数
//
// ```
// S.one('div').on('click',function(e){
//      alert(e.a);
// });
// S.one('div').fire('click',{
//      a:1
// });
// // => 弹出框，值为1
// ```
Node.fire = function(events, props) {
    var _this = this;
    events.split(/\s/).map(function(event){
        event = createEvent(event, props);
        _this.each(function(element) {
            if ('dispatchEvent' in element[0]) element[0].dispatchEvent(event);
            else element.fireHandler(events, props);
        });
    });
    return _this;
};

/**
 * 执行符合匹配的 dom 节点的相应事件的事件处理器，不会冒泡
 * @param  {[type]} event [description]
 * @param  {[type]} props  [description]
 * @return {[type]}       [description]
 */
// **S.Node.fireHandler(event,props)**
//
// 执行符合匹配的 dom 节点的相应事件的事件处理器，不会冒泡
//
// 推荐直接执行
//
// ```
// el.fireHandler('click',{...})
// ```
//
// **el.fireHandler(eventType,props)**
//
// 以非冒泡形式触发回调，由`el.fire()`函数调用，在单纯希望执行事件绑定函数时使用此方法
Node.fireHandler = function(events, props) {
    var e, result, _this = this;
    events.split(/\s/).map(function(event){
        _this.each(function(element) {
            e = createEvent(event);
            e.target = element[0];
            if(e.target === null){
                e = getCustomDOMEvent(e);
            }
            mix(e,props);
            findHandlers(element[0], event).map(function(handler, i) {
                result = handler.proxy(e);
                if (e.isImmediatePropagationStopped && e.isImmediatePropagationStopped()) return false;
            });
        });
    });
    return _this;
};

function getCustomDOMEvent(e){
    var eProxy = {};
    mix(eProxy,e);
    eProxy.__proto__ = e.__proto__;
    return eProxy;
}


S.Event || (S.Event = {});
/**
 * 将普通对象混入 Event.Target 后，即能拥有简单的自定义事件特性。
 * @type {Object}
 */
// **S.Event.Target**
//
// 简单自定义事件对象，将普通对象混入 `Event.Target` 后，即能拥有简单的自定义事件特性。
//
// 事件本身是一个抽象概念，和平台无关、和设备无关、更和浏览器无关，浏览器只是使用“事件”的方法来触发特定的行为，进而触发某段网页逻辑。而常见的DOM事件诸如click,dbclick是浏览器帮我们实现的“特定行为”。而这里的“特定行为”就是触发事件的时机，是可以被重新定义的，原理上，事件都是需要精确的定义的，比如下面这个例子，我们定义了一个新事件：“初始化1秒后”
//
// ```
// var EventFactory = function(){
//      var that = this;
//      setTimeout(function(){
//          that.fire('afterOneSecond');
//      },1000);
// };
// S.augment(EventFactory,S.Event.Target);
// var a = new EventFactory();
// a.on('afterOneSecond',function(){
//      alert('1秒后');
// });
// // 1秒后弹框
// ```
//
// 这是一个很纯粹的自定义事件，它有事件名称`afterOneSecond`，有事件的触发条件`self.fire('afterOneSecond')`，有事件的绑定，`a.on('afterOneSecond')`。这样这个事件就能顺利的发生，并被成功监听。在代码组织层面，一般工厂类中实现了事件命名、定义和实现，属于内聚的功能实现。而绑定事件时可以是工厂类这段代码外的用户，他不会去关心事件的具体实现，只要关心工厂类"暴露了什么事件可以让我绑定"就可以了，这就是KISSY中使用自定义事件的用法。
// 
S.Event.Target = {
    /**
     * 用于存放绑定的事件信息
     * @type {Object}
     */
    _L: {
        /*
         "click": [
             {
                 E: "click touchstart",
                 F: fn1,
                 S: scope1
             },
             {
                 E: "click",
                 F: fn2,
                 S: scope2
             }
         ]
         */
    },
    /**
     * 绑定事件
     * @param  {String}   eventType 必选，绑定的事件类型，以空格分隔
     * @param  {Function} fn        必选，触发事件后的回调方法
     * @param  {[type]}   scope     回调方法的 this 指针
     * @return {[type]}             返回对象本身
     */
    on: function(eventType, fn, scope) {
        var eventArr = s2a(eventType), T = this;
        eventArr.map(function(ev){
            var evt = ev in T._L ? T._L[ev] : (T._L[ev] = []);
            evt.push({
                E: eventType,
                F: fn,
                S: scope
            });
        });
        return T;
    },
    /**
     * 触发事件
     * @param  {String} eventType 必选，绑定的事件类型，以空格分隔
     * @param  {[type]} data      触发事件时传递给回调事件对象的信息，而 data 后面的参数会原封不动地传过去
     * @return {[type]}           返回对象本身
     */
    // on()
    //
    // Event.Target 的参元方法，绑定自定义事件
    //
    // fire(event,data)
    //
    // Event.Target 的参元方法，触发事件
    fire: function(eventType, data) {
        var eventArr = s2a(eventType), T = this;
        eventArr.map(function(ev){
            var evt = T._L[ev], 
                returnEv = S.mix(data || {}, {target: T, currentTarget: T});
            if(!evt) return;
            evt.map(function(group){
                group.F.apply(group.S || T, [returnEv].concat([].slice.call(arguments, 2)));
            });

        });
        return T;
    },

    /**
     * 解除绑定事件
     * @param  {String}   eventType 必选，绑定的事件类型，以空格分隔
     * @param  {Function} fn        如果需要指定解除某个回调，需要填写
     * @param  {[type]}   scope     同上，可以进一步区分某个回调
     * @return {[type]}             返回对象本身
     */
    // detach(event,fn)
    //
    // Event.Target 的参元方法，解除绑定事件
    detach: function(eventType, fn, scope) {
        var eventArr = s2a(eventType), T = this;
        eventArr.map(function(ev){
            /* 如果遇到相同事件，优先取消最新绑定的 */
            var evt = T._L[ev], group;
            if(!evt) return;
            if(!fn && (T._L[ev] = [])) return;
            for(var key=0; key < evt.length; key++) {
                group = evt[key];
                if(group.F == fn && group.S == scope) {
                    evt.splice(key, 1);
                    continue;
                }
                else if(group.F == fn) {
                    evt.splice(key, 1);
                    continue;
                }
            }
        });
        return T;
    }
};

S.Event.Special = {
    /*
    'myEvent':{
        setup:function(){

        },
        teardown:function(){

        }
    }
   */
};

/**
 * 把 event 字符串格式化为数组
 */
// s2a(str)
//
// 内部方法，把 event 字符串格式化为数组
function s2a(str) {
    return str.split(' ');
}

S.add('event',function(S){
    return S.Event;
});

})(KISSY);