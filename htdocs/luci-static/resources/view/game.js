/* 怀旧游戏 · 页① 设置 */
'use strict';
'require view';
'require form';
'require rpc';
'require uci';
'require ui';
'require dom';

var callStatus  = rpc.declare({ object: 'luci.sakura_game', method: 'status' });
var callStorage = rpc.declare({ object: 'luci.sakura_game', method: 'storage' });
var callRemount = rpc.declare({ object: 'luci.sakura_game', method: 'remount' });

var PLATFORMS = [
	['nes','FC 红白机'],['snes','SFC 超任'],['gb','GB 掌机'],['gbc','GBC'],['gba','GBA'],
	['nds','NDS'],['n64','N64'],['psx','PS1'],['segaMD','MD 世嘉'],['segaMS','SMS'],
	['segaGG','GG'],['segaCD','Sega CD'],['sega32x','32X'],['atari2600','雅达利 2600'],
	['atari7800','雅达利 7800'],['lynx','Atari Lynx'],['pce','PCE 引擎'],['ngp','掌上蛇'],
	['ws','WonderSwan'],['vb','Virtual Boy'],['arcade','街机'],['bios','BIOS 文件（PS1 等）']
];

function doUpload(file, plat, key, bar, log, btn) {
	var xhr = new XMLHttpRequest();
	var url = '/cgi-bin/game-upload?key=' + encodeURIComponent(key)
		+ '&dir=' + encodeURIComponent(plat)
		+ '&name=' + encodeURIComponent(file.name);

	btn.disabled = true;
	log.appendChild(E('div', {}, [ '⏳ 上传中：' + file.name + '（' + (file.size / 1048576).toFixed(1) + ' MB）' ]));

	xhr.upload.onprogress = function (ev) {
		if (ev.lengthComputable) bar.firstChild.style.width = (ev.loaded / ev.total * 100).toFixed(1) + '%';
	};
	xhr.onload = function () {
		btn.disabled = false;
		bar.firstChild.style.width = '100%';
		var r = {};
		try { r = JSON.parse(xhr.responseText); } catch (e) {}
		log.appendChild(E('div', {}, [ (r.ok ? '✅ ' : '❌ ') + (r.msg || xhr.status) ]));
		if (r.ok) ui.addNotification(null, E('p', {}, [ r.msg ]), 'info');
	};
	xhr.onerror = function () {
		btn.disabled = false;
		log.appendChild(E('div', {}, [ '❌ 网络错误' ]));
	};
	xhr.open('POST', url, true);
	xhr.send(file);
}

return view.extend({
	load: function () {
		return Promise.all([ uci.load('game'), callStatus(), callStorage() ]);
	},

	render: function (data) {
		var st = data[1] || {}, sg = data[2] || {};
		var key = uci.get('game', 'main', 'upload_key') || '';
		var m, s, o, curPlat = 'nes';

		m = new form.Map('game', '🎮 怀旧游戏 · 设置',
			'让路由器变成怀旧游戏站：游戏放在路由器上 ✓ 手机 / 电脑 / 平板打开浏览器就能玩 ✓');

		s = m.section(form.NamedSection, 'main', 'game', '基本设置');
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', '启用插件', '关闭后游戏站不可用，ROM 目录也不再映射到 Web');
		o.default = '1'; o.rmempty = false;

		o = s.option(form.Flag, 'show_covers', '显示封面图', '把同名图片放进 covers/ 目录即作为封面');
		o.default = '1';

		o = s.option(form.Flag, 'use_local_assets', '使用本地模拟器资源包',
			'优先用路由器本地的模拟器核心 ✓ 内网快 + 断网也能玩 ✓ 缺核心时自动回退外网 CDN');
		o.default = '1';

		o = s.option(form.Value, 'game_dir', '数据根目录', '游戏 / 封面 / 金手指 / 存档都放这里，建议放大容量分区');
		o.default = '/opt/game'; o.rmempty = false;

		o = s.option(form.Value, 'asset_source', '外网资源地址（CDN）', '本地没有的机型从这里加载');
		o.default = 'https://cdn.emulatorjs.org/stable/data/';

		s = m.section(form.NamedSection, 'main', 'game', '存储情况');
		s.anonymous = true;
		s.description = '游戏 ' + (sg.roms || '0') + '　资源包 ' + (sg.assets || '0')
			+ '　存档 ' + (sg.saves || '0') + '　剩余 ' + (sg.free || '?') + ' / ' + (sg.total || '?');

		s = m.section(form.NamedSection, 'main', 'game', '游戏站');
		s.anonymous = true;
		s.description = '保存并应用后，进入游戏站开始玩 ✓';
		o = s.option(form.DummyValue, '_station', '打开游戏站');
		o.cfgvalue = function () {
			var wrap = E('div', {});
			wrap.appendChild(E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'click': function () { window.open('/luci-static/game/', '_blank'); }
			}, [ '🎮 进入游戏站（新窗口）' ]));
			return wrap;
		};

		s = m.section(form.NamedSection, 'main', 'game', '上传游戏');
		s.anonymous = true;
		s.description = '支持大文件流式上传 ✓ ZIP 自动解压 ✓ 也可以直接把文件丢进目录 ✓';

		var bar = E('div', { 'style': 'height:8px;border-radius:6px;background:rgba(128,128,128,.25);overflow:hidden;margin-top:.6em' }, [
			E('div', { id: 'up-bar', 'style': 'height:100%;width:0;background:#d878a0;transition:width .2s' })
		]);
		var log = E('div', { id: 'up-log', 'style': 'font-size:.85em;color:#8a8a8a;margin-top:.5em;line-height:1.8' }, []);

		o = s.option(form.DummyValue, '_upload', '上传文件');
		o.cfgvalue = function () {
			var sel = E('select', { 'class': 'cbi-input-select', 'change': function (ev) { curPlat = ev.target.value; } },
				PLATFORMS.map(function (p) { return E('option', { value: p[0] }, [ p[1] ]); }));
			var inp = E('input', { type: 'file', 'style': 'margin-left:.5em' });
			var btn = E('button', { 'class': 'btn cbi-button cbi-button-action', 'style': 'margin-left:.5em' }, [ '开始上传' ]);

			btn.addEventListener('click', function () {
				var f = inp.files && inp.files[0];
				if (!f) { ui.addNotification(null, E('p', {}, [ '请先选文件' ]), 'warning'); return; }
				doUpload(f, curPlat, key, bar, log, btn);
			});

			return E('div', {}, [
				E('div', {}, [ '放到哪个平台：', sel ]),
				E('div', { 'style': 'margin-top:.6em' }, [ inp, btn ]),
				bar, log
			]);
		};

		return m.render();
	}
});
