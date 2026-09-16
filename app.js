'use strict';

const STORAGE_KEY = 'yujistorage-capacity-calc-v1';
const $ = id => document.getElementById(id);
const num = id => Math.max(0, Number($(id)?.value || 0));
const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
const fmt = value => Math.round(value).toLocaleString('zh-CN');

const shoeTypes = {
  mixed: {name:'综合常用鞋', pitch:190, height:170, depth:350, note:'男女常用鞋混合；并排口径。'},
  womenFlat: {name:'女平底 / 小皮鞋', pitch:165, height:120, depth:300, note:'女鞋宽 80mm（万物与尺度实测）×2 + 缝'},
  womenSport: {name:'女运动 / 厚底鞋', pitch:175, height:150, depth:320, note:'鞋高约 15cm'},
  men: {name:'男鞋 / 运动鞋', pitch:205, height:170, depth:350, note:'男鞋宽 100mm（万物与尺度实测）×2 + 缝'},
  child: {name:'儿童鞋', pitch:135, height:150, depth:260, note:'按年龄复核鞋长（1-2岁140 → 11-13岁245）'},
  shortBoot: {name:'短靴', pitch:205, height:200, depth:360, note:'靴筒不额外占宽，鞋高约 16–18cm'},
  highBoot: {name:'长靴 / 高筒雨靴', pitch:330, height:450, depth:380, note:'鞋面宽 158mm（实测）×2 并按靴筒留缝'},
  guest: {name:'客用拖鞋', pitch:235, height:120, depth:300, note:'客拖实测 280×115，成对并放'}
};
// 摆放口径：pitch 基准是「并排直放」实测口径；错位/斜插按达哥量化口径折算
const layModes = {
  stagger: {name:'错位摆放（达哥口径 · 每米约 8 双）', factor:0.61, note:'相邻两双错开半只，实测男鞋约 125mm/双、女鞋约 100mm/双，与达哥「100cm 宽放 8 双男鞋 / 10 双女鞋」一致。'},
  side:    {name:'并排直放（保守 · 每米约 5 双）', factor:1.00, note:'两鞋并排、一目了然，取放最顺手，但占宽约为错位摆放的 1.6 倍。'}
};


let projectItems = [];
let deferredInstallPrompt = null;
let lastShoeResult = null;
let lastWardrobeResult = null;
let toastTimer = null;

function populateShoeTypes(){
  $('shoeType').innerHTML = Object.entries(shoeTypes).map(([key,item]) => `<option value="${key}"${key==='mixed'?' selected':''}>${item.name}</option>`).join('');
  $('shoeMixRows').innerHTML = Object.entries(shoeTypes).filter(([key]) => key !== 'mixed').map(([key,item]) => `
    <label class="mix-row"><b>${item.name}</b><small>${item.height}高 / ${item.pitch}宽</small><span>层数</span><input class="mix-input" type="number" min="0" max="20" value="0" data-shoe-key="${key}" aria-label="${item.name}层数"></label>`).join('');
}

function getMixRows(){
  return [...document.querySelectorAll('.mix-input')].map(input => ({key:input.dataset.shoeKey, rows:clampInt(input.value,0,20)})).filter(item => item.rows > 0);
}

