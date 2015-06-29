// <style>td {border-top:1px solid #ccc} table {border-collapse: collapse;}</style>

/*
combined files : 

m/anim

*/
// 基于 Zepto.js 的动画实现，兼容KISSY动画API
KISSY.add('m/anim',function(S) {

	// 调用方法
	// ```
	// S.use('anim',function(S){
	//		S.one('#id').animate({
	//			width:100
	//		},2/*秒*/,'easeNone',function(){
	//			// 2 秒后触发回调
	//		});
	// });
	// ```
	//
	// 动画API参照 [KISSY Anim](http://docs.kissyui.com/1.4/docs/html/api/node/animate.html)
	//
	// ```
	// el.animate(properties, 
	// 		[duration, [easing, [function(){ 
	//			//...
	// 		}]]])  ⇒ self
	// el.animate(properties, 
	// 		{ 
	// 			duration: msec, 
	// 			easing: type, 
	// 			complete: fn })  ⇒ self
	// ```
	//
	// 代码差异
	//
	// ```
	// // 1.4.0，支持两种用法
	// S.Anim('div',to,duration/*秒*/,easing,function(){
	//}).run();
	//S.one('div').animate(to,duration/*秒*/,easing,function(){
	//});
	//```
	//
	// ```
	// // MINI，只支持一种用法，S.Anim不存在
	//S.one('div').animate(to,duration/*秒*/,easing,function(){
	//});
	// ```
	//
	// 特别注意CSS3动画的回调时机
	// CSS3动画的回调实例代码，同样效果的CSS3动画的实现差异：
	//
	//```
	// // 1.4.0
	//el.animate({
	//		'-webkit-transition-duration':'2s'
	//},0.001,easing,function(){
	//		// 0.001 秒后触发回调	
	//});
	//setTimeout(function(){
	//		// 2秒后触发回调
	//},2000);
	//
	// // MINI
	//el.animate({
	//		'-webkit-transition-duration':'2s'
	//},2,easing,function(){
	//		// 2 秒后触发回调	
	//});
	//```
		
	var $ = S.one;
	var prefix = '',
	eventPrefix, endEventName, endAnimationName, vendors = {
		Webkit: 'webkit',
		Moz: '',
		O: 'o'
	},
	document = window.document,
	testEl = document.createElement('div'),
	supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
	transform,
	transitionProperty,
	transitionDuration,
	transitionTiming,
	transitionDelay,
	animationName,
	animationDuration,
	animationTiming,
	animationDelay,
	cssReset = {}

	function dasherize(str) {
		return str.replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase()
	}
	function normalizeEvent(name) {
		return eventPrefix ? eventPrefix + name: name.toLowerCase()
	}

	S.each(vendors, function(event, vendor) {
		if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
			prefix = '-' + vendor.toLowerCase() + '-'
			eventPrefix = event
			return false
		}
	})

	transform = prefix + 'transform'
	cssReset[transitionProperty = prefix + 'transition-property'] = cssReset[transitionDuration = prefix + 'transition-duration'] = cssReset[transitionDelay = prefix + 'transition-delay'] = cssReset[transitionTiming = prefix + 'transition-timing-function'] = cssReset[animationName = prefix + 'animation-name'] = cssReset[animationDuration = prefix + 'animation-duration'] = cssReset[animationDelay = prefix + 'animation-delay'] = cssReset[animationTiming = prefix + 'animation-timing-function'] = ''

	S.mix(S,{
		_fx : {
			off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
			speeds: {
				_default: 400,
				fast: 200,
				slow: 600
			},
			cssPrefix: prefix,
			transitionEnd: normalizeEvent('TransitionEnd'),
			animationEnd: normalizeEvent('AnimationEnd')
		}
	});

	function animate(properties, duration, ease, callback, delay) {
		if (S.isFunction(duration)) callback = duration,
		ease = undefined,
		duration = undefined
		if (S.isFunction(ease)) callback = ease,
		ease = undefined
		if (S.isPlainObject(duration)) ease = duration.easing,
		callback = duration.complete,
		delay = duration.delay,
		duration = duration.duration
		if (duration) duration = (typeof duration == 'number' ? duration: (S._fx.speeds[duration] || S._fx.speeds._default)) / 1000
		if (delay) delay = parseFloat(delay) / 1000 ;
		return this.anim(properties, duration, ease, callback, delay)
	}

	function anim(properties, duration, ease, callback, delay) {
		/* KISSY Anim 默认以秒为单位 */
		duration *= 1000;
		var key, cssValues = {},
		cssProperties, transforms = '',
		that = this,
		wrappedCallback, endEvent = S._fx.transitionEnd,
		fired = false

		if (duration === undefined) duration = S._fx.speeds._default / 1000
		if (delay === undefined) delay = 0
		if (S._fx.off) duration = 0

		if (typeof properties == 'string') {
			/* keyframe animation */
			cssValues[animationName] = properties
			cssValues[animationDuration] = duration + 's'
			cssValues[animationDelay] = delay + 's'
			cssValues[animationTiming] = (ease || 'linear')
			endEvent = S._fx.animationEnd
		} else {
			cssProperties = []
			/* CSS transitions */
			for (key in properties)
			if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
			else cssValues[key] = properties[key],
			cssProperties.push(dasherize(key))

			if (transforms) cssValues[transform] = transforms,
			cssProperties.push(transform)
			if (duration > 0 && typeof properties === 'object') {
				cssValues[transitionProperty] = cssProperties.join(', ')
				cssValues[transitionDuration] = duration + 's'
				cssValues[transitionDelay] = delay + 's'
				cssValues[transitionTiming] = (ease || 'linear')
			}
		}

		wrappedCallback = function(event) {
			if (typeof event !== 'undefined') {
				if (event.target !== event.currentTarget) return ;
				$(event.target).detach(endEvent, wrappedCallback)
			} else $(this).detach(endEvent, wrappedCallback) ;
			fired = true
			$(this).css(cssReset)
			callback && callback.call(this)
		}
		if (duration > 0) {
			$(this).on(endEvent, wrappedCallback)
			/* transitionEnd is not always firing on older Android phones
			so make sure it gets fired */
			setTimeout(function() {
				if (fired) return ;
				wrappedCallback.call(that)
			},
			(duration * 1000) + 25)
		}

		this.length && this[0].clientLeft

		this.css(cssValues)

		if (duration <= 0) setTimeout(function() {
			that.each(function() {
				wrappedCallback.call(this)
			})
		},
		0)

		return this
	}

	testEl = null;

	S.mix(S.node, {
		anim:anim,
		animate:animate
	});

});