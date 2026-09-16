/*!
 * report.js · 全屋收纳量化统计表 — 报告引擎（HTML 投屏/打印 + PPTX 导出）
 * ------------------------------------------------------------------
 * 数据来源：项目汇总里已加入的每条核算记录 + 项目信息 + 家庭成员 + 客户实际数量
 * 输出：
 *   ① HTML 报告视图（A4 竖版，浏览器打印即成 PDF）
 *   ② PPTX（PptxGenJS 离线生成，逐柜一页）
 * 取数原则：只输出已有数据，缺数据的地方写"未提供"，不编造。
 */
(function () {
  'use strict';
  var INK = '0F2438', GOLD = 'F4B942', PAPER = 'EDF1F3', MUTED = '657482', LINE = 'CBD4DA';
  var FONT = '微软雅黑';

  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('zh-CN'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function items() { return (window.getProjectItems ? window.getProjectItems() : (window.projectItems || [])).slice(); }

  function parseMembers(txt) {
    if (!txt) return [];
    return txt.split(/[,，;；\n]+/).map(function (s) {
      var p = s.split(/[:：]/);
      if (p.length < 2) return null;
      var name = p[0].trim(), h = parseInt(String(p[1]).replace(/[^\d]/g, ''), 10);
      if (!name || !h) return null;
      if (h < 100) h = h * 10;                       // 允许写 1.75 → 1750
      return { name: name, h: h };
    }).filter(Boolean);
  }
  function bands(h) { return { hand: Math.round(h * 0.4), eye: Math.round(h * 0.9), reach: Math.round(h * 1.2) }; }

  function collect() {
    var mem = parseMembers(val('familyMembers'));
    var base = parseMembers(val('generalUserHeight') ? '业主:' + val('generalUserHeight') : '');
    return {
      project: val('projectName') || '聿集收纳项目',
      client: val('clientName'), community: val('communityName'), area: val('areaSize'),
      designer: val('designerName'), date: new Date().toLocaleDateString('zh-CN'),
      members: mem.length ? mem : (base.length ? base : []),
      shoeLay: (function () { var el = document.getElementById('generalShoeLay'); return el ? el.value : 'stagger'; })(),
      items: items()
    };
  }

  // 汇总统计
  function summaries(d) {
    var byScene = {}, byUnit = {}, needTotal = 0, capTotal = 0, warnCount = 0, gapCount = 0, unknown = 0;
    d.items.forEach(function (it) {
      var sc = it.scene || '未分类';
      byScene[sc] = byScene[sc] || { n: 0, unit: {}, need: 0, cap: 0, warn: 0 };
      var s = byScene[sc]; s.n++;
      s.cap += Number(it.capacity) || 0;
      s.unit[it.unit || '件'] = (s.unit[it.unit || '件'] || 0) + (Number(it.capacity) || 0);
      if (Number(it.needQty) > 0) { s.need += Number(it.needQty); needTotal += Number(it.needQty); }
      else unknown++;
      capTotal += Number(it.capacity) || 0;
      if (!it.valid) { s.warn++; warnCount++; }
      if (Number(it.needQty) > 0 && Number(it.needQty) > (Number(it.safe) || 0)) gapCount++;
      var u = it.unit || '件';
      byUnit[u] = (byUnit[u] || 0) + (Number(it.capacity) || 0);
    });
    return { byScene: byScene, byUnit: byUnit, needTotal: needTotal, capTotal: capTotal, warnCount: warnCount, gapCount: gapCount, unknown: unknown };
  }

  function adviceOf(it) {
    try { return window.YujiAdvice ? window.YujiAdvice.build(it, { userHeight: it.userHeight || 1600 }) : []; } catch (e) { return []; }
  }

  function verdict(it) {
    var need = Number(it.needQty) || 0, cap = Number(it.safety === undefined ? it.safe : it.safe) || 0;
    if (!need) return { t: '待补数量', c: MUTED, note: '客户实际数量未填，无法判定够不够' };
    if (need <= cap) return { t: '够用', c: '28765B', note: '需求 ' + fmt(need) + ' ≤ 建议装载 ' + fmt(cap) };
    if (need <= (Number(it.capacity) || 0)) return { t: '偏紧', c: '9A5B00', note: '需求 ' + fmt(need) + ' 超过建议值 ' + fmt(cap) + '，需挤到理论上限内' };
    return { t: '缺口 ' + fmt(need - (Number(it.capacity) || 0)), c: 'A63F3F', note: '需求 ' + fmt(need) + ' > 理论容量 ' + fmt(it.capacity) + '，需加柜体或减量' };
  }

  // ===================== HTML 报告 =====================
  // 收纳方案（优先用现场提问存下的；否则按记录尺寸自动生成）
  var planCache = {};
  function planOf(it) {
    if (it.askPlan && it.askPlan.text) return { text: it.askPlan.text, rows: it.askPlan.rows || [], src: '现场提问（已存入）' };
    var key = [it.label, it.width, it.height, it.depth, it.bayWidth, it.scene, it.itemName].join('|');
    if (key in planCache) return planCache[key];
    var out = null;
    try {
      if (window.YujiAsk && it.scene && it.width && it.height) {
        var q = (it.label ? it.label + '·' : '') + it.scene + '：宽 ' + Math.round(it.width) + '、高 ' + Math.round(it.height) + '、深 ' + Math.round(it.depth) + ' mm 的柜体，建议怎么放置和收纳？';
        var res = window.YujiAsk.answer(q, {
          length: it.width, height: it.height, depth: it.depth,
          bayWidth: it.bayWidth || 600, board: it.board || 18, depthLoss: it.depthLoss || 30,
          reserved: it.reserved || 0, plinth: it.plinth || 0
        });
        if (res && res.ok) out = { text: res.text, rows: res.rows || [], src: '系统按该柜尺寸自动生成' };
      }
    } catch (e) { out = null; }
    planCache[key] = out;
    return out;
  }
  function planTable(p) {
    if (p.rows && p.rows.length) {
      return '<table class="rpt-tb"><thead><tr><th>区域 / 层位</th><th>放什么</th><th>建议数量</th><th>容量上限</th><th>离地高度</th></tr></thead><tbody>' +
        p.rows.map(function (x) {
          return '<tr><td>' + esc(x.where) + '</td><td><b>' + esc(x.name) + '</b></td><td>' + x.suggest + ' ' + esc(x.unit || '') +
            '</td><td>' + x.cap + ' ' + esc(x.unit || '') + '</td><td>' + fmt(x.from) + '–' + fmt(x.to) + ' mm</td></tr>';
        }).join('') + '</tbody></table>';
    }
    return '<pre class="rpt-pre">' + esc(p.text) + '</pre>';
  }

  function render() {
    var d = collect(), s = summaries(d);
    var host = document.getElementById('reportBody') || document.getElementById('reportView');
    if (!host) return;
    if (!d.items.length) { alert('还没有核算记录：先在全屋速算页把柜体逐条「加入项目汇总」。'); return; }

    var page = function (inner, cls) { return '<section class="rpt-page ' + (cls || '') + '">' + inner + '</section>'; };
    var out = '';

    // 1 封面
    out += page(
      '<div class="rpt-cover">' +
        '<div class="rpt-brand"><i></i><i></i><i></i><i></i></div>' +
        '<div class="rpt-brandname">聿集生活收纳规划系统</div>' +
        '<h1>全屋收纳量化统计表</h1>' +
        '<div class="rpt-rule"></div>' +
        '<table class="rpt-cover-tb">' +
          '<tr><th>客户</th><td>' + (d.client ? esc(d.client) : '未提供') + '</td></tr>' +
          '<tr><th>楼盘 / 小区</th><td>' + (d.community ? esc(d.community) : '未提供') + '</td></tr>' +
          '<tr><th>户型面积</th><td>' + (d.area ? esc(d.area) + ' ㎡' : '未提供') + '</td></tr>' +
          '<tr><th>项目</th><td>' + esc(d.project) + '</td></tr>' +
          '<tr><th>设计师</th><td>' + (d.designer ? esc(d.designer) : '未提供') + '</td></tr>' +
          '<tr><th>家庭成员</th><td>' + (d.members.length ? d.members.map(function (m) { return esc(m.name) + ' ' + m.h + 'mm'; }).join(' · ') : '未提供') + '</td></tr>' +
          '<tr><th>出表日期</th><td>' + esc(d.date) + '</td></tr>' +
        '</table>' +
        '<p class="rpt-foot">聿集整装 · 全屋定制收纳量化</p>' +
      '</div>');

    // 2 口径声明
    out += page(
      '<h2>一、核算口径声明</h2>' +
      '<ul class="rpt-list">' +
        '<li><b>物品尺寸</b>：内部实测物品尺寸数据库（鞋宽 女80/男100、客拖115、雨靴鞋面158 mm 等）。</li>' +
        '<li><b>核算方法</b>：量化收纳口径（每米挂杆、每层可放、百纳箱换算）+ 量化收纳口径（三档进深 20/30/40cm、人体比例尺）。</li>' +
        '<li><b>鞋类口径</b>：' + (d.shoeLay === 'side' ? '并排直放（保守，每米约 5 双）' : '错位摆放（口径，每米约 8 双男鞋）') + '。</li>' +
        '<li><b>单位</b>：全部为 mm；容量为理论值，建议装载已预留未来增量。</li>' +
        '<li><b>边界</b>：本表用于方案初审与客户沟通，<b>不替代现场复尺、五金样本、门板开启、施工图深化</b>。标 ⚠ 的条目必须复核后才能下单。</li>' +
      '</ul>');

    // 3 总览 KPI
    var unitLine = Object.keys(s.byUnit).map(function (u) { return esc(u) + ' ' + fmt(s.byUnit[u]); }).join(' · ') || '—';
    out += page(
      '<h2>二、全屋总览</h2>' +
      '<div class="rpt-kpis">' +
        '<div><small>已核算条目</small><b>' + d.items.length + '</b><span>项</span></div>' +
        '<div><small>理论容量合计</small><b>' + fmt(s.capTotal) + '</b><span>（不跨单位相加）</span></div>' +
        '<div><small>待复核</small><b>' + s.warnCount + '</b><span>项</span></div>' +
        '<div><small>数量缺口</small><b>' + s.gapCount + '</b><span>项</span></div>' +
      '</div>' +
      '<p class="rpt-line"><b>容量构成</b>：' + unitLine + '</p>' +
      '<p class="rpt-line"><b>实际数量申报</b>：' + (s.needTotal ? '已申报 ' + fmt(s.needTotal) + ' 件；' + (s.unknown ? s.unknown + ' 项未填数量' : '全部已填') : '客户尚未申报物品数量（' + s.unknown + ' 项待补）') + '</p>' +
      (d.members.length ? '<p class="rpt-line"><b>身高与可达</b>：' + d.members.map(function (m) { var b = bands(m.h); return esc(m.name) + ' 够到上限 ' + b.reach + ' / 视线 ' + b.eye + ' / 垂手指尖 ' + b.hand + ' mm'; }).join('；') + '</p>' : ''));

    // 4 空间分布总表
    var rows = Object.keys(s.byScene).map(function (sc) {
      var v = s.byScene[sc];
      var u = Object.keys(v.unit).map(function (k) { return esc(k) + ' ' + fmt(v.unit[k]); }).join(' / ');
      var needTxt = v.need ? fmt(v.need) : '未填';
      var vd = v.need ? (v.need <= v.cap * 0.8 ? '<span class="ok">够用</span>' : (v.need <= v.cap ? '<span class="warn">偏紧</span>' : '<span class="bad">缺口</span>')) : '—';
      return '<tr><td><b>' + esc(sc) + '</b></td><td>' + v.n + '</td><td>' + u + '</td><td>' + needTxt + '</td><td>' + vd + '</td></tr>';
    }).join('');
    out += page(
      '<h2>三、空间分布总表</h2>' +
      '<table class="rpt-tb"><thead><tr><th>空间</th><th>条目</th><th>容量</th><th>需求</th><th>结论</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="rpt-note">不同单位不合并成"总件数"；结论按各空间内各类物品分别判断。</p>');

    // 5 逐柜详情
    d.items.forEach(function (it, idx) {
      var vd = verdict(it);
      var adv = adviceOf(it), advLines = [];
      adv.forEach(function (g) { g.items.slice(0, 2).forEach(function (t) { advLines.push('[' + g.k + '] ' + t.replace(/\*\*/g, '')); }); });
      var wl = (it.warnings || []).map(function (w) { return '<li class="' + (w.level === 'danger' ? 'bad' : 'warn') + '">' + esc(w.text) + '</li>'; }).join('') || '<li class="ok">无警告</li>';
      out += page(
        '<h2>四.' + (idx + 1) + '　' + esc(it.label || '未编号柜体') + '</h2>' +
        '<table class="rpt-tb"><tbody>' +
          '<tr><th>场景 / 物品</th><td>' + esc(it.scene || '') + ' · ' + esc(it.itemName || '') + '</td></tr>' +
          '<tr><th>柜体尺寸（外）</th><td>长 ' + fmt(it.width) + ' × 深 ' + fmt(it.depth) + ' × 高 ' + fmt(it.height) + ' mm</td></tr>' +
          '<tr><th>柜内净尺寸</th><td>' + fmt(it.netWidth) + ' × ' + fmt(it.netDepth) + ' × ' + fmt(it.netHeight) + ' mm' + (it.bays ? '（' + it.bays + ' 格）' : '') + '</td></tr>' +
          '<tr><th>存放方式</th><td>' + esc(methodName(it.method)) + (it.method === 'hang' ? '（' + (it.railsMode === 'double' ? '上下双杆' : it.railsMode === 'single' ? '单杆' : '自动：短衣双层/长衣单杆') + '）' : '') + '</td></tr>' +
          '<tr><th>容量结果</th><td><b>' + fmt(it.capacity) + ' ' + esc(it.unit || '件') + '</b>（理论） / ' + fmt(it.safe) + ' ' + esc(it.unit || '件') + '（建议装载，已留 ' + Math.round((it.growth || 0) * 100) + '% 增量）</td></tr>' +
          '<tr><th>客户需求数量</th><td>' + (Number(it.needQty) > 0 ? fmt(it.needQty) + ' ' + esc(it.unit || '件') : '未提供') + ' → <b style="color:#' + vd.c + '">' + vd.t + '</b>　' + esc(vd.note) + '</td></tr>' +
          '<tr><th>复核状态</th><td>' + (it.valid ? '<span class="ok">初审通过</span>' : '<span class="bad">需要调整</span>') + '</td></tr>' +
        '</tbody></table>' +
        '<h3>待办与提醒</h3><ul class="rpt-list">' + wl + '</ul>' +
        (advLines.length ? '<h3>收纳建议</h3><ul class="rpt-list">' + advLines.slice(0, 6).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : ''));
    });

    // 5b 收纳方案建议（自主提问）
    var planItems = d.items.filter(function (it) { return planOf(it); }).slice(0, 8);
    planItems.forEach(function (it, i) {
      var p = planOf(it);
      out += page(
        '<h2>四·补.' + (i + 1) + '　收纳方案建议 · ' + esc(it.label || '未编号柜体') + '</h2>' +
        '<p class="rpt-note">来源：' + esc(p.src) + '　｜　物品与尺寸全部取自「' + esc(it.scene || '') + '」物品库，数量按柜体净空算得并已留取放余量。</p>' +
        planTable(p) +
        '<p class="rpt-note">位置原则：高频物品放中段（站着伸手就够），重物和大件放底层，低频备品放顶层。下单前请按客户实物复核最长/最厚的那一件。</p>'
      );
    });

    // 对账表
    var recRows = d.items.map(function (it) {
      var vd = verdict(it);
      return '<tr><td>' + esc(it.label || '') + '</td><td>' + esc(it.itemName || '') + '</td><td>' + (Number(it.needQty) > 0 ? fmt(it.needQty) : '未填') + '</td><td>' + fmt(it.capacity) + '</td><td>' + fmt(it.safe) + '</td><td style="color:#' + vd.c + ';font-weight:700">' + vd.t + '</td></tr>';
    }).join('');
    out += page(
      '<h2>五、物品 ↔ 容量对账表</h2>' +
      '<table class="rpt-tb"><thead><tr><th>柜体 / 位置</th><th>物品</th><th>客户需求</th><th>理论容量</th><th>建议装载</th><th>结论</th></tr></thead><tbody>' + recRows + '</tbody></table>' +
      '<p class="rpt-note">结论规则：需求 ≤ 建议装载 → 够用；建议装载 < 需求 ≤ 理论容量 → 偏紧；需求 > 理论容量 → 缺口（需加柜体、改分区或减量）。</p>');

    // 建议摘要 & 风险 & 下一步
    out += page(
      '<h2>六、收纳建议摘要</h2>' +
      '<ul class="rpt-list">' +
        '<li><b>三条铁律</b>：就近存放（东西放在被使用的地方）· 同物集中（同类只放一处）· 指定座位（固定位 + 标签，用完归位）。</li>' +
        '<li><b>进深</b>：按物品定三档 20 / 30 / 40cm；余深不会变成容量，深处会变成遗忘区。</li>' +
        '<li><b>挂衣</b>：上装挂宽 60cm、下装 40cm 分开挂；折叠按 25×35cm 配 40cm 抽屉盒；杆上留 20% 空位。</li>' +
        '<li><b>高度</b>：常用放"垂手指尖到视线之间"；超过够到上限（身高×1.2）只放换季低频，配取物篮；重物低放。</li>' +
        '<li><b>规模</b>：收纳不是越大越好——够用 + 留 15–25% 增量；层板可调、挂杆可移，10/20/30 年只做小改造。</li>' +
      '</ul>');

    var risk = d.items.filter(function (it) { return !it.valid; }).map(function (it) {
      return '<li class="bad">' + esc(it.label || '') + '：' + (it.warnings || []).filter(function (w) { return w.level === 'danger'; }).map(function (w) { return esc(w.text); }).join('；') + '</li>';
    }).join('') || '<li class="ok">无必须调整项</li>';
    out += page(
      '<h2>七、风险与待办清单</h2>' +
      '<h3>必须处理</h3><ul class="rpt-list">' + risk + '</ul>' +
      '<h3>下单前必须现场复核</h3><ul class="rpt-list">' +
        '<li>柜体净尺寸复尺（墙地顶误差、踢脚线、梁柱、门窗套、检修口）。</li>' +
        '<li>五金配置：抽拉/斜插/升降件的安装高度、净深与开门是否碰撞。</li>' +
        '<li>老人小孩相关：高位取放、重物与易碎品的层位。</li>' +
        '<li>客户物品实物：按最长鞋、最长衣、最厚外套实测复核占宽。</li>' +
      '</ul>');

    out += page(
      '<h2>八、下一步与配合事项</h2>' +
      '<ul class="rpt-list">' +
        '<li>客户补充物品数量与型号（衣柜按"长衣/短衣/裤/叠衣/配饰"、玄关按"按人分鞋"、厨房按"锅具/餐具/小家电"）。</li>' +
        '<li>现场复尺后按实物修正本表，再进入五金选型与拆单。</li>' +
        '<li>本表不含报价；报价与五金清单另行提供。</li>' +
      '</ul>' +
      '<div class="rpt-sign"><span>设计师签字：__________</span><span>客户确认：__________</span><span>日期：' + esc(d.date) + '</span></div>' +
      '<p class="rpt-foot">聿集整装 · 聿集生活收纳规划系统 出品</p>');

    host.innerHTML = out;
    switchView('report');
    document.querySelectorAll('.mode-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.view === 'report'); });
  }

  function methodName(m) {
    return ({ 'shelf-row': '层板单排', 'shelf-grid': '层板双排/网格', 'stack-group': '成摞叠放', 'vertical': '直立槽位', 'hang': '挂杆悬挂', 'volume': '大件独立' })[m] || m || '—';
  }

  // ===================== PPTX =====================
  function exportPPTX(btn) {
    var d = collect();
    if (!d.items.length) { alert('还没有核算记录：先在全屋速算页把柜体逐条「加入项目汇总」。'); return; }
    if (typeof PptxGenJS === 'undefined') { alert('PPTX 引擎未加载，请用完整版文件（dist 或单文件版）重试。'); return; }
    if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
    setTimeout(function () {
      try {
        var pptx = buildDeck(d);
        var fname = (d.project || '聿集收纳') + '-全屋收纳量化统计表-' + new Date().toISOString().slice(0, 10) + '.pptx';
        pptx.writeFile({ fileName: fname }).then(function () {
          if (btn) { btn.disabled = false; btn.textContent = '导出 PPTX'; }
          if (window.showToast) showToast('PPTX 已生成：' + fname);
        }).catch(function (err) {
          if (btn) { btn.disabled = false; btn.textContent = '导出 PPTX'; }
          alert('生成失败：' + (err && err.message ? err.message : err));
        });
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = '导出 PPTX'; }
        alert('生成失败：' + (err && err.message ? err.message : err));
      }
    }, 50);
  }

  // 建 deck：纯数据入参，不依赖 DOM（便于自动化校验）
  function buildDeck(d) {
    var s = summaries(d);
    var pptx = new PptxGenJS();
    (function () {
        pptx.layout = 'LAYOUT_16x9';
        pptx.author = '聿集整装'; pptx.company = '聿集设计';
        pptx.title = d.project + ' 全屋收纳量化统计表';

        var W = 10, H = 5.625;
        function head(slide, title, sub) {
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.62, fill: { color: INK } });
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.62, w: W, h: 0.05, fill: { color: GOLD } });
          slide.addText(title, { x: 0.45, y: 0.06, w: 7, h: 0.5, fontSize: 18, bold: true, color: 'FFFFFF', fontFace: FONT });
          if (sub) slide.addText(sub, { x: 6.6, y: 0.16, w: 3, h: 0.32, fontSize: 10, color: 'ACBDC8', align: 'right', fontFace: FONT });
        }
        function table(slide, rows, opts) {
          slide.addTable(rows, Object.assign({
            x: 0.45, y: 0.95, w: 9.1, fontSize: 10, fontFace: FONT, color: INK,
            border: { type: 'solid', color: LINE, pt: 0.5 }, valign: 'middle',
            rowH: 0.28, autoPage: false
          }, opts || {}));
        }

        // 1 封面
        var c = pptx.addSlide();
        c.background = { color: INK };
        c.addShape(pptx.ShapeType.rect, { x: 0, y: 2.05, w: 1.1, h: 0.06, fill: { color: GOLD } });
        c.addText('聿集生活收纳规划系统', { x: 0.9, y: 1.35, w: 8, h: 0.4, fontSize: 14, color: 'F4B942', fontFace: FONT, charSpacing: 2 });
        c.addText('全屋收纳量化统计表', { x: 0.9, y: 2.3, w: 8.4, h: 0.9, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: FONT });
        c.addText([
          { text: '客户：' + (d.client || '未提供') + '　　', options: {} },
          { text: '楼盘：' + (d.community || '未提供') + '　　', options: {} },
          { text: '面积：' + (d.area ? d.area + ' ㎡' : '未提供') + '\n', options: {} },
          { text: '项目：' + d.project + '　　设计师：' + (d.designer || '未提供') + '　　出表：' + d.date, options: {} }
        ], { x: 0.9, y: 3.35, w: 8.4, h: 0.9, fontSize: 12, color: 'C2D2DC', fontFace: FONT, lineSpacing: 20 });
        c.addText('聿集整装 · 全屋定制收纳量化', { x: 0.9, y: 4.85, w: 8, h: 0.35, fontSize: 10, color: '8298A6', fontFace: FONT });

        // 2 口径声明
        var p2 = pptx.addSlide(); head(p2, '一、核算口径声明', d.project);
        p2.addText([
          { text: '物品尺寸：内部实测物品尺寸数据库（鞋宽 女80 / 男100、客拖115、雨靴鞋面158 mm 等）\n' },
          { text: '核算方法：量化收纳口径（每米挂杆、每层可放、百纳箱换算）+ 量化收纳口径（三档进深 20/30/40cm、人体比例尺）\n' },
          { text: '鞋类口径：' + (d.shoeLay === 'side' ? '并排直放（保守，每米约 5 双）' : '错位摆放（口径，每米约 8 双男鞋）') + '\n' },
          { text: '单位：全部为 mm；容量为理论值，"建议装载"已预留未来增量\n' },
          { text: '边界：本表用于方案初审与客户沟通，不替代现场复尺、五金样本、门板开启、施工图深化；标 ⚠ 的条目必须复核后才能下单。' }
        ], { x: 0.55, y: 1.0, w: 8.9, h: 4.2, fontSize: 12, color: INK, fontFace: FONT, lineSpacing: 26, bullet: { code: '25AA' } });

        // 3 总览
        var p3 = pptx.addSlide(); head(p3, '二、全屋总览', d.project);
        var unitLine = Object.keys(s.byUnit).map(function (u) { return u + ' ' + fmt(s.byUnit[u]); }).join('  ·  ') || '—';
        table(p3, [
          [{ text: '指标', options: { bold: true, fill: { color: PAPER } } }, { text: '结果', options: { bold: true, fill: { color: PAPER } } }],
          ['已核算条目', d.items.length + ' 项'],
          ['容量构成', unitLine],
          ['实际数量申报', s.needTotal ? '已申报 ' + fmt(s.needTotal) + ' 件' + (s.unknown ? '；' + s.unknown + ' 项未填' : '') : '客户尚未申报（' + s.unknown + ' 项待补）'],
          ['待复核 / 缺口', s.warnCount + ' 项 / ' + s.gapCount + ' 项'],
          ['家庭成员与可达', d.members.length ? d.members.map(function (m) { return m.name + ' ' + m.h + 'mm（够到 ' + bands(m.h).reach + '）'; }).join('；') : '未提供']
        ], { colW: [2.2, 6.9], rowH: 0.42 });

        // 4 空间分布
        var p4 = pptx.addSlide(); head(p4, '三、空间分布总表', d.project);
        var rows4 = [[{ text: '空间', options: { bold: true, fill: { color: PAPER } } }, { text: '条目', options: { bold: true, fill: { color: PAPER } } }, { text: '容量', options: { bold: true, fill: { color: PAPER } } }, { text: '需求', options: { bold: true, fill: { color: PAPER } } }, { text: '结论', options: { bold: true, fill: { color: PAPER } } }]];
        Object.keys(s.byScene).forEach(function (sc) {
          var v = s.byScene[sc];
          var u = Object.keys(v.unit).map(function (k) { return k + ' ' + fmt(v.unit[k]); }).join(' / ');
          var vd = v.need ? (v.need <= v.cap * 0.8 ? '够用' : (v.need <= v.cap ? '偏紧' : '缺口')) : '—';
          rows4.push([sc, String(v.n), u, v.need ? fmt(v.need) : '未填', vd]);
        });
        table(p4, rows4, { colW: [1.6, 0.9, 4.4, 1.1, 1.1], rowH: 0.36, fontSize: 11 });

        // 5 逐柜详情（每柜一页）
        var MAXCAB = 8;
        d.items.slice(0, MAXCAB).forEach(function (it, i) {
          var vd = verdict(it);
          var sl = pptx.addSlide(); head(sl, '四.' + (i + 1) + '　' + (it.label || '未编号柜体'), (it.scene || '') + ' · ' + (it.itemName || ''));
          table(sl, [
            [{ text: '柜体尺寸（外）', options: { bold: true, fill: { color: PAPER } } }, '长 ' + fmt(it.width) + ' × 深 ' + fmt(it.depth) + ' × 高 ' + fmt(it.height) + ' mm'],
            [{ text: '柜内净尺寸', options: { bold: true, fill: { color: PAPER } } }, fmt(it.netWidth) + ' × ' + fmt(it.netDepth) + ' × ' + fmt(it.netHeight) + ' mm' + (it.bays ? '（' + it.bays + ' 格）' : '')],
            [{ text: '存放方式', options: { bold: true, fill: { color: PAPER } } }, methodName(it.method) + (it.method === 'hang' ? '（' + (it.railsMode === 'double' ? '上下双杆' : it.railsMode === 'single' ? '单杆' : '自动') + '）' : '')],
            [{ text: '容量结果', options: { bold: true, fill: { color: PAPER } } }, fmt(it.capacity) + ' ' + (it.unit || '件') + '（理论） / ' + fmt(it.safe) + ' ' + (it.unit || '件') + '（建议，留 ' + Math.round((it.growth || 0) * 100) + '%）'],
            [{ text: '客户需求', options: { bold: true, fill: { color: PAPER } } }, (Number(it.needQty) > 0 ? fmt(it.needQty) + ' ' + (it.unit || '件') : '未提供') + '　→　' + vd.t + '（' + vd.note + '）'],
            [{ text: '复核状态', options: { bold: true, fill: { color: PAPER } } }, it.valid ? '初审通过' : '需要调整']
          ], { x: 0.45, y: 0.95, w: 9.1, colW: [2.2, 6.9], rowH: 0.4, fontSize: 11 });

          var wlines = (it.warnings || []).map(function (w) { return (w.level === 'danger' ? '⚠ ' : '· ') + w.text; });
          var advice = [];
          adviceOf(it).forEach(function (g) { g.items.slice(0, 1).forEach(function (t) { advice.push('· [' + g.k + '] ' + t.replace(/\*\*/g, '')); }); });
          var body = [];
          if (wlines.length) body.push({ text: '待办与提醒', options: { bold: true, color: '9A5B00', breakLine: true } });
          wlines.slice(0, 3).forEach(function (t) { body.push({ text: t, options: { breakLine: true } }); });
          if (advice.length) body.push({ text: '收纳建议', options: { bold: true, color: INK, breakLine: true } });
          advice.slice(0, 3).forEach(function (t) { body.push({ text: t, options: { breakLine: true } }); });
          if (body.length) sl.addText(body, { x: 0.55, y: 3.6, w: 8.9, h: 1.7, fontSize: 10, color: '33404B', fontFace: FONT, lineSpacing: 15 });
        });
        if (d.items.length > MAXCAB) {
          var pMore = pptx.addSlide(); head(pMore, '四：其余柜体', d.project);
          var rowsM = [[{ text: '柜体', options: { bold: true, fill: { color: PAPER } } }, { text: '物品', options: { bold: true, fill: { color: PAPER } } }, { text: '容量', options: { bold: true, fill: { color: PAPER } } }, { text: '需求', options: { bold: true, fill: { color: PAPER } } }, { text: '结论', options: { bold: true, fill: { color: PAPER } } }]];
          d.items.slice(MAXCAB).forEach(function (it) {
            var vd = verdict(it);
            rowsM.push([it.label || '', it.itemName || '', fmt(it.capacity) + ' ' + (it.unit || ''), Number(it.needQty) > 0 ? fmt(it.needQty) : '未填', vd.t]);
          });
          table(pMore, rowsM, { colW: [2.4, 2.4, 1.5, 1.3, 1.5], rowH: 0.32, fontSize: 10 });
        }

        // 四·补 收纳方案建议（自主提问）
        var planRecs = d.items.filter(function (it) { return planOf(it); }).slice(0, 6);
        planRecs.forEach(function (it, i) {
          var pl = planOf(it);
          var slp = pptx.addSlide();
          head(slp, '四·补' + (i + 1) + '　收纳方案 · ' + (it.label || ''), (it.scene || '') + ' · ' + pl.src);
          if (pl.rows && pl.rows.length) {
            var rowsP = [[{ text: '区域 / 层位', options: { bold: true, fill: { color: PAPER } } }, { text: '放什么', options: { bold: true, fill: { color: PAPER } } }, { text: '建议数量', options: { bold: true, fill: { color: PAPER } } }, { text: '容量上限', options: { bold: true, fill: { color: PAPER } } }, { text: '离地高度', options: { bold: true, fill: { color: PAPER } } }]];
            pl.rows.slice(0, 10).forEach(function (x) {
              rowsP.push([x.where, x.name, x.suggest + ' ' + (x.unit || ''), x.cap + ' ' + (x.unit || ''), Math.round(x.from) + '–' + Math.round(x.to) + ' mm']);
            });
            table(slp, rowsP, { colW: [2.0, 2.9, 1.5, 1.4, 2.0], rowH: 0.30, fontSize: 9.5 });
          } else {
            slp.addText(pl.text.split('\n').slice(0, 13).map(function (t) { return { text: t.replace(/\*\*/g, '') + '\n' }; }),
              { x: 0.55, y: 1.0, w: 8.9, h: 4.2, fontSize: 10.5, color: INK, fontFace: FONT, lineSpacing: 16 });
          }
          slp.addText('说明：只使用该场景物品库的条目；数量按柜体净空算得并已留取放余量。高频放中段、重物放底层、低频放顶层。下单前按实物复核最长/最厚的那一件。',
            { x: 0.5, y: 4.85, w: 9.1, h: 0.5, fontSize: 9, color: MUTED, fontFace: FONT });
        });

        // 对账表
        var p5 = pptx.addSlide(); head(p5, '五、物品 ↔ 容量对账表', d.project);
        var rows5 = [[{ text: '柜体 / 位置', options: { bold: true, fill: { color: PAPER } } }, { text: '物品', options: { bold: true, fill: { color: PAPER } } }, { text: '客户需求', options: { bold: true, fill: { color: PAPER } } }, { text: '理论容量', options: { bold: true, fill: { color: PAPER } } }, { text: '建议装载', options: { bold: true, fill: { color: PAPER } } }, { text: '结论', options: { bold: true, fill: { color: PAPER } } }]];
        d.items.slice(0, 12).forEach(function (it) {
          var vd = verdict(it);
          rows5.push([it.label || '', it.itemName || '', Number(it.needQty) > 0 ? fmt(it.needQty) : '未填', fmt(it.capacity), fmt(it.safe), vd.t]);
        });
        table(p5, rows5, { colW: [2.3, 2.0, 1.4, 1.3, 1.3, 0.8], rowH: 0.3, fontSize: 10 });
        p5.addText('结论规则：需求 ≤ 建议装载 → 够用；建议装载 < 需求 ≤ 理论容量 → 偏紧；需求 > 理论容量 → 缺口。', { x: 0.45, y: 4.9, w: 9.1, h: 0.3, fontSize: 9, color: MUTED, fontFace: FONT });

        // 建议摘要
        var p6 = pptx.addSlide(); head(p6, '六、收纳建议摘要', '量化收纳口径 · 现场可直接执行');
        p6.addText([
          { text: '三条铁律：就近存放（东西放在被使用的地方）· 同物集中（同类只放一处）· 指定座位（固定位+标签，用完归位）\n' },
          { text: '进深：按物品定三档 20/30/40cm；余深不会变成容量，深处会变成遗忘区\n' },
          { text: '挂衣：上装挂宽 60cm、下装 40cm 分开挂；折叠 25×35cm 配 40cm 抽屉盒；杆上留 20% 空位\n' },
          { text: '高度：常用放"垂手指尖到视线之间"；超过身高×1.2 的层只放换季低频，配取物篮；重物低放\n' },
          { text: '规模：不是越大越好——够用 + 留 15–25% 增量；层板可调、挂杆可移，10/20/30 年只做小改造' }
        ], { x: 0.55, y: 1.0, w: 8.9, h: 4.2, fontSize: 12, color: INK, fontFace: FONT, lineSpacing: 26, bullet: { code: '25AA' } });

        // 风险与下一步
        var p7 = pptx.addSlide(); head(p7, '七、风险与待办', d.project);
        var riskRows = d.items.filter(function (it) { return !it.valid; }).map(function (it) {
          return [(it.label || ''), (it.warnings || []).filter(function (w) { return w.level === 'danger'; }).map(function (w) { return w.text; }).join('；')];
        });
        table(p7, [[{ text: '柜体', options: { bold: true, fill: { color: PAPER } } }, { text: '必须处理（危险级）', options: { bold: true, fill: { color: PAPER } } }]]
          .concat(riskRows.length ? riskRows : [['—', '无必须调整项']]), { colW: [2.6, 6.5], rowH: 0.36, fontSize: 10 });
        p7.addText('下单前必须现场复核：柜体净尺寸复尺 · 五金安装条件（抽拉/升降/开门碰撞）· 老人小孩取放与重物层位 · 客户实物最长鞋/最长衣/最厚外套占宽实测。',
          { x: 0.45, y: 4.2, w: 9.1, h: 0.9, fontSize: 10, color: MUTED, fontFace: FONT, lineSpacing: 16 });

        var p8 = pptx.addSlide(); head(p8, '八、下一步与配合事项', d.project);
        p8.addText([
          { text: '客户补充物品数量与型号（衣柜按长衣/短衣/裤/叠衣/配饰；玄关按人分鞋；厨房按锅具/餐具/小家电）\n' },
          { text: '现场复尺后按实物修正本表，再进入五金选型与拆单\n' },
          { text: '本表不含报价；报价与五金清单另行提供' }
        ], { x: 0.55, y: 1.0, w: 8.9, h: 2.2, fontSize: 12, color: INK, fontFace: FONT, lineSpacing: 26, bullet: { code: '25AA' } });
        p8.addText('设计师签字：____________　　客户确认：____________　　日期：' + d.date,
          { x: 0.55, y: 4.4, w: 8.9, h: 0.4, fontSize: 11, color: '4C5B66', fontFace: FONT });

    })();
    return pptx;
  }

  window.YujiReport = { render: render, exportPPTX: exportPPTX, buildDeck: buildDeck, collect: collect, summaries: summaries };
})();