function shoeCalculation(){
  const width = num('shoeWidth');
  const height = num('shoeHeight');
  const depth = num('shoeDepth');
  const board = num('shoeBoard');
  const plinth = num('shoePlinth');
  const dividers = clampInt(num('shoeDividers'),0,8);
  const reserved = num('shoeReserved');
  const clearance = num('shoeClearance');
  const growth = Number($('shoeGrowth').value || 0);
  const selectedKey = $('shoeType').value;
  const selected = shoeTypes[selectedKey];
  const layKey = ($('shoeLayMode') && $('shoeLayMode').value) || 'stagger';
  const lay = layModes[layKey] || layModes.stagger;
  const pitchOf = type => Math.max(40, type.pitch * lay.factor);   // 每双实际占宽
  const columns = dividers + 1;
  const netWidth = Math.max(0, width - (2 + dividers) * board);
  const netHeight = Math.max(0, height - plinth - reserved - board * 2);
  const cellWidth = columns ? netWidth / columns : netWidth;
  const mix = getMixRows();
  let capacity = 0;
  let rows = 0;
  let requiredHeight = 0;
  let minDepth = selected.depth;
  let perRow = 0;
  let perBay = 0;
  let unitHeight = selected.height + clearance + board;
  let detail = [];
  if (mix.length){
    mix.forEach(entry => {
      const type = shoeTypes[entry.key];
      const bay = Math.floor(cellWidth / pitchOf(type));
      const row = bay * columns;
      perRow += row;
      capacity += row * entry.rows;
      rows += entry.rows;
      requiredHeight += entry.rows * (type.height + clearance);
      minDepth = Math.max(minDepth, type.depth);
      unitHeight = Math.max(unitHeight, type.height + clearance + board);
      detail.push({name:type.name, rows:entry.rows, perRow:row, perBay:bay, pitch:Math.round(pitchOf(type)), capacity:row * entry.rows});
    });
    requiredHeight += Math.max(0, rows - 1) * board;
    const match = detail[0] && Object.values(shoeTypes).find(t => t.name === detail[0].name);
    perBay = (match && columns) ? Math.floor(cellWidth / pitchOf(match)) : 0;
  } else {
    unitHeight = selected.height + clearance + board;
    rows = unitHeight > 0 ? Math.floor((netHeight + board) / unitHeight) : 0;
    perBay = Math.floor(cellWidth / pitchOf(selected));
    perRow = perBay * columns;
    capacity = rows * perRow;
    requiredHeight = rows * (selected.height + clearance) + Math.max(0, rows - 1) * board;
    detail = [{name:selected.name, rows, perRow, perBay, pitch:Math.round(pitchOf(selected)), capacity}];
  }
  const safe = Math.floor(capacity / (1 + growth));
  const depthPass = depth >= minDepth;
  const heightPass = requiredHeight <= netHeight + 1;
  const widthPass = perBay >= 1;
  const warnings = [];
  // —— 提升空间：给出可增容的杠杆（都是按同一口径真算出来的）
  const hints = [];
  if (rows > 0 && perBay > 0){
    // ① 中隔数量：把宽度切成几格最划算
    let best = null;
    for (let d = 0; d <= 4; d++){
      const cols = d + 1;
      const nw = Math.max(0, width - (2 + d) * board);
      const cw = nw / cols;
      const cap = rows * Math.floor(cw / pitchOf(selected)) * cols;
      if (!best || cap > best.cap) best = {d, cap, cols};
    }
    if (best && best.cap > capacity){
      hints.push(`中隔 ${dividers} 个 → ${best.d} 个：容量 ${fmt(capacity)} 双 → ${fmt(best.cap)} 双（+${fmt(best.cap - capacity)} 双）。窄格放不满一双就浪费宽度，分格越细越吃亏。`);
    }
    // ② 其它占高（抽屉 / 换鞋凳 / 开放格）每让出一层高度就多一层
    if (reserved > 0 && unitHeight > 0){
      const freed = Math.min(reserved, unitHeight);
      const extraLayers = Math.floor((netHeight + freed + board) / unitHeight) - rows;
      if (extraLayers > 0) hints.push(`其它占高每让出 ${fmt(unitHeight)}mm（当前占用 ${fmt(reserved)}mm）→ 多 ${extraLayers} 层，约 +${fmt(extraLayers * perRow)} 双。抽屉/换鞋凳的位置可以换成浅抽或不占净高。`);
    }
    // ③ 余深：鞋柜深了不等于容量高，但可加五金换成两层
    const spare = depth - Math.max(selected.depth, minDepth);
    if (spare >= 150) hints.push(`柜深比鞋长多 ${fmt(spare)}mm。深柜不会自动多放鞋，但可加「抽拉/斜插鞋架」把每层变两层（约 +30%～50%），需配五金并确认取放动作。`);
    // ④ 口径提醒
    if (layKey === 'side') hints.push('当前按「并排直放」保守口径。若现场实际是错位摆放（相邻两双错开半只），切到「错位摆放」可以再增容约 60%——报客户前请确认实际摆法。');
  }
  if (!widthPass) warnings.push({level:'danger', text:'单格净宽不足以放下一双选定鞋型，请减少中隔或加宽柜体。'});
  if (!heightPass) warnings.push({level:'danger', text:`混合层高需要约 ${fmt(requiredHeight)}mm，超过可用净高 ${fmt(netHeight)}mm。`});
  if (!depthPass) warnings.push({level:'danger', text:`柜深不足：当前 ${fmt(depth)}mm，建议至少按 ${fmt(minDepth)}mm 初审。`});
  if (plinth < 150) warnings.push({level:'', text:'玄关底部悬空通常建议 150–180mm；若不悬空可忽略。'});
  if (depth >= 450) warnings.push({level:'', text:'鞋柜过深不等于容量更高，需防止里外双排导致看不见、难归位。'});
  if (!warnings.length) warnings.push({level:'ok', text:'尺寸初审通过；仍需核对门板开启、踢脚线、层板调节孔和现场完成面。'});
  return {type:'鞋柜', label:$('shoeLabel').value.trim() || '未编号鞋柜', width,height,depth,board,plinth,reserved,dividers,columns,netWidth,netHeight,clearance,growth,selectedKey,selectedName:selected.name,layKey,layName:lay.name,layNote:lay.note,pitchUsed:Math.round(pitchOf(selected)),capacity,safe,rows,perRow,perBay,requiredHeight,minDepth,detail,valid:widthPass&&heightPass&&depthPass,warnings,hints};
}

