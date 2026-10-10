/* 怀旧游戏 · 页②：直接把浏览器送到独立游戏站 */
'use strict';
'require view';
'require uci';

return view.extend({
	load: function () { return uci.load('game'); },
	render: function () {
		var k = uci.get('game', 'main', 'upload_key') || '';
		var url = '/luci-static/game/' + (k ? ('?k=' + encodeURIComponent(k)) : '');
		location.replace(url);
		return E('div', { 'style': 'padding:2em;text-align:center' }, [
			E('p', {}, [ _('正在进入游戏站…') ]),
			E('p', {}, [ E('a', { href: url }, [ _('如果没有自动跳转，点这里') ]) ])
		]);
	}
});
