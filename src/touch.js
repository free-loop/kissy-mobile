/*
combined files : 

m/touch

*/
/**
 * @ignore
 * @file touch
 * @author 虎牙 <huya.nzb@alibaba-inc.com>
 */

!(function(S) {
    
    //预防重复绑定监听
    if (S.__touchModAdded) { return; }
    
    var TAP_MAX_TOUCH_TIME = 200, //KISSY为300ms
        TAP_MAX_DISTANCE = 10, //KISSY为5px
        TAP_HOLD_DELAY = 500, //KISSY为1000ms
        SINGLE_TAP_DELAY = 300, //KISSY为300ms，Zepto为250ms，太快无法触发doubleTap
        
        docElem = document.documentElement,
        hasTouch = !!('ontouchstart' in window),
        
        //桌面浏览器上用mousedown和mouseup模拟
        EVT_TOUCH_START = hasTouch ? 'touchstart' : 'mousedown',
        EVT_TOUCH_MOVE = hasTouch ? 'touchmove' : 'mousemove',
        EVT_TOUCH_END = hasTouch ? 'touchend' : 'mouseup',
        EVT_TOUCH_CANCEL = 'touchcancel',
        EVT_SCROLL = 'scroll',
        
        noop = function() {},
        
        tapHoldTimer = null,
        doubleTapTimmer = null,
        singleTouch = null,
        
        touches = [
        /*{
            startX:0,
            startY:0,
            endX:0,
            endY:0,
            startTime:0,
            endTime:0,
            deltaX:0,
            deltaY:0,
            distance:0,
            timeSpan:0,
       }*/
       ];
    
    //清除多余触摸
    function clearTouchArray() {
        if (touches.length > 2) {
            var tmpArray = [];
            for (var i = 1; i < touches.length; i++) {
                tmpArray[i - 1] = touches[i];
            }
            touches = tmpArray;
        }
    }

    //排除多次绑定中的单次点击的多次记录
    function shouldExcludeTouches() {
        
        clearTouchArray();
        
        if (touches.length == 0) {
            return false;
        }
        
        var duration = singleTouch.startTime - touches[touches.length - 1].startTime;
        
        //判断是否是同一次点击
        if (duration < 10) {
            return true;
        } else {
            return false;
        }
    }
    
    //检查是否是两次tap
    function checkDoubleTap() {
        
        clearTouchArray();
        
        if (touches.length == 1) {
            return false;
        }
        
        //检查两次tap的target是不是一致
        var sameTarget = touches[0].endEvent.target == touches[1].endEvent.target;
        var duration = touches[1].startTime - touches[0].startTime;
        
        if (sameTarget && duration < SINGLE_TAP_DELAY) {
            return true;
        } else {
            return false;
        }
    }
    
    //取消长按的延时器
    function cancelTapHoldTimer() {
        if (tapHoldTimer) {
            clearTimeout(tapHoldTimer);
            tapHoldTimer = null;
        }
    }
    
    //取消双击的延时器
    function cancelDoubleTapTimer() {
        if (doubleTapTimmer) {
            clearTimeout(doubleTapTimmer);
            doubleTapTimmer = null;
        }
    }
    
    //触摸开始回调
    function touchstartHandler(e) {
        
        //多指触摸
        if (e.touches && e.touches.length > 1) {
            singleTouch = null;
            cancelDoubleTapTimer();
            return;
        }
        
        var target = e.target,
            touch = e.changedTouches ? e.changedTouches[0] : e,
            startX = touch.pageX,
            startY = touch.pageY;
            
        singleTouch = {
            startX: startX,
            startY: startY,
            startEvent: e,
            startTime: new Date().getTime()
        };
        
        //长按延时器
        cancelTapHoldTimer();
        
        //设置长按延时
        tapHoldTimer = setTimeout(function() {
            
            cancelTapHoldTimer();
            
            if (singleTouch) {
                var eProxy = S.merge(e, {
                    type: 'tapHold',
                    pageX: startX,
                    pageY: startY,
                    originalEvent: e,
                    timeStamp: new Date().getTime()
                });
                
                S.one(target).fire('tapHold', eProxy);
            }
            
        }, TAP_HOLD_DELAY);
    }
    
    //触摸滑动回调
    function touchmoveHandler(e) {
        
        if (!singleTouch || !tapHoldTimer) { return; }
        
        var target = e.target,
            touch = e.changedTouches ? e.changedTouches[0] : e,
            endX = touch.pageX,
            endY = touch.pageY,
            deltaX = Math.abs(endX - singleTouch.startX), //滑过的水平距离
            deltaY = Math.abs(endY - singleTouch.startY), //滑过的垂直距离
            distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        //位移超过一定距离，取消tapHold事件    
        if (distance > TAP_MAX_DISTANCE) {
            cancelTapHoldTimer();
        }
    }
    
    //触摸结束回调
    function touchendHandler(e) {
        
        cancelTapHoldTimer();
        
        if (!singleTouch) {
            cancelDoubleTapTimer();
            return;
        }
        
        var eProxy, $target,
            target = e.target,
            touch = e.changedTouches ? e.changedTouches[0] : e,
            endX = touch.pageX,
            endY = touch.pageY,
            endTime = new Date().getTime(),
            deltaX = Math.abs(endX - singleTouch.startX), //滑过的水平距离
            deltaY = Math.abs(endY - singleTouch.startY); //滑过的垂直距离
            
        S.mix(singleTouch, {
            endX: endX,
            endY: endY,
            deltaX: deltaX,
            deltaY: deltaY,
            endTime: endTime,
            endEvent: e,
            distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            timeSpan: endTime - singleTouch.startTime
        });
        
        //触摸时间和移动距离超过最大值，则无效
        if (singleTouch.timeSpan > TAP_MAX_TOUCH_TIME || singleTouch.distance > TAP_MAX_DISTANCE) {
            singleTouch = null;
            cancelDoubleTapTimer();
            return;
        }
        
        //同时绑定singleTap和doubleTap时，一次点击push了两次singleTouch，应该只push一次
        if (!shouldExcludeTouches(singleTouch)) {
            touches.push(singleTouch);
        } else {
            cancelDoubleTapTimer();
            return;
        }
        
        clearTouchArray();
       
        fireTap(e, {
            type: 'tap',
            pageX: endX,
            pageY: endY,
            clientX: touch.clientX,
            clientY: touch.clientY,
            timeStamp: new Date().getTime(),
            originalEvent:e
        });
    }
    
    //触摸取消回调
    function touchcancelHandler(e) {
        singleTouch = null;
        clearTouchArray();
        cancelDoubleTapTimer();
        cancelTapHoldTimer();
    }
    
    //TODO
    //部分情况不可以发生tap事件，或者target有误，比如说-webkit-overflow-scrolling等
    //触发tap事件
    function fireTap(e, obj) {
        var  $target = S.one(e.target);
        
        eProxy = S.merge(e, obj || {});
        
        //防止点击穿透
        eProxy.preventDefault = function() {
            try { 
                this.constructor.prototype.preventDefault.call(this);   
                e.preventDefault(); 
            } catch(err) {}
        };
        
        //先触发tap，再触发doubleTap
        $target.fire('tap', eProxy);
        
        //doubleTap和singleTap互斥
        if (doubleTapTimmer) {
            cancelDoubleTapTimer();
            
            if (checkDoubleTap()) {
                S.mix(eProxy, {
                    type: 'doubleTap',
                    timeStamp: new Date().getTime()
                });
                
                $target.fire('doubleTap', eProxy);
            }
        } else {
            doubleTapTimmer = setTimeout(function() {
                clearTimeout(doubleTapTimmer);
                doubleTapTimmer = null;
                
                S.mix(eProxy, {
                    type: 'singleTap',
                    timeStamp: new Date().getTime()
                });
                
                $target.fire('singleTap', eProxy);
            }, SINGLE_TAP_DELAY);
        }
    }
    
    docElem.addEventListener(EVT_TOUCH_START, touchstartHandler, false);
    docElem.addEventListener(EVT_TOUCH_MOVE, touchmoveHandler, false);
    docElem.addEventListener(EVT_TOUCH_END, touchendHandler, false);
    docElem.addEventListener(EVT_TOUCH_CANCEL, touchcancelHandler, false);
    window.addEventListener(EVT_SCROLL, touchcancelHandler, false);
    
    //fix ios 的 touch 无法触发的问题
    if (hasTouch) {
        
        S.each(['tap', 'tapHold', 'singleTap', 'doubleTap'], function(item) {
            S.Event.Special[item] = {
                setup: function() {
                    var elem = this[0];
                    if (!elem.__fixTouchEvent) {
                        elem.addEventListener('touchstart', noop, false);
                        elem.__fixTouchEvent = true;
                    }
                }
            };
        });
        
        S.ready(function() {
            document.body.addEventListener('touchstart', noop, false);
        });
    }

    S.add && S.add('m/touch', function () {});
    
    S.__touchModAdded = true;

})(KISSY);