function wardrobeCalculation(){
  const width = num('wardrobeWidth');
  const height = num('wardrobeHeight');
  const depth = num('wardrobeDepth');
  const board = num('wardrobeBoard');
  const top = num('wardrobeTop');
  const growth = Number($('wardrobeGrowth').value || 0);
  const shortWidth = num('shortWidth');
  const shortRails = clampInt(num('shortRails'),1,2);
  const shortPitch = num('shortPitch');
  const longWidth = num('longWidth');
  const longLength = num('longLength');
  const longPitch = num('longPitch');
  const foldWidth = num('foldWidth');
  const foldLayers = clampInt(num('foldLayers'),0,15);
  const foldPerStack = clampInt(num('foldPerStack'),1,20);
  const drawerCount = clampInt(num('drawerCount'),0,20);
  const drawerCapacity = clampInt(num('drawerCapacity'),1,100);
  const netWidth = Math.max(0,width - board * 4);
  const netHeight = Math.max(0,height - top - board * 2);
  const allocatedWidth = shortWidth + longWidth + foldWidth;
  const shortPerRail = shortPitch ? Math.floor(shortWidth / shortPitch) : 0;
  const shortCapacity = shortPerRail * shortRails;
  const longCapacity = longPitch ? Math.floor(longWidth / longPitch) : 0;
  const hangingCapacity = shortCapacity + longCapacity;
  const stacksPerLayer = Math.floor(foldWidth / 300);
  const foldCapacity = stacksPerLayer * foldLayers * foldPerStack;
  const drawerTotal = drawerCount * drawerCapacity;
  const safeHang = Math.floor(hangingCapacity / (1 + growth));
  const safeFold = Math.floor(foldCapacity / (1 + growth));
  const safeDrawer = Math.floor(drawerTotal / (1 + growth));
  const shortNeed = shortRails * 1000 + Math.max(0,shortRails-1) * board;
  const longNeed = longLength + 80;
  const widthPass = allocatedWidth <= netWidth + 1;
  const depthPass = depth >= 600;
  const shortPass = shortNeed <= netHeight + 1;
  const longPass = longNeed <= netHeight + 1;
  const warnings = [];
  if (!widthPass) warnings.push({level:'danger',text:`分区净宽合计 ${fmt(allocatedWidth)}mm，超过可用净宽 ${fmt(netWidth)}mm。`});
  else if (netWidth - allocatedWidth > 120) warnings.push({level:'',text:`还有约 ${fmt(netWidth-allocatedWidth)}mm 净宽未分配，可用于侧板误差、次净衣或配饰区。`});
  if (!depthPass) warnings.push({level:'danger',text:'衣柜外深不足 600mm，挂衣可能顶门或被移门轨道压缩；需结合门型复核净深 550–560mm。'});
  if (!shortPass) warnings.push({level:'danger',text:`短衣区需要约 ${fmt(shortNeed)}mm 净高，当前扣除顶柜后仅 ${fmt(netHeight)}mm。`});
  if (!longPass) warnings.push({level:'danger',text:`长衣区需要约 ${fmt(longNeed)}mm 净高，当前扣除顶柜后仅 ${fmt(netHeight)}mm。`});
  if (foldPerStack > 10) warnings.push({level:'',text:'每摞超过 10 件后容易抽取塌落，建议增加层板而不是继续向上叠。'});
  if (!warnings.length) warnings.push({level:'ok',text:'尺寸初审通过；深化时再核对门型、铰链、抽屉冲突、灯带电源与顶封板。'});
  return {type:'衣柜',label:$('wardrobeLabel').value.trim()||'未编号衣柜',width,height,depth,board,top,growth,netWidth,netHeight,allocatedWidth,shortWidth,shortRails,shortPitch,shortCapacity,shortNeed,longWidth,longLength,longPitch,longCapacity,longNeed,foldWidth,foldLayers,foldPerStack,stacksPerLayer,foldCapacity,drawerCount,drawerCapacity,drawerTotal,hangingCapacity,safeHang,safeFold,safeDrawer,valid:widthPass&&depthPass&&shortPass&&longPass,warnings};
}

