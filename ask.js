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
    '餐厅/茶饮': ['茶壶', '茶杯', '茶罐', '茶海', '泡茶盘', '茶漏'],
    '玄关': ['高筒雨靴', '男鞋', '女鞋', '儿童鞋', '客用拖鞋', '鞋盒', '长伞'],
    '厨房': ['中式炒锅', '西式平底锅', '米饭碗', '大号浅盘', '调味瓶', '米桶', '砧板', '收纳罐'],
    '卫浴': ['洗面奶', '乳液瓶', '牙刷杯', '毛巾', '浴巾', '卷纸', '吹风机'],
    '家政': ['吸尘器', '扫地机器人', '清洁剂', '洗涤', '纸巾', '拖把', '折叠椅'],
    '衣帽': ['大衣', '羽绒服', '女装短衣', '男装短衣', '真空压缩被', '针织帽'],
    '客厅/公共': ['遥控器', '充电器', '排插', '医药箱', '纸巾'],
    '书房': ['A4 书/资料', '正16开书', 'A5 书', '正32开书', '文件盒', '双孔文件夹'],
    '儿童/兴趣': ['大龄绘本', '低龄绘本', '玩具收纳箱', '乐高收纳盒'],
    '大件储藏': ['20寸登机箱', '24寸行李箱', '28寸行李箱', '32寸行李箱', '塑料堆叠椅', '折叠椅']
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

    // 候选物品：问句点名的优先，其次按场景推荐顺序
    var picked = [];
    p.items.forEach(function (name) {
      var hit = sceneItems.filter(function (it) { return it.name === name; })[0];
      if (hit && picked.indexOf(hit) < 0) picked.push(hit);
    });
    (SCENE_PRIORITY[scene] || []).forEach(function (kw) {
      sceneItems.forEach(function (it) { if (picked.indexOf(it) < 0 && it.name.indexOf(kw) >= 0 && picked.length < 7) picked.push(it); });
    });
    if (!picked.length) picked = sceneItems.slice(0, 5);

    var plinth = cab.plinth, rows = [], zones = [], remainTxt = '';

    // ===== 模式 A：问句给了层数 → 层高均匀 =====
    if (p.layers) {
      var L = Math.max(1, Math.min(12, p.layers));
      var lc = Math.floor((cab.netHeight - (L - 1) * cab.board) / L);
      var i = 0;
      picked.slice().sort(function (a, b) { return b.h - a.h || b.w - a.w; }).forEach(function (it) {
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
      // ===== 模式 B：按物品高度分区排布 =====
      var pool = picked.slice().sort(function (a, b) { return b.h - a.h || b.w - a.w; });
      var hangs = pool.filter(function (it) { return it.method === 'hang'; });
      var others = pool.filter(function (it) { return it.method !== 'hang'; });
      var used = 0, zIdx = 0;

      // ① 挂衣区
      if (hangs.length) {
        var longs = hangs.filter(function (it) { return it.h > 1050; });
        var shorts = hangs.filter(function (it) { return it.h <= 1050; });
        if (longs.length) {
          var rodL = Math.max.apply(null, longs.map(function (x) { return x.h; })) + 100;
          if (used + rodL + cab.board <= cab.netHeight) {
            zIdx++;
            var z1 = { zone: '长衣区（1 根杆）', no: zIdx, from: plinth + used, to: plinth + used + rodL, h: rodL };
            zones.push(z1);
            longs.forEach(function (it) {
              var cap = perLayer(it, cab);
              rows.push({ no: zIdx, zone: z1.zone, name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap,
                method: '挂杆悬挂', from: z1.from, to: z1.to, layerClear: rodL,
                suggest: Math.max(1, Math.floor(cap * 0.8)), note: '' });
            });
            used += rodL + cab.board;
          }
        }
        if (shorts.length) {
          var rodS = Math.max.apply(null, shorts.map(function (x) { return x.h; })) + 100;
          var avail = cab.netHeight - used;
          var fitRods = Math.floor((avail + cab.board) / (rodS + cab.board));
          var rods = Math.max(0, Math.min(2, fitRods));
          if (rods >= 1) {
            var zoneH = rodS * rods + cab.board * (rods - 1);
            zIdx++;
            var z2 = { zone: '短衣区（' + (rods === 2 ? '上下双杆' : '1 根杆') + '）', no: zIdx, from: plinth + used, to: plinth + used + zoneH, h: zoneH };
            zones.push(z2);
            shorts.forEach(function (it) {
              var cap = perLayer(it, cab) * rods;
              rows.push({ no: zIdx, zone: z2.zone, name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, pitch: it.w,
                method: '挂杆悬挂 ×' + rods, from: z2.from, to: z2.to, layerClear: rodS,
                suggest: Math.max(1, Math.floor(cap * 0.8)), note: '' });
            });
            used += zoneH + cab.board;
          } else if (longs.length) {
            shorts.forEach(function (it) {
              var cap = perLayer(it, cab);
              rows.push({ no: 1, zone: '与长衣区共用一根杆', name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, pitch: it.w,
                method: '挂杆悬挂', from: zones[0] ? zones[0].from : plinth, to: zones[0] ? zones[0].to : plinth, layerClear: zones[0] ? zones[0].h : 0,
                suggest: Math.max(1, Math.floor(cap * 0.6)), note: '与长衣共用杆，两类合计别超过一根杆的总量' });
            });
            remainTxt = '柜高不够再排一根短衣杆：若要短衣上下双杆（净高约 ' + (rodS * 2 + 100 + cab.board) + 'mm），长衣需要另设一柜或以挂衣间解决。';
          }
        }
      }

      // ② 层板 / 叠放区
      var n = rows.filter(function (r) { return r.zone === ''; }).length;
      others.forEach(function (it) {
        var need = clearOf(it), cap = perLayer(it, cab);
        if (cap < 1) {
          rows.push({ no: 0, zone: '', name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: 0, method: methodName(it.method),
            from: 0, to: 0, layerClear: 0, suggest: 0, note: '单格净宽 ' + Math.round(cab.cellWidth) + 'mm 放不下（需要净宽 ' + it.w + 'mm）' });
          return;
        }
        if (used + need + cab.board > cab.netHeight + 1) {
          rows.push({ no: 0, zone: '', name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap, method: methodName(it.method),
            from: 0, to: 0, layerClear: 0, suggest: 0, note: '余高不够（需要 ' + (need + cab.board) + 'mm，只剩 ' + Math.max(0, cab.netHeight - used) + 'mm）：建议与相邻层合并，或改用抽拉五金' });
          return;
        }
        n++;
        var bottom2 = plinth + used;
        rows.push({ no: 100 + n, zone: '层板区', name: it.name, unit: it.unit, dims: it.w + '×' + it.d + '×' + it.h, cap: cap,
          method: methodName(it.method), from: bottom2, to: bottom2 + need, layerClear: need,
          suggest: Math.max(1, Math.floor(cap * (it.h > 200 ? 0.7 : 0.75))), note: '' });
        used += need + cab.board;
      });
      if (zones.length && !p.layers) remainTxt = remainTxt || ('按上述分区后，柜内剩余高度约 ' + Math.max(0, Math.round(cab.netHeight - used)) + 'mm 可留作备用层。');
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
    if (placed.length) {
      var midIdx = Math.max(0, Math.floor((placed.length - 2) / 2));
      midFrom = placed[midIdx].from;
      midTo = placed[Math.min(placed.length - 1, midIdx + 1)].to;
    }

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

    return { ok: true, html: html, text: lines.join('\n'), rows: outRows, scene: scene, question: question, layers: p.layers || placed.length };
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
