/* 游戏站 · 播放器 */
(function () {
	var Q = new URLSearchParams(location.search);
	var PATH = Q.get('p') || '';
	var NAME = Q.get('n') || '游戏';
	var CORE = Q.get('c') || 'nes';
	var PLAT = Q.get('plat') || CORE;
	var LOCAL = 'fs/assets/';   /* 只走本地 ✓ 不联网 ✓ */
	var el = RG.el, emu = null, ready = false;

	var ROMURL = 'fs/roms/' + PATH.split('/').map(encodeURIComponent).join('/');
	document.title = NAME + ' · 怀旧游戏站';
	document.getElementById('b-title').textContent = NAME;

	var splash = document.getElementById('splash');
	function splashMsg(a, b) {
		document.getElementById('splash-msg').textContent = a;
		document.getElementById('splash-sub').textContent = b || '';
	}
	function hideSplash() { splash.classList.add('hide'); }
	function failSplash(msg) {
		splashMsg('😢 模拟器没能启动', msg || '');
		document.getElementById('splash-sub').innerHTML =
			'常见原因：外网不通 / CDN 被墙 ✗ → 请在「设置」里打开发资源包下载，或换个网络再试 ✓';
	}

	/* ---------------- 面板开关 ---------------- */
	function panel(id, force) {
		var p = document.getElementById(id);
		var on = (force != null) ? force : !p.classList.contains('open');
		['p-cheat', 'p-keys', 'p-pad'].forEach(function (x) { document.getElementById(x).classList.remove('open'); });
		if (on) p.classList.add('open');
		return on;
	}
	document.addEventListener('click', function (e) {
		var c = e.target.closest ? e.target.closest('[data-close]') : null;
		if (c) panel(c.closest('.panel').id, false);
	});
	document.getElementById('b-cheat').onclick = function () { if (panel('p-cheat')) loadCheats(); };
	document.getElementById('b-keys').onclick = function () { panel('p-keys'); };
	document.getElementById('b-pad').onclick = function () { panel('p-pad'); startPadPoll(); };
	document.getElementById('b-back').onclick = function () { location.href = 'index.html'; };
	document.getElementById('b-full').onclick = toggleFull;

	function toggleFull() {
		var d = document;
		if (!d.fullscreenElement) {
			(d.documentElement.requestFullscreen || function () {}).call(d.documentElement);
			if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
		} else {
			d.exitFullscreen.call(d);
		}
	}

	/* ---------------- 启动模拟器 ---------------- */
	function pickBase() {
		return fetch(LOCAL + 'loader.js', { method: 'HEAD', cache: 'no-store' })
			.then(function (r) { return r.ok ? LOCAL : null; })
			.catch(function () { return null; });
	}

	function boot(base) {
		splashMsg('正在加载模拟器…', '使用路由器本地资源包 ✓（纯本地 · 不联网）');

		window.EJS_player = '#canvas';
		window.EJS_core = CORE;
		window.EJS_gameUrl = ROMURL;
		window.EJS_gameName = NAME;
		window.EJS_gameID = 'rg_' + PATH.replace(/[^A-Za-z0-9]/g, '_').slice(-60);
		window.EJS_pathtodata = base;
		window.EJS_startOnLoaded = true;
		window.EJS_volume = 0.8;
		window.EJS_backgroundColor = '#100d16';
		window.EJS_color = '#e07aa6';
		window.EJS_lang = 'zh-CN';
		if (PLAT === 'psx') window.EJS_biosUrl = 'fs/roms/bios/scph5501.bin';
		if (PLAT === 'segaCD') window.EJS_biosUrl = 'fs/roms/bios/bios_CD_U.bin';

		var s = document.createElement('script');
		s.src = base + 'loader.js';
		s.onload = function () { watchEmu(base); };
		s.onerror = function () {
			failSplash('资源包加载失败 ✗ 文件可能不完整，请重新下载资源包 ✓');
		};
		document.head.appendChild(s);
	}

	function watchEmu(base) {
		var t0 = Date.now();
		var iv = setInterval(function () {
			if (window.EJS_emulator) {
				emu = window.EJS_emulator;
				ready = true;
				clearInterval(iv);
				hideSplash();
				RG.toast('🕹 开始吧：' + NAME);
			} else if (Date.now() - t0 > 45000) {
				clearInterval(iv);
				failSplash('超时了（45 秒）✗ 本地资源包可能不完整');
			}
		}, 300);
	}

	/* ---------------- 即时存档 ---------------- */
	function gm() {
		return (emu && emu.gameManager) ? emu.gameManager
			: (window.EJS_emulator && window.EJS_emulator.gameManager ? window.EJS_emulator.gameManager : null);
	}

	function saveState() {
		if (!gm()) return RG.toast('模拟器还没准备好 ✗');
		var slot = prompt('存到哪个槽位？（1-5）', '1');
		if (!slot || !/^[1-5]$/.test(slot)) return;
		Promise.resolve(gm().getState()).then(function (data) {
			RG.toast('💾 正在写入路由器…');
			return fetch('/cgi-bin/game-api?m=state_put&p=' + encodeURIComponent(PATH)
				+ '&slot=' + slot + '&k=' + encodeURIComponent(RG.key()),
				{ method: 'POST', body: data, cache: 'no-store' });
		}).then(function (r) { return r.json(); }).then(function (r) {
			RG.toast(r && r.ok ? ('✓ ' + (r.msg || '已存档')) : '存档失败 ✗');
		}).catch(function () { RG.toast('存档失败 ✗（可能这个核心不支持）'); });
	}

	function loadState() {
		if (!gm()) return RG.toast('模拟器还没准备好 ✗');
		var slot = prompt('读取哪个槽位？（1-5）', '1');
		if (!slot || !/^[1-5]$/.test(slot)) return;
		fetch('/cgi-bin/game-api?m=state_get&p=' + encodeURIComponent(PATH) + '&slot=' + slot, { cache: 'no-store' })
			.then(function (r) { return r.arrayBuffer(); })
			.then(function (buf) {
				if (!buf || buf.byteLength < 100) return RG.toast('这个槽位没有存档 ✗');
				try { gm().loadState(new Uint8Array(buf)); RG.toast('✓ 已读档'); }
				catch (e) { RG.toast('读档失败 ✗（可能这个核心不支持）'); }
			}).catch(function () { RG.toast('读档失败 ✗'); });
	}
	document.getElementById('b-save').onclick = saveState;
	document.getElementById('b-load').onclick = loadState;

	/* ---------------- 金手指 ---------------- */
	function parseCht(txt) {
		var map = {}, i;
		(txt || '').split('\n').forEach(function (line) {
			var m = line.match(/^\s*cheat(\d+)_(desc|code|enable)\s*=\s*"?([^"\n]*)"?\s*$/);
			if (!m) return;
			i = 'c' + m[1];
			map[i] = map[i] || { id: i, idx: +m[1], desc: '', code: '', enable: true };
			if (m[2] === 'enable') map[i].enable = /^true|1$/i.test(m[3].trim());
			else map[i][m[2]] = m[3].trim();
		});
		return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.idx - b.idx; });
	}

	function buildCht(items) {
		var out = ['cheats = ' + items.length, ''];
		items.forEach(function (c, n) {
			out.push('cheat' + n + '_desc = "' + (c.desc || '') + '"');
			out.push('cheat' + n + '_code = "' + (c.code || '') + '"');
			out.push('cheat' + n + '_enable = ' + (c.enable ? 'true' : 'false'));
			out.push('');
		});
		return out.join('\n');
	}

	var cheats = [];

	function paintCheats() {
		var box = document.getElementById('cheat-list');
		box.innerHTML = '';
		if (!cheats.length) {
			box.appendChild(el('div', { class: 'rg-dim', style: 'font-size:.88em;padding:.4em 0' },
				[ '这个游戏还没有金手指 ✓ 可以下面手动添加 ✓ 或把现成的 .cht 放进 cheats/ 目录 ✓' ]));
			return;
		}
		cheats.forEach(function (c, n) {
			var cb = el('input', { type: 'checkbox' });
			cb.checked = c.enable;
			cb.onchange = function () { cheats[n].enable = cb.checked; };
			box.appendChild(el('div', { class: 'cheat' }, [
				cb,
				el('div', { class: 'c-main' }, [
					el('div', { class: 'c-desc' }, [ c.desc || ('金手指 ' + (n + 1)) ]),
					el('div', { class: 'c-code' }, [ c.code || '' ])
				]),
				el('button', { class: 'c-del', onclick: function () { cheats.splice(n, 1); paintCheats(); } }, [ '🗑' ])
			]));
		});
	}

	function loadCheats() {
		RG.api('cheat_get', { p: PATH }).then(function (r) {
			cheats = parseCht(r.text || '');
			paintCheats();
		});
	}

	document.getElementById('ch-add').onclick = function () {
		var d = document.getElementById('ch-desc').value.trim();
		var c = document.getElementById('ch-code').value.trim();
		if (!c) return RG.toast('代码不能为空 ✗');
		cheats.push({ desc: d, code: c, enable: true });
		document.getElementById('ch-desc').value = '';
		document.getElementById('ch-code').value = '';
		paintCheats();
	};

	document.getElementById('ch-save').onclick = function () {
		RG.post('cheat_set', { p: PATH }, buildCht(cheats)).then(function (r) {
			RG.toast(r && r.ok ? '✓ 金手指已保存（重新载入后生效）' : ((r && r.msg) || '保存失败 ✗ 检查口令'));
		});
	};
	document.getElementById('ch-reload').onclick = function () { location.reload(); };

	/* ---------------- 手柄检测 ---------------- */
	var padTimer = null;
	function startPadPoll() {
		if (padTimer) return;
		padTimer = setInterval(paintPads, 100);
	}
	function paintPads() {
		var pads = navigator.getGamepads ? navigator.getGamepads() : [];
		var vis = document.getElementById('pad-vis'), st = document.getElementById('pad-status');
		var list = [];
		for (var i = 0; i < pads.length; i++) if (pads[i]) list.push(pads[i]);
		if (!list.length) {
			st.textContent = '没检测到手柄 ✗ 插好后随便按一个键唤醒它 ✓（有些手柄要先按灯亮 ✓）';
			vis.innerHTML = '';
			return;
		}
		st.textContent = '✓ 已连接 ' + list.length + ' 个手柄' + (list.length > 1 ? '（支持双打 ✓）' : '');
		vis.innerHTML = '';
		list.forEach(function (p) {
			var box = el('div', { style: 'margin-bottom:.9em' }, [
				el('div', { class: 'pad-name' }, [ '#' + p.index + ' ' + (p.id || '手柄').slice(0, 40) ])
			]);
			var btns = el('div', { class: 'pad-btns' });
			p.buttons.forEach(function (b, n) {
				btns.appendChild(el('span', { class: 'pad-b on'.replace(' on', b.pressed ? ' on' : '') }, [ String(n) ]));
			});
			box.appendChild(btns);
			var axes = el('div', { class: 'pad-ax' });
			p.axes.forEach(function (a, n) {
				axes.appendChild(el('span', {}, [ '轴', el('b', {}, [ String(n) ]), '=' + a.toFixed(2) ]));
			});
			box.appendChild(axes);
			vis.appendChild(box);
		});
	}
	window.addEventListener('gamepadconnected', function (e) {
		RG.toast('🎮 手柄已连接：' + (e.gamepad.id || '').slice(0, 30));
		startPadPoll();
	});

	/* ---------------- 快捷键 ---------------- */
	document.addEventListener('keydown', function (e) {
		if (e.key === 'F2') { e.preventDefault(); saveState(); }
		else if (e.key === 'F3') { e.preventDefault(); loadState(); }
		else if (e.key === 'F4') { e.preventDefault(); if (panel('p-cheat')) loadCheats(); }
		else if (e.key === 'F8') { e.preventDefault(); toggleFull(); }
	});

	/* ---------------- go ---------------- */
	pickBase().then(function (base) {
		if (!base) {
			splashMsg('没有找到模拟器资源包 ✗',
				'本插件【纯本地运行】✓ 不联网 ✓ 请先到「设置」页点「下载 / 更新资源包」✓');
			document.getElementById('splash-sub').innerHTML =
				'<a href="/cgi-bin/luci/admin/services/game/settings">→ 去设置页下载资源包</a>';
			return;
		}
		boot(base);
	});
	RG.api('play', { p: PATH, n: NAME });
})();