function renderShoe(){
  const r = shoeCalculation(); lastShoeResult = r;
  $('shoeCapacity').textContent = fmt(r.capacity); $('shoeSafe').textContent = `${fmt(r.safe)} 双`;
  $('shoeReserveText').textContent = r.growth ? `已留 ${Math.round(r.growth*100)}% 增量` : '未预留未来增量';
  $('shoeNetWidth').textContent = `${fmt(r.netWidth)} mm（${r.columns} 格，每格 ${fmt(r.netWidth/r.columns)} mm）`;
  $('shoeNetHeight').textContent = `${fmt(r.netHeight)} mm`;
  $('shoeLayerInfo').textContent = r.detail.length===1
    ? `${r.perBay} 双/格 × ${r.columns} 格 = ${r.perRow} 双/层 × ${r.rows} 层`
    : `${r.detail.length} 类混合 × ${r.rows} 层（合计 ${r.perRow} 双/层）`;
  $('shoeDepthCheck').textContent = `${fmt(r.depth)} / 建议≥${fmt(r.minDepth)} mm`;
  $('shoeDimWidth').textContent = `${fmt(r.width)} mm`; $('shoeDimHeight').textContent = `${fmt(r.height)} mm`;
  $('shoeStatus').textContent = r.valid ? '初审通过' : '需要调整'; $('shoeStatus').classList.toggle('warn',!r.valid);
  const layLine = `<div class="warning ok">口径：${r.layName}｜每双占宽按 ${r.pitchUsed} mm 计（${r.selectedName}）</div>`;
  const hintLines = (r.hints && r.hints.length) ? r.hints.map(h=>`<div class="warning">提升空间：${h}</div>`).join('') : '';
  $('shoeWarnings').innerHTML = r.warnings.map(w=>`<div class="warning ${w.level}">${w.text}</div>`).join('') + layLine + hintLines;
  const displayRows = Math.max(1,Math.min(r.rows,12));
  $('shoeDiagram').style.setProperty('--rows',displayRows); $('shoeDiagram').style.setProperty('--cols',Math.max(1,r.columns));
  $('shoeDiagram').innerHTML = Array.from({length:displayRows*r.columns},()=>'<i class="shoe-cell"></i>').join('');
  scheduleSave();
}

