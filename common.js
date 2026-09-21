"use strict";
/* ============================================================
   الطبقة المشتركة: قاعدة البيانات، القوالب، مكوّنات الواجهة
============================================================ */
const LS_KEY='school-wizard-demo-v1';
const _mem={};
const store={
  get(k){try{return localStorage.getItem(k)}catch(e){return k in _mem?_mem[k]:null}},
  set(k,v){try{localStorage.setItem(k,v)}catch(e){_mem[k]=v}},
  del(k){try{localStorage.removeItem(k)}catch(e){delete _mem[k]}}
};
function freshDB(){return{school:null,paths:{},subjects:{},teachers:[],parents:[],students:[],sectionsByYear:{},sectionTeachers:{},notes:[],
  behaviors:defaultBehaviors(),behaviorSettings:clone(DEFAULT_BEHAVIOR_SETTINGS),behaviorRecords:[],behaviorIncidents:[],behaviorAwards:[],weeklyPlans:[]}}
function loadDB(){
  try{const d=JSON.parse(store.get(LS_KEY));
    if(d&&typeof d==='object'&&d.sectionsByYear){const x=Object.assign(freshDB(),d);ensureBehaviorData(x);return x;}
  }catch(e){}
  return freshDB();
}
function saveDB(d){store.set(LS_KEY,JSON.stringify(d));}
function clone(o){return JSON.parse(JSON.stringify(o));}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

/* ---------- المسارات والقوالب ---------- */
const PATHS_META={
  national:{name:'المسار الوطني',flag:'🇯🇴',desc:'المنهاج الرسمي الأردني — من الروضة حتى الصف الثاني عشر'},
  international:{name:'المسار الدولي',flag:'🌍',desc:'المنهاج الدولي (رياض الأطفال – G12)'},
  british:{name:'المسار البريطاني',flag:'🇬',desc:'المنهاج البريطاني (Nursery – Year 13: GCSE وA-Level)'}
};
const STAGE_PRESETS={
  national:[
    {name:'الروضة',levels:['الروضة ١','الروضة ٢']},
    {name:'المرحلة الأساسية',levels:['الأول الأساسي','الثاني الأساسي','الثالث الأساسي','الرابع الأساسي','الخامس الأساسي','السادس الأساسي']},
    {name:'التحضيرية',levels:['السابع','الثامن']},
    {name:'المرحلة الثانوية',levels:['التاسع','العاشر','الحادي عشر','الثاني عشر']}
  ],
  international:[
    {name:'سنوات المراحل المبكرة',levels:['Kindergarten']},
    {name:'المراحل الدنيا',levels:['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5']},
    {name:'المتوسطة',levels:['Grade 6','Grade 7','Grade 8']},
    {name:'العليا',levels:['Grade 9','Grade 10','Grade 11','Grade 12']}
  ],
  british:[
    {name:'سنوات المراحل المبكرة (EYFS)',levels:['Nursery','Reception']},
    {name:'المستوى المفتاحي 1 (KS1)',levels:['Year 1','Year 2']},
    {name:'المستوى المفتاحي 2 (KS2)',levels:['Year 3','Year 4','Year 5','Year 6']},
    {name:'المستوى المفتاحي 3 (KS3)',levels:['Year 7','Year 8','Year 9']},
    {name:'المستوى المفتاحي 4 (GCSE)',levels:['Year 10','Year 11']},
    {name:'A-Level',levels:['Year 12','Year 13']}
  ]
};
const SUBJECT_PRESETS={
  national:['اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','الدراسات الإسلامية','الاجتماعيات','الحاسوب','التربية البدنية','التربية الفنية'],
  international:['English','Mathematics','Science','Social Studies','Art','Physical Education','Music','Computer Science'],
  british:['English Language','Mathematics','Biology','Chemistry','Physics','History','Geography','Art','Physical Education','ICT']
};
const GOVERNORATES=['عمان','الزرقاء','إربد','المفرق','مادبا','البلقاء','جرش','عجلون','الكرك','الطفيلة','معان','العقبة'];
const MONTHS=['سبتمبر','أكتوبر','نوفمبر','ديسمبر','يناير','فبراير','مارس','أبريل','مايو','يونيو'];
const YEAR_CHOICES=['2025/2026','2026/2027','2027/2028'];

/* ---------- المستويات ---------- */
function stagesOfPath(db,pid){
  const p=db.paths[pid];
  if(!p) return [];
  if(Array.isArray(p)) return p;          /* تسامح مع الصيغة القديمة */
  return p.stages||[];
}
function flatLevels(db){
  const out=[];
  for(const pid of (db.school&&db.school.paths)||[]){
    stagesOfPath(db,pid).forEach((st,si)=>st.levels.forEach((lv,li)=>out.push({id:pid+'::'+si+':'+li,name:lv,stage:st.name,pathId:pid})));
  }
  return out;
}
function levelCountOfPath(db,pid){
  return stagesOfPath(db,pid).reduce((a,s)=>a+s.levels.length,0);
}

/* ---------- أولياء الأمور والطلاب والتوزيع ---------- */
function sectionKey(sec){return sec.year+'::'+sec.gradeId+'::'+sec.letter;}
function secKey(sec){return sectionKey(sec);}
function keyYear(k){return k.split('::')[0];}
function keyGrade(k){const p=k.split('::');return p.slice(1,p.length-1).join('::');}
function keyLetter(k){return k.split('::').pop();}

