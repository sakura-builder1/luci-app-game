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
var callAssets  = rpc.declare({ object: 'luci.sakura_game', method: 'assets_fetch' });
var callAssetsSt= rpc.declare({ object: 'luci.sakura_game', method: 'assets_status' });
var callKey     = rpc.declare({ object: 'luci.sakura_game', method: 'key', params: [ 'action' ] });

/* ★ 只列常用平台 ✓ 其余平台（SMS/GG/SegaCD/32X/雅达利/Lynx/PCE/掌上蛇/WonderSwan/VB）
   插件仍然支持 ✗ 已有游戏照常显示 ✓ 只是上传时不再列出，免得眼花 ✓ */
var PLATFORMS = [
	['nes',_('FC 红白机')],['snes',_('SFC 超任')],['gb',_('GB 掌机')],['gbc','GBC'],['gba','GBA'],
	['nds','NDS'],['n64','N64'],['psx','PS1'],['segaMD',_('MD 世嘉')],['arcade',_('街机')],['bios',_('BIOS 文件（PS1 等）')]
];

function doUpload(file, plat, key, bar, log, btn) {
	var xhr = new XMLHttpRequest();
	var url = '/cgi-bin/game-upload?k=' + encodeURIComponent(key)
		+ '&dir=' + encodeURIComponent(plat)
		+ '&name=' + encodeURIComponent(file.name);

	btn.disabled = true;
	log.appendChild(E('div', {}, [ _('⏳ 上传中：') + file.name + '（' + (file.size / 1048576).toFixed(1) + ' MB）' ]));

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
		log.appendChild(E('div', {}, [ _('❌ 网络错误') ]));
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

		m = new form.Map('game', _('🎮 怀旧游戏 · 设置'),
			_('让路由器变成怀旧游戏站：游戏放在路由器上 ✓ 手机 / 电脑 / 平板打开浏览器就能玩 ✓'));

		s = m.section(form.NamedSection, 'main', 'game', _('基本设置'));
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('启用插件'), _('关闭后游戏站不可用，ROM 目录也不再映射到 Web'));
		o.default = '1'; o.rmempty = false;

		o = s.option(form.Flag, 'show_covers', _('显示封面图'), _('把同名图片放进 covers/ 目录即作为封面'));
		o.default = '1';

		o = s.option(form.Flag, 'use_local_assets', _('使用本地模拟器资源包'),
			_('优先用路由器本地的模拟器核心 ✓ 内网快 + 断网也能玩 ✓ 缺核心时自动回退外网 CDN'));
		o.default = '1';

		o = s.option(form.Value, 'game_dir', _('数据根目录'), _('游戏 / 封面 / 金手指 / 存档都放这里，建议放大容量分区'));
		o.default = '/opt/game'; o.rmempty = false;

		o = s.option(form.Value, 'asset_source', _('外网资源地址（CDN）'), _('本地没有的机型从这里加载'));
		o.default = 'https://cdn.emulatorjs.org/stable/data/';

		s = m.section(form.NamedSection, 'main', 'game', _('存储情况'));
		s.anonymous = true;
		s.description = _('游戏 ') + (sg.roms || '0') + _('　资源包 ') + (sg.assets || '0')
			+ _('　存档 ') + (sg.saves || '0') + _('　剩余 ') + (sg.free || '?') + ' / ' + (sg.total || '?');

		s = m.section(form.NamedSection, 'main', 'game', _('模拟器资源包（本地化）'));
		s.anonymous = true;
		s.description = _('模拟器【纯本地运行】✓ 不联网 ✓ 首次装完必须下载一次资源包 ✓ 之后永久内网离线可玩 ✓（供 FC/SFC/GBA/MD 等机型，按需下载 ✓）');
		o = s.option(form.DummyValue, '_assets', _('资源包状态'));
		o.cfgvalue = function () {
			var info = E('div', { 'style': 'line-height:1.9;font-size:.9em' }, [ _('读取中…') ]);
			var btn = E('button', { 'class': 'btn cbi-button cbi-button-action' }, [ _('⬇ 下载 / 更新资源包（首次必做 ✓）') ]);
			btn.addEventListener('click', function () {
				btn.disabled = true;
				callAssets().then(function (r) {
					ui.addNotification(null, E('p', {}, [ (r && r.msg) || _('已开始下载') ]), 'info');
					setTimeout(function () { btn.disabled = false; poll(); }, 2000);
				});
			});
			function paint(st) {
				st = st || {};
				var map = { none: _('还没下载过'), listing: _('正在取清单'), running: _('下载中'), done: _('已完成 ✓'), failed: _('失败 ✗') };
				info.innerHTML = '';
				info.appendChild(E('div', {}, [ _('状态：') + (map[st.state] || st.state || _('未知')) ]));
				if (st.total) info.appendChild(E('div', {}, [ _('进度：') + (st.done || 0) + ' / ' + st.total ]));
				if (st.current) info.appendChild(E('div', { 'style': 'color:#8a8a8a' }, [ _('当前：') + st.current ]));
				info.appendChild(E('div', { 'style': 'color:#8a8a8a' }, [ _('已占用：') + (st.size || '0') ]));
			}
			function poll() { callAssetsSt().then(paint); }
			poll();
			setInterval(poll, 3000);
			return E('div', {}, [ info, E('div', { 'style': 'margin-top:.7em' }, [ btn ]) ]);
		};

		s = m.section(form.NamedSection, 'main', 'game', _('游戏站'));
		s.anonymous = true;
		s.description = _('保存并应用后，进入游戏站开始玩 ✓');
		o = s.option(form.DummyValue, '_station', _('打开游戏站'));
		o.cfgvalue = function () {
			var wrap = E('div', {});
			wrap.appendChild(E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'click': function () { window.open('/luci-static/game/' + (key ? ('?k=' + encodeURIComponent(key)) : ''), '_blank'); }
			}, [ _('🎮 进入游戏站（新窗口）') ]));
			return wrap;
		};

		s = m.section(form.NamedSection, 'main', 'game', _('上传游戏'));
		s.anonymous = true;
		s.description = _('支持大文件流式上传 ✓ ZIP 自动解压 ✓ 也可以直接把文件丢进目录 ✓');

		var bar = E('div', { 'style': 'height:8px;border-radius:6px;background:rgba(128,128,128,.25);overflow:hidden;margin-top:.6em' }, [
			E('div', { id: 'up-bar', 'style': 'height:100%;width:0;background:#d878a0;transition:width .2s' })
		]);
		var log = E('div', { id: 'up-log', 'style': 'font-size:.85em;color:#8a8a8a;margin-top:.5em;line-height:1.8' }, []);

		o = s.option(form.DummyValue, '_upload', _('上传文件'));
		o.cfgvalue = function () {
			var sel = E('select', { 'class': 'cbi-input-select', 'change': function (ev) { curPlat = ev.target.value; } },
				PLATFORMS.map(function (p) { return E('option', { value: p[0] }, [ p[1] ]); }));
			var inp = E('input', { type: 'file', 'style': 'margin-left:.5em' });
			var btn = E('button', { 'class': 'btn cbi-button cbi-button-action', 'style': 'margin-left:.5em' }, [ _('开始上传') ]);

			btn.addEventListener('click', function () {
				var f = inp.files && inp.files[0];
				if (!f) { ui.addNotification(null, E('p', {}, [ _('请先选文件') ]), 'warning'); return; }
				doUpload(f, curPlat, key, bar, log, btn);
			});

			return E('div', {}, [
				E('div', {}, [ _('放到哪个平台：'), sel ]),
				E('div', { 'style': 'margin-top:.6em' }, [ inp, btn ]),
				bar, log
			]);
		};

		/* ---------------- 上传口令保护（可选 ✓ 默认关闭 ✓）---------------- */
		s = m.section(form.NamedSection, 'main', 'game', _('上传口令保护（可选）'));
		s.anonymous = true;
		s.description = _('默认【关闭】✓ 内网打开就能用 ✓ 开启后：上传 / 存档 / 改名 / 收藏 都需要口令 ✓ 多人共用路由器时防乱动 ✓');

		o = s.option(form.DummyValue, '_keybox', _('保护状态'));
		o.cfgvalue = function () {
			var wrap = E('div', {});
			var state = E('div', { 'style': 'min-height:3.2em;line-height:1.9' }, [ _('读取中…') ]);
			var show = function (st) {
				while (state.firstChild) state.removeChild(state.firstChild);
				st = st || {};
				if (st.enabled) {
					state.appendChild(E('div', {}, [ _('🔒 已开启：写操作需要口令') ]));
					state.appendChild(E('div', {}, [
						_('当前口令：'),
						E('code', { 'style': 'background:rgba(128,128,128,.18);padding:.15em .5em;border-radius:4px;user-select:all' }, [ st.key || '' ]),
						E('button', { 'class': 'btn cbi-button', 'style': 'margin-left:.6em',
							'click': function () {
								var t = document.createElement('textarea');
								t.value = st.key || ''; document.body.appendChild(t); t.select();
								try { document.execCommand('copy'); } catch (e) {}
								document.body.removeChild(t);
								ui.addNotification(null, E('p', {}, [ _('口令已复制 ✓') ]), 'info');
							}
						}, [ _('📋 复制') ])
					]));
					state.appendChild(E('div', { 'style': 'font-size:.85em;color:#8a8a8a' },
						[ _('提示：从本页「进入游戏站」按钮打开会自动带上口令 ✓ 直接输网址则读操作可用、写操作会被拦 ✓') ]));
				} else {
					state.appendChild(E('div', {}, [ _('🔓 已关闭：内网直接可用，无需口令 ✓') ]));
				}
			};
			var act = function (a) {
				callKey(a).then(function (r) {
					if (a === 'enable' || a === 'disable' || a === 'regen')
						ui.addNotification(null, E('p', {}, [ (r && r.msg) || _('已更新 ✓') ]), 'info');
					show(r);
					if (a === 'enable' || a === 'disable' || a === 'regen') setTimeout(function () { location.reload(); }, 900);
				}).catch(function () { state.appendChild(E('div', {}, [ _('读取失败 ✗') ])); });
			};
			wrap.appendChild(state);
			wrap.appendChild(E('div', { 'style': 'margin-top:.5em' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': function () { act('enable'); } }, [ _('🔒 开启保护（自动生成口令）') ]),
				' ',
				E('button', { 'class': 'btn cbi-button', 'click': function () { act('regen'); } }, [ _('🔄 重新生成口令') ]),
				' ',
				E('button', { 'class': 'btn cbi-button', 'click': function () { act('disable'); } }, [ _('🔓 关闭保护') ])
			]));
			act('');
			return wrap;
		};

		return m.render();
		/* ★ 资源包失败项：列出来 + 说明可重试 ✓ */
		if (r && r.failcount > 0) {
			info.appendChild(E('div', { 'style': 'margin-top:.4em;color:#c33;font-size:.85em' },
				[ _('✗ 失败 ') + r.failcount + _(' 个 — 再点上面的按钮即可重试 ✓ 已下好的会自动跳过 ✓') ]));
			var box = E('div', { 'style': 'font-size:.78em;max-height:9em;overflow:auto;background:rgba(0,0,0,.06);padding:.4em;border-radius:4px;margin-top:.3em' });
			(r.fails || []).slice(0, 300).forEach(function (f) { box.appendChild(E('div', {}, [ f ])); });
			info.appendChild(box);
		}

	}
});