function renderWardrobe(){
  const r = wardrobeCalculation(); lastWardrobeResult = r;
  $('hangingCapacity').textContent=fmt(r.hangingCapacity); $('foldCapacity').textContent=fmt(r.foldCapacity); $('drawerTotal').textContent=fmt(r.drawerTotal);
  $('wardrobeSafe').textContent=`挂 ${fmt(r.safeHang)} · 叠 ${fmt(r.safeFold)} · 抽 ${fmt(r.safeDrawer)} 件`;
  $('wardrobeReserveText').textContent=r.growth?`已留 ${Math.round(r.growth*100)}% 增量`:'未预留未来增量';
  $('wardrobeWidthUse').textContent=`${fmt(r.allocatedWidth)} / ${fmt(r.netWidth)} mm`;
  $('shortResult').textContent=`${r.shortRails} 层 × ${Math.floor(r.shortWidth/r.shortPitch)} 件 = ${fmt(r.shortCapacity)} 件`;
  $('longResult').textContent=`${fmt(r.longCapacity)} 件 · 挂长 ${fmt(r.longLength)}mm`;
  $('wardrobeDepthCheck').textContent=`外深 ${fmt(r.depth)}mm / 建议 600mm`;
  $('wardrobeDimWidth').textContent=`${fmt(r.width)} mm`; $('wardrobeDimHeight').textContent=`${fmt(r.height)} mm`;
  $('wardrobeStatus').textContent=r.valid?'初审通过':'需要调整'; $('wardrobeStatus').classList.toggle('warn',!r.valid);
  $('wardrobeWarnings').innerHTML=r.warnings.map(w=>`<div class="warning ${w.level}">${w.text}</div>`).join('');
  const total=Math.max(1,r.allocatedWidth); const drawerShare=Math.min(r.foldWidth*.38,r.foldWidth);
  $('wardrobeDiagram').innerHTML=`<div class="wardrobe-zone short" style="flex:${r.shortWidth/total}"><span>短衣 × ${r.shortRails}</span></div><div class="wardrobe-zone long" style="flex:${r.longWidth/total}"><span>长衣</span></div><div class="wardrobe-zone fold" style="flex:${Math.max(0,r.foldWidth-drawerShare)/total}"><span>叠放</span></div><div class="wardrobe-zone drawer" style="flex:${drawerShare/total}"><span>抽屉</span></div>`;
  scheduleSave();
}

function switchView(name){
  document.querySelectorAll('.mode-tab').forEach(btn=>{const active=btn.dataset.view===name;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));});
  const target=$(`${name}View`); if(!target) return;
  document.querySelectorAll('.calculator-view').forEach(view=>view.classList.remove('active'));
  target.classList.add('active'); window.scrollTo({top:0,behavior:'smooth'});
  if(name==='summary') renderSummary();
}

function addItem(result){
  const stamp = new Date();
  projectItems.push({...result,id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,createdAt:stamp.toISOString(),warnings:result.warnings.map(w=>({...w}))});
  renderSummary(); saveState(); showToast(`${result.label} 已加入项目汇总`);
}

function renderSummary(){
  $('summaryCount').textContent=projectItems.length; $('kpiCabinets').textContent=projectItems.length;
  const shoes=projectItems.filter(x=>x.type==='鞋柜'||(x.type==='全屋物品'&&x.category==='鞋类')).reduce((s,x)=>s+(x.capacity||0),0);
  const hang=projectItems.filter(x=>x.type==='衣柜').reduce((s,x)=>s+x.hangingCapacity,0)+projectItems.filter(x=>x.type==='全屋物品'&&x.scene==='衣帽'&&x.method==='hang').reduce((s,x)=>s+x.capacity,0);
  const fold=projectItems.filter(x=>x.type==='衣柜').reduce((s,x)=>s+x.foldCapacity+x.drawerTotal,0)+projectItems.filter(x=>x.type==='全屋物品'&&x.scene==='衣帽'&&x.method==='stack-group').reduce((s,x)=>s+x.capacity,0);
  $('kpiShoes').textContent=fmt(shoes); $('kpiHang').textContent=fmt(hang); $('kpiFold').textContent=fmt(fold);
  $('emptySummary').hidden=projectItems.length>0;
  $('summaryBody').innerHTML=projectItems.map(item=>{
    const cap=item.type==='鞋柜'?`理论 ${fmt(item.capacity)} 双 / 建议 ${fmt(item.safe)} 双`:item.type==='衣柜'?`挂 ${fmt(item.hangingCapacity)} · 叠 ${fmt(item.foldCapacity)} · 抽 ${fmt(item.drawerTotal)} 件`:`${escapeHtml(item.itemName)}：理论 ${fmt(item.capacity)} ${escapeHtml(item.unit)} / 建议 ${fmt(item.safe)} ${escapeHtml(item.unit)}`;
    return `<tr><td><b>${escapeHtml(item.label)}</b><small>${new Date(item.createdAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></td><td>${item.type}</td><td>${fmt(item.width)} × ${fmt(item.depth)} × ${fmt(item.height)} mm</td><td>${cap}</td><td><b style="color:${item.valid?'var(--ok)':'var(--danger)'}">${item.valid?'初审通过':'需要调整'}</b><small>${item.warnings.length} 条提醒</small></td><td><button class="delete-btn" data-delete-id="${item.id}" aria-label="删除 ${escapeHtml(item.label)}">×</button></td></tr>`;
  }).join('');
}

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