/* ---------- المرحلة 3 — تعيينات التدريس (معلم لكل مادة في كل شعبة) ---------- */
function sectionPathOf(db,sec){ return sec?(sec.gradeId||'').split('::')[0]:null; }
function sectionSubjects(db,sec){ const pid=sectionPathOf(db,sec); return (db.subjects[pid]||[]).slice(); }
function teachPlanOf(db,key){ return ((db.sectionTeachers||{})[key])||{}; }
function setTeachPlan(db,sectionKey,subject,teacherId){
  if(!db.sectionTeachers)db.sectionTeachers={};
  if(!db.sectionTeachers[sectionKey])db.sectionTeachers[sectionKey]={};
  if(teacherId)db.sectionTeachers[sectionKey][subject]=teacherId;
  else delete db.sectionTeachers[sectionKey][subject];
  saveDB(db);
}
function teachPlanStats(db,year){
  const secs=(db.sectionsByYear[year]||[]);
  let total=0,done=0; const missing=[];
  secs.forEach(s=>{
    const k=sectionKey(s); const map=teachPlanOf(db,k);
    sectionSubjects(db,s).forEach(sub=>{
      total++;
      const tid=map[sub];
      if(tid&&(db.teachers||[]).some(t=>t.id===tid))done++;
      else missing.push({sectionKey:k,subject:sub});
    });
  });
  return {total,done,missing};
}
function teacherLoad(db,teacherId){
  let n=0;
  for(const k in (db.sectionTeachers||{})){
    const map=db.sectionTeachers[k];
    n+=Object.keys(map).filter(s=>map[s]===teacherId).length;
  }
  return n;
}
/* تعيين تلقائي لشعبة: يطابق تخصص المعلم، ويتوازن بين الأعباء، ولا يعيد تعيين ما أُسند */
function autoAssignSection(db,sec){
  const k=sectionKey(sec);
  const map=teachPlanOf(db,k);
  const load={};
  (db.teachers||[]).forEach(t=>{load[t.id]=teacherLoad(db,t.id);});
  let n=0;
  sectionSubjects(db,sec).forEach(sub=>{
    if(map[sub])return;
    const cand=(db.teachers||[])
      .filter(t=>t.subject===sub)
      .sort((a,b)=>(load[a.id]-load[b.id])||((db.teachers||[]).indexOf(a)-(db.teachers||[]).indexOf(b)));
    if(cand.length){ map[sub]=cand[0].id; load[cand[0].id]++; n++; }
  });
  if(n){
    if(!db.sectionTeachers)db.sectionTeachers={};
    db.sectionTeachers[k]=map;
    saveDB(db);
  }
  return n;
}
/* صلاحيات المعلم: مربعاته = ما عُيّن عليه (teach) + كل مواد صفّه كمربّي (homeroom) */
function teacherBoxes(db,teacherId,year){
  const out=[]; const seen={};
  const secs=(db.sectionsByYear[year]||[]);
  secs.forEach(s=>{
    const k=sectionKey(s); const map=teachPlanOf(db,k);
    Object.keys(map).forEach(sub=>{
      if(map[sub]===teacherId){ out.push({sectionKey:k,subject:sub,via:'teach'}); seen[k+'||'+sub]=true; }
    });
  });
  secs.forEach(s=>{
    if(s.teacherId!==teacherId)return;
    const k=sectionKey(s);
    sectionSubjects(db,s).forEach(sub=>{
      if(!seen[k+'||'+sub]) out.push({sectionKey:k,subject:sub,via:'homeroom'});
    });
  });
  return out;
}
function canWorkInBox(db,teacherId,sectionKey,subject){
  if(!sectionKey)return false;
  return teacherBoxes(db,teacherId,keyYear(sectionKey)).some(b=>b.sectionKey===sectionKey&&b.subject===subject);
}
function countInSection(db,key){return (db.students||[]).filter(s=>s.sectionKey===key).length;}
/* أول شعبة غير ممتلئة للمستوى */
function findOpenSection(db,year,gradeId){
  for(const s of (db.sectionsByYear[year]||[])){
    if(s.gradeId===gradeId&&countInSection(db,sectionKey(s))<s.max)return s;
  }
  return null;
}
/* شعبة الأقل امتلاءً (توزيع متوازن) */
function pickBalancedSection(db,year,gradeId){
  const secs=(db.sectionsByYear[year]||[]).filter(s=>s.gradeId===gradeId);
  if(!secs.length)return null;
  let best=secs[0];
  for(const s of secs){
    if(countInSection(db,sectionKey(s))>=s.max)continue;
    if(countInSection(db,sectionKey(s))<countInSection(db,sectionKey(best)))best=s;
  }
  return countInSection(db,sectionKey(best))<best.max?best:null;
}
function levelName(db,gradeId){
  const f=flatLevels(db).find(x=>x.id===gradeId);
  return f?f.name:gradeId;
}
function studentsOfParent(db,parentId){return (db.students||[]).filter(s=>s.parentId===parentId);}
function unassignedCount(db){return (db.students||[]).filter(s=>!s.sectionKey).length;}
function totalLevels(db){let n=0;for(const pid in db.paths)n+=levelCountOfPath(db,pid);return n;}
function totalSubjects(db){let n=0;for(const pid in db.subjects)n+=(db.subjects[pid]||[]).length;return n;}
function nextYearLabel(y){const s=parseInt(String(y).split('/')[0]);return (s+1)+'/'+(s+2);}

/* ---------- حالة الإعداد ---------- */
function setupStatus(db){
  const pids=(db.school&&db.school.paths)||[];
  const stagesOk=pids.length>0&&pids.every(p=>levelCountOfPath(db,p)>0);
  const subjectsOk=pids.length>0&&pids.every(p=>(db.subjects[p]||[]).length>0);
  const sectionsOk=Object.values(db.sectionsByYear).some(a=>Array.isArray(a)&&a.length>0);
  const parentsOk=(db.parents||[]).length>0;
  const studentsOk=(db.students||[]).length>0;
  const enrollOk=studentsOk&&(db.students||[]).every(s=>s.sectionKey);
  const tp=teachPlanStats(db,db.school?db.school.yearLabel:null);
  const teachPlanOk=enrollOk&&tp.total>0&&tp.done===tp.total;
  ensureBehaviorData(db);
  const behaviorOk=!!db.school
    &&(db.behaviors.negative||[]).length>0&&(db.behaviors.positive||[]).length>0
    &&(db.behaviorSettings.negStages||[]).length===3&&(db.behaviorSettings.posLevels||[]).length===3;
  const done=[!!db.school,stagesOk,subjectsOk,db.teachers.length>0,sectionsOk,parentsOk,studentsOk,enrollOk,teachPlanOk,behaviorOk].filter(Boolean).length;
  return {school:!!db.school,stages:stagesOk,subjects:subjectsOk,teachers:db.teachers.length>0,sections:sectionsOk,
    parents:parentsOk,students:studentsOk,enroll:enrollOk,teachPlan:teachPlanOk,behavior:behaviorOk,done,total:10};
}