/**
 * 解决点击穿透的问题
 * [http://gitlab.alibaba-inc.com/mpi/fix-click-through](http://gitlab.alibaba-inc.com/mpi/fix-click-through)
 * @author huya.nzb@alibaba-inc.com
 * @date 2015-01-09
 */
!(function() {
    
    //TODO
    //解决点击穿透之后active和-webkit-tap-highlight-color无法取消的问题
    
    var docElem = document.documentElement,
    
        CLICK = 'click',
        MOUSE_DOWN = 'mousedown',
        MOUSE_UP = 'mouseup',
        RADIO_TYPE = 'radio',
        RESET_DELAY = 400,
        THRESHOLD = 10,
        
        ATTR_FIX_THROUGH = 'fix-through',
        ATTR_FIX_THROUGH_TAPPED = 'fix-through-tapped';
    
    (function () {
        
        if (document.getElementById('fix-click-through-style')) { return; }
        
        var stylesheet = document.createElement('style'),
            head = document.getElementsByTagName('head')[0];
            
        stylesheet.type = 'text/css';
        stylesheet.id = 'fix-click-through-style';
        head.insertBefore(stylesheet, head.firstChild);
        
        //默认样式为黑色
        stylesheet.appendChild(document.createTextNode(
            '[fix-through] input,' +
            '[fix-through] select,' +
            '[fix-through] textarea {pointer-events:none;}' +
            
            '[fix-through] input[type=button],' +
            '[fix-through] input[type=submit],' +
            '[fix-through] input[type=reset],' +
            '[fix-through] input[type=image],' +
            '[fix-through] input[type=file],' +
            '[fix-through] input[type=radio],' +
            '[fix-through] input[type=checkbox],' +
            '[fix-through] [fix-through-tapped] {pointer-events:auto;}'
        ));
    })();
    
    /**
     * 解决点击穿透
     * @class FixClickThrough
     * @static
     */    
    window.FixClickThrough = window.FixClickThrough || {
        
        /**
         * 事件绑定缓存
         * @property cache
         * @type Object
         */
        cache: {},
        
        /**
         * elementFromPoint是否相对于视窗
         * @property relativeToViewport
         * @type Boolean
         */
        relativeToViewport: null,
        
        /**
         * 判断elementFromPoint是否相对于视窗
         * @method isRelativeToViewport
         * @return {Boolean}
         */
        isRelativeToViewport: function() {
            if (this.relativeToViewport !== null) return this.relativeToViewport;
        
            var x = window.pageXOffset ? window.pageXOffset + window.innerWidth - 1 : 0;
            var y = window.pageYOffset ? window.pageYOffset + window.innerHeight - 1 : 0;
            if (!x && !y) return true;
          
            // Test with a point larger than the viewport. If it returns an element,
            // then that means elementFromPoint takes page coordinates.
            return (this.relativeToViewport = !!document.elementFromPoint && !document.elementFromPoint(x, y));
        },
        
        /**
         * 根据坐标获取元素
         * [https://github.com/moll/js-element-from-point/](https://github.com/moll/js-element-from-point/)
         * @method elementFromPoint
         * @param {Number} x X轴值
         * @param {Number} y Y轴值
         * @return {HTMLElement}
         */
        elementFromPoint: function(x, y) {
            if (!this.isRelativeToViewport())  {
                x += window.pageXOffset;
                y += window.pageYOffset;
            }
            return document.elementFromPoint ? document.elementFromPoint(x, y) : null;
        },
        
        /**
         * 是否源自于label节点
         * @method fromLabel
         * @param {HTMLElement} elem 事件新节点
         * @param {HTMLElement} from 事件源自于哪个节点
         * @return {Boolean} 是否源自于label节点
         */
        fromLabel: function(elem, from) {
            if (!elem || !elem.nodeName.match(/(input|select|textarea)/i)) {
                return false;
            }
            
            var labels = this.getLabels(elem);
            
            for (var i = 0, l = labels.length; i < l; i++) {
                if (labels[i].contains(from)) {
                    return true;
                }
            }
            
            return false;
        },
        
        /**
         * 获取表单元素的label
         * @method getLabels
         * @param {HTMLElement} elem 表单元素
         * @return {Array} label数组
         */
        getLabels: function(elem) {
            var id = elem.id,
                labels = [],
                label = id ? document.querySelectorAll('label[for="' + id +'"]') : null;
            
            if (label && label.length) {
                labels = labels.concat(labels.slice.call(label, 0));
            }
            
            label = elem;
            
            while ((label = label.parentNode)) {
                if (label.nodeName.match(/label/i)) {
                    labels.push(label);
                }
            } 
            
            return labels;  
        },
        
        /**
         * 绑定点击穿透的事件
         * @method bind
         * @param {String} eventName 事件名称
         * @param {Function} filter 过滤事件
         */
        bind: function(eventName, filter) {
            
            var self = this;
            
            //如果已经解决过，则不再解决
            if (!filter && this.cache[eventName]) { return; }
            
            //监听冒泡事件
            document.addEventListener(eventName, function(e) {
                
                var target = e.target,
                    now = new Date().getTime(),
                    halt, detach, detached, checked, newTarget;
                
                if (filter && filter(e) === false) { return; }
                
                //防止无法收起键盘
                if (document.activeElement && 
                    document.activeElement.blur &&
                    document.activeElement !== target) {
                    
                    document.activeElement.blur();
                }
                
                // //防止点击输入框无法focus问题
                // if (target.focus && document.activeElement !== target) {
                    // target.focus();
                // }
                
                //如果当前位置的元素不是之前的元素，说明tap时发生了位移或者隐藏，直接阻止事件
                //但是还存在tap事件后延时发生位移和隐藏的元素，这个时候最好触发一下
                newTarget = this.elementFromPoint(e.clientX, e.clientY);
                
                if (newTarget && newTarget !== target) {
                    e.preventDefault && e.preventDefault();
                }
                
                //阻止事件穿透（click, focus, blur, focusin, focusout...）
                halt = function(evt) {
                    
                    newTarget = evt.target;
                    
                    if (newTarget !== target && !self.fromLabel(newTarget, target) &&
                        Math.abs(e.clientX - evt.clientX) < THRESHOLD &&
                        Math.abs(e.clientY - evt.clientY) < THRESHOLD) {
                        
                        //大部分情况下可以阻止穿透点击事件的触发
                        //某些浏览器和webview阻止了focus的触发，但浏览器依旧响应状态弹出键盘
                        e.preventDefault && e.preventDefault();
                        evt.preventDefault && evt.preventDefault();
                        evt.stopPropagation && evt.stopPropagation();
                        
                        //部分安卓2.x手机（小米1）不支持stopImmediatePropagation
                        if (evt.stopImmediatePropagation) {
                            evt.stopImmediatePropagation();
                        }
                        
                        //点击穿透到radio时，无法阻止选中的状态
                        if (newTarget.type === RADIO_TYPE) {
                            if (evt.type === MOUSE_DOWN) {
                                checked = newTarget.checked;
                            } else if (checked === false && evt.type === CLICK) {
                                newTarget.checked = false;
                            }
                        }
                        
                        //最后触发穿透后解除绑定
                        if (evt.type === CLICK) {
                            detach();
                        }
                    }
                };
                
                detach = function() {
                    if (detached) { return; }
                    
                    document.removeEventListener(CLICK, halt, true);
                    document.removeEventListener(MOUSE_DOWN, halt, true);
                    document.removeEventListener(MOUSE_UP, halt, true);
                    
                    //如果值和之前设置的不一样，那么说明有可能连续触发了两次tap，
                    //等待最后一次延时结束后移除attribute
                    if (target.getAttribute(ATTR_FIX_THROUGH_TAPPED) == now) {
                        target.removeAttribute(ATTR_FIX_THROUGH_TAPPED);
                    }
                    
                    if (docElem.getAttribute(ATTR_FIX_THROUGH) == now) {
                        docElem.removeAttribute(ATTR_FIX_THROUGH);
                    }
                    
                    detached = true;
                };
                
                document.addEventListener(CLICK, halt, true);
                document.addEventListener(MOUSE_DOWN, halt, true);
                document.addEventListener(MOUSE_UP, halt, true);
                
                target.setAttribute(ATTR_FIX_THROUGH_TAPPED, now);
                docElem.setAttribute(ATTR_FIX_THROUGH, now);
                
                //在部分机型下，包括ios，click事件有可能延时300+ms，400ms是比较稳妥的时间
                setTimeout(detach, RESET_DELAY);
                
            }, false);
            
            //没有过滤器的时候缓存
            if (!filter) {
                this.cache[eventName] = 1;
            }
        }
    };
    
    //解决tap事件穿透问题    
    FixClickThrough.bind('tap');
    
})();