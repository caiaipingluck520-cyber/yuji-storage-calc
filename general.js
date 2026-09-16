'use strict';

const sceneDefaults = {
  '玄关': {length:1200,bay:600,height:2200,depth:400,label:'C1 玄关综合柜'},
  '厨房': {length:1800,bay:600,height:900,depth:600,label:'C2 厨房储物柜'},
  '餐厅/茶饮': {length:1600,bay:800,height:900,depth:400,label:'C3 餐边茶水柜'},
  '卫浴': {length:900,bay:450,height:800,depth:550,label:'C4 浴室柜'},
  '家政': {length:1200,bay:600,height:2400,depth:650,label:'C5 家政柜'},
  '衣帽': {length:2400,bay:600,height:2600,depth:600,label:'C6 衣柜/衣帽柜'},
  '客厅/公共': {length:1800,bay:600,height:2200,depth:400,label:'C7 公共储物柜'},
  '书房': {length:1800,bay:600,height:2200,depth:320,label:'C8 书柜文件柜'},
  '儿童/兴趣': {length:1600,bay:800,height:1200,depth:450,label:'C9 儿童兴趣柜'},
  '大件储藏': {length:1800,bay:600,height:2400,depth:700,label:'C10 大件储藏柜'}
};

const m = (scene,category,name,w,d,h,method,unit,note,slide,extra={}) => ({scene,category,name,w,d,h,method,unit,note,slide,clearance:10,moduleHeight:Math.max(h+30,120),stackQty:1,...extra});

