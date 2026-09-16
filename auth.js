/*!
 * auth.js · 聿集收纳速算系统 — 访问密码门 + 密码管理（授权/可修改）
 * ------------------------------------------------------------------
 * 机制：
 *  ① 主密码（出厂）以「盐 + 5000 次迭代 SHA-256」哈希写在文件里（FACTORY_HASH），源码不含明文
 *  ② 本机授权配置存 localStorage：可改主密码、可增发/停用「成员密码」（发给同事）
 *  ③ 任何密码变更都必须先输入一个「当前有效的密码」授权（已解锁 ≠ 有权限改）
 *  ④ 换密码全员统一：node tools/set-password.mjs 新密码 → 重新打包/部署（改的是文件里的 FACTORY_HASH）
 *
 * ⚠ 诚实边界：纯前端。懂技术的人查看源码可绕过；本机改动只在本设备生效（清缓存即回到出厂密码）。
 *   用途是挡住随手转发、保护方案数据，不是银行级安全。
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ===== 可调参数 =====
  var FACTORY_HASH = '1a95d9da59ca549065d4c4599f300828a903da7f88b43b256434ef355e80a56c';   // 出厂主密码哈希，由 tools/set-password.mjs 写入
  var SALT      = 'yuji-zhj-2026';
  var ITER      = 5000;
  var SESSION_KEY = 'yujistorage-auth-v1';
  var FAIL_KEY    = 'yujistorage-auth-fail';
  var CONF_KEY    = 'yujistorage-auth-conf-v1';
  var REMEMBER_DAYS = 7;
  var MAX_FAIL = 5;
  var LOCK_MS  = 60000;
  var MIN_LEN  = 6;

  // ===== SHA-256（纯 JS，避免 file:// 或 http 环境缺 crypto.subtle）=====
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, maxWord = mp(2, 32), lp = 'length', i, j;
    var result = '', words = [], bitLen = ascii[lp] * 8;
    var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], pc = k[lp];
    var isComposite = {};
    for (var cand = 2; pc < 64; cand++) {
      if (!isComposite[cand]) {
        for (i = 0; i < 313; i += cand) isComposite[i] = cand;
        hash[pc] = (mp(cand, .5) * maxWord) | 0;
        k[pc++] = (mp(cand, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii[lp] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lp]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lp]] = (bitLen / maxWord) | 0;
    words[words[lp]] = bitLen;
    for (j = 0; j < words[lp]; j += 16) {
      var w = words.slice(j, j + 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) +
          ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] +
            (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] +
            (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }
  function toBin(s) {
    var bytes = new TextEncoder().encode(s), out = '';
    for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return out;
  }
  function derive(pw) {
    var h = sha256(toBin(SALT + ':' + pw));
    for (var i = 0; i < ITER; i++) h = sha256(h + SALT);
    return h;
  }

  // ===== 存储兜底 =====
  var mem = {};
  function store(k, v) { try { localStorage.setItem(k, v); return; } catch (e) {} try { sessionStorage.setItem(k, v); return; } catch (e) {} mem[k] = v; }
  function read(k) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} try { var v2 = sessionStorage.getItem(k); if (v2 !== null) return v2; } catch (e) {} return mem[k] === undefined ? null : mem[k]; }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} try { sessionStorage.removeItem(k); } catch (e) {} delete mem[k]; }

  // ===== 授权配置（本机）=====
  function conf() {
    try { var c = JSON.parse(read(CONF_KEY) || 'null'); if (c && typeof c === 'object') { c.members = c.members || []; return c; } } catch (e) {}
    return { main: null, members: [], days: REMEMBER_DAYS, updated: null };
  }
  function saveConf(c) { c.updated = new Date().toISOString(); store(CONF_KEY, JSON.stringify(c)); }
  function effMain() { return conf().main || FACTORY_HASH; }
  function rememberDays() { var c = conf(); return Number(c.days) || REMEMBER_DAYS; }
  function validHashes() { return [effMain()].concat(conf().members.filter(function (m) { return !m.disabled; }).map(function (m) { return m.h; })); }
  function verify(pw) { var h = derive(pw); return validHashes().indexOf(h) >= 0 ? h : null; }
  function isFactory() { return !conf().main; }

  function validSession() {
    try {
      var s = JSON.parse(read(SESSION_KEY) || 'null');
      return !!(s && s.exp > Date.now() && validHashes().indexOf(s.h) >= 0);
    } catch (e) { return false; }
  }
  function failState() { try { return JSON.parse(read(FAIL_KEY) || '{"n":0,"until":0}'); } catch (e) { return { n: 0, until: 0 }; } }

  // ===== 解锁 / 上锁 =====
  function unlock(hash, remember) {
    if (remember) store(SESSION_KEY, JSON.stringify({ h: hash, exp: Date.now() + rememberDays() * 864e5 }));
    else store(SESSION_KEY, JSON.stringify({ h: hash, exp: Date.now() + 3 * 3600e3 }));
    drop(FAIL_KEY);
    document.documentElement.classList.remove('auth-locked');
    var g = document.getElementById('authGate'); if (g) g.remove();
    var btn = document.getElementById('lockNowBtn'); if (btn) btn.hidden = false;
    var st = document.getElementById('authSettingBtn'); if (st) st.hidden = false;
  }
  function lockNow() { drop(SESSION_KEY); drop(FAIL_KEY); location.reload(); }

  // ===== 密码门 =====
  function buildGate() {
    var brand = document.querySelector('.brand strong');
    var name = brand ? brand.textContent : '聿集收纳速算系统';
    var gate = document.createElement('div');
    gate.id = 'authGate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    /* innerHTML 仅拼接本文件内的常量与自家 DOM 文本，无外部输入，安全 */
    gate.innerHTML =
      '<form class="auth-card" id="authForm" autocomplete="off">' +
        '<div class="auth-brand"><span class="auth-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
          '<div><strong>' + name + '</strong><em>整装收纳量化 · 内部系统</em></div></div>' +
        '<h2>请输入访问密码</h2>' +
        '<p class="auth-sub">本系统含公司物品尺寸数据库与核算方法，仅限内部人员使用。</p>' +
        '<label class="auth-field"><span>访问密码</span>' +
          '<span class="auth-input-wrap"><input type="password" id="authPass" inputmode="text" autocomplete="current-password" placeholder="请输入密码" enterkeyhint="go">' +
          '<button type="button" class="auth-eye" id="authEye" aria-label="显示密码">显示</button></span>' +
        '</label>' +
        '<div class="auth-remember"><label><input type="checkbox" id="authRemember" checked>记住本机 ' + rememberDays() + ' 天</label></div>' +
        '<p class="auth-msg" id="authMsg" role="alert"></p>' +
        '<button type="submit" class="auth-submit" id="authSubmit">进入系统</button>' +
        '<p class="auth-foot">忘记密码请联系设计总监 · ' + (isFactory() ? '当前为出厂主密码' : '本机已自定义密码') + '</p>' +
      '</form>';
    document.body.appendChild(gate);

    var form = gate.querySelector('#authForm'),
        input = gate.querySelector('#authPass'),
        msg = gate.querySelector('#authMsg'),
        eye = gate.querySelector('#authEye'),
        submit = gate.querySelector('#authSubmit');
    setTimeout(function () { input.focus(); }, 60);

    eye.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      eye.textContent = show ? '隐藏' : '显示';
      input.focus();
    });
    input.addEventListener('input', function () { msg.textContent = ''; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = failState();
      if (f.until > Date.now()) { msg.textContent = '尝试次数过多，请 ' + Math.ceil((f.until - Date.now()) / 1000) + ' 秒后再试'; return; }
      var pw = input.value;
      if (!pw) { msg.textContent = '请输入密码'; return; }
      submit.disabled = true; submit.textContent = '校验中…';
      setTimeout(function () {
        var h = null;
        try { h = verify(pw); } catch (err) { h = null; }
        if (h) { unlock(h, gate.querySelector('#authRemember').checked); return; }
        var n = (f.n || 0) + 1, until = 0;
        if (n >= MAX_FAIL) { until = Date.now() + LOCK_MS; n = 0; }
        store(FAIL_KEY, JSON.stringify({ n: n, until: until }));
        input.value = ''; input.focus();
        msg.textContent = until ? '密码连续错误 ' + MAX_FAIL + ' 次，锁定 ' + (LOCK_MS / 1000) + ' 秒' : '密码不正确，还可尝试 ' + (MAX_FAIL - n) + ' 次';
        submit.disabled = false; submit.textContent = '进入系统';
        var card = gate.querySelector('.auth-card');
        if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
      }, 30);
    });
  }

  // ===== 顶栏按钮 =====
  function buildTopButtons() {
    var host = document.querySelector('.top-actions');
    if (!host) return;
    var set = document.createElement('button');
    set.className = 'ghost-btn'; set.id = 'authSettingBtn'; set.type = 'button';
    set.textContent = '密码设置'; set.title = '修改密码 / 增发同事密码（需授权）'; set.hidden = true;
    set.addEventListener('click', function () { openSettings(); });
    host.insertBefore(set, host.firstChild);

    var btn = document.createElement('button');
    btn.className = 'ghost-btn'; btn.id = 'lockNowBtn'; btn.type = 'button';
    btn.textContent = '锁定'; btn.title = '退出并清除本机登录状态'; btn.hidden = true;
    btn.addEventListener('click', function () { if (confirm('退出后需要重新输入访问密码，确定吗？')) lockNow(); });
    host.insertBefore(btn, host.firstChild);
  }

  // ===== 密码设置（需授权）=====
  function openSettings() {
    var dlg = document.getElementById('authSettingDialog');
    if (!dlg) return;
    var cx = document.getElementById('authSettingClose');
    if (cx && !cx.dataset.bound) { cx.dataset.bound = '1'; cx.addEventListener('click', function () { dlgClose(); }); }
    dlg.showModal();
    renderSettings('auth');
    setTimeout(function () { var i = document.getElementById('authCur'); if (i) i.focus(); }, 40);
  }

  function renderSettings(stage, msgText) {
    var host = document.getElementById('authSettingBody');
    if (!host) return;
    if (stage === 'auth') {
      host.innerHTML =
        '<p class="set-note">改密码属于管理动作，需要先<b>授权验证</b>：请输入当前的有效密码（主密码或同事密码均可）。</p>' +
        '<label class="set-row"><span>当前密码</span><input type="password" id="authCur" autocomplete="off" placeholder="用于授权"></label>' +
        '<p class="set-msg" id="setMsg">' + (msgText || '') + '</p>' +
        '<div class="set-actions"><button type="button" class="primary-btn" id="authDoAuth">授权进入设置</button>' +
        '<button type="button" class="secondary-btn" id="authCancel">取消</button></div>';
      document.getElementById('authDoAuth').addEventListener('click', function () {
        var pw = document.getElementById('authCur').value;
        var ok = false; try { ok = !!verify(pw); } catch (e) { ok = false; }
        if (!ok) { renderSettings('auth', '密码不正确，无法进入设置'); return; }
        renderSettings('panel');
      });
      document.getElementById('authCancel').addEventListener('click', function () { dlgClose(); });
      var inp = document.getElementById('authCur');
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('authDoAuth').click(); } });
      return;
    }
    var c = conf();
    var members = c.members.map(function (m, i) {
      return '<li class="member-row"><b>' + esc(m.label || ('同事 ' + (i + 1))) + '</b>' +
        '<small>' + (m.disabled ? '已停用' : '有效') + ' · ' + new Date(m.created || Date.now()).toLocaleDateString('zh-CN') + '</small>' +
        '<button type="button" class="mini-btn" data-toggle="' + i + '">' + (m.disabled ? '启用' : '停用') + '</button>' +
        '<button type="button" class="mini-btn danger" data-del="' + i + '">删除</button></li>';
    }).join('') || '<li class="member-empty">还没有为同事增发密码</li>';

    host.innerHTML =
      '<p class="set-note">' + (isFactory() ? '当前使用<b>出厂主密码</b>。' : '本机已自定义<b>主密码</b>。')
        + ' 有效密码共 <b>' + validHashes().length + '</b> 个（1 个主密码' + (c.members.filter(function (m) { return !m.disabled; }).length ? ' + ' + c.members.filter(function (m) { return !m.disabled; }).length + ' 个同事密码' : '') + '）。</p>' +

      '<section class="set-sec"><h4>① 修改主密码（设计总监）</h4>' +
        '<label class="set-row"><span>新密码</span><input type="password" id="newMain" autocomplete="new-password" placeholder="至少 ' + MIN_LEN + ' 位"></label>' +
        '<label class="set-row"><span>再输一次</span><input type="password" id="newMain2" autocomplete="new-password" placeholder="确认新密码"></label>' +
        '<div class="set-actions"><button type="button" class="primary-btn" id="saveMain">保存主密码</button>' +
        (isFactory() ? '' : '<button type="button" class="secondary-btn" id="resetMain">恢复出厂主密码</button>') + '</div>' +
        '<p class="set-hint">⚠ 只在本机生效（存在此设备的浏览器里）。要让全体同事统一换密码，请用打包工具改文件：<code>node tools/set-password.mjs 新密码</code> 后重新打包/部署。</p>' +
      '</section>' +

      '<section class="set-sec"><h4>② 增发同事密码（授权使用）</h4>' +
        '<label class="set-row"><span>使用人</span><input type="text" id="memLabel" placeholder="如：王设计 / 门店A" maxlength="20"></label>' +
        '<label class="set-row"><span>密码</span><input type="password" id="memPass" autocomplete="new-password" placeholder="至少 ' + MIN_LEN + ' 位"></label>' +
        '<div class="set-actions"><button type="button" class="primary-btn" id="addMember">增发这个密码</button></div>' +
        '<ul class="member-list">' + members + '</ul>' +
        '<p class="set-hint">停用/删除后，该密码立刻失效（下次打开或点「锁定」重进时生效）。</p>' +
      '</section>' +

      '<section class="set-sec"><h4>③ 记住天数</h4>' +
        '<label class="set-row"><span>免密登录</span><select id="setDays">' +
          [1, 3, 7, 15, 30].map(function (d) { return '<option value="' + d + '"' + (Number(c.days) === d ? ' selected' : '') + '>' + d + ' 天</option>'; }).join('') +
        '</select></label>' +
        '<div class="set-actions"><button type="button" class="secondary-btn" id="saveDays">保存</button></div>' +
      '</section>' +

      '<section class="set-sec"><h4>④ 说明</h4>' +
        '<p class="set-hint">这是纯前端密码门：能挡住文件被随手转发，但不是服务端鉴权；本机设置清缓存后会回到出厂密码。需要更强管控请走托管平台登录。</p>' +
        '<p class="set-msg" id="setMsg2"></p>' +
      '</section>' +

      '<div class="set-actions"><button type="button" class="secondary-btn" id="dlgCloseBtn">关闭</button></div>';

    function say(t) { var m = document.getElementById('setMsg2'); if (m) m.textContent = t; }

    document.getElementById('saveMain').addEventListener('click', function () {
      var a = document.getElementById('newMain').value, b2 = document.getElementById('newMain2').value;
      if (a.length < MIN_LEN) return say('新密码至少 ' + MIN_LEN + ' 位');
      if (a !== b2) return say('两次输入不一致');
      var cc = conf(); cc.main = derive(a); saveConf(cc);
      refreshSession(cc.main);
      say('主密码已更新（本机生效）。请记牢——忘记只能清本机数据回到出厂密码。');
      renderSettings('panel', '');
      var m = document.getElementById('setMsg2'); if (m) m.textContent = '主密码已更新（本机生效）';
    });
    var rm = document.getElementById('resetMain');
    if (rm) rm.addEventListener('click', function () {
      if (!confirm('恢复为出厂主密码？本机自定义的主密码将被清除。')) return;
      var cc = conf(); cc.main = null; saveConf(cc);
      refreshSession(FACTORY_HASH);
      renderSettings('panel', '');
      var m = document.getElementById('setMsg2'); if (m) m.textContent = '已恢复出厂主密码';
    });
    document.getElementById('addMember').addEventListener('click', function () {
      var label = document.getElementById('memLabel').value.trim() || '同事';
      var pw = document.getElementById('memPass').value;
      if (pw.length < MIN_LEN) return say('同事密码至少 ' + MIN_LEN + ' 位');
      var cc = conf();
      if (validHashes().indexOf(derive(pw)) >= 0) return say('这个密码已经存在');
      cc.members.push({ label: label, h: derive(pw), created: Date.now(), disabled: false });
      saveConf(cc);
      renderSettings('panel', '');
      var m = document.getElementById('setMsg2'); if (m) m.textContent = '已为「' + label + '」增发密码，可单独停用或删除';
    });
    document.getElementById('saveDays').addEventListener('click', function () {
      var cc = conf(); cc.days = Number(document.getElementById('setDays').value) || REMEMBER_DAYS; saveConf(cc);
      say('已保存：免密登录 ' + cc.days + ' 天');
    });
    host.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { var cc = conf(), i = Number(b.dataset.toggle); cc.members[i].disabled = !cc.members[i].disabled; saveConf(cc); renderSettings('panel'); });
    });
    host.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () { var cc = conf(), i = Number(b.dataset.del); if (!confirm('删除这个密码？对方将无法再登录。')) return; cc.members.splice(i, 1); saveConf(cc); renderSettings('panel'); });
    });
    document.getElementById('dlgCloseBtn').addEventListener('click', function () { dlgClose(); });
  }

  function dlgClose() { var d = document.getElementById('authSettingDialog'); if (d) d.close(); }
  // 改主密码后保住当前会话，避免管理员把自己踢出登录
  function refreshSession(hash) {
    try { var s = JSON.parse(read(SESSION_KEY) || 'null'); if (s && s.exp > Date.now()) { s.h = hash; store(SESSION_KEY, JSON.stringify(s)); } } catch (e) {}
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function init() {
    if (validSession()) { unlock(null, false); document.documentElement.classList.remove('auth-locked'); return; }
    document.documentElement.classList.add('auth-locked');
    buildGate();
  }

  window.__yujiAuth = { sha256: sha256, derive: derive, factoryHash: FACTORY_HASH, conf: conf, verify: verify, lock: lockNow, openSettings: openSettings };

  document.addEventListener('DOMContentLoaded', function () { buildTopButtons(); init(); });
})();
