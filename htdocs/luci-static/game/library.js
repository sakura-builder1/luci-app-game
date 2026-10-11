/* 游戏站 · 游戏库 */
(function () {
	var el = RG.el, S = { q: '', plat: '', view: 'all' };
	var games = [], names = {}, favs = {}, recent = {}, grid, chips, empty, stat;

	function display(g) { return names[g.path] || g.name; }

	function filtered() {
		return games.filter(function (g) {
			if (S.plat && g.platform !== S.plat) return false;
			if (S.view === 'fav' && !favs[g.path]) return false;
			if (S.view === 'recent' && !recent[g.path]) return false;
			if (S.q) {
				var t = (display(g) + ' ' + g.name + ' ' + (g.platname || '')).toLowerCase();
				if (t.indexOf(S.q) < 0) return false;
			}
			return true;
		}).sort(function (a, b) {
			if (S.view === 'recent') return (recent[b.path] || 0) - (recent[a.path] || 0);
			return display(a).localeCompare(display(b), 'zh-Hans-CN');
		});
	}

	function play(g) {
		RG.api('play', { p: g.path, n: display(g) });
		window.location.href = '/cgi-bin/game-player?p=' + encodeURIComponent(g.path)
			+ '&n=' + encodeURIComponent(display(g))
			+ '&c=' + encodeURIComponent(RG.core(g.platform))
			+ '&plat=' + encodeURIComponent(g.platform);
	}

	function ctxMenu(g, ev) {
		ev.preventDefault();
		var old = document.querySelector('.rg-ctx'); if (old) old.remove();
		var box = el('div', { class: 'rg-ctx', style: 'left:' + ev.clientX + 'px;top:' + ev.clientY + 'px' }, [
			el('button', { onclick: function () { box.remove(); play(g); } }, [ '▶ 开始游戏' ]),
			el('button', { onclick: function () { box.remove(); rename(g); } }, [ '✏️ 重命名' ]),
			el('button', { onclick: function () { box.remove(); toggleFav(g); } }, [ favs[g.path] ? '💔 取消收藏' : '❤️ 收藏' ]),
			el('button', { class: 'danger', onclick: function () { box.remove(); del(g); } }, [ '🗑 删除游戏' ])
		]);
		document.body.appendChild(box);
		var r = box.getBoundingClientRect();
		if (r.right > innerWidth) box.style.left = (innerWidth - r.width - 8) + 'px';
		if (r.bottom > innerHeight) box.style.top = (innerHeight - r.height - 8) + 'px';
		setTimeout(function () {
			document.addEventListener('click', function close() { box.remove(); document.removeEventListener('click', close); });
		}, 0);
	}

	function rename(g) {
		var cur = display(g);
		var v = prompt('新的显示名（留空恢复原名）', cur);
		if (v === null) return;
		RG.api('name_set', { p: g.path, d: v.trim() }).then(function (r) {
			if (r.ok) { if (v.trim()) names[g.path] = v.trim(); else delete names[g.path]; RG.toast('已改名 ✓'); paint(); }
			else RG.toast(r.msg || '失败');
		});
	}

	function toggleFav(g) {
		RG.api('fav_toggle', { p: g.path }).then(function (r) {
			if (!r.ok) return RG.toast(r.msg || '失败');
			if (favs[g.path]) delete favs[g.path]; else favs[g.path] = 1;
			RG.toast(favs[g.path] ? '已收藏 ❤️' : '已取消');
			paint(); chipsPaint();
		});
	}

	function del(g) {
		if (!confirm('确定删除「' + display(g) + '」？文件会从路由器上删掉。')) return;
		RG.api('rm', { p: g.path }).then(function (r) {
			if (!r.ok) return RG.toast(r.msg || '失败');
			games = games.filter(function (x) { return x.path !== g.path; });
			RG.toast('已删除 ✓'); paint(); chipsPaint();
		});
	}

	function card(g) {
		var h = RG.hue(g.platform);
		var cov = g.cover ? el('div', { class: 'rg-cov', style: 'background-image:url("' + RG.fs(g.cover) + '")' })
			: el('div', { class: 'rg-cov', style: 'background:linear-gradient(150deg,' + h[0] + ',' + h[1] + ')' }, [ g.platname || g.platform ]);
		var wrap = el('div', { class: 'rg-card', style: 'position:relative', title: display(g) }, [ cov ]);
		if (favs[g.path]) wrap.appendChild(el('div', { class: 'rg-heart' }, [ '❤️' ]));
		wrap.appendChild(el('div', { class: 'rg-meta' }, [
			el('div', { class: 'rg-name' }, [ display(g) ]),
			el('div', { class: 'rg-sub' }, [
				el('span', {}, [ g.platname || g.platform ]),
				el('span', {}, [ g.cheat === 'yes' ? '🪄 ' : '', RG.size(g.size) ])
			])
		]));
		wrap.addEventListener('click', function () { play(g); });
		wrap.addEventListener('contextmenu', function (ev) { ctxMenu(g, ev); });
		return wrap;
	}

	function paint() {
		var list = filtered();
		grid.innerHTML = '';
		if (!list.length) {
			empty.hidden = false;
			empty.innerHTML = games.length
				? '没有匹配的游戏 ✓ 换个关键词或分类试试'
				: '还没有游戏 ✓ 进「⚙ 设置」上传，或把 ROM 丢进 <code>roms/</code> 的分类文件夹里';
			return;
		}
		empty.hidden = true;
		list.forEach(function (g) { grid.appendChild(card(g)); });
		stat.textContent = list.length + ' / ' + games.length + ' 个游戏';
	}

	function chipsPaint() {
		var cnt = {};
		games.forEach(function (g) { cnt[g.platform] = (cnt[g.platform] || 0) + 1; });
		chips.innerHTML = '';
		function chip(k, label, n) {
			return el('button', { class: 'rg-chip' + (S.plat === k ? ' on' : ''), onclick: function () {
				S.plat = (S.plat === k) ? '' : k; chipsPaint(); paint();
			} }, [ label + (n ? ' ' + n : '') ]);
		}
		chips.appendChild(chip('', '全部', games.length));
		Object.keys(RG.P).forEach(function (k) { if (cnt[k]) chips.appendChild(chip(k, RG.P[k], cnt[k])); });
	}

	document.addEventListener('DOMContentLoaded', function () {
		grid = document.getElementById('rg-grid');
		chips = document.getElementById('rg-chips');
		empty = document.getElementById('rg-empty');
		stat = document.getElementById('rg-stat');

		var urlKey = new URLSearchParams(location.search).get('k');
		if (urlKey) RG.setKey(urlKey);

		document.getElementById('rg-q').addEventListener('input', function (e) { S.q = e.target.value.toLowerCase(); paint(); });
		document.getElementById('rg-refresh').addEventListener('click', function () { location.reload(); });
		document.getElementById('rg-key').addEventListener('click', function () { document.getElementById('rg-keybox').hidden = false; });
		document.getElementById('rg-keyclose').addEventListener('click', function () { document.getElementById('rg-keybox').hidden = true; });
		document.getElementById('rg-keysave').addEventListener('click', function () {
			RG.setKey(document.getElementById('rg-keyin').value.trim());
			document.getElementById('rg-keybox').hidden = true;
			RG.toast('口令已保存 ✓'); load();
		});

		Array.prototype.forEach.call(document.querySelectorAll('.rg-tab'), function (t) {
			t.addEventListener('click', function () {
				Array.prototype.forEach.call(document.querySelectorAll('.rg-tab'), function (x) { x.classList.remove('on'); });
				t.classList.add('on'); S.view = t.getAttribute('data-view'); paint();
			});
		});

		load();
	});

	function load() {
		Promise.all([ RG.api('games'), RG.api('names'), RG.api('favs'), RG.api('recent'), RG.api('storage') ])
			.then(function (r) {
				games = (r[0] && r[0].games) || [];
				names = {}; (r[1] && r[1].names || []).forEach(function (n) { names[n.path] = n.display; });
				favs = {}; (r[2] && r[2].favs || []).forEach(function (n) { favs[n.path] = 1; });
				recent = {}; (r[3] && r[3].recent || []).forEach(function (n) { recent[n.path] = n.at; });
				var sg = r[4] || {};
				document.getElementById('rg-stat').textContent =
					games.length + ' 个游戏　剩余 ' + (sg.free || '?');
				chipsPaint(); paint();
			});
	}
})();