const objectLibrary = [
  m('大件储藏','儿童出行','儿童溜溜车',270,630,880,'volume','辆','整车直立停放，先留把手与拿取通道。',2,{clearance:30}),
  m('大件储藏','儿童出行','扭扭车',295,810,230,'volume','辆','低位平放，避免压在高处。',2,{clearance:30}),
  m('大件储藏','运动','轮滑鞋包',370,390,700,'volume','包','按整包直立，潮湿后需通风。',2,{clearance:30}),
  m('儿童/兴趣','运动','儿童滑板',200,100,700,'vertical','块','竖放槽位，固定轮子避免滑倒。',2,{clearance:30}),
  m('大件储藏','运动','高尔夫球包',300,360,950,'vertical','包','独立高柜直立，预留提拿高度。',3,{clearance:40}),
  m('大件储藏','代步','小米代步器',530,330,920,'volume','台','折叠后独立停放，并预留充电插座。',3,{clearance:40}),
  m('大件储藏','儿童出行','童车',550,600,900,'volume','辆','按折叠后实物复尺，靠近出入口。',3,{approx:true,clearance:50}),
  m('玄关','出门用品','买菜车/购物车',250,360,950,'vertical','辆','直立收纳，避免脏轮进入室内。',3,{clearance:30}),

  m('厨房','小家电','原汁机',200,250,400,'shelf-grid','台','高频用则放台面或腰部层板，预留上提空间。',4,{clearance:30,moduleHeight:460}),
  m('厨房','小家电','豆浆机',232,232,308,'shelf-grid','台','靠近插座与清洗点，层高留开盖余量。',4,{clearance:30,moduleHeight:370}),
  m('厨房','小家电','榨汁机',220,220,375,'shelf-grid','台','按整机占位，线材不得挤在机身后。',4,{clearance:30,moduleHeight:435}),
  m('厨房','小家电','5L 电水壶',170,290,340,'shelf-grid','台','大容量水壶较重，宜腰部以下稳固层板。',4,{clearance:30,moduleHeight:400}),
  m('厨房','小家电','1.7L 电水壶',160,220,260,'shelf-grid','台','靠近水源和插座，开盖区不被吊柜压住。',4,{clearance:30,moduleHeight:320}),
  m('厨房','小家电','压力锅',300,340,300,'shelf-grid','台','重物放低位，层板校验承重。',5,{clearance:30,moduleHeight:360}),
  m('厨房','小家电','电饭煲',250,400,280,'shelf-grid','台','抽拉操作时校验蒸汽、开盖和插座。',5,{clearance:40,moduleHeight:380}),
  m('厨房','小家电','20L 微波炉',460,352,280,'volume','台','独立电器格，四周散热和插座按型号复核。',5,{clearance:50}),
  m('厨房','小家电','23L 微波炉',490,380,300,'volume','台','独立电器格，门扇全开与散热按型号复核。',5,{clearance:50}),

  m('厨房','锅具','西式平底锅',280,470,100,'shelf-row','口','平放单排；若立放应改用锅具分隔架。',6,{clearance:20,moduleHeight:150}),
  m('厨房','锅具','中式炒锅',330,550,140,'shelf-row','口','锅把决定柜深，避免与门板冲突。',6,{clearance:20,moduleHeight:190}),
  m('厨房','锅具','辅锅/小奶锅',170,240,160,'shelf-grid','口','同系列可套叠，计算结果按独立放置更保守。',6,{clearance:15,moduleHeight:210}),
  m('厨房','备餐工具','大砧板',400,40,360,'vertical','块','竖放并留通风缝，湿砧板不封闭。',7,{clearance:15}),
  m('厨房','蒸煮','蒸笼',340,340,260,'shelf-grid','套','按整套叠放，层板需防潮。',7,{clearance:20,moduleHeight:310}),
  m('厨房','锅具','5L 陶锅',300,300,220,'shelf-grid','口','重物放低位，锅盖独立或倒扣。',7,{clearance:20,moduleHeight:270}),
  m('厨房','锅具','2.5L 陶锅',220,220,180,'shelf-grid','口','重物放低位，避免高处端取。',7,{clearance:20,moduleHeight:230}),
  m('厨房','容器','0.8L 玻璃碗',200,200,80,'stack-group','只','成摞收纳，默认每摞 6 只。',8,{stackQty:6,moduleHeight:150}),
  m('厨房','容器','1.2L 玻璃碗',230,230,90,'stack-group','只','成摞收纳，默认每摞 5 只。',8,{stackQty:5,moduleHeight:170}),
  m('厨房','备餐工具','沥水篮',220,220,120,'stack-group','只','同尺寸可套叠，默认每摞 3 只。',8,{stackQty:3,moduleHeight:180}),
  m('厨房','备餐工具','料理盆',300,300,120,'stack-group','只','同尺寸可套叠，默认每摞 4 只。',8,{stackQty:4,moduleHeight:200,approx:true}),
  m('厨房','烘焙','圆形烤盘',320,320,30,'vertical','只','竖插比平摞更易取，槽位需防滑。',9,{clearance:12}),
  m('厨房','烘焙','方形烤盘',300,250,23,'vertical','只','竖插收纳，靠近烤箱。',9,{clearance:12}),
  m('厨房','餐具','米饭碗',120,120,60,'stack-group','只','默认每摞 8 只，日常餐具靠近出餐点。',9,{stackQty:8,moduleHeight:180}),
  m('厨房','餐具','大汤碗',210,210,100,'stack-group','只','默认每摞 4 只，避免堆得过高。',9,{stackQty:4,moduleHeight:180}),
  m('厨房','餐具','面碗',185,185,85,'stack-group','只','默认每摞 5 只，重碗放下层。',9,{stackQty:5,moduleHeight:180}),
  m('厨房','餐具','小碟',120,120,23,'stack-group','只','默认每摞 10 只。',10,{stackQty:10,moduleHeight:140,approx:true}),
  m('厨房','餐具','大号深盘',200,200,40,'stack-group','只','默认每摞 8 只，盘边留指缝。',10,{stackQty:8,moduleHeight:150}),
  m('厨房','餐具','小号浅盘',200,200,25,'stack-group','只','默认每摞 10 只。',10,{stackQty:10,moduleHeight:140}),
  m('厨房','餐具','大号浅盘',230,230,30,'stack-group','只','默认每摞 8 只。',10,{stackQty:8,moduleHeight:150}),
  m('厨房','烘焙','擀面杖',55,490,55,'shelf-grid','根','水平单独放或抽屉分格，防止滚动。',11,{clearance:10,moduleHeight:100}),
  m('厨房','烘焙','油刷',40,190,40,'shelf-grid','把','抽屉分格，清洗晾干后归位。',11,{clearance:8,moduleHeight:100}),
  m('厨房','烘焙','刮刀',47,227,40,'shelf-grid','把','抽屉分格，按最长边校验抽屉净深。',11,{clearance:8,moduleHeight:100}),
  m('厨房','刀具','刀具收纳组',130,300,100,'shelf-grid','组','固定刀架或抽屉刀具盒，儿童不可达。',12,{clearance:15,moduleHeight:150}),
  m('厨房','量具','1000ml 量杯',145,145,117,'shelf-grid','只','杯口向上，避免叠压刻度。',13,{clearance:12,moduleHeight:165}),
  m('厨房','量具','500ml 量杯',115,115,105,'shelf-grid','只','可与大号套叠，当前按独立放置保守计算。',13,{clearance:12,moduleHeight:150}),
  m('厨房','备餐工具','窄面包板',150,500,20,'vertical','块','竖插通风，避免平摞难取。',13,{clearance:12}),
  m('厨房','备餐工具','宽面包板',240,480,20,'vertical','块','竖插通风，校验柜深。',13,{clearance:12}),
  m('厨房','烘焙','奶油打发器',120,180,90,'shelf-grid','个','抽屉或工具罐分格收纳。',13,{clearance:10,moduleHeight:140,approx:true}),
  m('厨房','清洁','海绵擦',110,30,30,'shelf-grid','块','湿物需沥水通风，不与食材混放。',14,{clearance:10,moduleHeight:90}),
  m('厨房','清洁','清洁锅刷',60,90,30,'shelf-grid','把','湿物需沥水，靠近水槽。',14,{clearance:10,moduleHeight:100}),
  m('厨房','储物罐','4.7L 收纳罐',160,250,315,'shelf-grid','只','按瓶底落位，标签朝外。',15,{clearance:15,moduleHeight:360}),
  m('厨房','储物罐','4L 收纳罐',160,250,260,'shelf-grid','只','按瓶底落位，常用放腰部。',15,{clearance:15,moduleHeight:305}),
  m('厨房','储物罐','1.6L 收纳罐',120,120,260,'shelf-grid','只','同规格并排，标签朝外。',15,{clearance:12,moduleHeight:305}),
  m('厨房','储物罐','1L 收纳罐',105,110,175,'shelf-grid','只','调料与干货分层。',15,{clearance:12,moduleHeight:220}),
  m('厨房','储物罐','0.5L 收纳罐',95,95,125,'shelf-grid','只','小罐用浅层或拉篮，避免深处失踪。',15,{clearance:10,moduleHeight:170}),
  m('厨房','耗材','厨房抹布',175,240,30,'stack-group','块','折叠成摞，干湿分开，默认每摞 8 块。',16,{stackQty:8,moduleHeight:140}),
  m('厨房','餐具','隔热餐垫',300,400,20,'vertical','张','竖放或卷放，靠近餐桌。',16,{clearance:10}),
  m('厨房','食材','5L 食用油',160,160,340,'shelf-grid','瓶','重瓶放低位，防漏托盘。',17,{clearance:15,moduleHeight:390}),
  m('厨房','食材','1.8L 食用油',120,120,290,'shelf-grid','瓶','靠近灶台但避开热源。',17,{clearance:15,moduleHeight:340}),
  m('厨房','餐具','汤勺',90,270,40,'shelf-grid','把','抽屉分格，按最长边校验。',18,{clearance:8,moduleHeight:90}),
  m('厨房','餐具','筷子',75,240,20,'shelf-grid','双','餐具抽屉分格，默认按一双计。',18,{clearance:5,moduleHeight:80}),
  m('厨房','餐具','饭勺',60,210,40,'shelf-grid','把','与电饭煲就近。',18,{clearance:8,moduleHeight:90}),
  m('厨房','餐具','主餐具套',125,220,40,'shelf-grid','套','刀叉勺按套分格，靠近餐厅。',19,{clearance:8,moduleHeight:90}),
  m('厨房','调味','250ml 调味瓶',50,50,210,'shelf-grid','瓶','单排可视优先，避免前后双排。',20,{clearance:10,moduleHeight:255}),
  m('厨房','调味','500ml 调味瓶',60,60,260,'shelf-grid','瓶','单排可视优先，抽拉篮需校验瓶高。',20,{clearance:10,moduleHeight:305}),
  m('厨房','调味','750ml 调味瓶',85,85,300,'shelf-grid','瓶','重瓶放下层，防漏托盘。',20,{clearance:10,moduleHeight:345}),
  m('厨房','调味','1000ml 调味瓶',100,100,300,'shelf-grid','瓶','按瓶底并排，校验拉篮净宽。',20,{clearance:10,moduleHeight:345}),
  m('厨房','耗材','厨房湿纸巾',205,55,120,'shelf-grid','包','一眼可见，靠近清洁点。',21,{clearance:10,moduleHeight:165,approx:true}),
  m('厨房','耗材','厨房纸巾',225,225,240,'shelf-grid','卷','保持干燥，避免灶火与水槽飞溅。',21,{clearance:15,moduleHeight:290}),
  m('厨房','清洁','长柄杯刷',60,60,290,'vertical','把','直立沥水，湿物通风。',21,{clearance:12}),
  m('厨房','垃圾分类','10L 垃圾桶',250,300,390,'shelf-grid','只','预留开盖、提袋和投放路径。',22,{clearance:30,moduleHeight:460}),
  m('厨房','粮食','10kg 米桶',315,350,320,'shelf-grid','只','重物低位，开盖与倒米动作要顺。',22,{clearance:30,moduleHeight:390}),
  m('厨房','粮食','15kg 米桶',320,350,350,'shelf-grid','只','重物低位，层板或底板校验承重。',22,{clearance:30,moduleHeight:420,approx:true}),

  m('卫浴','洗护瓶','250ml 换装瓶',67,67,125,'shelf-grid','瓶','湿区用品单排可视，标签朝外。',23,{clearance:10,moduleHeight:175}),
  m('卫浴','洗护瓶','450ml 换装瓶',67,67,180,'shelf-grid','瓶','校验镜柜层高与泵头。',23,{clearance:10,moduleHeight:230}),
  m('卫浴','洗护瓶','650ml 换装瓶',67,67,230,'shelf-grid','瓶','高瓶放下层，预留泵头操作。',23,{clearance:10,moduleHeight:280}),
  m('卫浴','清洁容器','水桶',310,310,250,'shelf-grid','只','倒扣或通风收纳，按实物直径复尺。',23,{clearance:20,moduleHeight:310,approx:true}),
  m('卫浴','清洁容器','洗脚桶',250,250,225,'shelf-grid','只','低位收纳，避免老人弯腰搬重水。',23,{clearance:20,moduleHeight:285,approx:true}),
  m('卫浴','织物','浴袍',520,80,1000,'hang','件','挂放并与湿毛巾分开，确保通风。',23,{clearance:20,moduleHeight:1100}),
  m('卫浴','洗护瓶','400ml 洗手液',75,75,152,'shelf-grid','瓶','台面或抽拉格，泵头留操作空间。',24,{clearance:10,moduleHeight:205}),
  m('卫浴','洗护瓶','自动洗手机',89,89,250,'shelf-grid','台','预留充电或电池维护空间。',24,{clearance:15,moduleHeight:305}),
  m('卫浴','洗护瓶','250ml 洗面奶',67,67,120,'shelf-grid','瓶','高频放镜柜腰眼区。',24,{clearance:10,moduleHeight:170}),
  m('卫浴','洗护瓶','650ml 乳液瓶',68,68,220,'shelf-grid','瓶','泵头留操作空间。',24,{clearance:10,moduleHeight:270}),
  m('卫浴','清洁工具','搓衣刷',120,175,20,'shelf-grid','把','湿刷通风，避免密闭发霉。',25,{clearance:10,moduleHeight:90}),
  m('卫浴','清洁工具','搓澡球',120,120,120,'shelf-grid','只','挂晾优先；柜内需完全干燥。',25,{clearance:20,moduleHeight:180,approx:true}),
  m('卫浴','清洁工具','丝瓜络沐浴擦',110,160,30,'shelf-grid','只','挂晾优先，避免长期封闭。',25,{clearance:10,moduleHeight:90}),
  m('家政','清洁工具','伸缩地刷',130,130,1190,'vertical','把','高柜直立，卡扣固定防倾倒。',25,{clearance:25}),
  m('卫浴','儿童洗护','婴儿洗澡盆',390,500,230,'volume','只','低频大件，挂墙或独立格，先量把手外廓。',26,{clearance:30}),
  m('卫浴','辅助用品','双层踩脚凳',295,390,230,'volume','只','儿童可达，取放不挡通道。',26,{clearance:20}),
  m('卫浴','清洁容器','洗脸盆',330,450,120,'stack-group','只','同尺寸可套叠，默认每摞 3 只。',26,{stackQty:3,moduleHeight:180}),
  m('卫浴','辅助用品','防滑凳',250,440,500,'volume','只','老人使用时应常驻，不宜藏得过深。',26,{clearance:30,approx:true}),
  m('卫浴','电器','戴森吹风机',245,75,230,'shelf-grid','台','预留线材、插座与散热，湿区防水。',27,{clearance:20,moduleHeight:290}),
  m('卫浴','梳理','齿梳',65,245,20,'shelf-grid','把','抽屉浅分格，便于一眼可见。',27,{clearance:8,moduleHeight:80}),
  m('卫浴','织物','毛巾（折叠）',185,170,40,'stack-group','条','默认每摞 6 条，干湿分区。',27,{stackQty:6,moduleHeight:180,approx:true}),
  m('卫浴','织物','浴巾（折叠）',350,260,70,'stack-group','条','默认每摞 4 条，柜内保持干燥。',27,{stackQty:4,moduleHeight:350,approx:true}),

  m('玄关','随身小物','钱包',120,90,40,'shelf-grid','个','浅抽屉定点归位，避免与钥匙刮碰。',28,{clearance:10,moduleHeight:90}),
  m('玄关','随身小物','车钥匙',80,40,25,'shelf-grid','把','入口第一落点，浅盘或挂钩。',28,{clearance:10,moduleHeight:80}),
  m('玄关','随身小物','门钥匙',50,30,20,'shelf-grid','把','入口第一落点，固定托盘或挂钩。',28,{clearance:10,moduleHeight:80}),
  m('玄关','纸品','小票',100,50,10,'stack-group','张','设置临时票据位并定期清理，默认每格 50 张。',28,{stackQty:50,moduleHeight:80}),
  m('玄关','纸品','信件',220,110,10,'stack-group','封','A4 以下临时文件格，默认每格 30 封。',28,{stackQty:30,moduleHeight:100}),
  m('玄关','雨具','普通长伞',100,100,1000,'vertical','把','湿伞区需接水盘、通风并与鞋分开。',29,{clearance:15}),
  m('玄关','雨具','特大长伞',120,120,1300,'vertical','把','独立高位槽，检查柜高。',29,{clearance:20}),
  m('玄关','包袋','日常拎包（薄）',320,80,290,'shelf-row','个','高频包不叠压，留提手高度。',29,{clearance:20,moduleHeight:350}),
  m('玄关','包袋','日常拎包（厚）',420,170,320,'shelf-row','个','单包独立格，防止挤压变形。',29,{clearance:20,moduleHeight:390}),
  m('玄关','衣物','外套',600,80,1100,'hang','件','回家临挂区，与洁净衣柜分开。',30,{clearance:20,moduleHeight:1200}),
  m('玄关','快递工具','剪刀',80,200,20,'shelf-grid','把','入口工具抽屉，儿童不可达。',30,{clearance:8,moduleHeight:80,approx:true}),
  m('玄关','快递工具','笔',15,150,15,'shelf-grid','支','入口工具抽屉，和标签纸同区。',30,{clearance:5,moduleHeight:70}),
  m('玄关','快递工具','胶带',100,50,100,'shelf-grid','卷','快递拆包区就近。',30,{clearance:10,moduleHeight:150}),
  m('玄关','快递工具','美工刀',40,160,20,'shelf-grid','把','抽屉收纳，儿童不可达。',30,{clearance:8,moduleHeight:80}),
  m('玄关','鞋类','女鞋',100,300,120,'shelf-row','双','女鞋宽 80mm（万物与尺度实测）按错位摆放折算约 100mm/双（达哥口径：100cm 宽 10 双）。',31,{clearance:20,moduleHeight:140}),
  m('玄关','鞋类','男鞋',125,340,155,'shelf-row','双','男鞋宽 100mm（万物与尺度实测）按错位摆放折算约 125mm/双（达哥口径：100cm 宽 8 双）。',31,{clearance:20,moduleHeight:175}),
  m('玄关','鞋类','儿童鞋',80,240,130,'shelf-row','双','按错位口径折算；低位儿童可达，鞋长按年龄复核（1-2岁140 → 11-13岁245）。',32,{clearance:20,moduleHeight:150,approx:true}),
  m('玄关','鞋类','高筒雨靴',195,380,450,'shelf-row','双','鞋面宽 158mm（实测）×2 折算；独立高层，湿靴需通风和接水。',33,{clearance:30,moduleHeight:480}),
  m('玄关','鞋类','中筒雨靴',195,360,220,'shelf-row','双','独立中高层，避免压筒。',33,{clearance:25,moduleHeight:245,approx:true}),
  m('玄关','鞋类','客用拖鞋',140,280,110,'shelf-row','双','客拖实测 280×115，成对并放折算约 140mm/双。',33,{clearance:15,moduleHeight:125}),
  m('玄关','鞋盒','标准鞋盒',220,340,160,'shelf-grid','个','标签朝外；鞋盒为硬壳不可错位，按盒宽 220mm 计。',34,{clearance:10,moduleHeight:205}),
  m('玄关','鞋盒','布艺鞋盒',220,320,120,'shelf-grid','个','换季鞋用，注意透气。',34,{clearance:10,moduleHeight:165}),
  m('玄关','鞋具','鞋刷/鞋油组合',170,220,100,'shelf-grid','组','独立浅格，避免污染鞋和衣物。',35,{clearance:15,moduleHeight:160,approx:true}),

  m('卫浴','口腔护理','电动牙刷',40,40,200,'vertical','支','竖放充电，电源与湿区安全复核。',36,{clearance:10}),
  m('卫浴','口腔护理','成人牙刷',20,20,185,'vertical','支','家庭成员分格，竖放通风。',36,{clearance:10}),
  m('卫浴','口腔护理','儿童牙刷',20,20,145,'vertical','支','儿童可达并与成人分格。',36,{clearance:10}),
  m('卫浴','纸品','卷纸',120,120,120,'shelf-grid','卷','保持干燥，常用与囤货分区。',36,{clearance:8,moduleHeight:160}),
  m('卫浴','口腔护理','牙刷杯',77,77,105,'shelf-grid','只','靠近洗漱点，底部易清洁。',37,{clearance:10,moduleHeight:150}),
  m('卫浴','口腔护理','漱口杯',77,77,105,'shelf-grid','只','家庭成员分位。',37,{clearance:10,moduleHeight:150}),
  m('卫浴','洗护','肥皂盒',117,77,20,'shelf-grid','只','需沥水，避免积水。',37,{clearance:10,moduleHeight:80,approx:true}),
  m('卫浴','清洁工具','马桶刷',115,115,337,'vertical','把','与干净物品隔离，保持通风。',37,{clearance:20}),

  m('家政','清洁电器','戴森吸尘器',300,220,1200,'vertical','台','直立充电，预留插座、散热和拆卸路径。',38,{clearance:30}),
  m('家政','清洁电器','扫地机器人',345,340,96,'volume','台','低位回充，前方保持回站通道。',39,{clearance:50}),
  m('家政','风扇','立式摇头风扇',340,340,1007,'vertical','台','换季直立收纳，底座不可受压。',39,{clearance:30}),
  m('家政','风扇','无叶风扇',230,230,1250,'vertical','台','换季高格，按外廓复尺。',39,{clearance:30}),
  m('客厅/公共','电气','充电器',67,52,23,'shelf-grid','个','线材与设备配对，浅抽屉分格。',40,{clearance:8,moduleHeight:80}),
  m('客厅/公共','电气','排插',70,225,46,'shelf-grid','个','避免线材打结，长期使用注意散热。',40,{clearance:10,moduleHeight:100}),
  m('客厅/公共','电气','遥控器',50,210,25,'shelf-grid','个','沙发附近固定归位，不宜深藏。',40,{clearance:8,moduleHeight:80,approx:true}),
  m('客厅/公共','医疗','医药箱',345,330,210,'shelf-grid','箱','成人可达、儿童不可达；过期药定期清理。',41,{clearance:20,moduleHeight:270}),
  m('大件储藏','备用家具','塑料堆叠椅',285,480,255,'stack-group','把','同款套叠，默认每摞 6 把。',42,{stackQty:6,moduleHeight:520}),
  m('大件储藏','备用家具','折叠椅',180,460,1130,'vertical','把','折叠后竖放，卡扣防倒。',42,{clearance:20}),

  m('餐厅/茶饮','茶具','7L 茶渣桶',180,220,230,'shelf-grid','只','靠近茶台，开盖和清理路径顺畅。',42,{clearance:20,moduleHeight:290}),
  m('餐厅/茶饮','茶具','9L 茶渣桶',180,220,300,'shelf-grid','只','预留开盖与提桶空间。',42,{clearance:20,moduleHeight:360}),
  m('餐厅/茶饮','茶具','茶杯',90,90,65,'shelf-grid','只','高频杯单层可视，避免过度叠放。',43,{clearance:10,moduleHeight:120}),
  m('餐厅/茶饮','茶具','茶漏',65,65,45,'shelf-grid','只','小件浅格，清洗晾干后归位。',43,{clearance:10,moduleHeight:100}),
  m('餐厅/茶饮','茶具','茶海',150,130,80,'shelf-grid','只','靠近泡茶区，易拿易洗。',43,{clearance:10,moduleHeight:135}),
  m('餐厅/茶饮','茶具','茶壶',240,160,150,'shelf-grid','把','一壶一位，壶把和壶嘴留余量。',43,{clearance:20,moduleHeight:220,approx:true}),
  m('餐厅/茶饮','茶具','泡茶盘',290,240,50,'shelf-grid','只','平放单层，校验排水配件。',43,{clearance:15,moduleHeight:110}),
  m('餐厅/茶饮','茶具','茶罐',160,160,240,'shelf-grid','只','避光干燥，标签朝外。',43,{clearance:12,moduleHeight:290}),

  m('客厅/公共','收纳容器','通用收纳盒',350,240,210,'shelf-grid','个','标签朝外，同类成组，避免过深柜双排。',44,{clearance:15,moduleHeight:270}),
  m('客厅/公共','收纳容器','IKEA 纸盒',260,145,280,'shelf-grid','个','文件或零碎分类，按把手方向取放。',44,{clearance:15,moduleHeight:335}),
  m('客厅/公共','纸品','抽纸盒',200,120,90,'shelf-grid','盒','高频位置就近补充。',45,{clearance:10,moduleHeight:140}),
  m('书房','文件','双孔文件夹',75,288,315,'shelf-row','本','直立单排，脊背朝外。',45,{clearance:8,moduleHeight:360}),
  m('书房','文件','文件盒',90,300,320,'shelf-row','个','直立单排；活动层板总高约 352mm。',46,{clearance:8,moduleHeight:352}),
  m('书房','书籍','正32开书',30,130,185,'shelf-row','本','直立单排，默认厚度 30mm，可按实物改。',47,{clearance:5,moduleHeight:230,approx:true}),
  m('书房','书籍','A5 书',30,148,210,'shelf-row','本','直立单排，书脊朝外。',47,{clearance:5,moduleHeight:255,approx:true}),
  m('书房','书籍','正16开书',30,195,270,'shelf-row','本','直立单排，层板深度不必统一做深。',47,{clearance:5,moduleHeight:315,approx:true}),
  m('书房','书籍','A4 书/资料',30,210,294,'shelf-row','本','直立单排，柜内深度约 250–300mm 即可。',47,{clearance:5,moduleHeight:340,approx:true}),
  m('儿童/兴趣','图书','低龄绘本',10,250,280,'shelf-row','本','封面朝前或矮层直立，儿童可达。',47,{clearance:3,moduleHeight:330,approx:true}),
  m('儿童/兴趣','图书','大龄绘本',30,250,280,'shelf-row','本','直立单排，按 10–30mm 厚度估算。',47,{clearance:3,moduleHeight:330,approx:true}),

  m('衣帽','帽饰','针织帽（折叠）',250,250,80,'stack-group','顶','折叠成摞，默认每摞 5 顶。',48,{stackQty:5,moduleHeight:180,approx:true}),
  m('衣帽','帽饰','圆形硬帽',320,320,160,'shelf-grid','顶','单顶独立，避免压塌帽型。',48,{clearance:20,moduleHeight:230,approx:true}),
  m('衣帽','配饰','项链',50,20,380,'hang','条','垂直挂放防缠绕，首饰柜浅而可见。',51,{clearance:8,moduleHeight:430}),
  m('衣帽','配饰','手链',50,20,187,'hang','条','分钩悬挂或抽屉分格。',51,{clearance:8,moduleHeight:240}),
  m('衣帽','配饰','手表',38,33,20,'shelf-grid','只','软垫分格，避免互相刮碰。',51,{clearance:10,moduleHeight:80}),
  m('衣帽','配饰','围巾（折叠）',300,280,50,'stack-group','条','默认每摞 6 条，也可用抽屉分格。',52,{stackQty:6,moduleHeight:180,approx:true}),
  m('衣帽','配饰','腰带（悬挂）',50,30,850,'hang','条','展开挂放，避免卷曲遗忘。',52,{clearance:8,moduleHeight:920}),
  m('家政','衣物护理','挂烫机',420,280,1600,'vertical','台','直立高柜，预留电源与水箱拆卸。',52,{clearance:30}),
  m('衣帽','衣物','女装短衣',45,560,1050,'hang','件','按衣架占杆宽 45mm，短挂区可双层。',53,{clearance:0,moduleHeight:1130}),
  m('衣帽','衣物','羽绒服',85,560,1060,'hang','件','厚衣按较大占杆宽估算，避免压缩过度。',54,{clearance:0,moduleHeight:1140}),
  m('衣帽','衣物','大衣',70,590,1225,'hang','件','长挂单层，柜深校验衣架与门板。',54,{clearance:0,moduleHeight:1310}),
  m('衣帽','衣物','男装短衣',50,590,800,'hang','件','按衣架占杆宽 50mm，短挂区可双层。',55,{clearance:0,moduleHeight:900}),
  m('衣帽','衣物','男装中长衣',60,590,1050,'hang','件','单层或与抽屉组合。',55,{clearance:0,moduleHeight:1130}),
  m('衣帽','床品','真空压缩被',450,600,150,'stack-group','床','压缩后平放，默认每摞 3 床；定期检查回弹。',56,{stackQty:3,moduleHeight:520}),
  m('衣帽','行李箱','18寸登机箱',340,250,510,'volume','只','低频高位或独立格，校验取放通道。',56,{clearance:30}),
  m('衣帽','行李箱','20寸登机箱',350,290,560,'volume','只','独立格，避免遮挡常用衣物。',56,{clearance:30}),
  m('衣帽','行李箱','24寸行李箱',420,320,670,'volume','只','独立格或储藏间，校验柜深。',56,{clearance:30}),
  m('衣帽','行李箱','28寸行李箱',470,330,750,'volume','只','大件独立位，优先低频区。',56,{clearance:30}),
  m('衣帽','行李箱','32寸行李箱',520,360,810,'volume','只','大件独立位，取放时需完整通道。',56,{clearance:40}),

  m('儿童/兴趣','乐器','吉他/尤克里里',400,200,1040,'vertical','把','直立固定防倾倒，控制温湿度。',57,{clearance:30}),
  m('儿童/兴趣','乐器','21寸尤克里里',330,120,530,'vertical','把','墙挂或直立格，儿童可达。',57,{clearance:20,approx:true}),
  m('儿童/兴趣','乐器','钢琴',1530,610,1230,'volume','台','非柜内收纳；仅用于校验专属落位尺寸。',57,{clearance:100}),
  m('儿童/兴趣','电子设备','游戏机整套',253,106,116,'shelf-grid','套','预留散热、充电与手柄归位。',58,{clearance:25,moduleHeight:180}),
  m('儿童/兴趣','电子设备','游戏手柄',158,116,35,'shelf-grid','只','浅格充电，线材配对。',58,{clearance:12,moduleHeight:100}),
  m('儿童/兴趣','电子设备','12.9寸 iPad',281,215,7,'vertical','台','竖插充电，屏幕防刮。',58,{clearance:12,approx:true}),
  m('儿童/兴趣','玩具','玩具收纳箱',500,365,260,'shelf-grid','箱','整箱抽取，低位儿童可达。',59,{clearance:20,moduleHeight:330}),
  m('儿童/兴趣','玩具','乐高收纳盒（小）',360,310,90,'shelf-grid','盒','按主题标签，浅盒平铺更易找。',59,{clearance:12,moduleHeight:145}),
  m('儿童/兴趣','玩具','乐高收纳盒（大）',600,370,165,'shelf-grid','盒','整盒抽取，校验层板跨度与承重。',59,{clearance:20,moduleHeight:230})
];

