/*
combined files : 

m/ua

*/
// ## UA 模块
//
// 硬件设备探测模块，API 兼容KISSY，但去除了对IE老版本的支持。新增对kindle、touchpad、blackberry等设备的探测，这样来引入模块：
// 
// ```
// KISSY.use('ua',function(S,UA){
// 		// S.UA.xx 或者 UA.xx 来获取设备探测字段
// });
// ```
//
// 使用方法
// ```
// // 通用探测
// S.UA.webkit //webkit内核版本
// S.UA.trident // IE 内核版本，支持不全
// S.UA.gecko // Firefox 内核版本
// S.UA.presto // Opera 内核版本
// S.UA.chrome // Cheome 版本
// S.UA.safari // Safari 版本
// S.UA.firefox // Firefox 版本
// S.UA.ie // IE 版本，支持不全
// S.UA.opera // Opera 版本
// S.UA.core // 内核类型，返回webkit或者trident等
// S.UA.shell // 外壳版本，返回ie,chrome,firefox等
//
// // 移动设备探测
// S.UA.phantomjs // PhantomJS 版本号
// S.UA.os // 操作系统类型，取值linux、windows、ios、android等
// S.UA.ipad // ipad 版本
// S.UA.iphone // iphone 版本
// S.UA.ipod // ipod 版本
// S.UA.ios // ios 操作系统版本
// S.UA.touchpad // touchpad 版本
// S.UA.kindle // kindle 版本
// S.UA.android // android 版本
// S.UA.webos // webos版本
// S.UA.blackberry // 黑莓版本
// S.UA.bb10 // 老版本黑莓版本探测
// S.UA.rimtabletos // 平板电脑版本
// S.UA.tablet // 平板电脑版本
// S.UA.slik // Slik 版本
// S.UA.playbook // PlayBook版本
// ```
//
// 具体用法参照[KISSY1.4.0 UA文档](http://docs.kissyui.com/1.4/docs/html/guideline/ua.html)
KISSY.add('m/ua',function(S) {
	var ua = navigator.userAgent,m,core,shell,
	UA = S.UA = {
		/**
		 * webkit version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		webkit: undefined,
		/**
		 * trident version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		trident: undefined,
		/**
		 * gecko version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		gecko: undefined,
		/**
		 * presto version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		presto: undefined,
		/**
		 * chrome version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		chrome: undefined,
		/**
		 * safari version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		safari: undefined,
		/**
		 * firefox version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		firefox: undefined,
		/**
		 * ie version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		ie: undefined,
		/**
		 * opera version
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		opera: undefined,
		/**
		 * mobile browser. apple, android.
		 * @type String
		 * @member KISSY.UA
		 */
		/*mobile: undefined,*/
		/**
		 * browser render engine name. webkit, trident
		 * @type String
		 * @member KISSY.UA
		 */
		core: undefined,
		/**
		 * browser shell name. ie, chrome, firefox
		 * @type String
		 * @member KISSY.UA
		 */
		shell: undefined,

		/**
		 * PhantomJS version number
		 * @type undefined|Number
		 * @member KISSY.UA
		 */
		phantomjs: undefined,

		/**
		 * operating system. android, ios, linux, windows
		 * @type string
		 * @member KISSY.UA
		 */
		os: undefined,

		/**
		 * ipad ios version
		 * @type Number
		 * @member KISSY.UA
		 */
		ipad: undefined,
		/**
		 * iphone ios version
		 * @type Number
		 * @member KISSY.UA
		 */
		iphone: undefined,
		/**
		 * ipod ios
		 * @type Number
		 * @member KISSY.UA
		 */
		ipod: undefined,
		/**
		 * ios version
		 * @type Number
		 * @member KISSY.UA
		 */
		ios: undefined,
		touchpad:undefined,
		kindle:undefined,

		/**
		 * android version
		 * @type Number
		 * @member KISSY.UA
		 */
		android: undefined,
		webos:undefined,
		blackberry:undefined,
		bb10:undefined,
		rimtabletos:undefined,
		tablet:undefined,

		slik:undefined,
		playbook:undefined
	};
	function numberify(s) {
		var c = 0;
		/* convert '1.2.3.4' to 1.234 */
		return parseFloat(s.replace(/\./g, function() {
			return (c++ === 0) ? '.': '';
		}));
	}

	var os = /*S.UA.os =*/ {},
	browser = /*this.browser =*/ {},
	webkit = ua.match(/Web[kK]it[\/]{0,1}([\d.]+)/),
	android = ua.match(/(Android);?[\s\/]+([\d.]+)?/),
	ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
	ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/),
	iphone = ! ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
	webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
	touchpad = webos && ua.match(/TouchPad/),
	kindle = ua.match(/Kindle\/([\d.]+)/),
	silk = ua.match(/Silk\/([\d._]+)/),
	blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
	bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
	rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
	playbook = ua.match(/PlayBook/),
	chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
	firefox = ua.match(/Firefox\/([\d.]+)/),
	ie = ua.match(/MSIE\s([\d.]+)/),
	safari = webkit && ua.match(/Mobile\//) && ! chrome,
	webview = ua.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/) && ! chrome;

	/*
	Todo: clean this up with a better OS/browser seperation:
	- discern (more) between multiple browsers on android
	- decide if kindle fire in silk mode is android or not
	- Firefox on Android doesn't specify the Android version
	- possibly devide in os, device and browser hashes
	*/
	if (browser.webkit = !! webkit) {
		browser.webkit = numberify(webkit[1]);
	}

	if (android){
		os.android = numberify(android[2]);
		UA.os = 'android';
	}
	if (iphone && ! ipod){
		os.ios = os.iphone = numberify(iphone[2].replace(/_/g, '.'));
		UA.os = 'ios';
	}
	if (ipad){
		os.ios = os.ipad = numberify(ipad[2].replace(/_/g, '.'));
		UA.os = 'ios';
	}
	if (ipod){
		os.ios = os.ipod = numberify(ipod[3] ? ipod[3].replace(/_/g, '.') : true);
		UA.os = 'ios';
	}
	if (webos){
		os.webos = numberify(webos[2]);
		UA.os = 'webos';
	}
	if (touchpad){
		os.touchpad = true;
		UA.os = 'touchpad';
	}
	if (blackberry){
		os.blackberry = numberify(blackberry[2]);
		UA.os = 'blackberry';
	}
	if (bb10){
		os.bb10 = numberify(bb10[2]);
		UA.os = 'bb10';
	}
	if (rimtabletos){
		os.rimtabletos = numberify(rimtabletos[2]);
		UA.os = 'rimtabletos';
	}
	if (playbook) {
		browser.playbook = true;
		shell = 'playbook';
	}
	if (kindle) {
		os.kindle = numberify(kindle[1]);
		UA.os = 'kindle';
	}
	if (silk) {
		browser.silk = numberify(silk[1])
	}
	if (!silk && os.android && ua.match(/Kindle Fire/)){
		browser.silk = true;
		shell = 'silk';
	}
	if (chrome) {
		browser.chrome = numberify(chrome[1]);
		shell = 'chrome';
	}
	if (firefox) {
		browser.firefox = numberify(firefox[1]);
		shell = 'firefox';
	}
	if (ie) {
		browser.ie = numberify(ie[1]);
		shell = 'ie';
	}
	if (safari && (ua.match(/Safari/) || !! os.ios)){
		browser.safari = true;
		shell = 'safari';
	}
	if (webview){
		browser.webview = true;
		shell = 'webview';
	}

	if ((m = ua.match(/AppleWebKit\/([\d.]*)/)) && m[1]) {
		core = 'webkit';

		if ((m = ua.match(/OPR\/(\d+\.\d+)/)) && m[1]) {
			UA[shell = 'opera'] = numberify(m[1]);
		}
		if ((m = ua.match(/PhantomJS\/([^\s]*)/)) && m[1]) {
			UA.phantomjs = numberify(m[1]);
		}
	}
	/* NOT WebKit */
	else {
		/* 
		Presto
		ref: http://www.useragentstring.com/pages/useragentstring.php
		*/
        if ((m = ua.match(/Trident\/([\d.]*)/)) && m[1]) {
            UA[core = 'trident'] = numberify(m[1]);
        }
		else if ((m = ua.match(/Presto\/([\d.]*)/)) && m[1]) {
			UA[core = 'presto'] = numberify(m[1]);

			/* Opera */
			if ((m = ua.match(/Opera\/([\d.]*)/)) && m[1]) {
				UA[shell = 'opera'] = numberify(m[1]); // Opera detected, look for revision
				if ((m = ua.match(/Opera\/.* Version\/([\d.]*)/)) && m[1]) {
					UA[shell] = numberify(m[1]);
				}

			}

			/* NOT WebKit or Presto */
		} else if ((m = ua.match(/Gecko/))) {
			UA[core = 'gecko'] = 0.1; // Gecko detected, look for revision
			if ((m = ua.match(/rv:([\d.]*)/)) && m[1]) {
				UA[core] = numberify(m[1]);
			}
		}
	}

	S.mix(S.UA,{
		tablet : !! (ipad || playbook || (android && ! ua.match(/Mobile/)) || 
					 (firefox && ua.match(/Tablet/)) || (ie && ! ua.match(/Phone/) && ua.match(/Touch/))),
		phone : !! (!os.tablet && ! os.ipod && 
				(android || iphone || webos || blackberry || bb10 || (chrome && ua.match(/Android/)) || 
				 (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/)) || 
				 (ie && ua.match(/Touch/))))
	});

	S.mix(S.UA,browser);
	S.mix(S.UA,os);

	if(!UA.os){
		if ((/windows|win32/i).test(ua)) {
			UA.os = 'windows';
		} else if ((/macintosh|mac_powerpc/i).test(ua)) {
			UA.os  = 'macintosh';
		} else if ((/linux/i).test(ua)) {
			UA.os = 'linux';
		} else if ((/rhino/i).test(ua)) {
			UA.os = 'rhino';
		}
	}

	if(!UA.core){
		UA.core = core;
	}
	if(!UA.shell){
		UA.shell = shell;
	}

	return UA;
});