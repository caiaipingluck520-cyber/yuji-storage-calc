/*!
 * ask.js · 自主提问（按场景物品库给出收纳方案）
 * ------------------------------------------------------------------
 * 设计原则：
 *  ① 回答只使用「该使用场景」物品库里的条目，绝不引入库外物品；
 *  ② 所有数量都由库内实测尺寸 + 柜体净尺寸算出来，可复核；
 *  ③ 柜体尺寸 / 层数可以从问句里解析；
 *  ④ 衣帽类按「挂衣区 + 层板区」分区，其余场景按每类物品高度排层；
 *  ⑤ 无网络、无模型依赖——纯规则计算，现场秒出答案。
 */
(function () {
  'use strict';

  var SCENE_KEYS = {
    '玄关': ['玄关', '进门', '入户', '门厅', '鞋柜', '换鞋'],
    '厨房': ['厨房', '灶', '锅', '碗', '餐具', '米桶', '调料', '备餐', '洗碗', '橱柜'],
    '餐厅/茶饮': ['茶', '茶饮', '餐边', '酒', '水吧', '咖啡', '茶杯', '餐柜'],
    '卫浴': ['卫浴', '浴室', '卫生间', '洗手', '洗漱', '毛巾', '浴巾', '洗面', '吹风'],
    '家政': ['家政', '阳台', '清洁', '吸尘器', '拖把', '洗衣', '洗涤', '工具柜', '扫地机'],
    '衣帽': ['衣帽', '衣柜', '挂衣', '衣服', '衣橱', '被褥', '行李箱', '裤架'],
    '客厅/公共': ['客厅', '电视', '遥控', '药箱', '公共', '杂物'],
    '书房': ['书柜', '书房', '书', '文件', '办公', '资料', '绘本'],
    '儿童/兴趣': ['儿童', '孩子', '玩具', '绘本', '兴趣', '乐器', '画筒'],
    '大件储藏': ['大件', '储藏', '储物间', '行李箱', '风扇', '折叠椅', '备用', '画筒']
  };

  var SCENE_PRIORITY = {
    '餐厅/茶饮': ['茶壶', '茶杯', '茶罐', '茶海', '泡茶盘', '茶漏', '茶渣桶'],
    '玄关': ['男鞋', '女鞋', '儿童鞋', '高筒雨靴', '客用拖鞋', '普通长伞', '外套', '日常拎包（薄）', '标准鞋盒'],
    '厨房': ['中式炒锅', '西式平底锅', '米饭碗', '大号浅盘', '调味瓶', '米桶', '大砧板', '收纳罐', '刀具收纳组', '厨房纸巾'],
    '卫浴': ['洗面奶', '乳液瓶', '牙刷杯', '毛巾（折叠）', '浴巾（折叠）', '卷纸', '戴森吹风机', '防滑凳', '婴儿洗澡盆'],
    '家政': ['戴森吸尘器', '扫地机器人', '伸缩地刷', '挂烫机', '立式摇头风扇', '无叶风扇'],
    '衣帽': ['大衣', '羽绒服', '女装短衣', '男装短衣', '男装中长衣', '真空压缩被', '24寸行李箱', '28寸行李箱'],
    '客厅/公共': ['遥控器', '充电器', '排插', '医药箱', '抽纸盒', '通用收纳盒', 'IKEA 纸盒'],
    '书房': ['A4 书/资料', '正16开书', 'A5 书', '正32开书', '文件盒', '双孔文件夹'],
    '儿童/兴趣': ['大龄绘本', '低龄绘本', '玩具收纳箱', '乐高收纳盒（大）', '乐高收纳盒（小）', '儿童滑板', '钢琴'],
    '大件储藏': ['童车', '儿童溜溜车', '扭扭车', '小米代步器', '轮滑鞋包', '高尔夫球包', '折叠椅', '塑料堆叠椅']
  };

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function fmt(n) { return Math.round(n).toLocaleString('zh-CN'); }
  // 说明：下方拼 HTML 的内容只有两类——本系统物品库的固定字段（库内数据）与由问句算出的数字；
  // 任何来自用户输入的文本（场景名等）都经过 esc() 转义，因此不使用 innerHTML 注入用户原文。
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lib() {
    if (window.YujiGeneral && window.YujiGeneral.library) return window.YujiGeneral.library();
    return window.objectLibrary || [];
  }

  // ---------- 中文数字 → 阿拉伯数字（"一米二"→"1.2米"，"两米"→"2米"，"三点五"→"3.5"） ----------
  var ZH_D = { '零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9 };
  function zhInt(s) {
    if (/^[0-9]+$/.test(s)) return s;
    var rest = s.replace(/^十/, '一十'), m, total = 0;
    m = rest.match(/^([一二两三四五六七八九]?)百([一二两三四五六七八九]?十)?([一二三四五六七八九]?)$/);
    if (m && m[0]) {
      total += (m[1] ? ZH_D[m[1]] : 1) * 100;
      total += m[2] ? (m[2].replace('十', '').length ? ZH_D[m[2].replace('十', '')] : 1) * 10 : 0;
      total += m[3] ? ZH_D[m[3]] : 0;
      return String(total);
    }
    m = rest.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
    if (m) { total = (m[1] ? ZH_D[m[1]] : 1) * 10 + (m[2] ? ZH_D[m[2]] : 0); return String(total); }
    m = rest.match(/^([一二两三四五六七八九])$/);
    if (m) return String(ZH_D[m[1]]);
    // 非标准结构（如"二五""二四"做小数用）：全部是单个数字才逐字直转
    var allDigits = s.split('').every(function (c) { return ZH_D[c] !== undefined; });
    return allDigits ? s.split('').map(function (c) { return String(ZH_D[c]); }).join('') : '';
  }
  function zhNum(s) {
    if (s.indexOf('点') >= 0) return s.split('点').map(zhInt).join('.');
    return zhInt(s);
  }
  function zhDims(str) {
    // 数字+单位+后续小数："一米二"→"1.2米"，"1米2"→"1.2米"，"1米25"→"1.25米"
    str = str.replace(/([零一二两三四五六七八九十百]+)\s*(米|厘米|毫米)\s*([零一二两三四五六七八九十百]+)/g, function (m, a, u, b) { return zhNum(a) + '.' + zhNum(b) + u; });
    str = str.replace(/(\d+(?:\.\d+)?)\s*(米|厘米|毫米)\s*(\d{1,2})(?!\d)/g, function (m, a, u, b) { return a + '.' + b + u; });
    // 整段中文数字（含"点""百"）："两米"→"2米"，"三点五米"→"3.5米"，"二百四十厘米"→"240厘米"
    str = str.replace(/[零一二两三四五六七八九十百点]+/g, function (m) { return zhNum(m); });
    return str;
  }

  // ---------- 解析问句 ----------
  function parseQuestion(q) {
    var text = zhDims(String(q || ''));
    var r = { scene: '', length: 0, height: 0, depth: 0, layers: 0, items: [], raw: text };

    Object.keys(SCENE_KEYS).forEach(function (sc) {
      if (r.scene) return;
      SCENE_KEYS[sc].forEach(function (k) { if (!r.scene && text.indexOf(k) >= 0) r.scene = sc; });
    });

    function toMm(v, unit) {
      var n = parseFloat(v);
      if (unit && /毫米|mm/i.test(unit)) return n;
      if (unit && /厘米|cm/i.test(unit)) return n * 10;
      if (unit && /米|m/i.test(unit)) return n * 1000;
      if (n <= 20) return n * 1000;
      if (n <= 200) return n * 10;
      return n;
    }

    // 三连：1000×2000×400 / 1米*2米*0.4米
    var m3 = text.match(/(\d+(?:\.\d+)?)\s*(毫米|mm|厘米|cm|米|m)?\s*[×xX*＊]\s*(\d+(?:\.\d+)?)\s*(毫米|mm|厘米|cm|米|m)?\s*[×xX*＊]\s*(\d+(?:\.\d+)?)\s*(毫米|mm|厘米|cm|米|m)?/);
    if (m3) {
      r.length = toMm(m3[1], m3[2]);
      r.height = toMm(m3[3], m3[4]);
      r.depth = toMm(m3[5], m3[6]);
    }

    // ---------- 尺寸解析：顺序扫描，按句式统一归属 ----------
    // 先扫出所有 关键字(宽/长/高/深) 与 数字+单位 token（按出现顺序）。
    // 看第一个尺寸 token 是数字还是关键字，判定整句句式：
    //   数字开头（"1米宽2米高"）→ 每个数字归属其【后面】紧贴的关键字
    //   关键字开头（"宽1.8米高2.2米"、"长1200 高700"）→ 每个关键字归属其【后面】最近的数字
    var tokens = [];
    var tokenRe = /(宽|长|高|深|进深)\s*度?|(\d+(?:\.\d+)?)\s*(毫米|mm|厘米|cm|米|m)?/g, tm;
    while ((tm = tokenRe.exec(text))) {
      if (tm[1]) tokens.push({ type: 'key', key: tm[1], start: tm.index, end: tm.index + tm[0].length });
      else if (tm[2] !== undefined && tm[2] !== '') tokens.push({ type: 'num', val: toMm(tm[2], tm[3] || ''), raw: tm[2], hasUnit: !!tm[3], start: tm.index, end: tm.index + tm[0].length });
    }
    // 过滤：无单位的裸数字 <100 视为非尺寸（如"5层板"的5）
    tokens = tokens.filter(function (t) { return t.type === 'key' || t.hasUnit || t.val >= 100; });
    var assign = function (slot, v) { if (slot === 'length') { if (!r.length) r.length = v; } else if (slot === 'height') { if (!r.height) r.height = v; } else { if (!r.depth) r.depth = v; } };
    var keySlot = function (k) { return (k === '宽' || k === '长') ? 'length' : (k === '高' ? 'height' : 'depth'); };
    var firstSize = tokens[0];
    var gapLen = function (a, b) { var g = text.slice(a, b); return /\d/.test(g) ? Infinity : g.length; };
    if (firstSize && firstSize.type === 'num') {
      // 数字开头句式（含混合）：每个数字归属"最近的空闲关键字"（前后都看，取 gap 更短且不含数字的一侧）
      var usedKey = {};
      tokens.forEach(function (t, i) {
        if (t.type !== 'num') return;
        var prev = tokens[i - 1], next = tokens[i + 1];
        var lp = prev && prev.type === 'key' && !usedKey[i - 1] ? gapLen(prev.end, t.start) : Infinity;
        var ln = next && next.type === 'key' && !usedKey[i + 1] ? gapLen(t.end, next.start) : Infinity;
        // 数字带单位且与后面关键字隔空白 → 该数字已完整，不向后归属
        if (next && next.type === 'key' && t.hasUnit && /^\s/.test(text.slice(t.end, next.start))) ln = Infinity;
        if (lp === Infinity && ln === Infinity) return;
        var pick = lp <= ln ? prev : next, idx = lp <= ln ? i - 1 : i + 1;
        usedKey[idx] = 1;
        assign(keySlot(pick.key), t.val);
      });
    } else {
      // 关键字在前句式："宽1200 高700" / "长一米二，高70厘米" → 关键字归其后面最近的数字
      var GAP_OK = /^[\s，,。、的约是为有在：:]*$/;
      tokens.forEach(function (t, i) {
        if (t.type !== 'key') return;
        for (var j = i + 1; j < tokens.length; j++) {
          var n = tokens[j];
          if (n.type === 'key') break;                     // 中间隔了别的关键字：该关键字无自己的数字
          var gap = text.slice(t.end, n.start);
          if (GAP_OK.test(gap)) { assign(keySlot(t.key), n.val); }
          break;
        }
      });
    }
    var ml = text.match(/(\d+)\s*(?:层板|隔层|层格|层)/);
    if (ml) r.layers = Math.max(2, Math.min(12, parseInt(ml[1], 10)));

    // 物品：只认库内条目
    var seen = {};
    lib().forEach(function (it) {
      if (seen[it.name]) return;
      seen[it.name] = 1;
      if (text.indexOf(it.name) >= 0) { r.items.push(it.name); return; }
      var core = it.name.replace(/（[^）]*）/g, '').replace(/^[0-9.]+[A-Za-z寸升L]*\s*/, '').trim();
      if (core.length >= 2 && text.indexOf(core) >= 0) r.items.push(it.name);
    });
    return r;
  }

  // ---------- 柜体与容量 ----------
  function cabinet(over) {
    var g = window.YujiGeneral, base = {};
    // 左侧面板不存在（如离线报告/PPTX 导出、Node 校验沙箱）时，全部走 over 传入的尺寸
    try { if (g && g.cabinet) base = g.cabinet() || {}; } catch (e) { base = {}; }
    var o = Object.assign({}, base, over || {});
    var board = num(o.board) || 18;
    var bays = Math.max(1, Math.ceil(num(o.length) / Math.max(200, num(o.bayWidth) || 600)));
    var netWidth = Math.max(0, num(o.length) - board * (bays + 1));
    var netHeight = Math.max(0, num(o.height) - (num(o.plinth) || 0) - (num(o.reserved) || 0) - board * 2);
    var netDepth = Math.max(0, num(o.depth) - (num(o.depthLoss) || 30));
    return { board: board, bays: bays, netWidth: netWidth, cellWidth: netWidth / bays, netHeight: netHeight, netDepth: netDepth,
      length: num(o.length), height: num(o.height), depth: num(o.depth), plinth: num(o.plinth) };
  }

  function perLayer(item, cab) {
    var gap = item.clearance || 10;
    var across = Math.floor((cab.cellWidth + gap) / Math.max(1, item.w + gap));
    var deep = Math.max(1, Math.min(4, Math.floor((cab.netDepth + gap) / Math.max(1, item.d + gap))));
    var m = item.method;
    if (m === 'volume' || m === 'vertical') deep = 1;
    if (m === 'hang') return Math.max(0, Math.floor((cab.netWidth + gap) / Math.max(1, item.w + gap)));
    return Math.max(0, across) * deep * Math.max(1, cab.bays) * Math.max(1, item.stackQty || 1);
  }

  function methodName(m) { return ({ 'shelf-row': '层板单排', 'shelf-grid': '层板网格', 'stack-group': '成摞叠放', 'vertical': '直立槽位', 'hang': '挂杆悬挂', 'volume': '大件独立' })[m] || '层板'; }
  function clearOf(it) { return it.h + (it.method === 'hang' ? 100 : 40); }

  // ---------- 生成答案 ----------
  function answer(question, ctxOverride) {
    var p = parseQuestion(question);
    var over = Object.assign({}, ctxOverride || {});
    var fromQ = [];
    if (p.length) { over.length = p.length; fromQ.push('宽 ' + p.length); }
    if (p.height) { over.height = p.height; fromQ.push('高 ' + p.height); }
    if (p.depth) { over.depth = p.depth; fromQ.push('深 ' + p.depth); }
    var cab = cabinet(over);
    if (!cab.length || !cab.height) return { ok: false, text: '请先在左侧填写柜体尺寸（或直接在问题里写"1米宽2米高"），我再给方案。' };

    var scene = p.scene;
    if (!scene) { try { scene = (window.YujiGeneral && window.YujiGeneral.scene()) || '玄关'; } catch (e) { scene = '玄关'; } }
    if (p.scene && window.YujiGeneral && window.YujiGeneral.setScene) { try { window.YujiGeneral.setScene(scene); } catch (e) {} }

    var sceneItems = lib().filter(function (it) { return it.scene === scene; });
    if (!sceneItems.length) return { ok: false, text: '没有找到「' + scene + '」场景的物品数据。' };

    // 候选物品：问句点名的优先 → 场景推荐顺序 → 场景内其余物品（用于填满柜内余高）
    var picked = [];
    sceneItems.forEach(function (it) { it.__pri = 0; });
    p.items.forEach(function (name) {
      var hit = sceneItems.filter(function (it) { return it.name === name; })[0];
      if (hit && picked.indexOf(hit) < 0) picked.push(hit);
    });
    (SCENE_PRIORITY[scene] || []).forEach(function (kw) {
      sceneItems.forEach(function (it) { if (picked.indexOf(it) < 0 && it.name.indexOf(kw) >= 0 && picked.length < 10) picked.push(it); });
    });
    if (!picked.length) picked = sceneItems.slice(0, 6);
    var spare = sceneItems.filter(function (it) { return picked.indexOf(it) < 0; });
    picked.forEach(function (it) { it.__pri = 1; });

    var plinth = cab.plinth, rows = [], zones = [], remainTxt = '';

    // ===== 模式 A：问句给了层数 → 层高均匀 =====
    if (p.layers) {
      var L = Math.max(1, Math.min(12, p.layers));
      var lc = Math.floor((cab.netHeight - (L - 1) * cab.board) / L);
      var i = 0;
      picked.concat(spare).sort(function (a, b) { return b.h - a.h || b.w - a.w; }).forEach(function (it) {
        if (i >= L) return;
        var cap = perLayer(it, cab), bottom = plinth + i * (lc + cab.board);
        rows.push({ no: i + 1, zone: '', name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h,
          cap: cap, method: methodName(it.method), from: bottom, to: bottom + lc, layerClear: lc,
          suggest: cap < 1 ? 0 : Math.max(1, Math.floor(cap * (it.h > 200 ? 0.7 : 0.75))),
          note: cap < 1 ? ('该层净高 ' + lc + 'mm 放不下（需要 ' + clearOf(it) + 'mm）') : '' });
        i++;
      });
      if (L - rows.length > 0) remainTxt = '还有 ' + (L - rows.length) + ' 层空余：可放低频备品，或用收纳盒把小件合并。';
    } else {
      // ===== 模式 B：分区排布（全场景通用 · 上下双带模型）=====
      //  下带（自地面向上）：落地低区 → 直立高区 —— 落地件、重物、长件都在下带，符合承重与推拉习惯
      //  上带（自柜顶向下）：挂衣区              —— 挂杆靠柜顶，衣物自然垂落
      //  中带（剩余净高）  ：层板区              —— 高频日用品落在 600–1800mm 伸手可及区间
      // 任一区排不下时逐条给出原因与替代做法，不静默丢弃
      var STAND_MIN = 600, LOW_MAX = 350, MAX_ROWS = 20;
      var pool = picked.concat(spare).slice().sort(function (a, b) { return b.h - a.h || b.w - a.w; });
      var hangs = pool.filter(function (it) { return it.method === 'hang'; });
      var rest0 = pool.filter(function (it) { return it.method !== 'hang'; });
      var lows = rest0.filter(function (it) {
        if (it.h > LOW_MAX) return false;
        if (it.method === 'volume') return true;
        return it.method === 'stack-group' && it.w * it.d >= 120000;   // 大件叠放：折叠被褥、堆叠椅、洗脸盆
      });
      var stands = rest0.filter(function (it) { return it.h >= STAND_MIN && (it.method === 'vertical' || it.method === 'volume'); })
        .slice().sort(function (a, b) { return b.w - a.w || b.h - a.h; });
      var shelves = rest0.filter(function (it) { return lows.indexOf(it) < 0 && stands.indexOf(it) < 0; });
      var botUsed = 0, topUsed = 0, zIdx = 0, layerIdx = 0, truncated = 0, missed = [];
      function noRoom(it, why) {
        return { no: 0, zone: '', name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: 0,
          method: methodName(it.method), from: 0, to: 0, layerClear: 0, suggest: 0, note: why };
      }
      function placedCount() { var c = 0; rows.forEach(function (r) { if (r.no) c++; }); return c; }
      function room4() { return Math.max(0, Math.round(cab.netHeight - botUsed - topUsed)); }

      // ① 挂衣区（贴柜顶，自上而下排）
      if (hangs.length) {
        var longs = hangs.filter(function (it) { return it.h > 1050; });
        var shorts = hangs.filter(function (it) { return it.h <= 1050; });
        if (longs.length) {
          var rodL = Math.max.apply(null, longs.map(function (x) { return x.h; })) + 100;
          if (topUsed + rodL + cab.board <= cab.netHeight + 1) {
            zIdx++;
            var z1 = { zone: '挂衣区（长衣 · 1 根杆）', no: zIdx, from: plinth + cab.netHeight - topUsed - rodL, to: plinth + cab.netHeight - topUsed, h: rodL };
            zones.push(z1);
            longs.forEach(function (it) {
              var cap = perLayer(it, cab);
              rows.push({ no: zIdx, zone: z1.zone, name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, pitch: it.w,
                method: '挂杆悬挂', from: z1.from, to: z1.to, layerClear: rodL,
                suggest: Math.max(1, Math.floor(cap * 0.8)), note: '' });
            });
            topUsed += rodL + cab.board;
          } else {
            longs.forEach(function (it) { rows.push(noRoom(it, '挂衣区净高不够（需要 ' + rodL + 'mm，柜内只剩 ' + room4() + 'mm）：建议改为短衣折挂，或把该件挂到另一柜')); });
          }
        }
        if (shorts.length) {
          var rodS = Math.max.apply(null, shorts.map(function (x) { return x.h; })) + 100;
          var fitRods = Math.floor((cab.netHeight - topUsed - botUsed + cab.board) / (rodS + cab.board));
          var rods = Math.max(0, Math.min(2, fitRods));
          if (rods >= 1) {
            var zoneH = rodS * rods + cab.board * (rods - 1);
            zIdx++;
            var z2 = { zone: '挂衣区（短衣 ' + (rods === 2 ? '· 上下双杆' : '· 1 根杆') + '）', no: zIdx, from: plinth + cab.netHeight - topUsed - zoneH, to: plinth + cab.netHeight - topUsed, h: zoneH };
            zones.push(z2);
            shorts.forEach(function (it) {
              var cap = perLayer(it, cab) * rods;
              rows.push({ no: zIdx, zone: z2.zone, name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, pitch: it.w,
                method: '挂杆悬挂 ×' + rods, from: z2.from, to: z2.to, layerClear: rodS,
                suggest: Math.max(1, Math.floor(cap * 0.8 / (shorts.length > 2 ? 2 : 1))), note: '' });
            });
            topUsed += zoneH + cab.board;
          } else if (zones.length) {
            shorts.forEach(function (it) {
              var cap = perLayer(it, cab);
              rows.push({ no: 1, zone: '与长衣区共用一根杆', name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, pitch: it.w,
                method: '挂杆悬挂', from: zones[0].from, to: zones[0].to, layerClear: zones[0].h,
                suggest: Math.max(1, Math.floor(cap * 0.6)), note: '与长衣共用一根杆，两类合计别超过一根杆的总量' });
            });
          } else {
            shorts.forEach(function (it) { rows.push(noRoom(it, '挂衣区净高不够（短衣需 ' + rodS + 'mm，柜内只剩 ' + room4() + 'mm）')); });
          }
        }
      }

      // ② 落地低区（地面起）
      if (lows.length) {
        var lowClear = Math.max.apply(null, lows.map(clearOf));
        if (botUsed + lowClear + cab.board <= cab.netHeight - topUsed + 1) {
          zIdx++;
          var z3 = { zone: '落地低区（离地并排）', no: zIdx, from: plinth + botUsed, to: plinth + botUsed + lowClear, h: lowClear };
          zones.push(z3);
          var lowW = 0;
          lows.forEach(function (it) {
            var gw = it.w + 10, cap = perLayer(it, cab);
            if (lowW + gw > cab.netWidth + 1) {
              rows.push(noRoom(it, '落地低区净宽 ' + Math.round(cab.netWidth) + 'mm 已排满（已占 ' + Math.round(lowW) + 'mm）：建议减少并排件数，或该件移到另一柜'));
              return;
            }
            lowW += gw;
            rows.push({ no: zIdx, zone: z3.zone, name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, pitch: it.w,
              method: methodName(it.method) + '（落地）', from: z3.from, to: z3.to, layerClear: lowClear,
              suggest: Math.max(1, Math.floor(cap * 0.6)),
              note: '落地并排共用，本区已占宽约 ' + Math.round(lowW) + 'mm（净宽 ' + Math.round(cab.netWidth) + 'mm）' });
          });
          botUsed += lowClear + cab.board;
        } else {
          lows.forEach(function (it) { rows.push(noRoom(it, '余高不够（需要净高 ' + clearOf(it) + 'mm，柜内只剩 ' + room4() + 'mm）：建议与相邻层合并或另放')); });
        }
      }

      // ③ 直立高区（地面起，并排站立，宽的在前）
      if (stands.length) {
        var standClear = Math.max.apply(null, stands.map(clearOf));
        if (botUsed + standClear + cab.board <= cab.netHeight - topUsed + 1) {
          zIdx++;
          var z4 = { zone: '直立高区（并排站立）', no: zIdx, from: plinth + botUsed, to: plinth + botUsed + standClear, h: standClear };
          zones.push(z4);
          var stW = 0;
          stands.forEach(function (it) {
            var gw = it.w + 10;
            if (stW + gw > cab.netWidth + 1) {
              rows.push(noRoom(it, '直立高区净宽 ' + Math.round(cab.netWidth) + 'mm 已排满（已占 ' + Math.round(stW) + 'mm）：建议该件移到另一柜、改挂墙，或同区换更窄的款式（立式风扇/无叶风扇也可卧放于顶层）'));
              return;
            }
            stW += gw;
            rows.push({ no: zIdx, zone: z4.zone, name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: Math.max(1, Math.floor((cab.netWidth + 10) / gw)), pitch: it.w,
              method: methodName(it.method) + '（直立并排）', from: z4.from, to: z4.to, layerClear: standClear, suggest: 1,
              note: '直立并排共用，本区已占宽约 ' + Math.round(stW) + 'mm（净宽 ' + Math.round(cab.netWidth) + 'mm）' });
          });
          botUsed += standClear + cab.board;
        } else {
          stands.forEach(function (it) { rows.push(noRoom(it, '余高不够（需要净高 ' + clearOf(it) + 'mm，柜内只剩 ' + room4() + 'mm）：建议另设高柜，或改为上层卧放')); });
        }
      }

      // ④ 层板区（中带：每个竖格独立分层，层高接近的才共层；大件在下、小件在上）
      var stacks = [];
      for (var s0 = 0; s0 < cab.bays; s0++) stacks.push({ layers: [], usedH: 0 });
      shelves.every(function (it) {
        if (placedCount() >= MAX_ROWS) { truncated++; missed.push(it); return true; }
        var need = clearOf(it), gw = it.w + 10;
        if (gw > cab.cellWidth + 1 && cab.bays > 1) {
          if (it.__pri) rows.push(noRoom(it, '单格净宽 ' + Math.round(cab.cellWidth) + 'mm 放不下（需要 ' + it.w + 'mm）：建议该件所在格不设竖板，或加大单格宽'));
          else missed.push(it);
          return true;
        }
        // 先看能否并进已有同高层（层高差 ≤150mm 才共层，避免小件占着高层的净高）
        var pickS = -1, pickL = null;
        stacks.forEach(function (S, si) {
          S.layers.forEach(function (L) {
            if (L.remain < gw || Math.abs(L.clear - need) > 150) return;
            if (!pickL || Math.abs(L.clear - need) < Math.abs(pickL.clear - need)) { pickS = si; pickL = L; }
          });
        });
        if (pickL) { pickL.remain -= gw; pickL.items.push(it); return true; }
        // 否则新建一层：放到"加这层后该格总高最小、且不顶到上带"的竖格里
        var cand = null;
        stacks.forEach(function (S, si) {
          var top = S.usedH + need + cab.board;
          if (top > cab.netHeight - topUsed + 1) return;
          if (!cand || top < cand.top) cand = { si: si, top: top };
        });
        if (!cand) {
          var freeCell = room4() - Math.min.apply(null, stacks.map(function (S) { return S.usedH; }));
          if (it.__pri) rows.push(noRoom(it, '层板已排满（每格剩余净高最少 ' + Math.round(freeCell) + 'mm，放不下该件的 ' + need + 'mm）：建议加高柜体、减少上层物品，或该件另放'));
          else missed.push(it);
          return true;
        }
        var S2 = stacks[cand.si];
        S2.layers.push({ clear: need, remain: cab.cellWidth - gw, items: [it] });
        S2.usedH = cand.top;
        return true;
      });
      stacks.forEach(function (S, si) {
        var from = plinth + botUsed;
        S.layers.forEach(function (L, li) {
          layerIdx++;
          var zname = '层板区 第' + (si + 1) + '格 第' + (li + 1) + '层';
          var shared = L.items.length > 1;
          L.from = from; L.to = from + L.clear;
          L.items.forEach(function (it) {
            var gw = it.w + 10, cap = perLayer(it, cab);
            var share = (L.items.length === 1) ? 1 : gw / Math.max(1, cab.netWidth);
            rows.push({ no: 1000 + si * 100 + li + 1, zone: zname, name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, pitch: it.w,
              method: methodName(it.method), from: L.from, to: L.to, layerClear: L.clear,
              suggest: Math.max(1, Math.floor(cap * 0.75 * share)),
              note: shared ? ('与同层另 ' + (L.items.length - 1) + ' 类并排（本层净高 ' + L.clear + 'mm，按占宽分摊数量）') : '' });
          });
          from += L.clear + cab.board;
        });
        if (si === 0) botUsed += S.usedH;
      });

      var leftover = Math.max(0, Math.round(cab.netHeight - botUsed - topUsed));
      if (truncated) remainTxt = '本表已按净高排满，另有 ' + truncated + ' 项同场景物品未列出（增加层板或分柜可继续容纳）。';
      else if (leftover > 120) remainTxt = '柜内还余净高约 ' + leftover + 'mm，可留作备用层板，或用收纳盒把小件合并。';
    }

    var placed = rows.filter(function (r) { return r.no; });
    var zoneNotes = [];
    (function () {
      var groups = {};
      placed.forEach(function (r) { if (r.zone) { (groups[r.zone] = groups[r.zone] || []).push(r); } });
      Object.keys(groups).forEach(function (z) {
        var g = groups[z];
        if (g.length < 2 || !/衣区|挂衣|共用一根杆/.test(z)) return;
        var rods = /双杆/.test(z) ? 2 : 1;
        var pitchMax = Math.max.apply(null, g.map(function (r) { return r.pitch || parseFloat(String(r.dims).split('×')[0]) || 60; }));
        var zoneCap = Math.max(1, Math.floor((cab.netWidth + 5) / (pitchMax + 5)) * rods);
        g.forEach(function (r) {
          r.suggest = Math.max(1, Math.floor(zoneCap / g.length * 0.85));
          r.note = (r.note ? r.note + '；' : '') + '本区共用挂杆，' + g.length + ' 类合计上限约 ' + zoneCap + ' 件';
          r.cap = zoneCap;
        });
        zoneNotes.push('【' + z + '】同一根杆位：' + g.length + ' 类物品合计别超过约 ' + zoneCap + ' 件（按最大挂位占宽算），上面各类数量是"均分建议"，实际按业主哪类多就多分。');
      });
    })();
    var total = placed.reduce(function (s, r) { return s + r.suggest; }, 0);

    // 位置建议：中段留给高频
    var midFrom = 0, midTo = 0;
    var byHeight = placed.slice().sort(function (a, b) { return a.from - b.from; });   // 挂衣区在顶、层板区在中，需按离地高度取中段
    if (byHeight.length) {
      var midIdx = Math.max(0, Math.floor((byHeight.length - 2) / 2));
      midFrom = byHeight[midIdx].from;
      midTo = byHeight[Math.min(byHeight.length - 1, midIdx + 1)].to;
    }

    // ---------- 设计要点（按实际排出的分区给构造建议） ----------
    var hasZone = function (re) { return zones.some(function (z) { return re.test(z.zone); }); };
    var designTips = [];
    if (hasZone(/挂衣/)) designTips.push('挂衣区：净深 ≥530mm（含衣架 550mm），挂杆距顶板 60mm，长衣区不设层板');
    if (hasZone(/落地低区/)) designTips.push('落地低区：底板做可拆/加防潮垫，扫地机器人与充电类预留插座、前方留 100mm 回充通道');
    if (hasZone(/直立高区/)) designTips.push('直立高区：整格通高不设层板，柜门用平开或上翻，柜内留 60mm 拿取余量');
    if (hasZone(/层板区/)) designTips.push('层板区：按 32mm 排孔可调，重物（米桶/锅具/油瓶）放最下层，小件配收纳盒分区');
    designTips.push('以上单位 mm；下单前按客户实物复核最长/最厚/最重的那一件，并核对柜体承重');

    // ---------- 文本 ----------
    var lines = [];
    lines.push('【' + scene + ' · 收纳方案建议】');
    lines.push('柜体：' + fmt(cab.length) + ' 宽 × ' + fmt(cab.height) + ' 高 × ' + fmt(cab.depth) + ' 深 mm（净空 ' + fmt(cab.netWidth) + ' × ' + fmt(cab.netHeight) + ' × ' + fmt(cab.netDepth) + '，分 ' + cab.bays + ' 格）' + (fromQ.length ? '　※ 尺寸取自你的问题（' + fromQ.join('、') + '）' : '　※ 尺寸取自左侧已填的柜体'));
    lines.push(p.layers ? ('层数：按你说的 ' + p.layers + ' 层，每层净高约 ' + Math.floor((cab.netHeight - (p.layers - 1) * cab.board) / p.layers) + 'mm') : '层数：按每类物品所需净高排布（层板可调）');
    lines.push('');
    var lastZone = null, layerNo = 0;
    rows.forEach(function (r) {
      if (!r.no) { lines.push('× ' + r.name + '：' + r.note); return; }
      if (r.zone && r.zone !== '层板区' && r.zone !== lastZone) {
        lastZone = r.zone;
        lines.push('【' + r.zone + '】离地 ' + fmt(r.from) + '–' + fmt(r.to) + 'mm，净高 ' + r.layerClear + 'mm');
      }
      if (!r.zone || r.zone === '层板区') {
              layerNo++;
              lines.push('第 ' + layerNo + ' 层（离地 ' + fmt(r.from) + '–' + fmt(r.to) + 'mm，层净高 ' + r.layerClear + 'mm）：' + r.name
                + ' —— 建议 ' + r.suggest + ' ' + r.unit + '（本层容量上限 ' + r.cap + ' ' + r.unit + '，已留取放余量）' + (r.note ? '　⚠ ' + r.note : ''));
              return;
            }
      lines.push('  · ' + r.name + ' —— 建议 ' + r.suggest + ' ' + r.unit + '（本区容量上限 ' + r.cap + ' ' + r.unit + '）' + (r.note ? '　⚠ ' + r.note : ''));
    });
    zoneNotes.forEach(function (t) { lines.push(t); });
    lines.push('');
    lines.push('合计建议放置约 ' + fmt(total) + ' 件（不含取放余量的理论容量更高；留 20% 空位便于日常取放）。');
    lines.push('位置建议：高频物品放中段（约离地 ' + fmt(midFrom) + '–' + fmt(midTo) + 'mm，站着伸手就够）；底层放重物和大件，顶层放低频备品或用收纳盒合并小件。');
    if (remainTxt) lines.push(remainTxt);
    lines.push('依据：① 物品尺寸取自本场景物品库的实测条目（外形最长/最厚，含标注取放余量）；② 分区按人体工学可达域——高频在中段、重物与大件落地、低频与备品在上层；③ 直立类按净宽并排站立核算，层板类按净高分层、同层并排分摊；④ 每区净高 = 物品高 + 取放余量，柜内立板厚已扣。');
    lines.push('【设计要点】');
    designTips.forEach(function (t) { lines.push('· ' + t); });
    if (missed.length) lines.push('未列入本柜的物品（' + missed.length + ' 项）：' + missed.slice(0, 8).map(function (x) { return x.name; }).join('、') + (missed.length > 8 ? ' 等' : '') + '——本柜净高/净宽放不下，建议另设一柜或加大柜体。');
    lines.push('说明：以上物品与尺寸全部取自本场景物品库的实测数据；层高按可调层板计算，实际下单前请按客户实物复核最长/最厚的那一件。');

    // ---------- HTML ----------
    var html = '<div class="ask-h">' + esc(scene) + ' · 方案建议</div>' +
      '<div class="ask-meta">柜体 ' + fmt(cab.length) + '×' + fmt(cab.height) + '×' + fmt(cab.depth) + 'mm ｜ 净空 ' + fmt(cab.netWidth) + '×' + fmt(cab.netHeight) + '×' + fmt(cab.netDepth) + ' ｜ ' + cab.bays + ' 格' + (fromQ.length ? ' ｜ <b>尺寸取自你的问题</b>' : '') + '</div>' +
      '<table class="rpt-tb"><thead><tr><th>区域</th><th>放什么</th><th>建议数量</th><th>容量上限</th><th>存放方式</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + (r.zone ? esc(r.zone) : '—') + '<small style="display:block;color:#657482">' + (r.no ? '离地 ' + fmt(r.from) + '–' + fmt(r.to) + 'mm<br>净高 ' + r.layerClear + 'mm' : '未排入') + '</small></td>' +
          '<td><b>' + esc(r.name) + '</b><small style="display:block;color:#657482">' + esc(r.dims) + ' mm</small></td>' +
          '<td>' + (r.no ? r.suggest + ' ' + esc(r.unit) : '—') + '</td><td>' + (r.no ? r.cap + ' ' + esc(r.unit) : '—') + '</td>' +
          '<td>' + esc(r.method) + (r.note ? '<small style="display:block;color:#a63f3f">' + esc(r.note) + '</small>' : '') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="ask-note">位置建议：高频物品放中段（离地约 ' + fmt(midFrom) + '–' + fmt(midTo) + 'mm），底层放重物和大件，顶层放低频备品或用收纳盒合并小件。</p>' +
      '<p class="ask-note">合计约 ' + fmt(total) + ' 件（已留取放余量）。物品与尺寸全部取自「' + esc(scene) + '」物品库的实测条目，未引入库外物品。</p>' +
      (remainTxt ? '<p class="ask-note">' + esc(remainTxt) + '</p>' : '') +
      (missed.length ? '<p class="ask-note">本柜放不下、需另设一柜或加大柜体的物品（' + missed.length + ' 项）：' + esc(missed.slice(0, 8).map(function (x) { return x.name; }).join('、')) + (missed.length > 8 ? ' 等' : '') + '</p>' : '') +
      '<p class="ask-note">依据：物品库实测尺寸 + 人体工学可达域分区（高频中段／重物落地／低频上层）+ 直立按净宽并排、层板按净高分层核算。</p>' +
      '<p class="ask-note">设计要点：' + esc(designTips.join('；')) + '</p>' +
      '<button type="button" class="secondary-btn ask-save" data-saveplan="1">把这份方案存入当前柜体（随报告与 PPTX 导出）</button>' +
      (fromQ.length ? '<button type="button" class="secondary-btn ask-fill" data-fill="' + [cab.length, cab.height, cab.depth].join(',') + '">把这三个尺寸填到左侧柜体</button>' : '');

    // 结构化行（给报告/PPTX 用）
    var seq = 0;
    var outRows = placed.map(function (r) {
      var where = r.zone;
      if (!where || where === '层板区') { seq++; where = '第 ' + seq + ' 层'; }
      return { where: where, name: r.name, unit: r.unit, suggest: r.suggest, cap: r.cap,
        from: Math.round(r.from), to: Math.round(r.to), clear: Math.round(r.layerClear) };
    });

    return { ok: true, html: html, text: lines.join('\n'), rows: outRows, scene: scene, question: question,
      layers: p.layers || placed.length, length: cab.length, height: cab.height, depth: cab.depth };
  }

  // ---------- 界面 ----------
  function mount() {
    var q = document.getElementById('askInput'), btn = document.getElementById('askBtn'), out = document.getElementById('askAnswer');
    if (!q || !btn || !out) return;
    var hint = document.getElementById('askSceneHint');
    var refresh = function () {
      var scene = window.YujiGeneral ? window.YujiGeneral.scene() : '';
      var names = lib().filter(function (it) { return it.scene === scene; }).map(function (it) { return it.name; });
      if (hint) hint.textContent = '当前场景「' + scene + '」可问的物品共 ' + names.length + ' 项：' + names.slice(0, 12).join('、') + (names.length > 12 ? ' …' : '');
    };
    refresh();
    var run = function () {
      var text = q.value.trim();
      if (!text) { out.innerHTML = '<p class="ask-note">请先写一句问题，例如「1米宽2米高5层板的茶水柜，建议怎么放」。</p>'; return; }
      var r = answer(text, null);
      out.innerHTML = r.ok ? r.html : '<p class="ask-note">' + esc(r.text) + '</p>';
      window._askText = r.ok ? r.text : '';
      window._askLast = r.ok ? r : null;
      if (r.ok && window.YujiGeneral && window.YujiGeneral.applyFromAsk) {
        var firstRow = (r.rows || []).filter(function (x) { return x && x.name; })[0];
        try { window.YujiGeneral.applyFromAsk({ length: r.length, height: r.height, depth: r.depth, itemName: firstRow ? firstRow.name : '' }); }
        catch (e) { if (window.showToast) showToast('右侧面板同步失败，可点「把这三个尺寸填到左侧柜体」手动填'); }
      }
      refresh();
    };
    btn.addEventListener('click', run);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); run(); } });
    var copyBtn = document.getElementById('askCopyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      if (!window._askText) { if (window.showToast) showToast('先问一次再复制'); return; }
      if (window.copyText) copyText(window._askText + '\n（依据：本场景物品库实测尺寸 + 柜体净尺寸计算；下单前按实物复核）', '方案建议已复制');
    });
    document.querySelectorAll('#askExamples [data-ask]').forEach(function (b) {
      b.addEventListener('click', function () { q.value = b.dataset.ask; run(); });
    });
    out.addEventListener('click', function (e) {
      var sv = e.target.closest && e.target.closest('[data-saveplan]');
      if (sv) {
        var last = window._askLast;
        if (!last || !last.text) { if (window.showToast) showToast('先问一次再存入'); return; }
        window.__yujiAskPlan = {
          scene: last.scene, question: last.question, text: last.text, rows: last.rows || [],
          label: (document.getElementById('generalLabel') || {}).value || '', at: Date.now()
        };
        if (window.showToast) showToast('方案已存入当前柜体，加入项目汇总后会出现在报告与 PPTX 里');
        return;
      }
      var b = e.target.closest && e.target.closest('[data-fill]');
      if (!b) return;
      var v = b.dataset.fill.split(',');
      var set = function (id, val) { var el = document.getElementById(id); if (el) el.value = val; };
      set('generalLength', v[0]); set('generalHeight', v[1]); set('generalDepth', v[2]);
      var form = document.getElementById('generalForm');
      if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
      if (window.showToast) showToast('已把尺寸填到左侧柜体，可继续微调');
    });
  }

  window.YujiAsk = { answer: answer, parse: parseQuestion, mount: mount };
  if (document.addEventListener) document.addEventListener('DOMContentLoaded', function () { setTimeout(mount, 60); });
})();