function resultText(r){
  if(r.type==='鞋柜') return `${r.label}｜${r.width}×${r.depth}×${r.height}mm｜净宽${Math.round(r.netWidth)}mm（${r.columns}格），净高${Math.round(r.netHeight)}mm｜存放口径：${r.layName}，每双占宽${r.pitchUsed}mm｜理论容量${r.capacity}双（${r.perBay}双/格×${r.columns}格×${r.rows}层），预留${Math.round(r.growth*100)}%后建议${r.safe}双｜${r.valid?'初审通过':'需要调整'}：${r.warnings.map(w=>w.text).join('；')}${(r.hints&&r.hints.length)?'｜提升空间：'+r.hints.join('；'):''}`;
  if(r.type==='全屋物品') return `${r.label}｜${r.scene}｜${r.itemName}｜柜体总长${r.width}×总深${r.depth}×总高${r.height}mm，单格宽${r.bayWidth}mm｜理论容量${r.capacity}${r.unit}，预留${Math.round(r.growth*100)}%后建议${r.safe}${r.unit}｜${r.valid?'初审通过':'需要调整'}：${r.warnings.map(w=>w.text).join('；')}`;
  return `${r.label}｜${r.width}×${r.depth}×${r.height}mm｜挂衣${r.hangingCapacity}件（建议${r.safeHang}），叠衣${r.foldCapacity}件（建议${r.safeFold}），抽屉小件${r.drawerTotal}件（建议${r.safeDrawer}）｜${r.valid?'初审通过':'需要调整'}：${r.warnings.map(w=>w.text).join('；')}`;
}

function buildAuditPrompt(){
  const project=$('projectName').value.trim()||'未命名项目'; const designer=$('designerName').value.trim()||'未填写';
  const records=projectItems.length?projectItems.map((x,i)=>`${i+1}. ${resultText(x)}`).join('\n'):'暂无已加入汇总的柜体，请先提醒我补充数据。';
  return `你是一名严谨的全屋定制与收纳系统深化总监。请复核下面的全屋物品容量初算，不迎合，不把“体积塞得下”或“柜子多”当作“好用”。\n\n【项目】${project}\n【设计师】${designer}\n【计算记录】\n${records}\n\n【总复核原则】\n1. 所有尺寸以 mm 为单位，明确区分柜体外尺寸、柜内净尺寸、板厚、背板、门板、轨道、五金、踢脚、封板和安装误差。\n2. 必须按实际存放动作判断：单排、前后双排、成摞、直立、悬挂、抽屉分格或独立大件；不能只用柜体体积除以物品体积。\n3. 高频物品优先一眼可见、单手可取、顺手归位；低频物品才进入高位和深处。当前装载量保留 15%–25% 增量。\n4. 鞋柜按鞋长、鞋高和成双占宽检查；长靴、儿童鞋、客拖、鞋盒分开核算，并检查湿鞋通风、底部悬空与换鞋动作。\n5. 衣柜按短挂、长挂、厚衣、裤装、叠衣、内衣袜、配饰、包袋、次净衣、次日衣和换季区拆分；挂衣按衣架占杆宽，叠衣按单摞宽度和每摞件数核算。\n6. 厨房按取—洗—切—炒—装—上桌—回收—清洗—归位复核；锅把、锅盖、餐具叠高、小家电开盖散热、调料单排可视、米油承重、垃圾投放和水电位置分别校验。\n7. 卫浴柜区分干区、湿区、洗护瓶、纸品、毛巾、吹风机和清洁工具；检查泵头高度、防潮通风、插座防水、可拆洗与漏液托盘。\n8. 家政柜检查吸尘器、洗地机、扫地机、拖把、地刷、洗涤剂、纸品和床品；必须预留充电、散热、沥水、设备拆卸和检修路径。\n9. 书柜与文件柜按书型、文件盒高度、层板跨度和满载承重复核；儿童用品低位可达，大件储藏检查防倒与完整搬运通道。\n10. 同时检查门扇开启、抽屉拉出、铰链、移门轨道、灯带、插座、梁柱、窗帘盒、空调口、踢脚线、墙地顶误差、检修口和安装收口。\n11. 老人和儿童分别校验可达性、安全与误触风险；刀具、药品、电器和重物不得只按容量判断。\n12. 资料不足时明确写“无法确认”，不得假定通过；经验值与 OCR 数据不得冒充国家标准或施工定值。\n\n【请按此格式输出】\nA. 一句话总判断\nB. 容量复算表：原计算、复核值、差异、原因\nC. 使用场景与取放动作问题\nD. 功能分区缺口：少了什么、影响谁、发生在什么动作\nE. 尺寸、承重、水电、通风与五金冲突：通过 / 需调整 / 无法确认\nF. 调整建议：按优先级给出具体到 mm、层数、单格或分区比例的方案\nG. 现场必须复尺清单\nH. 需要向业主补问的物品数量、型号与使用习惯\n\n只输出能支持决策的内容，不写空泛审美评价。`;
}

