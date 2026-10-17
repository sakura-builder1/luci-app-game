/* 怀旧游戏 · 页②：游戏库【嵌在 LuCI 里】打开 ✓ 不再把浏览器整个带走 ✓ */
'use strict';
'require view';
'require uci';

var VER = '20261017a';

return view.extend({
	load: function () { return uci.load('game'); },
	render: function () {
		var k = uci.get('game', 'main', 'upload_key') || '';
		/* ★ 参数：embed=1 让游戏库知道自己被内嵌 ✓ v= 缓存戳防吃旧文件 ✓ */
		var url = '/luci-static/game/?embed=1&v=20261017a'
			+ (k ? ('&k=' + encodeURIComponent(k)) : '');
		return E('iframe', {
			'id': 'rg-frame',
			'src': url,
			'style': 'width:100%;height:calc(100vh - 190px);min-height:520px;'
				+ 'border:0;border-radius:10px;display:block;background:transparent'
		});
	}
});