const methodNames = { 'shelf-row':'层板单排', 'shelf-grid':'层板网格', 'stack-group':'成摞叠放', 'vertical':'直立槽位', 'hang':'挂杆悬挂', 'volume':'大件独立' };
let lastGeneralResult = null;

function generalNumber(id){return Math.max(0,Number(document.getElementById(id)?.value||0));}
function selectedObject(){return objectLibrary[Number(document.getElementById('generalItem').value)||0] || objectLibrary[0];}

function populateGeneralScenes(preferredScene){
  const scenes=Object.keys(sceneDefaults); const sceneSelect=document.getElementById('generalScene');
  sceneSelect.innerHTML=scenes.map(scene=>`<option value="${scene}">${scene}</option>`).join('');
  sceneSelect.value=preferredScene&&sceneDefaults[preferredScene]?preferredScene:'玄关';
  populateGeneralItems();
}

function populateGeneralItems(preferredName){
  const scene=document.getElementById('generalScene').value;
  const matches=objectLibrary.map((item,index)=>({item,index})).filter(x=>x.item.scene===scene);
  const groups=[...new Set(matches.map(x=>x.item.category))];
  document.getElementById('generalItem').innerHTML=groups.map(group=>`<optgroup label="${group}">${matches.filter(x=>x.item.category===group).map(x=>`<option value="${x.index}">${x.item.name}</option>`).join('')}</optgroup>`).join('');
  const preferred=matches.find(x=>x.item.name===preferredName); if(preferred)document.getElementById('generalItem').value=String(preferred.index);
  applyObjectDefaults();
}

