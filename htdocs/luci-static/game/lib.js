/* 游戏站公共层：接口调用 / 工具 / 平台定义 */
var RG = (function () {
	var FSPATH = 'fs/';

	var P = {
		nes: 'FC 红白机', snes: 'SFC 超任', gb: 'GB 掌机', gbc: 'GBC', gba: 'GBA',
		nds: 'NDS', n64: 'N64', psx: 'PS1', segaMD: 'MD 世嘉', segaMS: 'SMS',
		segaGG: 'GG', segaCD: 'Sega CD', sega32x: '32X', atari2600: '雅达利 2600',
		atari7800: '雅达利 7800', lynx: 'Atari Lynx', pce: 'PCE 引擎', ngp: '掌上蛇',
		ws: 'WonderSwan', vb: 'Virtual Boy', arcade: '街机', mame2003: 'MAME 2003'
	};
	var CORE = { gbc: 'gb', mame2003: 'arcade' };  /* 其余同名 */
	var HUE = {
		nes: ['#c62828', '#7b1fa2'], snes: ['#6a1b9a', '#283593'], gb: ['#455a64', '#1c313a'],
		gbc: ['#5d4037', '#3e2723'], gba: ['#4527a0', '#311b92'], nds: ['#00695c', '#004d40'],
		n64: ['#0277bd', '#01579b'], psx: ['#283593', '#1a237e'], segaMD: ['#1565c0', '#0d47a1'],
		segaMS: ['#0d47a1', '#002171'], segaGG: ['#00838f', '#006064'], segaCD: ['#ad1457', '#880e4f'],
		sega32x: ['#6d4c41', '#3e2723'], atari2600: ['#795548', '#4e342e'],
		atari7800: ['#5d4037', '#3e2723'], lynx: ['#37474f', '#263238'], pce: ['#ef6c00', '#e65100'],
		ngp: ['#33691e', '#1b5e20'], ws: ['#455a64', '#263238'], vb: ['#b71c1c', '#7f0000'],
		arcade: ['#e65100', '#bf360c'], mame2003: ['#e65100', '#bf360c']
	};

	function api(m, params) {
		var q = '?m=' + encodeURIComponent(m);
		params = params || {};
		Object.keys(params).forEach(function (k) {
			if (params[k] != null) q += '&' + k + '=' + encodeURIComponent(params[k]);
		});
		return fetch('/cgi-bin/game-api' + q, { cache: 'no-store' }).then(function (r) {
			return r.json().catch(function () { return {}; });
		}).catch(function () { return {}; });
	}

	function post(m, params, body) {
		var q = '?m=' + encodeURIComponent(m);
		params = params || {};
		Object.keys(params).forEach(function (k) {
			if (params[k] != null) q += '&' + k + '=' + encodeURIComponent(params[k]);
		});
		return fetch('/cgi-bin/game-api' + q, { method: 'POST', body: body || '', cache: 'no-store' })
			.then(function (r) { return r.json().catch(function () { return {}; }); })
			.catch(function () { return {}; });
	}

	function fs(p) { return FSPATH + String(p).split('/').map(encodeURIComponent).join('/'); }
	function core(plat) { return CORE[plat] || plat; }
	function hue(plat) { return HUE[plat] || ['#7e57c2', '#4527a0']; }

	function size(b) {
		b = +b || 0;
		if (b < 1024) return b + ' B';
		if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
		if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
		return (b / 1073741824).toFixed(2) + ' GB';
	}

	function toast(msg) {
		var t = document.createElement('div');
		t.className = 'rg-toast';
		t.textContent = msg;
		document.body.appendChild(t);
		setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 1600);
		setTimeout(function () { t.remove(); }, 2100);
	}

	function el(tag, attrs, kids) {
		var e = document.createElement(tag);
		attrs = attrs || {};
		Object.keys(attrs).forEach(function (k) {
			if (k === 'class') e.className = attrs[k];
			else if (k === 'style') e.style.cssText = attrs[k];
			else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
			else if (k === 'html') e.innerHTML = attrs[k];
			else e.setAttribute(k, attrs[k]);
		});
		(kids || []).forEach(function (c) {
			if (c == null) return;
			e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
		});
		return e;
	}

	return { api: api, post: post, fs: fs, core: core, hue: hue, size: size,
		toast: toast, el: el, P: P, FSPATH: FSPATH };
})();
