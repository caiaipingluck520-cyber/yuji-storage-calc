/*!
 * advice.js · 收纳建议引擎
 * ------------------------------------------------------------------
 * 数据源：
 *  ① 《尺寸间的井井有条——手绘尺寸库》中国建筑工业出版社 2016
 *     （三档进深 20/30/40cm、人体比例尺、就近/集中/指定座位、透明容器、三排可视上限）
 *  ② 《助你打造一个井井有条的家》中国建筑工业出版社 2013
 *     （物尽其用·规模适当、家务动线就近衔接、衣帽间上装 60/下装 40 分开挂、长期规划）
 *  ③ 量化收纳体系 + 人体工学校核
 * 读札记：E:\蒸馏工作区\产物\读札记\读札记3__尺寸间的井井有条.md / 读札记4
 * ------------------------------------------------------------------
 * 输出：按「进深 / 高度分区 / 分区方式 / 收纳动作 / 场景专项 / 规模与未来」分组的
 *       人话建议，每条尽量带数字依据。
 */
(function () {
  'use strict';

  var NEAR_DEPTH = [200, 300, 400, 500];        // 近藤三档进深 + 微波炉50档
  var DEPTH_NAME = { 200: '20cm 档（盥洗/厨房/餐厅小件）', 300: '30cm 档（客厅/书房/A4/餐盘）', 400: '40cm 档（厨房/储物/家电）', 500: '50cm 档（微波炉/深家电）' };
  function round(n) { return Math.round(n); }
  function num(n) { return Number(n || 0); }

  // 按身高算关键高度（人体比例尺）
  function bodyBands(H) {
    return { hand: H * 0.4, shoulder: H * 0.8, eye: H * 0.9, reach: H * 1.2 };
  }

  function layerBands(r, H) {
    var b = bodyBands(H);
    var mh = num(r.moduleHeight), bd = num(r.board), plinth = num(r.plinth);
    var netH = num(r.netHeight);
    var rows = num(r.rows) || num(r.levels) || 0;
    if (!rows || !mh) return null;
    if (r.method === 'hang') {
      // 挂衣：杆位在段顶（下挂衣长 item.h），不是按层中点
      var rodTop = plinth + netH - 40;
      var rodLow = rodTop - (num((r.itemDims || {}).h) + 100);
      return { kind: 'hang', bands: b, rodTop: rodTop, rodLow: rodLow, levels: rows };
    }
    var shelves = [];
    for (var i = 1; i <= rows; i++) {
      var bottom = plinth + (i - 1) * (mh + bd);
      shelves.push({ i: i, bottom: bottom, top: bottom + mh });
    }
    var high = shelves.filter(function (x) { return x.bottom < b.eye && x.top > b.hand; });
    var over = shelves.filter(function (x) { return x.top > b.reach; });
    var low = shelves.filter(function (x) { return x.top <= b.hand; });
    return { kind: 'shelf', bands: b, shelves: shelves, high: high, over: over, low: low };
  }

  function sceneAdvice(r) {
    var out = [];
    var sc = r.scene || '', cat = r.category || '';
    if (cat === '鞋类' || sc === '玄关') {
      out.push('鞋按「使用者 + 目的」分类，不要按款式堆：四季鞋 / 雨天鞋 / 冬季靴 / 仪式用鞋各一处，全家人的鞋分区而不是混放。');
      out.push('朝向能省进深：男鞋鞋跟朝外、女鞋鞋头朝外，比统一朝向少要约 4cm 进深；靴子/长靴放 180cm 以上高位，用足柜顶空间。');
      out.push('底部悬空 150–180mm 放"当天穿的鞋"，是玄关不乱的开关；悬空区别做门。');
    }
    if (sc === '衣帽' || (cat === '衣物' && r.method === 'hang')) {
      out.push('上装挂宽 60cm、下装挂宽 40cm——上装比下装宽，两者必须分开挂，否则宽的上装会遮住下装、白白吃掉一排位置。');
      out.push('折叠尺寸按 25×35cm 做，正好放进 40cm 外径、深 20cm 的抽屉收纳盒：找一个尺寸做全套，盒子可互换、空间随时重排。');
      out.push('过道 ≥70cm 才能站着换衣；衣帽间进深 60cm 是挂大衣的底线。');
      out.push('质地要分开：棉质折小会起褶→熨后叠；毛衣挂久失去弹性→叠放；西装/大衣挂（用统一植绒衣架，肩宽 42cm）。');
    }
    if (sc === '厨房' || sc === '餐厅/茶饮') {
      out.push('厨房物品分五类定区：食品 / 烹饪（含家电）/ 餐具 / 杂物 / 密封容器——一类一处，不跨界。');
      out.push('家电要散热，进深按 40cm 档；微波炉要 50cm 档（或做"家电塔"解决）。操作高度离地 70–85cm 最省力。');
    }
    if (sc === '卫浴') {
      out.push('湿区不做密闭收纳：洗护瓶按"泵头高度 + 单手取用"排布，毛巾/浴巾留通风缝，柜内留沥水与检修。');
    }
    if (sc === '家政') {
      out.push('家务动线要就近衔接：洗→晾→收→叠四个动作尽量落在一处（3㎡ 就能做家务中枢）；吸尘器这类立式设备做 40×40×130cm 的专用柜并预留充电插座。');
    }
    if (sc === '书房') {
      out.push('文件与书按开本定深：A4/16 开要 30cm 档；书直立单排、脊背朝外，别前后塞两排（后排永远想不起来）。');
    }
    if (sc === '儿童/兴趣') {
      out.push('儿童物品放在孩子自己能拿到的低层（不用大人帮忙才算收纳成功），高频玩具用带轮开放盒，收的时候一起推进去。');
    }
    if (sc === '大件储藏') {
      out.push('大件（行李箱/备用椅/风扇）走"低频高位 + 完整搬运通道"：先留出取放路径，再谈能放几个。');
    }
    return out;
  }

  function buildStorageAdvice(r, opts) {
    opts = opts || {};
    var H = num(opts.userHeight) || 1600;
    var out = [];
    var item = r.itemDims || { w: 0, d: 0, h: 0 };
    var unit = r.unit || '件';
    var spareDepth = num(r.netDepth) - num(item.d);

    // ① 进深三档
    var fit = null;
    for (var i = 0; i < NEAR_DEPTH.length; i++) { if (item.d <= NEAR_DEPTH[i]) { fit = NEAR_DEPTH[i]; break; } }
    var g1 = [];
    if (!fit) g1.push('物品进深 ' + round(item.d) + 'mm 超出常规三档进深（20/30/40cm，微波炉 50cm）——按"大件另算"处理：大件单独给格，不要为了它把整排柜体加深。');
    if (fit || spareDepth >= 150) {
      if (fit) g1.push('物品本身进深 ' + round(item.d) + 'mm，对应「' + DEPTH_NAME[fit] + '」。');
      if (spareDepth >= 150) {
        g1.push('柜内净深 ' + round(r.netDepth) + 'mm，比物品多出 ' + round(spareDepth) + 'mm。**多出来的深度不会变成容量**——深处会变成"看不见、想不起来"的遗忘区。两条路：① 把柜深减到 ' + round(item.d + 50) + 'mm 左右，省出的空间还给走道（进深缩短 5cm，人的活动空间就多 5cm）；② 保留深柜就配抽拉/斜插五金，把深处变成能拉出来的第二排。');
      } else if (spareDepth >= 0) {
        g1.push('净深 ' + round(r.netDepth) + 'mm 与物品进深贴合（余 ' + round(spareDepth) + 'mm），这是最省空间的做法，保留。');
      } else {
        g1.push('净深不足物品进深，需要加深柜体或改成侧放/斜放。');
      }
    }
    if (!fit && spareDepth >= 0 && spareDepth < 150) g1.push('净深贴合大件尺寸，没有浪费，合理。');
    var rowsDeep = num(r.deep) || 1;
    if (rowsDeep > 3) g1.push('前后排数已达 ' + rowsDeep + ' 排：不弯腰能一眼看清的上限是**三排**，超过就会翻找。高频物品改单排，深处只放换季/囤货。');
    else if (rowsDeep === 3) g1.push('正好三排，是"一眼看清"的上限，再往深分就看不见了。');
    if (g1.length) out.push({ k: '进深与可视', items: g1 });

    // ② 高度分区（用身高比例，而不是统一黄金区）
    var b = layerBands(r, H);
    var g2 = [];
    if (b) {
      var bd = b.bands;
      g2.push('按使用者身高 ' + round(H) + 'mm 折算：够到上限 ' + round(bd.reach) + 'mm（身高×1.2）／视线 ' + round(bd.eye) + 'mm（×0.9）／垂手指尖 ' + round(bd.hand) + 'mm（×0.4）。');
      if (b.kind === 'hang') {
        var tooHigh = b.rodTop > bd.reach;
        g2.push('上挂杆离地约 ' + round(b.rodTop) + 'mm' + (tooHigh
          ? '，**超过够到上限 ' + round(bd.reach) + 'mm**：这一杆需要脚凳或梯子。柜子做到 2400mm 高就是这个结果——要么把最上层改成顶柜（放换季被褥，用取物篮），要么把挂杆降到 ' + round(bd.reach - 100) + 'mm 以内，要么上电动升降挂杆。'
          : '，在够到范围内，不需要脚凳。'));
        if (b.levels >= 2) g2.push('下挂杆离地约 ' + round(b.rodLow) + 'mm：这一杆在' + (b.rodLow >= bd.hand ? '手可及区' : '**低于垂手指尖 ' + round(bd.hand) + 'mm**，挂长衣会拖地/弯腰掏') + '，适合短衣或裤装（对折挂），别放及膝以上长衣。');
        g2.push('挂衣的省力区间是视线 ' + round(bd.eye) + 'mm 到够到上限 ' + round(bd.reach) + 'mm：衣架提挂点落在这个带里最省力；低于 ' + round(bd.hand) + 'mm 的杆只做下装。');
        if (b.rodTop - num((r.itemDims || {}).h) > bd.hand + 200) g2.push('单杆挂长衣时，杆下方还空着约 ' + round(b.rodTop - num((r.itemDims || {}).h) - bd.hand) + 'mm：别空着——装抽屉柜/行李箱低位区，或把下装区做成第二根杆。');
      } else {
        if (b.high.length) g2.push('黄金手可及区（' + round(bd.hand) + '–' + round(bd.eye) + 'mm）覆盖第 ' + b.high[0].i + '–' + b.high[b.high.length - 1].i + ' 层：每天用的东西全放这里，一个动作拿到、一个动作放回。');
        if (b.over.length) g2.push('从第 ' + b.over[0].i + ' 层起顶面离地超过够到上限（' + round(bd.reach) + 'mm）：只放换季/低频，配带把手或带标签的取物篮；家里有老人小孩时，这一层不要放重物和易碎品。');
        else g2.push('最高层顶面 ' + round(b.shelves[b.shelves.length - 1].top) + 'mm，仍在够到上限 ' + round(bd.reach) + 'mm 内，不需要脚凳——这是好尺寸。');
        if (b.low.length) g2.push('第 ' + b.low[0].i + '–' + b.low[b.low.length - 1].i + ' 层（顶面低于垂手指尖 ' + round(bd.hand) + 'mm）放重物：米油、锅具、箱装囤货，顺带满足重物低放的要求，起身也不费腰。');
        g2.push('每层按频率分三档：常用＝指尖到眼之间（' + round(bd.hand) + '–' + round(bd.eye) + 'mm）；时不时用＝它上下两侧（轻物在上、重物在下）；很少用＝最高处，用篮子取放，别每次搬梯子。');
      }
    }
    if (g2.length) out.push({ k: '高度分区（按身高算）', items: g2 });

    // ③ 分区方式与收纳动作
    var g3 = [];
    var bays = num(r.bays) || 1, cell = num(r.cellWidth);
    if (bays > 1 && num(r.across) > 0) g3.push('当前分 ' + bays + ' 格、每格净宽约 ' + round(cell) + 'mm，每格放 ' + round(r.across) + ' ' + unit + '。分格数量宁少勿碎：格子越窄，"放不满一个单位"的余宽就越多。');
    if (r.method === 'hang') g3.push('挂区按"上装 60cm / 下装 40cm 分开挂"，杆上留 20% 空位，衣服才不会挤成一片、看不见。');
    if (r.method === 'shelf-row' || r.method === 'shelf-grid') g3.push('层板深处要弯腰翻找的，改成抽屉式收纳盒或浅抽（取放动作压缩到 1–3 个动作内）；容器选透明或半透明，一眼看见才不会重复买。');
    if (r.method === 'stack-group') g3.push('成摞叠放每摞≤10 件，超过就抽取塌落；用统一尺寸的收纳盒切分，一眼一层。');
    if (r.method === 'vertical') g3.push('直立收纳（锅盖、烤盘、文件、雨伞）比平摞省空间也更好拿，配分隔架防止倒。');
    g3.push('三条收纳铁律：**就近存放**——东西放在它被使用的地方，不是放在空墙处；**同物集中**——同类只放一处，不分散到三个柜子；**指定座位**——每样东西有固定位置并贴标签，用完自动归位，不会"反弹"。');
    out.push({ k: '分区与收纳动作', items: g3 });

    // ④ 场景专项
    var g4 = sceneAdvice(r);
    if (g4.length) out.push({ k: '场景专项（' + (r.scene || '通用') + '）', items: g4 });

    // ⑤ 规模与未来
    var g5 = [];
    var growth = num(r.growth);
    g5.push('「物尽其用、规模适当」：收纳空间不是越大越好——太大就会什么都往里塞，取用反而更不方便。' + (r.capacity ? '当前理论容量 ' + r.capacity + ' ' + unit + '、建议实际放 ' + r.safe + ' ' + unit + '，' : '') + '请按家里实际物品数量定柜，不要为了"看起来能装"而加深加高。');
    g5.push(growth ? '已预留 ' + Math.round(growth * 100) + '% 增量（建议 15–25%），符合"长期规划"要求。' : '未预留增量：建议留 15–25% 空位，孩子长大、换季、添置都不用拆柜。');
    g5.push('长期规划（10/20/30 年）：层板做可调孔、挂杆可移位、隔板可拆——只做"小改造"就能适应孩子成长与父母养老，不用二次装修。');
    out.push({ k: '规模与未来', items: g5 });

    return out;
  }

  function adviceToText(r, opts) {
    var groups = buildStorageAdvice(r, opts);
    var head = '【收纳建议】' + (r.label ? r.label + ' · ' : '') + (r.itemName || '') + '（' + (r.scene || '') + '）\n';
    var body = groups.map(function (g) {
      return '\n▍' + g.k + '\n' + g.items.map(function (t) { return '· ' + t.replace(/\*\*/g, ''); }).join('\n');
    }).join('\n');
    return head + body + '\n\n依据：《尺寸间的井井有条》《井井有条的家》+ 量化收纳口径 + 人体工学校核\n';
  }

  function renderAdvice(result, opts) {
    var host = document.getElementById('generalAdvice');
    if (!host) return;
    var groups = buildStorageAdvice(result, opts);
    host.innerHTML = groups.map(function (g) {
      return '<div class="advice-group"><b>' + g.k + '</b><ul>' +
        g.items.map(function (t) { return '<li>' + t.replace(/\*\*(.+?)\*\*/g, '<em>$1</em>') + '</li>'; }).join('') +
        '</ul></div>';
    }).join('');
  }

  window.YujiAdvice = { build: buildStorageAdvice, toText: adviceToText, render: renderAdvice };
})();