async function copyText(text,success){
  try{await navigator.clipboard.writeText(text);showToast(success);}catch{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showToast(success);}
}

window.getProjectItems=function(){return projectItems;};

function collectState(){
  const inputs={}; document.querySelectorAll('input:not([type=file]),select').forEach(el=>{inputs[el.id||`mix:${el.dataset.shoeKey}`]=el.value;});
  return {version:1,inputs,projectItems};
}

function applyState(state){
  if(!state||!state.inputs)return;
  Object.entries(state.inputs).forEach(([key,value])=>{const el=key.startsWith('mix:')?document.querySelector(`[data-shoe-key="${key.slice(4)}"]`):$(key);if(el)el.value=value;});
  projectItems=Array.isArray(state.projectItems)?state.projectItems:[];
}

function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(collectState()));$('saveStatus').textContent='已自动保存';}
function scheduleSave(){if(!$('saveStatus'))return;$('saveStatus').textContent='保存中…';clearTimeout(scheduleSave.timer);scheduleSave.timer=setTimeout(saveState,350);}
function showToast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2200);}

function downloadProject(){
  const blob=new Blob([JSON.stringify(collectState(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${($('projectName').value||'聿集收纳项目').replace(/[\\/:*?"<>|]/g,'-')}-容量核算.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function setNumeric(id,value,min=0,max=100000){if(!Number.isFinite(Number(value)))throw new Error(`${id} 必须是数字`);$(id).value=Math.max(min,Math.min(max,Number(value)));}

function registerWebMcp(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const tools=[
    {name:'read_project_capacity_summary',title:'读取项目容量汇总',description:'读取当前项目中已加入汇总的鞋柜和衣柜容量，不修改任何数据。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return {project:$('projectName').value,designer:$('designerName').value,cabinet_count:projectItems.length,shoe_pairs:projectItems.filter(x=>x.type==='鞋柜').reduce((s,x)=>s+x.capacity,0),hanging_items:projectItems.filter(x=>x.type==='衣柜').reduce((s,x)=>s+x.hangingCapacity,0),folded_and_drawer_items:projectItems.filter(x=>x.type==='衣柜').reduce((s,x)=>s+x.foldCapacity+x.drawerTotal,0)};}}
  ];
  tools.forEach(tool=>{try{Promise.resolve(context.registerTool(tool)).catch(()=>{});}catch{}});
}

function bindEvents(){
  document.querySelectorAll('.mode-tab').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  if($('shoeForm')) $('shoeForm').addEventListener('input',renderShoe);
  if($('wardrobeForm')) $('wardrobeForm').addEventListener('input',renderWardrobe);
  if($('projectName')) $('projectName').addEventListener('input',scheduleSave); $('designerName').addEventListener('input',scheduleSave);
  if($('addShoeBtn')) $('addShoeBtn').addEventListener('click',()=>addItem(lastShoeResult));
  if($('addWardrobeBtn')) $('addWardrobeBtn').addEventListener('click',()=>addItem(lastWardrobeResult));
  if($('copyShoeBtn')) $('copyShoeBtn').addEventListener('click',()=>copyText(resultText(lastShoeResult),'鞋柜核算结果已复制'));
  if($('copyWardrobeBtn')) $('copyWardrobeBtn').addEventListener('click',()=>copyText(resultText(lastWardrobeResult),'衣柜核算结果已复制'));
  // 报告与 PPTX 导出
  var rptBtn=$('reportBtn'); if(rptBtn) rptBtn.addEventListener('click',function(){ if(window.YujiReport) YujiReport.render(); });
  var pptxBtn=$('pptxBtn'); if(pptxBtn) pptxBtn.addEventListener('click',function(){ if(window.YujiReport) YujiReport.exportPPTX(pptxBtn); });
  var backRpt=$('backFromReportBtn'); if(backRpt) backRpt.addEventListener('click',function(){ switchView('summary'); });
  var printRpt=$('printReportBtn'); if(printRpt) printRpt.addEventListener('click',function(){ window.print(); });
  var pptxRpt=$('pptxFromReportBtn'); if(pptxRpt) pptxRpt.addEventListener('click',function(){ if(window.YujiReport) YujiReport.exportPPTX(pptxRpt); });
  const allAdviceBtn=$('copyAllAdviceBtn');
  if(allAdviceBtn) allAdviceBtn.addEventListener('click',()=>{
    if(!projectItems.length){showToast('还没有记录，先在全屋速算页加入汇总');return;}
    const text=projectItems.map(item=>window.YujiAdvice?YujiAdvice.toText(item,{userHeight:item.userHeight||1600}):'').filter(Boolean).join('\n────────────────\n');
    copyText('【'+($('projectName').value||'聿集项目')+'｜全屋收纳建议】共 '+projectItems.length+' 条核算\n\n'+text,'全屋收纳建议已复制');
  });
  $('copyPromptBtn').addEventListener('click',()=>copyText(buildAuditPrompt(),'完整 AI 复核提示词已复制'));
  $('printBtn').addEventListener('click',()=>window.print()); $('exportBtn').addEventListener('click',downloadProject);
  $('summaryBody').addEventListener('click',e=>{const id=e.target.dataset.deleteId;if(!id)return;projectItems=projectItems.filter(x=>x.id!==id);renderSummary();saveState();showToast('记录已删除');});
  $('importInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());applyState(data);if($('shoeForm'))renderShoe();if($('wardrobeForm'))renderWardrobe();renderSummary();saveState();showToast('项目数据已导入');}catch{showToast('导入失败：文件格式不正确');}e.target.value='';});
  $('resetAllBtn').addEventListener('click',()=>{if(!confirm('确定清空本机保存的项目信息和汇总记录吗？'))return;localStorage.removeItem(STORAGE_KEY);location.reload();});
  $('helpBtn').addEventListener('click',()=>$('helpDialog').showModal()); document.querySelector('.dialog-close').addEventListener('click',()=>$('helpDialog').close());
  if(document.querySelector('[data-shoe-preset]')) document.querySelector('[data-shoe-preset]').addEventListener('click',()=>{[['shoeWidth',1200],['shoeHeight',2200],['shoeDepth',380],['shoeBoard',18],['shoePlinth',160],['shoeReserved',320],['shoeDividers',1],['shoeClearance',20],['shoeLayMode','stagger'],['shoeType','mixed']].forEach(([id,v])=>$(id).value=v);document.querySelectorAll('.mix-input').forEach(x=>x.value=0);renderShoe();showToast('已套用常用玄关柜参数');});
  if(document.querySelector('[data-wardrobe-preset]')) document.querySelector('[data-wardrobe-preset]').addEventListener('click',()=>{[['wardrobeWidth',3000],['wardrobeHeight',2600],['wardrobeDepth',600],['wardrobeBoard',18],['wardrobeTop',450],['shortWidth',1000],['shortRails',2],['shortPitch',45],['longWidth',700],['longLength',1500],['longPitch',60],['foldWidth',700],['foldLayers',5],['foldPerStack',8],['drawerCount',4],['drawerCapacity',18]].forEach(([id,v])=>$(id).value=v);renderWardrobe();showToast('已套用双人主卧柜参数');});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installBtn').hidden=false;});
  $('installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt){$('helpDialog').showModal();return;}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installBtn').hidden=true;});
}

function init(){
  if($('shoeType')) populateShoeTypes();
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));applyState(saved);}catch{}
  bindEvents();
  if($('shoeForm')) renderShoe(); if($('wardrobeForm')) renderWardrobe();
  renderSummary(); registerWebMcp();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

document.addEventListener('DOMContentLoaded',init);