function applySceneDefaults(){
  const scene=document.getElementById('generalScene').value; const d=sceneDefaults[scene];
  document.getElementById('generalLength').value=d.length; document.getElementById('generalBayWidth').value=d.bay; document.getElementById('generalHeight').value=d.height; document.getElementById('generalDepth').value=d.depth; document.getElementById('generalLabel').value=d.label;
}

function applyObjectDefaults(){
  const item=selectedObject();
  document.getElementById('generalMethod').value=item.method; document.getElementById('generalModuleHeight').value=item.moduleHeight; document.getElementById('generalStackQty').value=item.stackQty;
  document.getElementById('itemContext').innerHTML=`<b>${item.category} · ${item.name}</b><span>${item.note}</span>`;
  renderGeneral();
}

function calculateGeneral(){
  const item=selectedObject(); const length=generalNumber('generalLength'); const bayTarget=Math.max(200,generalNumber('generalBayWidth')); const height=generalNumber('generalHeight'); const depth=generalNumber('generalDepth');
  const board=generalNumber('generalBoard'); const depthLoss=generalNumber('generalDepthLoss'); const reserved=generalNumber('generalReserved'); const plinth=Math.max(0,generalNumber('generalPlinth'));
  const moduleHeight=Math.max(50,generalNumber('generalModuleHeight')); const stackQty=Math.max(1,Math.floor(generalNumber('generalStackQty'))); const growth=Number(document.getElementById('generalGrowth').value||0); const needQty=Math.max(0,generalNumber('generalNeedQty')); const method=document.getElementById('generalMethod').value;
  // 鞋类摆放口径：错位（达哥口径）= 库内占宽；并排直放 = 占宽 ×1.64
  const layEl=document.getElementById('generalShoeLay'); const layKey=(layEl&&layEl.value)||'stagger'; const isShoe=item.category==='鞋类';
  const layFactor=(isShoe&&layKey==='side')?(1/0.61):1; const layName=isShoe?(layKey==='side'?'并排直放（保守）':'错位摆放（达哥口径）'):'—';
  const pitchOv=Math.max(0,generalNumber('generalPitch')); const wBase=pitchOv>0?pitchOv:item.w; const wEff=wBase*layFactor;
  const railsEl=document.getElementById('generalRails'); const railsMode=(railsEl&&railsEl.value)||'auto';
  const netDepth=Math.max(0,depth-depthLoss); const shelf=board; const gap=item.clearance||10; const netHeightBase=Math.max(0,height-board*2-reserved-plinth);
  function pack(bayT,mh){
    const bays=Math.max(1,Math.ceil(length/bayT)); const netWidth=Math.max(0,length-board*(bays+1)); const cellWidth=netWidth/bays; const netHeight=netHeightBase;
    let across=Math.floor((cellWidth+gap)/Math.max(1,wEff+gap)); let deep=1; let levels=1; let cap=0;
    if(method==='shelf-row'){levels=Math.floor((netHeight+shelf)/(mh+shelf));cap=across*bays*levels;}
    if(method==='shelf-grid'){deep=Math.floor((netDepth+gap)/Math.max(1,item.d+gap));levels=Math.floor((netHeight+shelf)/(mh+shelf));cap=across*bays*deep*levels;}
    if(method==='stack-group'){deep=Math.floor((netDepth+gap)/Math.max(1,item.d+gap));levels=Math.floor((netHeight+shelf)/(mh+shelf));cap=across*bays*deep*levels*stackQty;}
    if(method==='vertical'){deep=Math.floor((netDepth+gap)/Math.max(1,item.d+gap));levels=item.h<=netHeight?1:0;cap=across*bays*deep;}
    if(method==='hang'){across=Math.floor(cellWidth/Math.max(1,wEff));deep=1;const canDouble=netHeight>=(2*item.h+100);levels=railsMode==='single'?1:(railsMode==='double'?(canDouble?2:1):(item.h<=1050?(canDouble?2:1):1));cap=across*bays*levels;}
    if(method==='volume'){across=Math.floor((cellWidth+gap)/Math.max(1,wEff+gap));deep=Math.floor((netDepth+gap)/Math.max(1,item.d+gap));levels=Math.floor((netHeight+gap)/Math.max(1,item.h+gap));cap=across*bays*deep*levels;}
    return {bays,netWidth,cellWidth,netHeight,across,deep,levels,cap:Math.max(0,cap)};
  }
  const P=pack(bayTarget,moduleHeight);
  const bays=P.bays,netWidth=P.netWidth,cellWidth=P.cellWidth,netHeight=P.netHeight,across=P.across,deep=P.deep,levels=P.levels;
  const capacity=Math.max(0,P.cap); const safe=Math.floor(capacity/(1+growth)); const depthPass=netDepth>=item.d; const heightPass=method==='vertical'?netHeight>=item.h:true; const widthPass=cellWidth>=wEff; const warnings=[];
  if(!widthPass)warnings.push({level:'danger',text:`单格净宽约 ${Math.round(cellWidth)}mm，小于物品占宽 ${Math.round(wEff)}mm；增大单格宽或减少分格。`});
  if(!depthPass)warnings.push({level:'danger',text:`柜内净深约 ${Math.round(netDepth)}mm，小于物品进深 ${item.d}mm。`});
  if(!heightPass)warnings.push({level:'danger',text:`柜内净高约 ${Math.round(netHeight)}mm，小于物品高度 ${item.h}mm。`});
  if(method==='shelf-grid'&&deep>1)warnings.push({level:'',text:'当前计算包含前后多排；高频物品建议改单排，避免看不见、拿不出。'});
  if(item.approx)warnings.push({level:'',text:'该条目原始资料识别置信度较低，进入施工图前必须按业主实物复尺。'});
  if(/湿|通风|沥水|防漏/.test(item.note))warnings.push({level:'',text:'此物品涉及潮湿、漏液或通风，容量通过不代表构造可以密闭。'});
  if(method==='hang'&&railsMode==='double'&&item.h>1050&&netHeight<(2*item.h+100))warnings.push({level:'danger',text:`长衣（衣长 ${item.h}mm）上下双杆需净高 ≥ ${2*item.h+100}mm，当前净高 ${Math.round(netHeight)}mm 放不下，已按单杆计。`});
  if(!warnings.length)warnings.push({level:'ok',text:'容量初审通过；仍需核对门型、五金、承重、安装收口与取放动作。'});
  // —— 提升空间：按同一口径真算出来的杠杆
  const hints=[];
  if(capacity>0){
    let bestBay=null;
    for(let bt=300;bt<=Math.max(length,1600);bt+=50){const q=pack(bt,moduleHeight);if(!bestBay||q.cap>bestBay.cap)bestBay={bt,cap:q.cap,bays:q.bays,across:q.across};}
    const qFull=pack(length,moduleHeight); if(!bestBay||qFull.cap>bestBay.cap)bestBay={bt:length,cap:qFull.cap,bays:qFull.bays,across:qFull.across};
    if(bestBay&&bestBay.cap>capacity)hints.push(`单格宽 ${Math.round(bayTarget)} → ${bestBay.bt}mm（分 ${bestBay.bays} 格、每格 ${bestBay.across} ${item.unit}）：容量 ${capacity} → ${bestBay.cap} ${item.unit}（+${bestBay.cap-capacity}）。分格越细越可能出现「半件余宽」，单格宽要按物品占宽的整数倍取。`);
    const idealH=item.h+30;
    if(method!=='vertical'&&moduleHeight>idealH+30){const q=pack(bayTarget,idealH);if(q.cap>capacity)hints.push(`单元层净高 ${moduleHeight} → ${idealH}mm（物品净高 ${item.h}+30）：层数 ${levels} → ${q.levels} 层，容量 +${q.cap-capacity} ${item.unit}。层板可调时应贴着物品高度做。`);}
    if(reserved>0||plinth>0){const freedStep=moduleHeight+shelf;const freed=Math.min(reserved+plinth,freedStep);const q=pack(bayTarget,moduleHeight);const saved=netHeightBase+freed;const extra=Math.floor((saved+shelf)/(moduleHeight+shelf))-levels;if(extra>0)hints.push(`地脚/其它占高共占用 ${Math.round(reserved+plinth)}mm；每让出一层高度（约 ${freedStep}mm）→ 多 ${extra} 层，约 +${extra*across*bays*deep*stackQty} ${item.unit}。`);}
    const spareDepth=netDepth-item.d;
    if(spareDepth>=150&&method!=='hang')hints.push(`柜内净深比物品进深多 ${Math.round(spareDepth)}mm。深柜不会自动多放，可考虑抽拉/斜插五金或前后分区（约 +30%～50%），需配五金并确认取放动作。`);
    if(isShoe&&layKey==='side')hints.push('当前按「并排直放」保守口径。若现场实际是错位摆放（相邻两双错开半只），切到「错位摆放」可再增容约 60%——报客户前请确认实际摆法。');
    if(isShoe&&layKey==='stagger')hints.push('当前按「错位摆放」（达哥口径，每米约 8 双男鞋）计算；若客户习惯两鞋平放、一目了然，切到「并排直放」复核保守值。');
    if(method==='hang'){
      const perBay=Math.floor(cellWidth/Math.max(1,wEff)); const oneRow=perBay*bays; const needDouble=2*item.h+100; const canDouble=netHeight>=needDouble;
      hints.push(`挂衣两笔账：单杆 ${oneRow} 件（净宽 ${Math.round(netWidth)}mm ÷ 每件占杆宽 ${Math.round(wEff)}mm${bays>1?`；分 ${bays} 格后每格 ${perBay} 件，分格会吃掉余宽`:''} ≈ 每米 ${(oneRow/(netWidth/1000)).toFixed(1)} 件）${canDouble?`｜上下双杆 ${oneRow*2} 件（双杆需净高 ≥ ${needDouble}mm，当前 ${Math.round(netHeight)}mm 够）`:`｜上下双杆需净高 ≥ ${needDouble}mm，当前 ${Math.round(netHeight)}mm 不够`}。当前按「${railsMode==='auto'?'自动（短衣双层/长衣单杆）':railsMode==='single'?'强制单杆':'强制双杆'}」计。`);
      if(item.h>1050) hints.push(`衣长 ${item.h}mm 属长衣：双杆要抬手掏上排、下摆会压住下排，取放不顺手；建议长衣区单杆、短衣区（≤1050mm）才做双杆。`);
      const spareH=netHeight-levels*item.h-(levels-1)*30;
      if(spareH>=600) hints.push(`净高 ${Math.round(netHeight)}mm 按当前 ${levels} 层挂衣会空出约 ${Math.round(spareH)}mm（${Math.round(spareH/netHeight*100)}%）。两条路：① 顶部留 400–450mm 做被褥/换季层板（最常用）；② 改成上下双杆多挂 ${oneRow} 件（长衣双杆后上排离地约 ${Math.round(netHeight-item.h)}mm，要抬手掏），在「挂衣方式」里切换。`);
      if(spareH>=300&&spareH<600) hints.push(`净高还剩约 ${Math.round(spareH)}mm：可加一层薄层板放折叠衣物或旅行箱，别空着。`);
    }
  }
  return {type:'全屋物品',label:document.getElementById('generalLabel').value.trim()||`${item.scene}${item.name}`,scene:item.scene,itemName:item.name,category:item.category,unit:item.unit,userHeight:generalNumber('generalUserHeight')||1600,needQty,width:length,height,depth,bayWidth:bayTarget,bays,board,depthLoss,reserved,plinth,moduleHeight,stackQty,growth,method,layKey,layName,layFactor,wEff:Math.round(wEff),pitchOverride:pitchOv,railsMode,capacity,safe,netWidth,cellWidth,netHeight,netDepth,across,deep,levels,itemDims:{w:item.w,d:item.d,h:item.h},note:item.note,slide:item.slide,valid:widthPass&&depthPass&&heightPass,warnings,hints};
}