/* ---------- بيانات تجريبية كاملة بنقرة ---------- */
const DEMO_TEACHER_SEED=[
  ['أحمد سمير','الرياضيات'],['سارة محمد','اللغة الإنجليزية'],['ليلى خالد','اللغة العربية'],
  ['عمر حسن','العلوم'],['نورة فؤاد','الدراسات الإسلامية'],['خالد يوسف','الحاسوب'],
  ['هالة ناصر','اللغة العربية'],['يوسف عادل','الرياضيات'],['مريم سلام','العلوم'],
  ['طارق حبيب','الاجتماعيات'],['رنا عثمان','اللغة العربية'],['بلال صقر','اللغة الإنجليزية'],['دانة وليد','العلوم'],
  ['سامي نادر','التربية البدنية'],['هدى مراد','التربية الفنية']
];
function loadDemoSchool(){
  const db=loadDB();
  db.school={name:'مدرسة الرواد',type:'خاصة',city:'عمان',phone:'079 000 0000',
    yearLabel:'2026/2027',yearStartMonth:'سبتمبر',yearStartDay:9,periodsPerDay:6,maxPerSection:35,
    paths:['national','british']};
  db.paths.national={stages:clone(STAGE_PRESETS.national)};
  db.paths.british={stages:clone(STAGE_PRESETS.british)};
  db.subjects.national=[...SUBJECT_PRESETS.national];
  db.subjects.british=[...SUBJECT_PRESETS.british];
  db.teachers=DEMO_TEACHER_SEED.map((t,i)=>({id:'t'+(i+1),name:t[0],subject:t[1],pathId:'national',phone:'',maxSections:3}));
  const L=flatLevels(db);
  const g=n=>L.find(x=>x.name===n);
  const mk=(name,letter,tid)=>({year:'2025/2026',gradeId:g(name).id,letter,max:35,teacherId:tid,fresh:false});
  db.sectionsByYear['2025/2026']=[
    mk('الأول الأساسي','أ','t1'),mk('الأول الأساسي','ب','t2'),mk('الأول الأساسي','ج','t4'),
    mk('الثاني الأساسي','أ','t5'),mk('الثاني الأساسي','ب','t3'),mk('الثاني الأساسي','ج','t7'),
    mk('الثالث الأساسي','أ','t6'),mk('الثالث الأساسي','ب','t8'),mk('الثالث الأساسي','ج','t9'),
    mk('الرابع الأساسي','أ','t10'),mk('الرابع الأساسي','ب','t11'),mk('الرابع الأساسي','ج','t12'),mk('الرابع الأساسي','د','t13'),
    mk('الخامس الأساسي','أ','t3')
  ];
  /* شعب العام الجديد 2026/2027 (نسخة من العام السابق) */
  db.sectionsByYear['2026/2027']=(db.sectionsByYear['2025/2026']||[]).map(s=>({year:'2026/2027',gradeId:s.gradeId,letter:s.letter,max:s.max,teacherId:s.teacherId,fresh:false}));
  /* أولياء الأمور (18) */
  const P=['محمد العبادي','سماح الزعبي','خالد البطاينة','رنا الشوبكي','أيمن القضاة','هدى بني عيسى','فارس المصري','أحلام النجداوي','سامر الدجاني','لمى العمري','زياد الفاهوم','نداء الكسواني','حسان الطراونة','بشرى الرواشدة','عماد صرايرة','ميساء الخازن','وليد العتوم','جيهان بدوان'];
  db.parents=P.map((n,i)=>({id:'par'+(i+1),name:n,phone:'07'+String(90000000+i*137).slice(0,8),gender:i%3===0?'أنثى':'ذكر'}));
  /* الطلاب (45) — منهم إخوان لوليّ أمر واحد بمستويات مختلفة ومسارات مختلفة */
  const FN_M=['محمد','أحمد','يوسف','عمر','فهد','خالد','سعيد','طارق','هيثم','زياد','بلال','راكان','أنس','مالك'];
  const FN_F=['لينا','جود','ريم','نورة','سارة','دانا','لانا','هبة','رند','شهد','ميس','آية','تالا','غد'];
  const LN=['الحسيني','المعايطة','الزبن','السطري','الروسان','الخالدي','الزوايدة','العشا'];
  const LV=['national::1:0','national::1:1','national::1:2','national::1:3'];
  const students=[];
  const mkstu=(i,lv,pid)=>{
    const f=i%2;
    students.push({id:'stu'+(i+1),name:(f?FN_F:FN_M)[i%14]+' '+LN[(i+(pid?pid.length:0))%8],gender:f?'f':'m',
      pathId:lv.startsWith('british')?'british':'national',gradeId:lv,parentId:pid,sectionKey:null});
  };
  for(let i=0;i<42;i++){
    const pid=i<14?'par'+(i+1):(i<17?'par15':(i<19?'par16':'par'+(1+(i%10))));
    mkstu(i,LV[i%4],pid);
  }
  mkstu(42,'british::2:0','par17'); /* البريطاني 3 — وليّ أمر مستقل */
  mkstu(43,'british::3:0','par15'); /* البريطاني 7 — وليّ أمر له 3 أبناء وطنيون */
  mkstu(44,'british::2:0','par16'); /* البريطاني 3 — وليّ أمر لأبناء في مسارين */
  db.students=students;
  /* توزيع أول 30 طالبًا (توزيع متوازن) — تبقى 15 غير موزّعين لتجربة شاشة التوزيع */
  /* المرحلة 3: تعيينات التدريس للعام الحالي — معلم لكل مادة في كل شعبة (تلقائي بالتخصص + توازن) */
  (db.sectionsByYear['2026/2027']||[]).forEach(sec=>autoAssignSection(db,sec));
  /* ضمان قصة متسقة مع بذور البوابة: معلمو المهام البذرية على مواد شعبهم */
  setTeachPlan(db,'2026/2027::national::1:0::أ','الرياضيات','t1');
  setTeachPlan(db,'2026/2027::national::1:0::ب','العلوم','t4');
  setTeachPlan(db,'2026/2027::national::1:1::أ','اللغة العربية','t3');
  setTeachPlan(db,'2026/2027::national::1:2::أ','اللغة الإنجليزية','t2');
  let placed=0;
  for(const s of students){
    if(placed>=30)break;
    if(s.pathId==='british')continue;
    const sec=pickBalancedSection(db,'2026/2027',s.gradeId);
    if(!sec)continue;
    s.sectionKey=sectionKey(sec);placed++;
  }
  seedPortalDemo(db);
  saveDB(db);
  return db;
}
function resetAllData(){store.del(LS_KEY);}

