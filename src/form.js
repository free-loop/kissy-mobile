/*
 Refer
 - application/x-www-form-urlencoded
 - http://www.ietf.org/rfc/rfc3986.txt
 - http://en.wikipedia.org/wiki/URI_scheme
 - http://unixpapa.com/js/querystring.html
 - http://code.stephenmorley.org/javascript/parsing-query-strings-for-get-data/
 - same origin: http://tools.ietf.org/html/rfc6454
 */


/*
combined files : 

m/form

*/
// alias from zepto.form
// TODO：补充测试用例
KISSY.add('m/form',function(S) {
	var $ = S.one;
	function serializeArray() {
		var result = [],
		el
		$([].slice.call(this)).each(function() {
			el = $(this);
			var type = el.attr('type');
			if (this.nodeName.toLowerCase() != 'fieldset' && ! this.disabled && type != 'submit' && type != 'reset' && type != 'button' && ((type != 'radio' && type != 'checkbox') || this.checked)) result.push({
				name: el.attr('name'),
				value: el.val()
			});
		});
		return result;
	}

	function serialize() {
		var result = [];
		this.serializeArray().each(function(elm) {
			result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value))
		});
		return result.join('&');
	}

	function submit(callback) {
		if (callback) this.on('submit', callback)
		else if (this.length) {
			var event = $.Event('submit');
			this.submit();
		}
		return this;
	}

	S.mix(S.node, {
		submit:submit,
		serializeArray:serializeArray,
		serialize:serialize
	});
});