function renderGeneral(){
  if(!document.getElementById('generalItem').options.length)return; const r=calculateGeneral(); lastGeneralResult=r;
  document.getElementById('generalSceneName').textContent=`${r.scene} · ${r.category}`; document.getElementById('generalItemName').textContent=r.itemName; document.getElementById('generalCapacity').textContent=r.capacity.toLocaleString('zh-CN'); document.getElementById('generalUnit').textContent=r.unit; document.getElementById('generalSafe').textContent=`${r.safe.toLocaleString('zh-CN')} ${r.unit}`; document.getElementById('generalReserveText').textContent=r.growth?`已留 ${Math.round(r.growth*100)}% 增量`:'未预留未来增量';
  document.getElementById('generalItemDims').textContent=`${r.itemDims.w} × ${r.itemDims.d} × ${r.itemDims.h} mm`; document.getElementById('objectCubeLabel').textContent=`${r.itemDims.w} × ${r.itemDims.d} × ${r.itemDims.h}`; document.getElementById('generalMethodText').textContent=methodNames[r.method]; document.getElementById('generalLayerInfo').textContent=`${r.across*r.bays*r.deep} ${r.unit}/层 × ${r.levels} 层${r.stackQty>1?` × 每摞${r.stackQty}`:''}`; document.getElementById('generalNetDims').textContent=`${Math.round(r.netWidth)} × ${Math.round(r.netDepth)} × ${Math.round(r.netHeight)} mm`;
  document.getElementById('generalStatus').textContent=r.valid?'初审通过':'需要调整'; document.getElementById('generalStatus').classList.toggle('warn',!r.valid);
  const layLine=r.category==='鞋类'?`<div class="warning ok">口径：${r.layName}｜每双占宽按 ${r.wEff} mm 计</div>`:'';
  const hintLines=(r.hints&&r.hints.length)?r.hints.map(h=>`<div class="warning">提升空间：${h}</div>`).join(''):'';
  document.getElementById('generalWarnings').innerHTML=r.warnings.map(w=>`<div class="warning ${w.level}">${w.text}</div>`).join('')+layLine+hintLines; document.getElementById('generalSource').textContent=`尺寸依据：《万物与尺度》幻灯片 ${r.slide}；默认板厚 ${r.board}mm、扣深 ${r.depthLoss}mm、自动 ${r.bays} 格。用于方案初审，施工前按实物复尺。`;
  if(window.YujiAdvice) YujiAdvice.render(r,{userHeight:generalNumber('generalUserHeight')||1600});
  if(typeof scheduleSave==='function')scheduleSave();
}