/* ---------- مكوّنات واجهة مشتركة ---------- */
function toast(msg,opt={}){
  const {type='',actionLabel,onAction,dur=4200}=opt;
  const root=document.getElementById('toast-root');
  const el=document.createElement('div');
  el.className='toastx '+type;
  el.innerHTML='<span>'+msg+'</span>';
  if(actionLabel){
    const b=document.createElement('button');
    b.textContent=actionLabel;
    b.onclick=()=>{el.remove();if(onAction)onAction();};
    el.appendChild(b);
  }
  root.appendChild(el);
  setTimeout(()=>el.remove(),dur);
}
function askConfirm(title,body,onYes,yesLabel='تأكيد',danger=false){
  const r=document.getElementById('modal-root');
  r.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal"><h3>${title}</h3><p>${body}</p>
    <div class="row">
      <button class="btn ghost" onclick="closeModal()">إلغاء</button>
      <button class="btn ${danger?'primary':'outline-p'}" id="m-yes">${yesLabel}</button>
    </div></div></div>`;
  document.getElementById('m-yes').onclick=()=>{closeModal();onYes();};
}
function closeModal(){document.getElementById('modal-root').innerHTML='';}
function appbar(school,crumb){
  return `<div class="appbar">
    <div class="brand"><span class="logo">🎓</span>${esc(school)}<span class="crumb">${crumb}</span></div>
    <div class="appbar-l">🔔<span class="uav">ع</span></div>
  </div>`;
}
function stepIndicator(steps,current){
  const AR=['','١','٢','٣','٤','٥'];
  return steps.map((s,i)=>{
    const n=i+1;
    const cls=n<current?'done':(n===current?'on':'');
    const back=n<current?`onclick="goBackTo(${n})"`:'';
    return `<div class="wstep ${cls} ${n<current?'back':''}" ${back}><span class="d">${n<current?'✓':AR[n]}</span>${s}</div>`;
  }).join('<div class="wline"></div>');
}

/* ============================================================
   المرحلة 2 — البوابة: المعلم، الطالب، ولي الأمر
   (المهام Assignments & Assessments · العلامات · الكشوفات ·
    محادثات 1:1 · الحضور والغياب)
============================================================ */
const LS_SESSION=LS_KEY+'_session';
const EXCUSES=['مرض','ظرف عائلي','سفر','التزام رسمي','أخرى'];
const ATT_META={present:{t:'حاضر',cls:'ok'},absent:{t:'غائب',cls:'bad'},late:{t:'متأخر',cls:'warn'},excused:{t:'غياب بعذر',cls:'info'}};
const ASG_TYPES={task:{t:'مهمة'},assessment:{t:'اختبار / تقييم'}};
const NOTE_KINDS={academic:{t:'أكاديمية',ic:'📘',cls:'info'},behavioral:{t:'سلوكية',ic:'🧭',cls:'warn'}};

/* ---------- الجلسة (نموذج تجريبي: اختيار الدور والهوية) ---------- */
function getSession(){ try{const s=JSON.parse(store.get(LS_SESSION)); if(s&&s.role&&s.id)return s;}catch(e){} return null; }
function setSession(s){ if(s&&s.role)store.set(LS_SESSION,JSON.stringify(s)); else store.del(LS_SESSION); }

/* ---------- أدوات عامة ---------- */
function uid(p){ return p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function pad2(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function nowStamp(){ const d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function studentsOfSection(db,key){ return (db.students||[]).filter(s=>s.sectionKey===key); }
function sectionByKey(db,key){
  if(!key) return null;
  const y=key.split('::')[0];
  return (db.sectionsByYear[y]||[]).find(s=>s.year+'::'+s.gradeId+'::'+s.letter===key)||null;
}
function mySections(db,teacherId,year){ return (db.sectionsByYear[year]||[]).filter(s=>s.teacherId===teacherId); }
function teacherOfSection(db,sec){ return sec?(db.teachers||[]).find(t=>t.id===sec.teacherId)||null:null; }
function studentById(db,id){ return (db.students||[]).find(s=>s.id===id)||null; }
function parentById(db,id){ return id?(db.parents||[]).find(p=>p.id===id)||null:null; }
function teacherById(db,id){ return (db.teachers||[]).find(t=>t.id===id)||null; }
function displayName(db,ref){
  if(ref.role==='teacher'){ const t=teacherById(db,ref.id); return t?t.name:'معلم'; }
  if(ref.role==='student'){ const s=studentById(db,ref.id); return s?s.name:'طالب'; }
  if(ref.role==='parent'){ const p=parentById(db,ref.id); return p?p.name:'ولي أمر'; }
  return '—';
}

/* ---------- المهام والتقييم (Assignments & Assessments) ---------- */
function createAssignment(db,o){
  const a={id:uid('asg'),teacherId:o.teacherId,subject:o.subject,sectionKey:o.sectionKey,
    type:o.type||'task',title:o.title,instructions:o.instructions||'',dueDate:o.dueDate,
    maxScore:o.maxScore||20,resources:o.resources||[],createdAt:todayStr()};
  (db.assignments=db.assignments||[]).push(a); saveDB(db); return a;
}
function assignmentsOfSection(db,key){ return (db.assignments||[]).filter(a=>a.sectionKey===key); }
function assignmentsForStudent(db,student){ return (db.assignments||[]).filter(a=>a.sectionKey===student.sectionKey); }
function submissionFor(db,assignmentId,studentId){ return (db.submissions||[]).find(s=>s.assignmentId===assignmentId&&s.studentId===studentId)||null; }
function submitAssignment(db,assignmentId,studentId,o){
  let s=submissionFor(db,assignmentId,studentId);
  if(!s){ s={id:uid('sub'),assignmentId,studentId,submittedAt:nowStamp(),fileName:null,content:'',status:'submitted',score:null,feedback:''}; (db.submissions=db.submissions||[]).push(s); }
  s.submittedAt=nowStamp();
  if(o.fileName)s.fileName=o.fileName;
  if(o.content)s.content=o.content;
  if(o.fileData!=null)s.fileData=o.fileData;
  s.status='submitted';
  saveDB(db); return s;
}
function gradeSubmission(db,submissionId,score,feedback){
  const s=(db.submissions||[]).find(x=>x.id===submissionId); if(!s)return null;
  s.score=score; s.feedback=feedback||''; s.status='graded'; saveDB(db); return s;
}
function submissionsOf(db,assignmentId){ return (db.submissions||[]).filter(s=>s.assignmentId===assignmentId); }

/* ---------- محادثات فردية (One-to-One) ---------- */
function findConversation(db,pa,pb){
  return (db.conversations||[]).find(c=>
    (c.a.role===pa.role&&c.a.id===pa.id&&c.b.role===pb.role&&c.b.id===pb.id)||
    (c.a.role===pb.role&&c.a.id===pb.id&&c.b.role===pa.role&&c.b.id===pa.id))||null;
}
function startConversation(db,pa,pb){
  let c=findConversation(db,pa,pb);
  if(!c){ c={id:uid('cv'),a:pa,b:pb,messages:[]}; (db.conversations=db.conversations||[]).push(c); }
  saveDB(db); return c;
}
function addMessage(db,convId,from,text){
  const c=(db.conversations||[]).find(x=>x.id===convId); if(!c)return null;
  c.messages.push({from, text, at:nowStamp()}); saveDB(db); return c;
}
function conversationsOf(db,role,id){ return (db.conversations||[]).filter(c=>(c.a.role===role&&c.a.id===id)||(c.b.role===role&&c.b.id===id)); }
function lastMsg(c){ return c.messages.length?c.messages[c.messages.length-1]:null; }
function unreadConvs(db,role,id){ return conversationsOf(db,role,id).filter(c=>{const l=lastMsg(c); return l&&(l.from.role!==role||l.from.id!==id);}); }

/* ---------- الإشعارات ---------- */
function notify(db,to,text){ (db.notifications=db.notifications||[]).push({id:uid('nt'),to,text,at:nowStamp(),read:false}); saveDB(db); }
function notificationsFor(db,role,id){ return (db.notifications||[]).filter(n=>n.to.role===role&&n.to.id===id); }
function markNotifsRead(db,role,id){ let n=0;(db.notifications||[]).forEach(x=>{if(x.to.role===role&&x.to.id===id&&!x.read){x.read=true;n++;}}); if(n)saveDB(db); return n; }

/* ---------- الحضور والغياب ---------- */
function setAttendance(db,date,sectionKey,studentId,status,excuseType,notifyParent){
  let r=(db.attendance=db.attendance||[]).find(x=>x.date===date&&x.sectionKey===sectionKey&&x.studentId===studentId);
  if(!r){ r={id:uid('at'),date,sectionKey,studentId}; (db.attendance).push(r); }
  r.status=status;
  r.excuseType=(status==='excused')?(excuseType||EXCUSES[0]):null;
  let notified=false;
  if(status==='excused'&&notifyParent!==false){
    const st=studentById(db,studentId);
    if(st&&st.parentId){ const p=parentById(db,st.parentId);
      if(p){ notify(db,{role:'parent',id:p.id},`الحضور: غياب ابني/ابنتي ${st.name} بتاريخ ${date} (بعذر: ${r.excuseType}).`); notified=true; } }
  }
  r.notified=notified; saveDB(db); return r;
}
function attendanceOfDay(db,date,sectionKey){ return (db.attendance||[]).filter(x=>x.date===date&&x.sectionKey===sectionKey); }
function attendanceDates(db,sectionKey){ return [...new Set((db.attendance||[]).filter(x=>x.sectionKey===sectionKey).map(x=>x.date))].sort().reverse(); }
function attendanceSummary(db,studentId){
  const s={present:0,absent:0,late:0,excused:0};
  (db.attendance||[]).filter(x=>x.studentId===studentId).forEach(r=>{ if(s[r.status]!==undefined)s[r.status]++; });
  return s;
}
function recentAttendance(db,studentId,n=5){
  return (db.attendance||[]).filter(x=>x.studentId===studentId).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,n);
}

/* ---------- المرحلة 3 — الملاحظات الأكاديمية والسلوكية ---------- */
function createNote(db,o){
  const n={id:uid('note'),studentId:o.studentId,sectionKey:o.sectionKey,subject:o.subject,
    teacherId:o.teacherId,kind:o.kind||'behavioral',text:o.text,at:nowStamp()};
  (db.notes=db.notes||[]).push(n);
  const st=studentById(db,o.studentId);
  const t=teacherById(db,o.teacherId);
  const kt=NOTE_KINDS[n.kind]?NOTE_KINDS[n.kind].t:'ملاحظة';
  if(st){
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'student',id:st.id},
      text:`📝 ملاحظة ${kt} جديدة في مادة ${n.subject}${t?' من '+t.name:''}.`,at:nowStamp(),read:false});
    if(st.parentId){
      (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:st.parentId},
        text:`📝 ملاحظة ${kt} جديدة عن ${st.name} في مادة ${n.subject}${t?' من '+t.name:''}.`,at:nowStamp(),read:false});
    }
  }
  saveDB(db); return n;
}
function notesOfStudent(db,studentId){
  return (db.notes||[]).filter(n=>n.studentId===studentId).sort((a,b)=>b.at.localeCompare(a.at));
}
function notesOfBox(db,sectionKey,subject){
  return (db.notes||[]).filter(n=>n.sectionKey===sectionKey&&n.subject===subject).sort((a,b)=>b.at.localeCompare(a.at));
}

/* ---------- المرحلة 4 — نظام إدارة السلوك (نقاط إيجابية/سلبية) ---------- */
const BEHAVIOR_CATS_NEG=['الحضور والتأخر','الواجبات','السلوك الصفي','المخالفات','العدوانية','الممتلكات والأجهزة','أخرى'];
const BEHAVIOR_CATS_POS=['الحضور','الإنجاز الأكاديمي','المشاركة','الاجتماعي','القيادة','أخرى'];
const DEFAULT_NEG_BEHAVIORS=[
  {id:'bn1',name:'التأخر',points:1,category:'الحضور والتأخر'},
  {id:'bn2',name:'عدم تسليم الواجب',points:1,category:'الواجبات'},
  {id:'bn3',name:'تكرار الحديث أثناء الحصة',points:1,category:'السلوك الصفي'},
  {id:'bn4',name:'عدم الالتزام بالتعليمات',points:2,category:'السلوك الصفي'},
  {id:'bn5',name:'التشويش',points:2,category:'السلوك الصفي'},
  {id:'bn6',name:'مخالفة الأنظمة',points:2,category:'المخالفات'},
  {id:'bn7',name:'سوء استخدام الأجهزة',points:2,category:'الممتلكات والأجهزة'},
  {id:'bn8',name:'الإساءة إلى زميل',points:3,category:'العدوانية'},
  {id:'bn9',name:'إتلاف الممتلكات',points:4,category:'الممتلكات والأجهزة'},
  {id:'bn10',name:'التنمر',points:4,category:'العدوانية'},
  {id:'bn11',name:'المشاجرة',points:5,category:'العدوانية'}
];
const DEFAULT_POS_BEHAVIORS=[
  {id:'bp1',name:'الالتزام بالوقت',points:1,category:'الحضور'},
  {id:'bp2',name:'إنجاز الواجب',points:2,category:'الإنجاز الأكاديمي'},
  {id:'bp3',name:'المشاركة الإيجابية',points:2,category:'المشاركة'},
  {id:'bp4',name:'مساعدة زميل',points:2,category:'الاجتماعي'},
  {id:'bp5',name:'المحافظة على ممتلكات المدرسة',points:2,category:'الاجتماعي'},
  {id:'bp6',name:'المبادرة',points:3,category:'المشاركة'},
  {id:'bp7',name:'قيادة نشاط',points:3,category:'القيادة'},
  {id:'bp8',name:'تحسن أكاديمي واضح',points:5,category:'الإنجاز الأكاديمي'},
  {id:'bp9',name:'سلوك قيادي متميز',points:5,category:'القيادة'}
];
const DEFAULT_BEHAVIOR_SETTINGS={
  negStages:[
    {name:'تنبيه',threshold:5,action:'تسجيل تنبيه + إشعار المربي وولي الأمر + إجراء تربوي: تذكير لفظي ومتابعة من المربي'},
    {name:'إنذار',threshold:10,action:'إصدار إنذار مكتوب + إشعار ولي الأمر والمرشد التربوي + تحديد إجراء متابعة'},
    {name:'تدخل تربوي',threshold:15,action:'فتح حالة متابعة سلوكية + إشعار الإدارة والمرشد + اجتماع مع الطالب وولي الأمر عند الحاجة + خطة تدخل ومتابعة'}
  ],
  posLevels:[
    {name:'إشادة',threshold:10,reward:'إشادة أو شهادة إلكترونية'},
    {name:'تميز سلوكي',threshold:20,reward:'شارة تميز سلوكي'},
    {name:'تميز سلوكي متميز',threshold:30,reward:'تكريم تميز سلوكي متميز'}
  ]
};
const STAGE_META={1:{t:'تنبيه',cls:'warn'},2:{t:'إنذار',cls:'bad'},3:{t:'تدخل تربوي',cls:'bad'}};
function defaultBehaviors(){return{negative:clone(DEFAULT_NEG_BEHAVIORS),positive:clone(DEFAULT_POS_BEHAVIORS)};}
function ensureBehaviorData(db){
  if(!db.behaviors)db.behaviors=defaultBehaviors();
  if(!db.behaviorSettings)db.behaviorSettings=clone(DEFAULT_BEHAVIOR_SETTINGS);
  db.behaviorRecords=db.behaviorRecords||[];
  db.behaviorIncidents=db.behaviorIncidents||[];
  db.behaviorAwards=db.behaviorAwards||[];
}
function behaviorItem(db,kind,behaviorId){
  return (db.behaviors?db.behaviors[kind]:[]).find(b=>b.id===behaviorId)||null;
}
function behaviorTotals(db,studentId){
  let neg=0,pos=0;
  (db.behaviorRecords||[]).filter(r=>r.studentId===studentId).forEach(r=>{ if(r.kind==='negative')neg-=r.points; else pos+=r.points; });
  return {neg,pos};
}
/* تحليل النقاط حسب تصنيف السلوك */
function behaviorByCategory(db,studentId){
  const m={};
  (db.behaviorRecords||[]).filter(r=>r.studentId===studentId).forEach(r=>{
    m[r.category]=m[r.category]||{neg:0,pos:0,count:0};
    if(r.kind==='negative')m[r.category].neg-=r.points; else m[r.category].pos+=r.points;
    m[r.category].count++;
  });
  return Object.entries(m).map(([category,v])=>({category,...v}));
}
function studentBehavior(db,studentId){
  const {neg,pos}=behaviorTotals(db,studentId);
  const s=db.behaviorSettings||DEFAULT_BEHAVIOR_SETTINGS;
  const negAbs=-neg;
  let stage=0,stageName='';
  s.negStages.forEach((st,i)=>{ if(negAbs>=st.threshold){ stage=i+1; stageName=st.name; } });
  const nextNeg=stage<s.negStages.length?s.negStages[stage].threshold:null;
  let level=0,levelName='';
  s.posLevels.forEach((lv,i)=>{ if(pos>=lv.threshold){ level=i+1; levelName=lv.name; } });
  const nextPos=level<s.posLevels.length?s.posLevels[level].threshold:null;
  return {neg,pos,negAbs,stage,stageName,nextNeg,level,levelName,nextPos,
    records:(db.behaviorRecords||[]).filter(r=>r.studentId===studentId).length,
    byCategory:behaviorByCategory(db,studentId),
    incidents:(db.behaviorIncidents||[]).filter(x=>x.studentId===studentId),
    awards:(db.behaviorAwards||[]).filter(x=>x.studentId===studentId)};
}
/* تسجيل سلوك — يعيد {record, fired:{stages,levels}, notified:{student,parent,homeroom}} */
function recordBehavior(db,o){
  const b=behaviorItem(db,o.kind,o.behaviorId);
  if(!b)return null;
  const st=studentById(db,o.studentId); if(!st)return null;
  const t=teacherById(db,o.teacherId);
  const before=behaviorTotals(db,o.studentId);
  const rec={id:uid('br'),studentId:o.studentId,teacherId:o.teacherId,kind:o.kind,
    behaviorId:b.id,behaviorName:b.name,category:b.category,
    points:o.kind==='negative'?b.points:b.points,
    note:o.note||'',action:o.action||'',at:nowStamp(),notifiedParent:!!st.parentId,followUp:''};
  (db.behaviorRecords=db.behaviorRecords||[]).push(rec);
  const fired={stages:[],levels:[]};
  const notified={student:false,parent:false,homeroom:false};
  const s=db.behaviorSettings||DEFAULT_BEHAVIOR_SETTINGS;
  const after=behaviorTotals(db,o.studentId);
  const homeroomId=(sectionByKey(db,st.sectionKey)||{}).teacherId||null;
  if(o.kind==='negative'){
    const bA=-before.neg, aA=-after.neg;
    s.negStages.forEach((sg,i)=>{
      if(bA<sg.threshold&&aA>=sg.threshold){
        const inc={id:uid('inc'),studentId:st.id,stage:i+1,name:sg.name,threshold:sg.threshold,
          at:nowStamp(),action:sg.action,followUp:'',status:'open',closedAt:null,closedBy:null};
        (db.behaviorIncidents=db.behaviorIncidents||[]).push(inc);
        fired.stages.push(inc);
        if(st.parentId){
          (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:st.parentId},
            text:`⚠️ ${sg.name} سلوكي: وصل ${st.name} إلى ${sg.threshold} نقطة سلبية (المجموع ${aA}). الإجراء: ${sg.action}.`,at:nowStamp(),read:false});
          notified.parent=true;
        }
      }
    });
  } else {
    const bP=before.pos, aP=after.pos;
    s.posLevels.forEach((lv,i)=>{
      if(bP<lv.threshold&&aP>=lv.threshold){
        const aw={id:uid('awd'),studentId:st.id,level:i+1,name:lv.name,threshold:lv.threshold,reward:lv.reward,at:nowStamp()};
        (db.behaviorAwards=db.behaviorAwards||[]).push(aw);
        fired.levels.push(aw);
        if(st.parentId){
          (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:st.parentId},
            text:`🏆 مكافأة سلوكية: حقق ${st.name} مستوى «${lv.name}» (${aP} نقطة إيجابية) — ${lv.reward}.`,at:nowStamp(),read:false});
          notified.parent=true;
        }
      }
    });
  }
  /* إشعار الطالب دائمًا */
  (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'student',id:st.id},
    text:o.kind==='negative'
      ?`📋 سُجّلت حالة سلوكية (سلبي) عليك: ${b.name} (-${b.points})${t?' من '+t.name:''}. مجموعك السلبي: ${-after.neg}.`
      :`⭐ نقطة سلوكية إيجابية: ${b.name} (+${b.points})${t?' من '+t.name:''}. مجموعك الإيجابي: ${after.pos}.`,
    at:nowStamp(),read:false});
  notified.student=true;
  /* إشعار المربي إن كان المسجّل غير المربي */
  if(homeroomId&&homeroomId!==o.teacherId){
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'teacher',id:homeroomId},
      text:`🧭 سجل سلوك جديد على ${st.name} (${b.name} ${o.kind==='negative'?'-':'+'}${b.points})${t?' بواسطة '+t.name:''}. المجموع: سلبي ${-after.neg} / إيجابي ${after.pos}.`,
      at:nowStamp(),read:false});
    notified.homeroom=true;
  }
  /* إشعار ولي الأمر — دائمًا مع كل سجل سلوكي (نظام تواصل فعال: الأهل على اطلاع) */
  if(st.parentId&&!notified.parent){
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:st.parentId},
      text:`📋 سجل سلوك عن ${st.name}: ${b.name} (${o.kind==='negative'?'-':'+'}${b.points})${t?' من '+t.name:''} — ${rec.note||'بدون ملاحظة'}.`,
      at:nowStamp(),read:false});
    notified.parent=true;
  }
  if(notified.parent)rec.notifiedParent=true;
  saveDB(db);
  return {record:rec,fired,notified,totals:after};
}
function setRecordFollowUp(db,recordId,text){
  const r=(db.behaviorRecords||[]).find(x=>x.id===recordId); if(!r)return null;
  r.followUp=text||''; saveDB(db); return r;
}
function openIncidents(db){
  return (db.behaviorIncidents||[]).filter(x=>x.status==='open').sort((a,b)=>b.at.localeCompare(a.at));
}
function closeIncident(db,incidentId,teacherId){
  const inc=(db.behaviorIncidents||[]).find(x=>x.id===incidentId); if(!inc)return null;
  inc.status='closed'; inc.closedAt=nowStamp(); inc.closedBy=teacherId||null; saveDB(db); return inc;
}

/* ---------- العلامات وكشوف النتائج (Grades & Report Cards) ---------- */
function gradesOfStudent(db,studentId){
  return (db.submissions||[]).filter(s=>s.studentId===studentId&&s.score!=null).map(s=>{
    const a=(db.assignments||[]).find(a=>a.id===s.assignmentId);
    return a?{subject:a.subject,type:a.type,title:a.title,score:s.score,max:a.maxScore,feedback:s.feedback,at:s.submittedAt}:null;
  }).filter(Boolean);
}
function reportCardData(db,studentId){
  const st=studentById(db,studentId); if(!st)return null;
  const grades=gradesOfStudent(db,studentId);
  const perSubject={};
  grades.forEach(g=>{ (perSubject[g.subject]=perSubject[g.subject]||{n:0,sum:0,max:0}); perSubject[g.subject].n++; perSubject[g.subject].sum+=g.score; perSubject[g.subject].max+=g.max; });
  const per=Object.entries(perSubject).map(([subject,v])=>({subject,n:v.n,avg:v.max?Math.round(v.sum/v.max*100):0}));
  const overall=grades.length?Math.round(grades.reduce((a,g)=>a+g.score,0)/grades.reduce((a,g)=>a+g.max,0)*100):null;
  return {student:st,parent:parentById(db,st.parentId),section:sectionByKey(db,st.sectionKey),
    per,overall,att:attendanceSummary(db,studentId),gradeCount:grades.length,behavior:studentBehavior(db,studentId)};
}

/* ---------- المرحلة 5 — الملفات ودورة التواصل الفعّال ---------- */
const FILE_MAX=1048576; /* 1MB كحد أقصى لكل ملف (يُخزن في localStorage كـ dataURL) */
/* اختيار ملف من <input type=file> وقراءته كـ dataURL */
function pickFileEl(input,onFile,onErr){
  const f=(input.files&&input.files[0])||null;
  if(!f)return;
  if(f.size>FILE_MAX){ if(onErr)onErr('حجم الملف يتجاوز 1MB — اختر ملفًا أصغر'); input.value=''; return; }
  const rd=new FileReader();
  rd.onload=()=>onFile({name:f.name,data:rd.result,size:f.size});
  rd.onerror=()=>{ if(onErr)onErr('تعذّرت قراءة الملف'); input.value=''; };
  rd.readAsDataURL(f);
}
/* رابط تحميل لمورد/إجابة (يدعم dataURL المرفوع أو رابطًا خارجيًا) */
function fileLinkHtml(name,src,extra=''){
  if(!src)return esc(name);
  return `<a href="${esc(src)}" download="${esc(name)}" ${extra} style="color:var(--p);font-weight:700;text-decoration:none">📎 ${esc(name)}</a>`;
}
/* ---------- الخطة الأسبوعية لكل (شعبة × مادة) ---------- */
function postWeeklyPlan(db,o){
  const sec=sectionByKey(db,o.sectionKey);
  const t=teacherById(db,o.teacherId);
  const plan={id:uid('wp'),sectionKey:o.sectionKey,subject:o.subject,teacherId:o.teacherId,
    weekLabel:(o.weekLabel||'أسبوع '+todayStr()).trim(),text:(o.text||'').trim(),
    fileName:o.fileName||null,fileData:o.fileData||null,at:nowStamp()};
  (db.weeklyPlans=db.weeklyPlans||[]).push(plan);
  const notified={students:0,parents:0};
  const pids={};
  (db.students||[]).filter(s=>s.sectionKey===o.sectionKey).forEach(s=>{
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'student',id:s.id},
      text:`📅 خطة أسبوعية جديدة في ${o.subject} لشعبتك${sec?' (شعبة '+sec.letter+')':''}: ${plan.weekLabel}${t?' من '+t.name:''}${plan.fileName?' مع ملف مرفق':''}.`,
      at:nowStamp(),read:false});
    notified.students++;
    if(s.parentId&&!pids[s.parentId]){
      pids[s.parentId]=1;
      (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:s.parentId},
        text:`📅 خطة أسبوعية جديدة في مادة ${o.subject} لشعبة ابنك${sec?' (شعبة '+sec.letter+')':''}: ${plan.weekLabel}${t?' — '+t.name:''}.`,
        at:nowStamp(),read:false});
      notified.parents++;
    }
  });
  saveDB(db);
  return {plan,notified};
}
function plansOfBox(db,sectionKey,subject){
  return (db.weeklyPlans||[]).filter(p=>p.sectionKey===sectionKey&&p.subject===subject).sort((a,b)=>b.at.localeCompare(a.at));
}
function plansOfSection(db,sectionKey){
  return (db.weeklyPlans||[]).filter(p=>p.sectionKey===sectionKey).sort((a,b)=>b.at.localeCompare(a.at));
}
/* ---------- دورة إشعارات الواجبات والتسليم والتقييم ---------- */
function notifyOnPublish(db,a){
  const t=teacherById(db,a.teacherId);
  const sec=sectionByKey(db,a.sectionKey);
  const what=a.type==='assessment'?'اختبار':'واجب';
  const pids={};
  let students=0,parents=0;
  (db.students||[]).filter(s=>s.sectionKey===a.sectionKey).forEach(s=>{
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'student',id:s.id},
      text:`📝 ${what} جديد في ${a.subject}: «${a.title}» — التسليم ${a.dueDate} (الدرجة العظمى ${a.maxScore})${t?' — '+t.name:''}.`,
      at:nowStamp(),read:false});
    students++;
    if(s.parentId&&!pids[s.parentId]){
      pids[s.parentId]=1;
      (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:s.parentId},
        text:`📝 لدى ابنك ${what} جديد في ${a.subject}: «${a.title}» — التسليم ${a.dueDate}${sec?' (شعبة '+sec.letter+')':''}.`,
        at:nowStamp(),read:false});
      parents++;
    }
  });
  saveDB(db);
  return {students,parents};
}
function notifyOnSubmit(db,sub){
  const a=(db.assignments||[]).find(x=>x.id===sub.assignmentId);
  const st=studentById(db,sub.studentId);
  if(!a||!st)return {teacher:false,parent:false};
  let teacher=false,parent=false;
  if(a.teacherId){
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'teacher',id:a.teacherId},
      text:`✍️ ${st.name} سلّم «${a.title}»${sub.fileName?' (مع ملف مرفق)':''}.`,
      at:nowStamp(),read:false});
    teacher=true;
  }
  if(st.parentId){
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:st.parentId},
      text:`✍️ سلّم ابنك ${st.name} «${a.title}» (${a.subject})${sub.fileName?' — رفع ملف إجاباته':''}.`,
      at:nowStamp(),read:false});
    parent=true;
  }
  saveDB(db);
  return {teacher,parent};
}
function notifyOnGrade(db,sub,score,maxScore){
  const a=(db.assignments||[]).find(x=>x.id===sub.assignmentId);
  const st=studentById(db,sub.studentId);
  if(!a||!st)return {student:false,parent:false};
  let student=false,parent=false;
  const txt=`🎯 وُقيّم «${a.title}» (${a.subject}): ${score}/${maxScore}${sub.feedback?' — ملاحظة: '+sub.feedback:''}.`;
  (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'student',id:st.id},text:txt,at:nowStamp(),read:false});
  student=true;
  if(st.parentId){
    (db.notifications=db.notifications||[]).push({id:uid('nt'),to:{role:'parent',id:st.parentId},
      text:txt.replace('وُقيّم','وُقيّم لدى ابنك '+st.name+''),at:nowStamp(),read:false});
    parent=true;
  }
  saveDB(db);
  return {student,parent};
}

/* ---------- بذور البوابة التجريبية ---------- */
function seedPortalDemo(db){
  const Y='2026/2027';
  const K=(g,l)=>Y+'::'+g+'::'+l;
  db.assignments=[]; db.submissions=[]; db.conversations=[]; db.attendance=[]; db.notifications=[];
  const A=(id,subject,gid,letter,type,title,instructions,due,max,res,tid)=>{
    db.assignments.push({id,subject,sectionKey:K(gid,letter),type,title,instructions,dueDate:due,maxScore:max,resources:res,createdAt:'2026-09-18',teacherId:tid});
  };
  A('asg1','الرياضيات','national::1:0','أ','assessment','اختبار الوحدة الأولى: الأعداد والعمليات','حل المسائل الواردة في الكشف. مدة الاختبار: حصة واحدة.','2026-09-28',20,[{name:'كشف الوحدة الأولى.pdf',url:''}],'t1');
  A('asg2','اللغة العربية','national::1:1','أ','task','مقالة تعبيرية: مدرستي','اكتب مقالة من 200 إلى 300 كلمة عن مدرستك وبيئتها.','2026-10-10',10,[{name:'تعليمات المقالة.docx',url:''}],'t3');
  A('asg3','اللغة الإنجليزية','national::1:2','أ','task','ورقة مفردات الوحدة الثالثة','أكمل الورقة وأرسل ملف إجاباتك.','2026-10-05',15,[{name:'Vocabulary.docx',url:''}],'t2');
  A('asg4','العلوم','national::1:0','ب','assessment','تجربة مختبرية: حالات المادة','نفّذ التجربة وسجّل ملاحظاتك في نموذج التقرير.','2026-10-12',20,[{name:'نموذج التقرير.docx',url:''},{name:'فيديو التجربة.mp4',url:''}],'t4');
  const S=(aid,sid,files,graded,score,fdbk)=>{
    db.submissions.push({id:'sub_'+aid.slice(3)+'_'+sid,assignmentId:aid,studentId:sid,submittedAt:'2026-09-27 14:20',fileName:files,content:'',status:graded?'graded':'submitted',score,feedback:fdbk});
  };
  const secA=studentsOfSection(db,K('national::1:0','أ'));
  if(secA.length){ S('asg1',secA[0].id,'إجاباتي.pdf',true,17,'جيد جدًا — انتبه لخطأ التقريب في المسألة 5.'); if(secA[1]) S('asg1',secA[1].id,'answer2.pdf',true,14,'جهود مشكورة — راجع أولوية العمليات.'); if(secA[2]) S('asg1',secA[2].id,'draft.pdf',false,null,''); }
  const secB=studentsOfSection(db,K('national::1:0','ب'));
  if(secB.length) S('asg4',secB[0].id,'تقرير التجربة.pdf',true,18,'تجربة مستوفاة والملاحظات مرتبة.');
  const secC=studentsOfSection(db,K('national::1:1','أ'));
  if(secC.length) S('asg2',secC[0].id,'مقالة.docx',false,null,'');
  /* محادثات فردية */
  if(secA.length){
    const st1=secA[0], par1=parentById(db,st1.parentId);
    if(par1){
      db.conversations.push({id:'cv1',a:{role:'parent',id:par1.id},b:{role:'teacher',id:'t1'},messages:[
        {from:{role:'parent',id:par1.id},text:`مرحبًا، أود متابعة نتائج ابني ${st1.name} في اختبار الرياضيات.`,at:'2026-09-27 09:15'},
        {from:{role:'teacher',id:'t1'},text:'أهلًا! نتيجته جيدة (17/20)، يحتاج مراجعة التقريب فقط. التفاصيل الكاملة ستظهر في كشف النتائج.',at:'2026-09-27 11:02'},
        {from:{role:'parent',id:par1.id},text:'شكرًا لك يا أستاذ. ومتى الاختبار القادم؟',at:'2026-09-27 11:30'}]});
    }
    db.conversations.push({id:'cv2',a:{role:'student',id:st1.id},b:{role:'teacher',id:'t1'},messages:[
      {from:{role:'student',id:st1.id},text:'أستاذ، عندي سؤال حول المسألة 4 في الاختبار.',at:'2026-09-26 16:40'},
      {from:{role:'teacher',id:'t1'},text:'تفضل بعد الحصة أو أرسل تفاصيل السؤال هنا.',at:'2026-09-26 17:05'}]});
  }
  /* حضور 3 أيام + غياب بعذر مع إشعار ولي الأمر */
  const secATeacher=secA.length?teacherOfSection(db,sectionByKey(db,K('national::1:0','أ'))):null;
  ['2026-09-21','2026-09-22','2026-09-23'].forEach(dt=>{
    secA.forEach((st,si)=>{
      let status='present';
      if(dt==='2026-09-22'&&si===1)status='excused';
      if(dt==='2026-09-23'&&si===2)status='late';
      const r={id:'at_'+dt.slice(5)+'_'+st.id,date:dt,sectionKey:K('national::1:0','أ'),studentId:st.id,status,excuseType:status==='excused'?'مرض':null,notified:false};
      db.attendance.push(r);
      if(status==='excused'&&st.parentId){
        const p=parentById(db,st.parentId);
        if(p){ db.notifications.push({id:'nt_att_'+st.id,to:{role:'parent',id:p.id},text:`الحضور: غياب ${st.name} بتاريخ ${dt} (بعذر: ${r.excuseType}).`,at:dt+' 08:05',read:false}); r.notified=true; }
      }
    });
  });
  if(secATeacher&&secA[2]) db.notifications.push({id:'nt_sub',to:{role:'teacher',id:secATeacher.id},text:`تسليم جديد في «اختبار الوحدة الأولى»: ${secA[2].name}.`,at:'2026-09-27 14:21',read:true});
  /* المرحلة 3: ملاحظات أكاديمية وسلوكية (المربي يملك صلاحيات أي مادة في صفه) */
  db.notes=[];
  const N=(id,st,sub,tid,kind,text,at)=>{
    db.notes.push({id,studentId:st,sectionKey:K('national::1:0','أ'),subject:sub,teacherId:tid,kind,text,at});
    const stu=studentById(db,st);
    if(stu){
      db.notifications.push({id:'nt_note_'+id,to:{role:'student',id:stu.id},text:`📝 ملاحظة ${NOTE_KINDS[kind].t} جديدة في مادة ${sub} من ${teacherById(db,tid)?teacherById(db,tid).name:''}.`,at,read:false});
      if(stu.parentId)db.notifications.push({id:'nt_note_'+id+'_p',to:{role:'parent',id:stu.parentId},text:`📝 ملاحظة ${NOTE_KINDS[kind].t} جديدة عن ${stu.name} في مادة ${sub}.`,at,read:false});
    }
  };
  /* المرحلة 4: نظام إدارة السلوك — تُسجل السجلات عبر recordBehavior فيتفعّل السلّم تلقائيًا */
  db.behaviorRecords=[];db.behaviorIncidents=[];db.behaviorAwards=[];
  const B=(name)=>((db.behaviors.negative||[]).find(x=>x.name===name)||(db.behaviors.positive||[]).find(x=>x.name===name)).id;
  const RB=(sid,tid,kind,bname,note,notif)=>recordBehavior(db,{studentId:sid,teacherId:tid,kind,behaviorId:B(bname),note:note||'',notifyParent:!!notif,action:''});
  if(secA.length){
    /* stu الأول: إيجابي +12 ← مستوى «إشادة» + سلبي خفيف */
    RB(secA[0].id,'t1','negative','التأخر','تأخر 10 دقائق عن بدء الحصة',false);
    RB(secA[0].id,'t1','positive','إنجاز الواجب','سلّم واجب الوحدة في وقته وبجودة عالية',false);
    RB(secA[0].id,'t1','positive','المبادرة','بادر بحل مسألة إضافية على السبورة',false);
    RB(secA[0].id,'t1','positive','المشاركة الإيجابية','مشاركة فعّالة ومناسبة في مناقشة الحصة',false);
    RB(secA[0].id,'t1','positive','تحسن أكاديمي واضح','تحسن واضح في درجات اختبار الرياضيات',false);
    /* الثاني: سلبي -9 ← مرحلة «تنبيه» */
    RB(secA[1].id,'t1','negative','عدم تسليم الواجب','لم يسلم واجب القراءة',true);
    RB(secA[1].id,'t1','negative','تكرار الحديث أثناء الحصة','',true);
    RB(secA[1].id,'t7','negative','التشويش','شوّش على سير النشاط داخل الحصة',true);
    RB(secA[1].id,'t1','negative','مخالفة الأنظمة','تأخر عن الدوام دون إبلاغ المعلم',true);
    RB(secA[1].id,'t1','negative','الإساءة إلى زميل','',true);
    /* الثالث: سلبي -15 ← تنبيه + إنذار + تدخل تربوي */
    RB(secA[2].id,'t1','negative','التأخر','',true);
    RB(secA[2].id,'t1','negative','عدم تسليم الواجب','',true);
    RB(secA[2].id,'t1','negative','تكرار الحديث أثناء الحصة','',true);
    RB(secA[2].id,'t1','negative','مخالفة الأنظمة','',true);
    RB(secA[2].id,'t7','negative','التشويش','',true);
    RB(secA[2].id,'t1','negative','التنمر','تهدد زميلًا داخل الصف',true);
    RB(secA[2].id,'t1','negative','إتلاف الممتلكات','كسر مقعدًا أثناء الحصة',true);
  }
  const secJ=studentsOfSection(db,K('national::1:0','ج'));
  if(secJ[1]){ /* ابن وليّ الأمر par1 الثاني: سلبي -6 ← تنبيه */
    RB(secJ[1].id,'t1','negative','التأخر','',true);
    RB(secJ[1].id,'t1','negative','التشويش','',true);
    RB(secJ[1].id,'t1','negative','تكرار الحديث أثناء الحصة','',true);
    RB(secJ[1].id,'t1','negative','سوء استخدام الأجهزة','استخدم الجهاز بطريقة مخالفة للأنظمة',true);
  }
  if(secA.length){
    N('note1',secA[0].id,'الرياضيات','t1','academic','متابعة ممتازة في حل المسائل — يحتاج فقط الانتباه إلى قواعد التقريب قبل الاختبار.','2026-09-25 10:12');
    if(secA[1])N('note2',secA[1].id,'الرياضيات','t1','behavioral','تفاعل جيد في الحصة، لكنه أحيانًا يتكلم مع زملائه أثناء الشرح — نرجو تعزيز التركيز في البيت.','2026-09-26 09:40');
    if(secA[2])N('note3',secA[2].id,'اللغة العربية','t1','behavioral','ملاحظة سلوكية بصفتي مربّي الصف: تكرر التأخر في تسليم واجب القراءة مرتين هذا الأسبوع.','2026-09-27 08:15');
    /* المرحلة 5: خطة أسبوعية منشورة (رياضيات 1:0 أ) — يراها الطالب ووليّ الأمر مع إشعار */
    postWeeklyPlan(db,{sectionKey:K('national::1:0','أ'),subject:'الرياضيات',teacherId:'t1',
      weekLabel:'أسبوع 2026-09-21',
      text:'الاثنين: مراجعة الأعداد الكبيرة والقيمة المكانية · الثلاثاء: العمليات الأربع مع المسائل · الأربعاء: التقريب (الدرس 5) · الخميس: نشاط تطبيقي في مجموعات · الجمعة: اختبار قصير على الوحدة الأولى.',
      fileName:'خطة-الرياضيات-الأسبوعية.pdf',fileData:null});
  }
}