function generalAdviceText(r){return window.YujiAdvice?YujiAdvice.toText(r,{userHeight:generalNumber('generalUserHeight')||1600}):'';}

function generalResultText(r){return `${r.label}｜${r.scene}｜${r.itemName}｜柜体总长${r.width}×总深${r.depth}×总高${r.height}mm，单格宽${r.bayWidth}mm${r.category==='鞋类'?'，鞋类口径：'+r.layName+'（每双 '+r.wEff+'mm）':''}｜理论容量${r.capacity}${r.unit}（${r.across*r.bays*r.deep}${r.unit}/层 × ${r.levels} 层），预留${Math.round(r.growth*100)}%后建议${r.safe}${r.unit}｜${r.valid?'初审通过':'需要调整'}：${r.warnings.map(w=>w.text).join('；')}${(r.hints&&r.hints.length)?'｜提升空间：'+r.hints.join('；'):''}`;}

function registerGeneralWebMcp(){
  const context=document.modelContext;if(!context?.registerTool)return;
  try{Promise.resolve(context.registerTool({name:'stage_whole_home_object_capacity_calculation',title:'配置全屋物品容量核算',description:'选择《万物与尺度》中的场景和物品，只写入柜体总长、单格宽、总高、总深，完成容量核算。',inputSchema:{type:'object',properties:{scene:{type:'string',enum:Object.keys(sceneDefaults)},itemName:{type:'string'},length:{type:'number'},bayWidth:{type:'number'},height:{type:'number'},depth:{type:'number'},growthRate:{type:'number',minimum:0,maximum:.5},label:{type:'string'}},required:['scene','itemName','length','bayWidth','height','depth'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){const found=objectLibrary.find(x=>x.scene===input.scene&&x.name===input.itemName);if(!found)throw new Error('未找到该场景下的物品名称');document.getElementById('generalScene').value=input.scene;populateGeneralItems(input.itemName);[['generalLength',input.length],['generalBayWidth',input.bayWidth],['generalHeight',input.height],['generalDepth',input.depth]].forEach(([id,v])=>{if(!Number.isFinite(Number(v))||Number(v)<=0)throw new Error(`${id} 必须大于0`);document.getElementById(id).value=Number(v);});if(input.label)document.getElementById('generalLabel').value=String(input.label).slice(0,60);if(input.growthRate!==undefined){const opts=[...document.getElementById('generalGrowth').options].map(o=>Number(o.value));document.getElementById('generalGrowth').value=String(opts.reduce((a,b)=>Math.abs(b-input.growthRate)<Math.abs(a-input.growthRate)?b:a));}switchView('general');renderGeneral();return {scene:lastGeneralResult.scene,item:lastGeneralResult.itemName,capacity:lastGeneralResult.capacity,unit:lastGeneralResult.unit,recommended_current:lastGeneralResult.safe,status:lastGeneralResult.valid?'pass':'adjust',warnings:lastGeneralResult.warnings.map(w=>w.text)};}})).catch(()=>{});}catch{}
}

function initGeneral(){
  document.getElementById('libraryCount').textContent=`${objectLibrary.length} 项物品尺度`;
  let savedInputs={};try{savedInputs=JSON.parse(localStorage.getItem('yujistorage-capacity-calc-v1'))?.inputs||{};}catch{}
  populateGeneralScenes(savedInputs.generalScene); applySceneDefaults();
  Object.entries(savedInputs).filter(([key])=>key.startsWith('general')).forEach(([key,value])=>{const el=document.getElementById(key);if(el&&key!=='generalItem')el.value=value;});
  if(savedInputs.generalItem&&[...document.getElementById('generalItem').options].some(o=>o.value===String(savedInputs.generalItem)))document.getElementById('generalItem').value=String(savedInputs.generalItem);
  applyObjectDefaults();
  document.getElementById('generalScene').addEventListener('change',()=>{applySceneDefaults();populateGeneralItems();});
  document.getElementById('generalItem').addEventListener('change',applyObjectDefaults);
  document.getElementById('generalForm').addEventListener('input',renderGeneral);
  document.getElementById('addGeneralBtn').addEventListener('click',()=>addItem(lastGeneralResult));
  document.getElementById('copyGeneralBtn').addEventListener('click',()=>copyText(generalResultText(lastGeneralResult),'全屋物品核算结果已复制'));
  const adviceBtn=document.getElementById('copyAdviceBtn');
  if(adviceBtn) adviceBtn.addEventListener('click',()=>copyText(generalAdviceText(lastGeneralResult),'收纳建议已复制，可直接发微信'));
  registerGeneralWebMcp();
}

document.addEventListener('DOMContentLoaded',initGeneral);
