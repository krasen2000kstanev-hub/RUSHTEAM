(function(){
"use strict";
const $=s=>document.querySelector(s);
function h(tag,attrs,...kids){
  const el=document.createElement(tag);
  for(const k in (attrs||{})){const v=attrs[k]; if(v==null||v===false)continue;
    if(k==="class")el.className=v; else if(k==="style")el.style.cssText=v;
    else if(k.slice(0,2)==="on")el.addEventListener(k.slice(2),v);
    else if(k in el)el[k]=v; else el.setAttribute(k,v);}
  for(const c of kids.flat(3)){ if(c==null||c===false)continue; el.append(c.nodeType?c:document.createTextNode(String(c))); }
  return el;
}
const STAGES=[["idea","Идея"],["script","Сценарий"],["shoot","Заснемане"],["edit","Монтаж"],["review","Ревизия"],["done","Предадено"],["published","Публикувано"],["results","Резултати"]];
const ACTS=[["script","Сценарий"],["shoot","Заснемане"],["edit","Монтаж"],["post","Цвят и звук"],["review","Ревизии"],["design","Дизайн"],["dev","Разработка"],["org","Организация"],["meet","Срещи и комуникация"],["other","Друго"]];
const TEAMS={
  media:{name:"Видео създаване",one:"видео",add:"+ Ново видео",stages:STAGES},
  web:{name:"Сайтове",one:"сайт",add:"+ Нов сайт",stages:[["brief","Бриф"],["design","Дизайн"],["dev","Разработка"],["backend","Backend"],["content","Съдържание"],["review","Преглед от клиента"],["done","Пуснат"]]},
  events:{name:"Събития",one:"събитие",add:"+ Ново събитие",stages:[["request","Запитване"],["plan","Планиране"],["vendors","Локация и доставчици"],["promo","Промоция"],["ready","Готово за провеждане"],["done","Проведено"]]},
  design:{name:"Дизайн",one:"дизайн задача",add:"+ Нова задача",stages:[["brief","Бриф"],["concept","Концепция"],["work","Изработка"],["review","Ревизия"],["done","Предадено"]]}};
const TASK_TEMPLATES={media:[["Сценарий","Потвърден бриф","Сценарий/структура","Заснемане","Монтаж","Вътрешна ревизия","Одобрение от клиент","Публикуване"]],web:[["Уеб проект","Събрани изисквания","Структура и дизайн","Разработка","QA проверка","Предаване"]],events:[["Събитие","Дата и локация","Доставчици","Програма","Потвърждение с клиента","Провеждане"]],design:[["Дизайн","Бриф","Концепция","Изработка","Вътрешна ревизия","Предаване"]]};
const TAB_TEAM={board:"media",web:"web",events:"events",design:"design"},ALLT=["media","web","events","design","hr"],TNAME={media:"Видео",web:"Сайтове",events:"Събития",design:"Дизайн",hr:"Подбор"};
const teamOf=v=>TEAMS[v.team]?v.team:"media",stagesOf=v=>TEAMS[teamOf(v)].stages;
const stageId=v=>{const st=stagesOf(v);return (st.find(x=>x[0]===v.stage)||st[0])[0];},stageName=v=>{const st=stagesOf(v);return (st.find(x=>x[0]===v.stage)||st[0])[1];};
const isDone=v=>{const st=stagesOf(v);return st.findIndex(x=>x[0]===stageId(v))>=st.findIndex(x=>x[0]==="done");};
const STAGE_ACT={idea:"script",script:"script",shoot:"shoot",edit:"edit",review:"review",done:"other"};
const COLORS=["#2f7ed8","#d9534f","#e08a1e","#3a9d5d","#8e5bd1","#c7498f","#1a9aa0","#7a8a2e"];
const FORMATS=[["short","Reels / Shorts / TikTok"],["long","YouTube (дълго видео)"],["ad","Реклама"],["corp","Корпоративно"],["event","Събитие"],["photo","Фотосесия"],["other","Друго"]];
const fmtName=id=>(FORMATS.find(a=>a[0]===id)||[0,"Без формат"])[1];
const GD="Google Drive",SHEET={track:"1mzKA-mzzmQqNzb5glSvcDXdWXb9rTzr4ZwL4r7RMnzY",req:"1mzKA-mzzmQqNzb5glSvcDXdWXb9rTzr4ZwL4r7RMnzY",ads:"1mzKA-mzzmQqNzb5glSvcDXdWXb9rTzr4ZwL4r7RMnzY",tasks:"1mzKA-mzzmQqNzb5glSvcDXdWXb9rTzr4ZwL4r7RMnzY"};
const WHO=["човек","екип","служител","отговорник","рекрутър","консултант"];
const SHEETS_CFG=(window.TEAM_HUB_CONFIG||{}).sheets||{};Object.assign(SHEET,SHEETS_CFG);
const sheetUrl=id=>"https://docs.google.com/spreadsheets/d/"+id+"/edit";
const PST=[["open","Отворена"],["paused","На пауза"],["closed","Затворена"]];
const pstName=id=>(PST.find(a=>a[0]===id)||PST[0])[1];
const DEPTS=[["media","Медия"],["hr","Подбор"],["all","И двете"]];
const actName=id=>(ACTS.find(a=>a[0]===id)||[0,"Друго"])[1];

const S={db:null,user:null,uid:null,isAdmin:false,canWrite:true,ready:false,
  clients:{},videos:{},shoots:{},members:{},depts:{},mcp:null,booted:false,hr:{rows:null,jd:{},ads:[],adsErr:false,tasks:[],tasksErr:false,err:"",at:0,loading:false,hasWho:false},hrView:"who",prof:{},myDays:{},rep:{},
  tab:"timer",preset:"month",from:"",to:"",fClient:"",fFmt:"",mine:false,fWho:"",dl:null,cal:null,runId:null};

/* ---------- time helpers ---------- */
const p2=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
const pd=s=>{const a=s.split("-");return new Date(+a[0],+a[1]-1,+a[2]);};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const hm=ms=>{const d=new Date(ms);return p2(d.getHours())+":"+p2(d.getMinutes());};
function dur(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000);return Math.floor(s/3600)+":"+p2(Math.floor(s%3600/60))+":"+p2(s%60);}
function hrs(ms){return (ms/3.6e6).toLocaleString("bg-BG",{minimumFractionDigits:1,maximumFractionDigits:1})+" ч";}
function dayLabel(s){const t=ymd(new Date());if(s===t)return "Днес";if(s===ymd(addDays(new Date(),-1)))return "Вчера";
  return pd(s).toLocaleDateString("bg-BG",{weekday:"long",day:"numeric",month:"long"});}
const shortDate=s=>pd(s).toLocaleDateString("bg-BG",{day:"numeric",month:"short"});
function weekStart(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
function setPreset(p){S.preset=p;const n=new Date();
  if(p==="week"){const a=weekStart(n);S.from=ymd(a);S.to=ymd(addDays(a,6));}
  else if(p==="month"){S.from=ymd(new Date(n.getFullYear(),n.getMonth(),1));S.to=ymd(new Date(n.getFullYear(),n.getMonth()+1,0));}
  else if(p==="prev"){S.from=ymd(new Date(n.getFullYear(),n.getMonth()-1,1));S.to=ymd(new Date(n.getFullYear(),n.getMonth(),0));}
}
setPreset("month");
const nid=()=>"e"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function safeUrl(u){u=(u||"").trim();if(!u)return null;if(!/^[a-z][a-z0-9+.-]*:/i.test(u))u="https://"+u;
  try{const x=new URL(u);return (x.protocol==="https:"||x.protocol==="http:")?x.href:null;}catch(e){return null;}}
function linkLabel(l){if(l.label)return l.label;try{const hn=new URL(l.url).hostname;return /(^|\.)google\.com$/.test(hn)?"Google Drive":hn.replace(/^www\./,"");}catch(e){return "Линк";}}
const ext=(l)=>h("a",{href:l.url,target:"_blank",rel:"noopener noreferrer"},linkLabel(l)," ↗");

let toastT;
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3500);}
function errMsg(e){const c=e&&e.code;
  if(c==="quota_exceeded")return "Базата е пълна. Изтрийте стари записи и опитайте пак.";
  if(c==="invalid_argument")return "Нямате права за тази промяна.";
  if(c==="resource_exhausted")return "Твърде много заявки. Изчакайте малко и опитайте пак.";
  return "Промяната не се запази. Опитайте пак.";}
async function tryW(p,ok){try{await p;if(ok)toast(ok);return true;}catch(e){toast(errMsg(e));return false;}}

const nameOf=id=>{if(!id)return "Без отговорник";const p=S.prof[id];return (p&&p.name)||(id===S.uid?"Вие":"Колега");};
const client=id=>S.clients[id];
const cColor=id=>(client(id)&&client(id).color)||"";
const cName=id=>client(id)?client(id).name:"Без клиент";

/* ---------- data ---------- */
let rq=0;function schedule(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;render();});}
function onErr(e){if(e&&e.code==="revoked"){showBanner("Достъпът до данните е спрян за този изглед.");}}
function showBanner(m){const b=$("#banner");b.textContent=m;b.hidden=false;}
function subCol(name,after){S.db.collection(name).onSnapshot(s=>{const o={};s.docs.forEach(d=>{o[d.id]=d.data();});S[name]=o;if(after)after();fillSelects();schedule();},onErr);}
async function loadProfiles(){if(!S.user)return;const ids=new Set(Object.keys(S.members));if(S.uid)ids.add(S.uid);
  Object.values(S.videos).forEach(v=>{if(v.who)ids.add(v.who);(v.comments||[]).forEach(c=>c.by&&ids.add(c.by));});
  try{S.prof=await S.user.profiles([...ids]);}catch(e){} schedule();}

let repUnsubs=[],repKey="";
function subReports(force){
  if(!S.db||!S.uid)return;
  const people=S.isAdmin?[...new Set([S.uid,...Object.keys(S.members)])].sort():[S.uid];
  const key=people.join(",")+"|"+S.from+"|"+S.to; if(key===repKey&&!force)return; repKey=key;
  repUnsubs.forEach(u=>u());repUnsubs=[];S.rep={};
  people.slice(0,40).forEach(p=>{
    repUnsubs.push(S.db.collection("time/"+p+"/days").where("date",">=",S.from).where("date","<=",S.to)
      .onSnapshot(s=>{const o={};s.docs.forEach(d=>{o[d.id]=d.data();});S.rep[p]=o;if(S.tab==="reports")schedule();},onErr));
  });
}
const chains={};
function writeDay(date,fn){
  const ref=S.db.doc("time/"+S.uid+"/days/"+date);
  const run=async()=>{const snap=await ref.get();const cur=snap.exists?JSON.parse(JSON.stringify(snap.data())):{date:date,entries:{}};
    cur.date=date;cur.entries=cur.entries||{};fn(cur.entries);await ref.set(cur);};
  const p=(chains[date]||Promise.resolve()).then(run);chains[date]=p.catch(()=>{});return p;
}
function myEntries(){const out=[];for(const date in S.myDays){const es=(S.myDays[date]||{}).entries||{};for(const id in es)out.push(Object.assign({id:id,date:date},es[id]));}return out;}
function running(){return myEntries().filter(e=>e.e==null).sort((a,b)=>b.s-a.s)[0]||null;}

/* ---------- selects ---------- */
function fill(sel,items,empty){const v=sel.value;sel.textContent="";if(empty!=null)sel.append(h("option",{value:""},empty));
  items.forEach(i=>sel.append(h("option",{value:i[0]},i[1])));sel.value=[...sel.options].some(o=>o.value===v)?v:"";}
const clientOpts=()=>Object.entries(S.clients).filter(e=>!e[1].archived).sort((a,b)=>a[1].name.localeCompare(b[1].name,"bg")).map(e=>[e[0],e[1].name]);
const videoOpts=cid=>Object.entries(S.videos).filter(e=>(!cid||e[1].client===cid)&&teamOf(e[1])!=="events"&&myTeams().includes(teamOf(e[1]))).sort((a,b)=>a[1].title.localeCompare(b[1].title,"bg")).map(e=>[e[0],e[1].title]);
function fillSelects(){
  ["#t-client","#e-client","#v-client","#s-client"].forEach(s=>fill($(s),clientOpts(),"Без клиент"));
  [["#t-video","#t-client"],["#e-video","#e-client"],["#s-video","#s-client"]].forEach(p=>fill($(p[0]),videoOpts($(p[1]).value),"Без задача"));
  fill($("#v-who"),memberIds().map(id=>[id,nameOf(id)]),"Без отговорник");
}
function videoTeams(){return Object.entries(TEAMS).filter(([id])=>myTeams().includes(id)).map(([id,t])=>[id,t.name]);}
function fillTemplateOptions(team,selected=""){const s=$("#v-template");s.textContent="";s.append(h("option",{value:""},"Без шаблон"));(TASK_TEMPLATES[team]||[]).forEach((t,i)=>s.append(h("option",{value:String(i)},t[0])));s.value=selected;}
function memberIds(){const ids=new Set(Object.keys(S.members));if(S.uid)ids.add(S.uid);return [...ids].sort((a,b)=>nameOf(a).localeCompare(nameOf(b),"bg"));}
function pairSelects(c,v){$(c).addEventListener("change",()=>fill($(v),videoOpts($(c).value),"Без задача"));
  $(v).addEventListener("change",()=>{const vid=S.videos[$(v).value];if(vid&&vid.client&&$(c).value!==vid.client){$(c).value=vid.client;}});}

/* ---------- timer ---------- */
function timerFields(){return {d:$("#t-desc").value.trim(),c:$("#t-client").value,v:$("#t-video").value,a:$("#t-act").value||"other"};}
async function startTimer(f){
  if(!S.db||!S.uid){toast("Влезте в профила си, за да засичате време.");return;}
  const r=running();if(r)await stopTimer(r);
  const now=Date.now(),id=nid();
  await tryW(writeDay(ymd(new Date(now)),es=>{es[id]={d:f.d||"",c:f.c||"",v:f.v||"",a:f.a||"other",s:now,e:null};}));
}
function stopTimer(r){return tryW(writeDay(r.date,es=>{if(es[r.id]&&es[r.id].e==null)es[r.id].e=Date.now();}));}
function syncTimerBar(){
  const r=running(),bar=$("#timer");bar.classList.toggle("on",!!r);$("#t-toggle").textContent=r?"Стоп":"Старт";
  if(r&&S.runId!==r.id){$("#t-desc").value=r.d||"";$("#t-client").value=r.c||"";fill($("#t-video"),videoOpts(r.c),"Без задача");$("#t-video").value=r.v||"";$("#t-act").value=r.a||"other";}
  if(!r&&S.runId){$("#t-desc").value="";}
  S.runId=r?r.id:null;tick();
}
function tick(){const r=running();$("#t-clock").textContent=r?dur(Date.now()-r.s):"0:00:00";}
setInterval(tick,1000);
$("#t-toggle").addEventListener("click",async()=>{const b=$("#t-toggle");b.disabled=true;const r=running();
  if(r)await stopTimer(r);else await startTimer(timerFields());b.disabled=false;});
["#t-desc","#t-client","#t-video","#t-act"].forEach(s=>$(s).addEventListener("change",()=>{const r=running();if(!r)return;
  setTimeout(()=>{const f=timerFields();tryW(writeDay(r.date,es=>{if(es[r.id])Object.assign(es[r.id],f);}));},0);}));
$("#t-desc").addEventListener("keydown",e=>{if(e.key==="Enter"&&!running())$("#t-toggle").click();});

function teamsOf(id){const d=S.depts[id]||{};if(d.founder||d.admin)return ALLT;return Array.isArray(d.teams)?d.teams:[];}
function myTeams(){return S.isAdmin?ALLT:teamsOf(S.uid);}
function allowed(t){const m=myTeams();if(t==="today")return true;if(t==="hr")return m.includes("hr");if(TAB_TEAM[t])return m.includes(TAB_TEAM[t]);if(t==="calendar")return m.includes("media")||m.includes("events");if(t==="timer"||t==="reports")return m.some(x=>x!=="hr"&&x!=="events");return m.some(x=>x!=="hr");}
/* ---------- views ---------- */
function render(){
  const onlyHr=!myTeams().some(x=>x!=="hr"&&x!=="events");const rdy=S.booted&&(S.isAdmin||S.deptsLoaded);if(rdy&&!allowed(S.tab))S.tab=["today","timer","board","web","events","design","due","calendar","reports","team","hr"].find(allowed)||"today";document.body.dataset.tab=S.tab;
  $("#timer").hidden=onlyHr||S.tab==="hr"||S.tab==="events";
  if(S.tab==="hr"&&S.booted&&!S.hr.rows&&!S.hr.loading&&!S.hr.err)loadHr();
  document.body.classList.toggle("ro",!S.canWrite||!S.db);document.body.classList.toggle("adm",S.isAdmin);
  document.querySelectorAll("#tabs a").forEach(a=>{a.hidden=!allowed(a.getAttribute("href").slice(1));if(a.getAttribute("href")==="#"+S.tab)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  {const ac=document.querySelector('#tabs a[aria-current]'),tb=$("#tabs");if(ac&&tb.scrollWidth>tb.clientWidth)tb.scrollLeft=Math.max(0,ac.offsetLeft-tb.offsetLeft-(tb.clientWidth-ac.offsetWidth)/2);}
  $("#who").textContent=S.uid?(nameOf(S.uid)+" · "+(S.isAdmin?"основател":"член на екипа")):"";
  syncTimerBar();
  const v=$("#view");
  const scx=(v.querySelector(".board")||{}).scrollLeft||0;
  v.textContent="";
  if(!rdy){v.append(h("div",{class:"panel empty"},"Зареждане…"));return;}
  if(!allowed(S.tab)){v.append(h("div",{class:"panel empty"},"Още нямате достъп до нито един екип. Помолете мениджър да ви добави от „Екип и клиенти“."));return;}
  v.append(({today:vToday,timer:vTimer,board:vBoard,web:vBoard,events:vBoard,design:vBoard,due:vDue,hr:vHr,calendar:vCal,reports:vReports,team:vTeam}[S.tab]||vToday)());
  const bd=v.querySelector(".board");if(bd&&scx)bd.scrollLeft=scx;
  v.querySelectorAll(".tw table").forEach(t=>{const hs=[...t.querySelectorAll("thead th")].map(x=>x.textContent);t.querySelectorAll("tbody tr").forEach(r=>[...r.children].forEach((td,i)=>td.setAttribute("data-label",hs[i]||"")));});
}
function entryMeta(e){const vid=S.videos[e.v];return h("div",{class:"meta"},
  h("span",{class:"dot",style:"--c:"+cColor(e.c)}),h("span",null,cName(e.c)),vid?h("span",null,"· "+vid.title):null,h("span",{class:"pill"},actName(e.a)));}
async function deleteEntry(e){if(!window.confirm("Изтриване на този запис за време?"))return;await tryW(writeDay(e.date,es=>{delete es[e.id];}));}

function vToday(){
  const root=h("div",{style:"display:flex;flex-direction:column;gap:14px"}),today=ymd(new Date()),soon=ymd(addDays(new Date(),7));
  const mine=Object.entries(S.videos).filter(([,v])=>myTeams().includes(teamOf(v))&&!isDone(v)).sort((a,b)=>(a[1].due||"9999").localeCompare(b[1].due||"9999"));
  const late=mine.filter(([,v])=>v.due&&v.due<today),next=mine.filter(([,v])=>v.due&&v.due>=today&&v.due<=soon);
  root.append(h("div",{class:"bar"},h("div",{class:"sum"},h("div",null,h("b",null,mine.length),h("span",null,"Активни задачи")),h("div",null,h("b",{class:late.length?"late":""},late.length),h("span",null,"Просрочени")),h("div",null,h("b",null,next.length),h("span",null,"До 7 дни"))),h("span",{class:"sp"}),h("a",{class:"btn",href:"#due"},"Преглед на всички")));
  const panel=h("section",{class:"panel"},h("div",{class:"ph"},h("span",null,"Моите задачи за днес"),h("span",{class:"mono"},mine.length)));
  if(!mine.length)panel.append(h("div",{class:"empty"},"Няма активни задачи. Добра работа!"));
  mine.slice(0,12).forEach(([id,v])=>panel.append(h("div",{class:"drow"},h("div",{style:"min-width:0"},h("button",{class:"t",type:"button",onclick:()=>openVideo(id)},v.title),h("div",{class:"small muted"},cName(v.client)+" · "+nameOf(v.who))),h("span",{class:"pill"},TNAME[teamOf(v)]),v.due?h("span",{class:"mono small"+(v.due<today?" late":"")},shortDate(v.due)):h("span",{class:"small muted"},"без срок"))));
  root.append(panel);return root;
}

function vTimer(){
  const root=h("div",{style:"display:flex;flex-direction:column;gap:14px"});
  const es=myEntries(),now=Date.now(),today=ymd(new Date()),ws=ymd(weekStart(new Date()));
  const ms=e=>(e.e==null?now:e.e)-e.s;
  const tToday=es.filter(e=>e.date===today).reduce((a,e)=>a+ms(e),0),tWeek=es.filter(e=>e.date>=ws).reduce((a,e)=>a+ms(e),0);
  root.append(h("div",{class:"bar"},
    h("div",{class:"sum"},h("div",null,h("b",null,dur(tToday)),h("span",null,"Днес")),h("div",null,h("b",null,dur(tWeek)),h("span",null,"Тази седмица"))),
    h("span",{class:"sp"}),h("button",{class:"btn w-only",type:"button",onclick:()=>openEntry(null)},"+ Ръчен запис")));
  const dates=[...new Set(es.map(e=>e.date))].sort().reverse();
  if(!dates.length){root.append(h("div",{class:"panel empty"},S.ready?"Още няма записано време за последните две седмици. Изберете клиент и дейност горе и натиснете „Старт“.":"Зареждане…"));return root;}
  dates.forEach(d=>{
    const list=es.filter(e=>e.date===d).sort((a,b)=>b.s-a.s);
    const day=h("section",{class:"panel day"},h("header",null,h("span",null,dayLabel(d)),h("span",{class:"mono"},dur(list.reduce((a,e)=>a+ms(e),0)))));
    list.forEach(e=>day.append(h("div",{class:"row"},
      h("div",{class:"what"},h("span",{style:"overflow-wrap:anywhere"},e.d||h("span",{class:"muted"},"Без описание")),entryMeta(e)),
      h("span",{class:"span mono"},hm(e.s)+" – "+(e.e==null?"сега":hm(e.e))),
      h("span",{class:"dur mono"},dur(ms(e))),
      h("span",{class:"acts w-only"},
        e.e!=null?h("button",{class:"btn ghost",type:"button",title:"Продължи със същата задача",onclick:()=>startTimer(e)},"▶"):null,
        e.e!=null?h("button",{class:"btn ghost",type:"button",title:"Редактирай",onclick:()=>openEntry(e)},"✎"):null,
        e.e!=null?h("button",{class:"btn ghost danger",type:"button",title:"Изтрий директно", "aria-label":"Изтрий директно",onclick:()=>deleteEntry(e)},"×"):null))));
    root.append(day);
  });
  return root;
}

function vBoard(){
  const team=TAB_TEAM[S.tab]||"media",T=TEAMS[team];
  const root=h("div",{style:"display:flex;flex-direction:column;gap:12px"});
  const fc=h("select",{id:"b-client","aria-label":"Филтър по клиент",onchange:e=>{S.fClient=e.target.value;schedule();}});
  fill(fc,clientOpts(),"Всички клиенти");fc.value=S.fClient;
  const ff=h("select",{id:"b-fmt","aria-label":"Филтър по формат",onchange:e=>{S.fFmt=e.target.value;schedule();}});
  fill(ff,FORMATS,"Всички формати");ff.value=S.fFmt;
  root.append(h("div",{class:"bar"},fc,team==="media"?ff:null,
    h("span",{class:"sp"}),h("button",{class:"btn primary w-only",type:"button",onclick:()=>openVideo(null,team)},T.add)));
  const all=Object.entries(S.videos).filter(e=>teamOf(e[1])===team);
  const ppl=[...new Set([...memberIds().filter(id=>id===S.uid?myTeams().includes(team):teamsOf(id).includes(team)),...all.map(e=>e[1].who).filter(Boolean)])].sort((a,b)=>nameOf(a).localeCompare(nameOf(b),"bg"));
  if(S.fWho&&S.fWho!=="-"&&!ppl.includes(S.fWho))S.fWho="";
  const cnt=id=>all.filter(e=>!isDone(e[1])&&(id==="-"?!e[1].who:e[1].who===id)).length;
  const chip=(id,label)=>h("button",{class:"btn"+(S.fWho===id?" primary":""),type:"button","aria-pressed":String(S.fWho===id),style:"min-height:0;padding:6px 10px",title:id&&id!=="-"?((S.members[id]||{}).role||""):"",
    onclick:()=>{S.fWho=id;schedule();}},label,id?h("span",{class:"mono small",style:"margin-left:6px;opacity:.8"},cnt(id)):null);
  root.append(h("section",{class:"panel",style:"padding:10px 12px;display:flex;flex-direction:column;gap:8px"},
    h("div",{class:"small",style:"font-weight:700;color:var(--accent-2)"},"Екип „"+T.name+"“ · "+ppl.length+(ppl.length===1?" човек":" души")+" · числото е броят активни задачи"),
    h("div",{style:"display:flex;flex-wrap:wrap;gap:8px"},chip("","Всички"),ppl.map(id=>chip(id,nameOf(id)+(id===S.uid?" (вие)":""))),cnt("-")?chip("-","Без отговорник"):null)));
  const vids=all.filter(e=>(!S.fClient||e[1].client===S.fClient)&&(team!=="media"||!S.fFmt||e[1].fmt===S.fFmt)&&(!S.fWho||(S.fWho==="-"?!e[1].who:e[1].who===S.fWho)));
  if(!Object.values(S.videos).some(v=>teamOf(v)===team)){root.append(h("div",{class:"panel empty"},S.ready?"Тук ще се вижда всичко на екип „"+T.name+"“ по етапи: от „"+T.stages[0][1]+"“ до „"+T.stages[T.stages.length-1][1]+"“. Добавете първото с бутона горе.":"Зареждане…"));return root;}
  const today=ymd(new Date()),board=h("div",{class:"board"});
  T.stages.forEach((st,i)=>{
    const list=vids.filter(e=>stageId(e[1])===st[0]).sort((a,b)=>(a[1].due||"9999").localeCompare(b[1].due||"9999"));
    const col=h("section",{class:"col",
      ondragover:e=>{if(S.drag){e.preventDefault();e.dataTransfer.dropEffect="move";col.classList.add("over");}},
      ondragleave:e=>{if(!col.contains(e.relatedTarget))col.classList.remove("over");},
      ondrop:e=>{e.preventDefault();col.classList.remove("over");const id=S.drag;S.drag=null;if(id&&S.videos[id]&&stageId(S.videos[id])!==st[0])moveVideo(id,i);}},h("header",null,h("span",null,st[1]),h("span",{class:"mono"},list.length)));
    if(!list.length)col.append(h("div",{class:"none"},"Няма"));
    list.forEach(([id,v])=>{
      const late=v.due&&v.due<today&&!isDone(v);
      col.append(h("article",{class:"card",style:"--c:"+cColor(v.client),draggable:!!(S.canWrite&&S.db),
        ondragstart:e=>{S.drag=id;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",v.title);}catch(x){}e.currentTarget.classList.add("dragging");},
        ondragend:e=>{S.drag=null;e.currentTarget.classList.remove("dragging");document.querySelectorAll(".col.over").forEach(c=>c.classList.remove("over"));}},
        h("button",{class:"t",type:"button",onclick:()=>openVideo(id)},v.title),
        h("div",{class:"m"},h("span",null,cName(v.client)),h("span",null,"· "+nameOf(v.who))),
        (v.due||v.est)?h("div",{class:"m"},v.due?h("span",{class:late?"late":""},(late?"Просрочено: ":"Срок: ")+shortDate(v.due)):null,v.est?h("span",{class:"mono"},v.est+" ч план"):null):null,
        cardExtra(v),
        (v.links&&v.links.length)?h("div",{class:"links"},v.links.map(ext)):null,
        h("div",{class:"acts w-only"},
          h("button",{class:"btn ghost",type:"button",title:"Предишен етап",disabled:i===0,onclick:()=>moveVideo(id,i-1)},"←"),
          team==="events"?h("span"):h("button",{class:"btn ghost",type:"button",title:"Засечи време по тази задача",onclick:()=>{startTimer({d:"",c:v.client||"",v:id,a:team==="media"?STAGE_ACT[st[0]]:"other"});toast("Таймерът тръгна: "+v.title);}},"▶ Засечи"),
          h("button",{class:"btn ghost",type:"button",title:"Следващ етап",disabled:i===T.stages.length-1,onclick:()=>moveVideo(id,i+1)},"→"))));
    });
    board.append(col);
  });
  root.append(board);return root;
}
function cardExtra(v){const ck=v.check||[],cm=(v.comments||[]).length,bits=[];
  if(teamOf(v)==="events"){if(v.edate)bits.push(h("span",{class:"mono",style:"color:var(--gold)"},shortDate(v.edate)+(v.estart?" "+v.estart:"")));
    const sv=v.svc||[];if(sv.length)bits.push(h("span",null,"Услуги "+sv.filter(x=>x.done).length+"/"+sv.length));}
  if(teamOf(v)==="media"&&isDone(v)){if(v.track==="nodata")bits.push(h("span",{class:"pill",style:"opacity:.75"},"Нямаме данни"));
    else{const pl=safeUrl(v.publink);if(pl)bits.push(ext({url:pl,label:"Публикация"}));if(v.results)bits.push(h("span",{class:"pill",style:"color:var(--gold)"},"Има резултати"));}}
  if(v.fmt)bits.push(h("span",{class:"pill"},fmtName(v.fmt)));
  if(ck.length)bits.push(h("span",{class:"mono"},"✓ "+ck.filter(c=>c.done).length+"/"+ck.length));
  if(+v.revs)bits.push(h("span",null,"Ревизии: "+v.revs));
  if(cm)bits.push(h("span",null,"Коментари: "+cm));
  return bits.length?h("div",{class:"m"},bits):null;}
function moveVideo(id,i){const v=S.videos[id]||{},st=stagesOf(v),upd={stage:st[i][0],moved:Date.now()},di=st.findIndex(x=>x[0]==="done");
  upd.doneAt=i>=di?(v.doneAt||Date.now()):0;
  if(v.stage==="review"&&i<st.findIndex(x=>x[0]==="review")){upd.revs=(+v.revs||0)+1;toast("Отчетен е нов кръг ревизии.");}
  tryW(S.db.doc("videos/"+id).update(upd));}

function dueText(due,today){const n=Math.round((pd(due)-pd(today))/864e5);
  return n===0?"днес":n<0?("преди "+(-n)+(n===-1?" ден":" дни")):("след "+n+(n===1?" ден":" дни"));}
function vDue(){
  const root=h("div",{style:"display:flex;flex-direction:column;gap:16px"});
  const mine=Object.entries(S.videos).filter(e=>myTeams().includes(teamOf(e[1])));
  if(!mine.length){root.append(h("div",{class:"panel empty"},S.ready?"Тук ще се вижда докъде е стигнал всеки екип, кои задачи са просрочени и кой колко е натоварен. Добавете задачи в разделите на екипите.":"Зареждане…"));return root;}
  const today=ymd(new Date()),soon=ymd(addDays(new Date(),7)),byDue=(a,b)=>a[1].due.localeCompare(b[1].due);
  const act=mine.filter(e=>!isDone(e[1]));
  const late=act.filter(e=>e[1].due&&e[1].due<today).sort(byDue),next=act.filter(e=>e[1].due&&e[1].due>=today&&e[1].due<=soon).sort(byDue),nodue=act.filter(e=>!e[1].due);
  const big=(n,l,bad)=>h("div",null,h("b",{style:bad&&n?"color:var(--rec)":""},n),h("span",null,l));
  root.append(h("div",{class:"sum"},big(late.length,"Просрочени",true),big(next.length,"Срок до 7 дни"),big(nodue.length,"Без срок"),big(act.length,"Активни задачи")));
  const tp=h("section",{class:"panel"},h("div",{class:"ph"},h("span",null,"Докъде е всеки екип")));
  Object.keys(TEAMS).filter(t=>myTeams().includes(t)).forEach(t=>{const items=mine.filter(e=>teamOf(e[1])===t),lt=items.filter(e=>!isDone(e[1])&&e[1].due&&e[1].due<today).length;
    tp.append(h("div",{class:"drow",style:"grid-template-columns:minmax(0,1fr)"},
      h("div",{style:"display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"},h("a",{href:"#"+Object.keys(TAB_TEAM).find(k=>TAB_TEAM[k]===t),style:"font-weight:600"},TEAMS[t].name),lt?h("span",{class:"late small"},lt+" просрочени"):null),
      h("div",{style:"display:flex;flex-wrap:wrap;gap:4px 6px"},TEAMS[t].stages.map(st=>{const n=items.filter(e=>stageId(e[1])===st[0]).length;return h("span",{class:"pill",style:n?"color:var(--ink);font-weight:700":"opacity:.6"},st[1]+" · "+n);}))));});
  root.append(tp);
  const list=(title,items,none)=>{const p=h("section",{class:"panel"},h("div",{class:"ph"},h("span",null,title),h("span",{class:"mono"},items.length)));
    if(!items.length)p.append(h("div",{class:"drow muted"},none));
    items.forEach(([id,v])=>p.append(h("div",{class:"drow"},
      h("div",{style:"min-width:0;display:flex;flex-direction:column;gap:2px"},h("button",{class:"t",type:"button",onclick:()=>openVideo(id)},v.title),
        h("span",{class:"small muted",style:"display:flex;gap:6px;align-items:center;flex-wrap:wrap"},h("span",{class:"dot",style:"--c:"+cColor(v.client)}),cName(v.client)+" · "+nameOf(v.who))),
      h("span",{class:"pill"},TNAME[teamOf(v)]+" · "+stageName(v)),
      v.due?h("span",{class:"mono small"+(v.due<today?" late":"")},shortDate(v.due)+" · "+dueText(v.due,today)):h("span",{class:"small muted"},"без срок"))));
    return p;};
  const load={};act.forEach(([id,v])=>{const k=v.who||"";load[k]=load[k]||{n:0,late:0,est:0};load[k].n++;if(v.due&&v.due<today)load[k].late++;load[k].est+=+v.est||0;});
  const lr=Object.entries(load).sort((a,b)=>b[1].n-a[1].n),max=lr.length?lr[0][1].n:1;
  const wl=h("section",{class:"panel box"},h("h2",null,"Натоварване"),h("p",{class:"small muted",style:"margin:0"},"Активни задачи по отговорник, без приключените."),
    lr.length?lr.map(([k,o])=>h("div",{class:"meter"+(o.late?" over":"")},h("span",{class:"nm"},nameOf(k)),
      h("span",{class:"val mono"},o.n+(o.n===1?" задача":" задачи")+(o.late?" · "+o.late+" просроч.":"")+(o.est?" · "+o.est+" ч план":"")),
      h("div",{class:"track"},h("div",{class:"fill",style:"width:"+(o.n/max*100).toFixed(1)+"%;--c:"+(o.late?"var(--rec)":"var(--accent)")})))):h("div",{class:"muted"},"Няма активни видеа."));
  root.append(h("div",{class:"two"},h("div",{style:"display:flex;flex-direction:column;gap:16px;min-width:0"},list("Просрочени",late,"Няма просрочени видеа."),list("Срок до 7 дни",next,"Няма срокове през следващите 7 дни.")),wl));
  return root;
}

function vCal(){
  if(!S.cal){const n=new Date();S.cal=new Date(n.getFullYear(),n.getMonth(),1);}
  const m=S.cal,root=h("div",{style:"display:flex;flex-direction:column;gap:12px"}),mt=myTeams(),sm=mt.includes("media"),se=mt.includes("events");
  const go=n=>{S.cal=new Date(m.getFullYear(),m.getMonth()+n,1);schedule();};
  root.append(h("div",{class:"bar"},
    h("button",{class:"btn",type:"button",onclick:()=>go(-1),"aria-label":"Предишен месец"},"←"),
    h("h2",{style:"min-width:150px;text-align:center;text-transform:capitalize"},m.toLocaleDateString("bg-BG",{month:"long",year:"numeric"})),
    h("button",{class:"btn",type:"button",onclick:()=>go(1),"aria-label":"Следващ месец"},"→"),
    h("span",{class:"sp"}),
    se?h("button",{class:"btn primary w-only",type:"button",onclick:()=>openVideo(null,"events")},"+ Събитие"):null,
    sm?h("button",{class:"btn"+(se?"":" primary")+" w-only",type:"button",onclick:()=>openShoot(null)},"+ Снимачен ден"):null));
  const items=[];
  if(sm)Object.entries(S.shoots).forEach(([id,o])=>{if(o.date)items.push({k:"shoot",id:id,date:o.date,start:o.start||"",o:o});});
  let nodate=0;if(se)Object.entries(S.videos).forEach(([id,o])=>{if(teamOf(o)!=="events")return;if(o.edate)items.push({k:"event",id:id,date:o.edate,start:o.estart||"",o:o});else if(!isDone(o))nodate++;});
  items.sort((a,b)=>(a.date+(a.start||"99")).localeCompare(b.date+(b.start||"99")));
  const byDate={};items.forEach(x=>{(byDate[x.date]=byDate[x.date]||[]).push(x);});
  const grid=h("div",{class:"grid7"});["пн","вт","ср","чт","пт","сб","нд"].forEach(w=>grid.append(h("div",{class:"wd"},w)));
  const first=weekStart(m),today=ymd(new Date());
  for(let i=0;i<42;i++){const d=addDays(first,i),ds=ymd(d),out=d.getMonth()!==m.getMonth();
    if(i>=35&&out&&addDays(first,35).getMonth()!==m.getMonth())break;
    const cell=h(out?"div":"button",{class:"cell"+(out?" out":"")+(ds===today?" today":""),type:out?null:"button",
      "aria-label":out?null:ds,onclick:out?null:()=>{if(!S.canWrite||!S.db)return;if(se&&!sm)openVideo(null,"events",ds);else if(sm)openShoot(null,ds);}},h("span",{class:"n"+(out?" muted":"")},d.getDate()));
    if(!out){const l=byDate[ds]||[];l.slice(0,3).forEach(x=>cell.append(h("span",{class:"chip"+(x.k==="event"?" ev":""),style:"--c:"+cColor(x.o.client)},x.start||"цял ден")));
      if(l.length>3)cell.append(h("span",{class:"small muted",style:"font-size:10px"},"+"+(l.length-3)));}
    grid.append(cell);}
  const left=h("div",{style:"display:flex;flex-direction:column;gap:8px;min-width:0"},grid,
    (sm&&se)?h("div",{class:"small muted",style:"display:flex;gap:12px;flex-wrap:wrap;align-items:center"},h("span",{class:"chip"},"10:00"),"снимачен ден",h("span",{class:"chip ev"},"18:00"),"събитие"):null,
    nodate?h("div",{class:"small",style:"color:var(--warn)"},nodate+(nodate===1?" активно събитие е":" активни събития са")+" без дата и не се вижда"+(nodate===1?"":"т")+" в календара."):null);
  const pre=ymd(m).slice(0,7),list=items.filter(x=>x.date.slice(0,7)===pre),ag=h("div",{class:"panel agenda"});
  if(!list.length)ag.append(h("div",{class:"empty"},S.ready?"Няма нищо планирано за този месец. Натиснете ден от календара, за да добавите.":"Зареждане…"));
  let last="",n=0;
  list.forEach(x=>{const o=x.o;
    if(x.date!==last){last=x.date;n=0;ag.append(h("div",{class:"agd"},h("span",{style:"text-transform:capitalize"},pd(x.date).toLocaleDateString("bg-BG",{weekday:"long",day:"numeric",month:"long"})),h("span",{class:"mono small"},byDate[x.date].length)));}
    n++;
    if(x.k==="shoot"){const l=safeUrl(o.link),vid=S.videos[o.video];
      ag.append(h("div",{class:"shoot"},
        h("div",{class:"hd"},h("span",{style:"display:flex;gap:8px;align-items:center;min-width:0"},h("span",{class:"ord"},n+"."),h("span",{class:"dot",style:"--c:"+cColor(o.client)}),h("b",null,o.title)),
          h("button",{class:"btn ghost w-only",type:"button","aria-label":"Редактирай",onclick:()=>openShoot(x.id)},"✎")),
        h("div",{class:"small mono"},(o.start?o.start+(o.end?"–"+o.end:""):"цял ден")+" · снимачен ден"),
        h("div",{class:"small muted"},[cName(o.client),vid&&vid.title,o.loc].filter(Boolean).join(" · ")),
        (o.crew&&o.crew.length)?h("div",{class:"small"},"Екип: "+o.crew.map(nameOf).join(", ")):null,
        o.gear?h("div",{class:"small muted"},"Техника: "+o.gear):null,
        l?h("div",{class:"small"},ext({url:l})):null));}
    else{const sv=o.svc||[];
      ag.append(h("div",{class:"shoot"},
        h("div",{class:"hd"},h("span",{style:"display:flex;gap:8px;align-items:center;min-width:0"},h("span",{class:"ord"},n+"."),h("span",{class:"dot",style:"--c:"+cColor(o.client)}),h("b",null,o.title)),
          h("button",{class:"btn ghost",type:"button","aria-label":"Отвори събитието",onclick:()=>openVideo(x.id)},"✎")),
        h("div",{class:"small mono",style:"color:var(--gold)"},(o.estart?o.estart+(o.eend?"–"+o.eend:""):"цял ден")+" · събитие"),
        h("div",{class:"small muted"},[cName(o.client),o.eloc,nameOf(o.who)].filter(Boolean).join(" · ")),
        h("div",null,h("span",{class:"pill"},stageName(o)),sv.length?h("span",{class:"small muted"}," Услуги "+sv.filter(q=>q.done).length+"/"+sv.length):null),
        sv.length?h("ol",{class:"svl small"},sv.map(q=>h("li",{class:q.done?"done":""},q.t+(q.d?" · "+q.d:"")))):null));}});
  root.append(h("div",{class:"cal"},left,ag));return root;
}

function vReports(){
  const root=h("div",{style:"display:flex;flex-direction:column;gap:14px"});
  const ps=h("select",{id:"r-preset","aria-label":"Период",onchange:e=>{const p=e.target.value;if(p==="custom")S.preset=p;else setPreset(p);subReports();schedule();}},
    [["week","Тази седмица"],["month","Този месец"],["prev","Миналия месец"],["custom","Избран период"]].map(o=>h("option",{value:o[0]},o[1])));
  ps.value=S.preset;
  const chg=()=>{const a=$("#r-from").value,b=$("#r-to").value;if(a&&b&&a<=b){S.from=a;S.to=b;subReports();schedule();}};
  root.append(h("div",{class:"bar"},ps,
    S.preset==="custom"?[h("input",{type:"date",id:"r-from",value:S.from,"aria-label":"От дата",onchange:chg}),h("input",{type:"date",id:"r-to",value:S.to,"aria-label":"До дата",onchange:chg})]
      :h("span",{class:"muted mono small"},shortDate(S.from)+" – "+shortDate(S.to)),
    h("span",{class:"sp"}),h("span",{class:"small muted"},S.isAdmin?"Целият екип":"Само вашето време"),
    h("button",{class:"btn",id:"r-export",type:"button",hidden:!S.dl,onclick:exportCsv},"Свали CSV")));
  const agg={c:{},p:{},a:{},v:{},f:{},w:{}};let total=0;const weeks=new Set();
  {for(const r of repRows()){const e=r.e,ms=r.ms,p=r.p,wk=ymd(weekStart(pd(r.date)));weeks.add(wk);
    agg.w[p]=agg.w[p]||{};agg.w[p][wk]=(agg.w[p][wk]||0)+ms;
    if(e.v&&S.videos[e.v]){const fk=S.videos[e.v].fmt||"";agg.f[fk]=(agg.f[fk]||0)+ms;}
    total+=ms;agg.c[e.c||""]=(agg.c[e.c||""]||0)+ms;agg.p[p]=(agg.p[p]||0)+ms;agg.a[e.a||"other"]=(agg.a[e.a||"other"]||0)+ms;
    if(e.v){const k=e.v;agg.v[k]=agg.v[k]||{ms:0,a:{}};agg.v[k].ms+=ms;agg.v[k].a[e.a||"other"]=(agg.v[k].a[e.a||"other"]||0)+ms;}}}
  const t0=pd(S.from).getTime(),t1=addDays(pd(S.to),1).getTime(),today=ymd(new Date());
  const deliv=Object.values(S.videos).filter(v=>isDone(v)&&(v.doneAt||v.moved)>=t0&&(v.doneAt||v.moved)<t1);
  const avgRev=deliv.length?(deliv.reduce((a,v)=>a+(+v.revs||0),0)/deliv.length).toLocaleString("bg-BG",{maximumFractionDigits:1}):"–";
  const lateNow=Object.values(S.videos).filter(v=>!isDone(v)&&v.due&&v.due<today).length;
  root.append(h("div",{class:"sum"},h("div",null,h("b",null,hrs(total)),h("span",null,"Общо за периода")),
    h("div",null,h("b",null,deliv.length),h("span",null,"Предадени видеа")),
    h("div",null,h("b",null,avgRev),h("span",null,"Средно ревизии на предадено")),
    h("div",null,h("b",null,lateNow),h("span",null,"Просрочени в момента"))));
  if(!total){root.append(h("div",{class:"panel empty"},"Няма записано време за този период."));return root;}
  const monthly=S.preset==="month"||S.preset==="prev";
  const meters=(obj,label,color,quota)=>{const rows=Object.entries(obj).sort((a,b)=>b[1]-a[1]),max=rows.length?rows[0][1]:1;
    return rows.map(([k,ms])=>{const q=quota?quota(k):0,over=q&&ms>q*3.6e6,w=q?Math.min(100,ms/(q*3.6e6)*100):ms/max*100;
      return h("div",{class:"meter"+(over?" over":"")},
        h("span",{class:"nm"},color?h("span",{class:"dot",style:"--c:"+color(k)}):null,label(k)),
        h("span",{class:"val mono"},hrs(ms)+(q?" / "+q+" ч":"")),
        h("div",{class:"track"},h("div",{class:"fill",style:"width:"+w.toFixed(1)+"%;--c:"+(over?"var(--rec)":(color&&color(k))||"var(--accent)")})));});};
  const grid=h("div",{class:"rep"});
  grid.append(h("section",{class:"panel box"},h("h2",null,"По клиент"),monthly?h("p",{class:"small muted",style:"margin:0"},"Лентата показва каква част от договорените месечни часове е изразходвана."):null,
    meters(agg.c,cName,cColor,monthly?k=>+(client(k)&&client(k).hours)||0:null)));
  grid.append(h("section",{class:"panel box"},h("h2",null,"По дейност"),meters(agg.a,actName)));
  if(Object.keys(agg.f).length)grid.append(h("section",{class:"panel box"},h("h2",null,"По формат"),meters(agg.f,fmtName)));
  if(S.isAdmin)grid.append(h("section",{class:"panel box"},h("h2",null,"По човек"),meters(agg.p,nameOf)));
  root.append(grid);
  const wks=[...weeks].sort(),wb=h("tbody");
  Object.keys(agg.w).sort((a,b)=>nameOf(a).localeCompare(nameOf(b),"bg")).forEach(p=>wb.append(h("tr",null,h("td",null,nameOf(p)),
    wks.map(w=>h("td",{class:"num"},agg.w[p][w]?hrs(agg.w[p][w]):"–")),h("td",{class:"num",style:"font-weight:600"},hrs(agg.p[p]||0)))));
  root.append(h("section",{class:"panel"},h("div",{class:"ph"},h("span",null,"По седмици")),h("div",{class:"tw"},h("table",null,
    h("thead",null,h("tr",null,h("th",null,S.isAdmin?"Човек":"Вие"),wks.map(w=>h("th",{class:"num"},"от "+shortDate(w))),h("th",{class:"num"},"Общо"))),wb))));
  const vr=Object.entries(agg.v).sort((a,b)=>b[1].ms-a[1].ms);
  if(vr.length){const tb=h("tbody");
    vr.forEach(([id,o])=>{const v=S.videos[id]||{title:"Изтрито видео"},est=+v.est||0;
      tb.append(h("tr",null,h("td",null,v.title),h("td",null,cName(v.client)),
        h("td",{class:"small muted"},Object.entries(o.a).sort((a,b)=>b[1]-a[1]).map(x=>actName(x[0])+" "+hrs(x[1])).join(", ")),
        h("td",{class:"num"},est?est+" ч":"–"),h("td",{class:"num",style:est&&o.ms>est*3.6e6?"color:var(--rec);font-weight:600":""},hrs(o.ms))));});
    root.append(h("section",{class:"panel"},h("div",{class:"tw"},h("table",null,h("thead",null,h("tr",null,h("th",null,"Видео"),h("th",null,"Клиент"),h("th",null,"Разбивка"),h("th",{class:"num"},"План"),h("th",{class:"num"},"Реално"))),tb))));}
  return root;
}

function b64text(b){const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder("utf-8").decode(u);}
function parseCsv(t){const rows=[];let row=[],cell="",q=false;t=t.replace(/^﻿/,"");
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
    else if(c==='"')q=true;else if(c===","){row.push(cell);cell="";}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(cell);rows.push(row);row=[];cell="";}
    else cell+=c;}
  if(cell!==""||row.length){row.push(cell);rows.push(row);}
  return rows;}
async function readSheet(id){
  const call=()=>S.mcp.callTool(GD,"download_file_content",{fileId:id,exportMimeType:"text/csv"});
  let r;try{r=await call();}catch(e){if(e&&e.retryable){await new Promise(ok=>setTimeout(ok,Math.min(e.retryAfterMs||1500,8000)+Math.random()*500));r=await call();}else throw e;}
  const pl=r&&r.payload,c=pl&&typeof pl==="object"?pl.content:null;if(typeof c!=="string")throw {code:"upstream_error"};
  return parseCsv(b64text(c));}
const num=v=>{const n=parseInt(String(v||"").replace(/[^\d-]/g,""),10);return isFinite(n)&&n>0?n:0;};
const pstOf=v=>{v=String(v||"").toLowerCase();return v.includes("затвор")?"closed":v.includes("пауз")?"paused":"open";};
async function loadHr(silent){
  if(S.hr.loading)return;
  if(!S.mcp){S.hr.err="nomcp";schedule();return;}
  if(window.teamHubApi&&!S.hr.configLoaded){try{const cfg=await window.teamHubApi("/api/sheets/config");Object.assign(SHEET,cfg.sheets||{});S.hr.configLoaded=true;}catch(e){S.hr.err=e.code||"upstream_error";schedule();return;}}
  S.hr.loading=true;if(!silent){S.hr.err="";schedule();}
  const sameSource=[SHEET.track,SHEET.req,SHEET.ads,SHEET.tasks].every(id=>id===SHEET.track);let source;
  const readConfigured=id=>sameSource?(source||(source=readSheet(SHEET.track))):readSheet(id);
  try{
    const t=await readConfigured(SHEET.track),hd=(t[0]||[]).map(x=>x.trim().toLowerCase()),ix=k=>hd.findIndex(x=>x.includes(k)),ex=k=>{const e=hd.indexOf(k);return e>=0?e:hd.findIndex(x=>x.includes(k)&&!x.includes("описание")&&!x.includes("бележки"));};
    const c={cdesc:hd.findIndex(x=>x.includes("описание")&&x.includes("компани")),pdesc:hd.findIndex(x=>x.includes("описание")&&x.includes("позици")),co:ex("компания"),title:ex("позиция"),status:ix("статус"),heads:ix("търсени"),need:ix("нужни"),sent:ix("изпратени"),interview:ix("интервю"),offer:ix("оферт"),hired:ix("наети"),notes:ix("бележки")};
    c.who=WHO.map(ix).find(i=>i>=0);if(c.who==null)c.who=-1;S.hr.hasWho=c.who>=0;
    if(c.co<0||c.title<0)throw {code:"bad_sheet"};
    const g=(r,k)=>c[k]<0?"":(r[c[k]]||"").trim();
    S.hr.rows=t.slice(1).map(r=>({who:g(r,"who").split(/[,;\/]/).map(x=>x.trim()).filter(Boolean),co:g(r,"co"),title:g(r,"title"),status:pstOf(g(r,"status")),heads:num(g(r,"heads")),need:num(g(r,"need")),sent:num(g(r,"sent")),
      interview:num(g(r,"interview")),offer:num(g(r,"offer")),hired:num(g(r,"hired")),notes:g(r,"notes"),cdesc:g(r,"cdesc"),pdesc:g(r,"pdesc")})).filter(r=>r.co||r.title);
    S.hr.at=Date.now();if(S.hr.err){S.hr.err="";S.hr.sig="";}
  }catch(e){S.hr.loading=false;if(!silent||!S.hr.rows){S.hr.err=(e&&e.code)||"upstream_error";schedule();}return;}
  try{const q=await readConfigured(SHEET.req),hd=(q[0]||[]).map(x=>x.trim().toLowerCase()),pi=hd.findIndex(x=>x.includes("позиция")),ci=hd.findIndex(x=>x.includes("компания"));
    const jd={};if(pi>=0&&ci>=0)q.slice(1).forEach(r=>{const txt=r.filter((x,i)=>i!==pi&&i!==ci&&x.trim()).sort((a,b)=>b.length-a.length)[0];
      if(txt)jd[((r[ci]||"")+"|"+(r[pi]||"")).trim().toLowerCase()]=txt.trim();});
    S.hr.jd=jd;}catch(e){S.hr.jd={};}
  try{const a=await readConfigured(SHEET.ads),hd=(a[0]||[]).map(x=>x.trim().toLowerCase()),ix=k=>hd.findIndex(x=>x.includes(k)),
      c={co:ix("компания"),title:ix("позиция"),plat:ix("платформа"),url:ix("линк"),from:ix("качена"),to:ix("валидна"),who:Math.max(-1,...WHO.map(ix)),notes:ix("бележки")},g=(r,k)=>c[k]<0?"":(r[c[k]]||"").trim();
    S.hr.ads=a.slice(1).map(r=>({co:g(r,"co"),title:g(r,"title"),plat:g(r,"plat"),url:safeUrl(g(r,"url")),from:g(r,"from"),to:g(r,"to"),who:g(r,"who"),notes:g(r,"notes")})).filter(r=>r.title||r.plat||r.url);
    S.hr.adsErr=false;}catch(e){S.hr.ads=[];S.hr.adsErr=true;}
  try{const a=await readConfigured(SHEET.tasks),hd=(a[0]||[]).map(x=>x.trim().toLowerCase()),ix=k=>hd.findIndex(x=>x.includes(k)),
      c={co:ix("компания"),task:ix("задача"),who:Math.max(-1,...WHO.map(ix)),due:ix("срок"),status:ix("статус"),notes:ix("бележки")},g=(r,k)=>c[k]<0?"":(r[c[k]]||"").trim();
    S.hr.tasks=a.slice(1).map(r=>({co:g(r,"co"),task:g(r,"task"),who:g(r,"who"),due:g(r,"due"),status:g(r,"status"),notes:g(r,"notes")})).filter(r=>r.task);
    S.hr.tasksErr=false;}catch(e){S.hr.tasks=[];S.hr.tasksErr=true;}
  S.hr.loading=false;const sig=JSON.stringify([S.hr.rows,S.hr.jd,S.hr.ads,S.hr.tasks,S.hr.adsErr,S.hr.tasksErr,S.hr.hasWho]);
  if(!silent||sig!==S.hr.sig){S.hr.sig=sig;schedule();}else{const el=$("#h-at");if(el)el.textContent=atText();}
}
const atText=()=>"Прочетено в "+hm(S.hr.at)+" · обновява се всяка минута";
const hrAuto=()=>{if(S.tab==="hr"&&S.hr.rows&&document.visibilityState==="visible")loadHr(true);};
setInterval(hrAuto,60000);document.addEventListener("visibilitychange",hrAuto);
function hrErr(code){
  const m={nomcp:"Четенето на таблиците не е настроено. Вижте backend/README.md, раздел „Google таблици“.",
    not_in_manifest:"Нямате достъп до раздел „Подбор“. Помолете мениджър да ви добави към екипа.",
    not_granted:"Сесията ви е изтекла. Влезте отново.",
    tool_error:"Таблицата не е споделена със сервизния акаунт на платформата. Споделете я с него за четене и натиснете „Обнови“.",
    bad_sheet:"В таблицата липсват колоните „Компания“ и „Позиция“ на първия ред.",
    server_unavailable:"Google Sheets не отговаря в момента. Опитайте пак след малко."};
  return m[code]||"Таблицата не се зареди. Опитайте пак с „Обнови“.";}
function hrCanWrite(){const d=S.depts[S.uid]||{};return Boolean(S.canWrite&&S.db&&(S.isAdmin||(d.manager&&(d.teams||[]).includes("hr"))));}
async function openHrConfig(){if(!hrCanWrite())return;try{const cfg=await window.teamHubApi("/api/sheets/config");for(const key of ["track","req","ads","tasks"])$("#hr-sheet-"+key).value="https://docs.google.com/spreadsheets/d/"+(cfg.sheets||{})[key]+"/edit";$("#d-hr-config").showModal();}catch(e){toast("Настройките на таблиците не се заредиха.");}}
$("#f-hr-config").addEventListener("submit",async e=>{e.preventDefault();const body={};for(const key of ["track","req","ads","tasks"])body[key]=$("#hr-sheet-"+key).value.trim();try{const cfg=await window.teamHubApi("/api/sheets/config",{method:"PUT",body});Object.assign(SHEET,cfg.sheets||{});S.hr.configLoaded=true;S.hr.rows=null;$("#d-hr-config").close();loadHr();toast("Таблиците са сменени.");}catch(x){toast(x&&x.code==="not_in_manifest"?"Само основател или HR мениджър може да сменя таблиците.":"Линкът е невалиден или таблицата не е достъпна.");}});
const hrRowInput=id=>$("#hr-row-"+id).value.trim();
function syncHrRowForm(){const table=$("#hr-row-table").value;$("#hr-row-title-label").hidden=table==="tasks";$("#hr-row-task-label").hidden=table!=="tasks";$("#hr-row-link-label").hidden=table!=="ads";$("#hr-row-platform-label").hidden=table!=="ads";$("#hr-row-due-label").hidden=table!=="tasks";}
function openHrRow(){if(!hrCanWrite())return;$("#f-hr-row").reset();syncHrRowForm();$("#d-hr-row").showModal();}
$("#hr-row-table").addEventListener("change",syncHrRowForm);
$("#f-hr-row").addEventListener("submit",async e=>{e.preventDefault();const table=$("#hr-row-table").value,row={company:hrRowInput("company"),title:hrRowInput("title"),task:hrRowInput("task"),who:hrRowInput("who"),status:hrRowInput("status"),description:hrRowInput("description"),link:hrRowInput("link"),platform:hrRowInput("platform"),due:hrRowInput("due")};if(!row.company||((table!=="tasks")&&!row.title)||(table==="tasks"&&!row.task)){toast("Попълнете компания и име на позицията/задачата.");return;}try{await window.teamHubApi("/api/sheets/"+encodeURIComponent(SHEET[table])+"/rows",{method:"POST",body:row});$("#d-hr-row").close();S.hr.rows=null;S.hr.loading=false;loadHr();toast("Добавено в таблицата.");}catch(x){toast(x&&x.code==="not_in_manifest"?"Само мениджърът на подбор и основателите могат да добавят.":"Записът не се добави. Проверете дали таблицата е споделена с права за редактиране.");}});
function sheetDate(v){v=String(v||"").trim();let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+"-"+p2(m[2])+"-"+p2(m[3]);
  m=v.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);if(m&&+m[2]<=12)return m[3]+"-"+p2(m[2])+"-"+p2(m[1]);return "";}
function vAds(root){
  const ads=S.hr.ads,today=ymd(new Date()),soon=ymd(addDays(new Date(),5));
  const st=a=>{const d=sheetDate(a.to);return !d?"":d<today?"old":d<=soon?"soon":"ok";};
  root.append(h("div",{class:"bar"},h("span",{class:"small muted"},ads.length+" обяви · "+ads.filter(a=>st(a)==="old").length+" изтекли · "+ads.filter(a=>st(a)==="soon").length+" изтичат до 5 дни"),
    h("span",{class:"sp"}),h("a",{class:"btn",href:sheetUrl(SHEET.ads),target:"_blank",rel:"noopener noreferrer",style:"text-decoration:none"},"Отвори таблицата с обявите ↗")));
  if(S.hr.adsErr){root.append(h("div",{class:"banner"},"Таблицата „Подбор – обяви“ не се зареди. Проверете дали е споделена с вас и натиснете „Обнови“."));return;}
  if(!ads.length){root.append(h("div",{class:"panel empty"},"Още няма въведени обяви. В таблицата „Подбор – обяви“ добавете по един ред за всяко място, където е качена обява: компания, позиция, платформа, линк и докога е валидна."));return;}
  const groups={};ads.forEach(a=>{const k=(a.co||"Без компания")+" – "+(a.title||"Без позиция");(groups[k]=groups[k]||[]).push(a);});
  Object.keys(groups).sort((a,b)=>a.localeCompare(b,"bg")).forEach(k=>{const tb=h("tbody");
    groups[k].forEach(a=>{const x=st(a);tb.append(h("tr",{class:x==="old"?"off":""},
      h("td",null,h("b",null,a.plat||"–")),
      h("td",null,a.url?ext({url:a.url,label:"Виж обявата"}):h("span",{class:"muted"},"няма линк")),
      h("td",{class:"small mono"},a.from||"–"),
      h("td",{class:"small mono",style:x==="old"?"color:var(--rec);font-weight:600":x==="soon"?"color:var(--warn);font-weight:600":""},(a.to||"–")+(x==="old"?" · изтекла":x==="soon"?" · изтича скоро":"")),
      h("td",{class:"small"},a.who||"–"),h("td",{class:"small",style:"overflow-wrap:anywhere"},a.notes||"–")));});
    root.append(h("section",{class:"panel"},h("div",{class:"ph"},h("span",{style:"overflow-wrap:anywhere"},k),h("span",{class:"mono"},groups[k].length)),
      h("div",{class:"tw"},h("table",null,h("thead",null,h("tr",null,h("th",null,"Платформа"),h("th",null,"Обява"),h("th",null,"Качена на"),h("th",null,"Валидна до"),h("th",null,"Човек от екипа"),h("th",null,"Бележки"))),tb))));});
}
function vTasks(root){
  const ts=S.hr.tasks,today=ymd(new Date()),done=t=>/готов|приключ|завърш|done/i.test(t.status),late=t=>{const d=sheetDate(t.due);return !done(t)&&d&&d<today;};
  root.append(h("div",{class:"bar"},h("span",{class:"small muted"},ts.filter(t=>!done(t)).length+" отворени · "+ts.filter(late).length+" просрочени · "+ts.filter(done).length+" готови"),
    h("span",{class:"sp"}),h("a",{class:"btn",href:sheetUrl(SHEET.tasks),target:"_blank",rel:"noopener noreferrer",style:"text-decoration:none"},"Отвори таблицата със задачите ↗")));
  if(S.hr.tasksErr){root.append(h("div",{class:"banner"},"Таблицата „Подбор – допълнителни задачи“ не се зареди. Проверете дали е споделена с вас и натиснете „Обнови“."));return;}
  if(!ts.length){root.append(h("div",{class:"panel empty"},"Още няма допълнителни задачи. В таблицата „Подбор – допълнителни задачи“ добавете ред за всяка задача извън позициите: компания, задача, човек от екипа, срок и статус."));return;}
  const groups={};ts.forEach(t=>{const k=t.co||"Без компания";(groups[k]=groups[k]||[]).push(t);});
  Object.keys(groups).sort((a,b)=>a.localeCompare(b,"bg")).forEach(k=>{const tb=h("tbody"),list=groups[k].slice().sort((a,b)=>done(a)-done(b));
    list.forEach(t=>tb.append(h("tr",{class:done(t)?"off":""},
      h("td",null,h("b",{style:"overflow-wrap:anywhere"},t.task)),h("td",{class:"small"},t.who||"–"),
      h("td",{class:"small mono",style:late(t)?"color:var(--rec);font-weight:600":""},(t.due||"–")+(late(t)?" · просрочена":"")),
      h("td",null,h("span",{class:"pill"},t.status||"Без статус")),h("td",{class:"small",style:"overflow-wrap:anywhere"},t.notes||"–"))));
    root.append(h("section",{class:"panel"},h("div",{class:"ph"},h("span",{style:"overflow-wrap:anywhere"},k),h("span",{class:"mono"},list.filter(t=>!done(t)).length+" отворени")),
      h("div",{class:"tw"},h("table",null,h("thead",null,h("tr",null,h("th",null,"Задача"),h("th",null,"Човек от екипа"),h("th",null,"Срок"),h("th",null,"Статус"),h("th",null,"Бележки"))),tb))));});
}
function vHr(){
  const root=h("div",{style:"display:flex;flex-direction:column;gap:14px"}),H=S.hr,rows=H.rows||[];
  const big=(n,l)=>h("div",null,h("b",null,n),h("span",null,l));
  const cos=[...new Set(rows.map(r=>r.co||"Без компания"))].sort((a,b)=>a.localeCompare(b,"bg"));
  root.append(h("div",{class:"bar"},
    h("div",{class:"sum"},big(H.rows?cos.length:"–","Компании"),big(H.rows?rows.filter(r=>r.status==="open").length:"–","Отворени позиции"),
      big(H.rows?new Set(rows.flatMap(r=>r.who)).size:"–","Хора от екипа"),big(H.rows?rows.reduce((a,r)=>a+r.sent,0):"–","Изпратени CV-та"),big(H.rows?rows.reduce((a,r)=>a+r.hired,0):"–","Наети")),
    h("span",{class:"sp"}),
    H.at?h("span",{class:"small muted mono",id:"h-at"},atText()):null,
    h("button",{class:"btn",type:"button",id:"h-refresh",disabled:H.loading,onclick:()=>{S.hr.err="";loadHr();}},H.loading?"Зареждане…":"Обнови"),
    hrCanWrite()?h("button",{class:"btn primary",type:"button",onclick:openHrRow},"+ Добави в таблица"):null,
    hrCanWrite()?h("button",{class:"btn",type:"button",onclick:openHrConfig},"⚙ Таблици"):null,
    rows.length?h("button",{class:"btn",type:"button",onclick:()=>openReport(null)},"Общ отчет"):null,
    h("a",{class:"btn primary",href:sheetUrl(SHEET.track),target:"_blank",rel:"noopener noreferrer",style:"text-decoration:none"},"Отвори таблицата ↗")));
  root.append(h("p",{class:"small muted",style:"margin:0"},"Данните се въвеждат само в Google таблицата „Подбор – проследяване“. Тук се показват за преглед и за отчет."));
  if(H.err){root.append(h("div",{class:"banner"},hrErr(H.err)));if(!H.rows)return root;}
  if(!H.rows){root.append(h("div",{class:"panel empty"},"Зареждане на таблицата…"));return root;}
  if(!rows.length){root.append(h("div",{class:"panel empty"},"Таблицата е празна. Добавете ред за всяка позиция: компания, позиция, статус и бройките."));return root;}
  const tg=(k,l)=>h("button",{class:"btn"+(S.hrView===k?" primary":""),type:"button","aria-pressed":String(S.hrView===k),onclick:()=>{S.hrView=k;schedule();}},l);
  root.append(h("div",{class:"bar"},tg("who","По хора от екипа"),tg("co","По компании"),tg("ads","Обяви"),tg("tasks","Допълнителни задачи")));
  if(S.hrView==="ads"){vAds(root);return root;}
  if(S.hrView==="tasks"){vTasks(root);return root;}
  const byWho=S.hrView==="who",NOW="Без човек от екипа",NOC="Без компания";
  if(byWho&&!H.hasWho)root.append(h("div",{class:"banner"},"В таблицата още няма колона „Човек от екипа“. Добавете я на първия ред и впишете кой работи по всяка позиция. Ако по една позиция работят двама, направете отделен ред за всеки или ги разделете със запетая."));
  const cd={};rows.forEach(r=>{if(r.cdesc&&!cd[r.co])cd[r.co]=r.cdesc;});
  const dsc=(label,text)=>h("details",{class:"small",style:"margin-top:4px;max-width:440px;font-weight:400"},h("summary",{style:"cursor:pointer;color:var(--accent)"},label),h("div",{style:"white-space:pre-wrap;overflow-wrap:anywhere;margin-top:4px"},text));
  const groups={};rows.forEach(r=>{(byWho?(r.who.length?r.who:[NOW]):[r.co||NOC]).forEach(k=>{(groups[k]=groups[k]||[]).push(r);});});
  Object.keys(groups).sort((a,b)=>(a===NOW)-(b===NOW)||a.localeCompare(b,"bg")).forEach(k=>{const ps=groups[k],tb=h("tbody");
    ps.slice().sort((a,b)=>(a.status==="open"?0:1)-(b.status==="open"?0:1)||a.co.localeCompare(b.co,"bg")).forEach(p=>{const jd=p.pdesc||H.jd[(p.co+"|"+p.title).toLowerCase()];
      tb.append(h("tr",{class:p.status==="open"?"":"off"},
        h("td",null,h("b",{style:"overflow-wrap:anywhere"},p.title||"Без име"),h("div",null,h("span",{class:"pill"},pstName(p.status))),
          (()=>{const l=H.ads.filter(a=>a.url&&a.title.toLowerCase()===p.title.toLowerCase()&&(!a.co||a.co.toLowerCase()===p.co.toLowerCase()));
            return l.length?h("div",{class:"small",style:"display:flex;flex-wrap:wrap;gap:2px 10px;margin-top:4px"},l.map(a=>ext({url:a.url,label:a.plat||"Обява"}))):null;})(),
          jd?dsc("Описание на позицията",jd):null),
        h("td",{style:"overflow-wrap:anywhere"},byWho?(p.co||NOC):(p.who.join(", ")||"–"),(byWho&&cd[p.co])?dsc("За компанията",cd[p.co]):null),
        h("td",{class:"num"},p.sent+(p.need?" / "+p.need:""),p.need?h("div",{class:"mini"+(p.sent>=p.need?" full":"")},h("i",{style:"width:"+Math.min(100,p.sent/p.need*100).toFixed(0)+"%"})):null),
        h("td",{class:"num"},p.interview),h("td",{class:"num"},p.offer),
        h("td",{class:"num",style:p.hired?"color:var(--ok);font-weight:600":""},p.hired+(p.heads?" / "+p.heads:"")),
        h("td",{class:"small",style:"min-width:160px;overflow-wrap:anywhere"},p.notes||"–")));});
    const sm=f=>ps.reduce((a,r)=>a+r[f],0);
    root.append(h("section",{class:"panel"},h("div",{class:"ph",style:"align-items:center;flex-wrap:wrap"},
        h("div",{style:"min-width:0;display:flex;flex-direction:column"},h("span",{style:"overflow-wrap:anywhere"},k),
          h("span",{class:"small muted mono",style:"font-weight:400"},ps.filter(r=>r.status==="open").length+" отворени · "+sm("sent")+" CV-та · "+sm("interview")+" интервюта · "+sm("hired")+" наети"),(!byWho&&cd[k])?dsc("За компанията",cd[k]):null),
        h("button",{class:"btn",type:"button",onclick:()=>openReport({by:byWho?"who":"co",val:k})},"Отчет")),
      h("div",{class:"tw"},h("table",null,h("thead",null,h("tr",null,h("th",null,"Позиция"),h("th",null,byWho?"Компания":"Човек от екипа"),h("th",{class:"num"},"CV-та"),h("th",{class:"num"},"Интервю"),h("th",{class:"num"},"Оферти"),h("th",{class:"num"},"Наети"),h("th",null,"Бележки от компанията"))),tb))));});
  return root;
}
function genReport(f,notes){f=f||{};const NOW="Без човек от екипа",NOC="Без компания",L=[];
  const rows=(S.hr.rows||[]).filter(r=>f.by==="co"?(r.co||NOC)===f.val:f.by==="who"?(r.who.length?r.who.includes(f.val):f.val===NOW):true);
  L.push(f.by==="co"?"Отчет за подбор: "+f.val:f.by==="who"?"Отчет за подбор – "+f.val:"Общ отчет за подбор");L.push("Дата: "+new Date().toLocaleDateString("bg-BG"));
  const sm=k=>rows.reduce((a,r)=>a+r[k],0);
  L.push("Общо: "+rows.length+" позиции, "+sm("sent")+" изпратени CV-та, "+sm("interview")+" интервюта, "+sm("hired")+" наети");
  let last=null;rows.slice().sort((a,b)=>a.co.localeCompare(b.co,"bg")||a.title.localeCompare(b.title,"bg")).forEach(p=>{
    if(f.by!=="co"&&p.co!==last){L.push("");L.push("== "+(p.co||NOC)+" ==");last=p.co;}
    L.push("");L.push(p.title+" ("+pstName(p.status).toLowerCase()+")"+(f.by!=="who"&&p.who.length?" – "+p.who.join(", "):""));
    L.push("Изпратени CV-та: "+p.sent+(p.need?" от "+p.need+" нужни":""));
    L.push("Интервюта: "+p.interview+", оферти: "+p.offer);
    L.push("Наети: "+p.hired+(p.heads?" от "+p.heads+" търсени":""));
    if(notes&&p.notes)L.push("Бележки: "+p.notes);});
  return L.join("\n");}
function drawReport(){$("#p-text").value=genReport(cur.rep,$("#p-notes").checked);}
function openReport(co){cur.rep=co;$("#p-save").hidden=!S.dl;drawReport();$("#d-rep").showModal();}
$("#p-notes").addEventListener("change",drawReport);
$("#f-rep").addEventListener("submit",e=>e.preventDefault());
$("#p-copy").addEventListener("click",()=>{const t=$("#p-text");const fb=()=>{t.focus();t.select();toast("Текстът е маркиран. Копирайте го с Ctrl+C.");};
  try{navigator.clipboard.writeText(t.value).then(()=>toast("Отчетът е копиран."),fb);}catch(e){fb();}});
$("#p-save").addEventListener("click",async()=>{try{await S.dl.save({filename:"otchet-podbor-"+ymd(new Date())+".txt",data:$("#p-text").value});toast("Отчетът е свален.");}
  catch(x){if(!(x&&x.code==="declined"))toast("Свалянето не е достъпно в този изглед.");}});

function repRows(){const now=Date.now(),out=[];
  for(const p in S.rep)for(const d in S.rep[p]){const es=S.rep[p][d].entries||{};for(const id in es){const e=es[id];out.push({p:p,date:d,e:e,ms:Math.max(0,(e.e==null?now:e.e)-e.s)});}}
  return out;}
async function exportCsv(){
  const rows=repRows().sort((a,b)=>a.date.localeCompare(b.date)||a.e.s-b.e.s);
  if(!rows.length){toast("Няма записи за този период.");return;}
  const q=v=>{let t=String(v==null?"":v);if(/^[=+\-@\t]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
  const lines=[["Дата","Човек","Клиент","Видео","Формат","Дейност","Описание","Начало","Край","Часове"].map(q).join(";")];
  rows.forEach(r=>{const e=r.e,v=S.videos[e.v];lines.push([r.date,nameOf(r.p),cName(e.c),v?v.title:"",v?fmtName(v.fmt):"",actName(e.a),e.d||"",hm(e.s),e.e==null?"":hm(e.e),(r.ms/3.6e6).toFixed(2).replace(".",",")].map(q).join(";"));});
  try{await S.dl.save({filename:"otchet-"+S.from+"-"+S.to+".csv",data:"﻿"+lines.join("\r\n")});toast("Отчетът е свален.");}
  catch(x){const c=x&&x.code;if(c==="declined")return;toast(c==="rate_limited"?"Изчакайте малко и опитайте пак.":"Свалянето не е достъпно в този изглед.");}
}

function vTeam(){
  const root=h("div",{class:"two"});
  const team=h("section",{class:"panel"},h("div",{class:"box"},h("h2",null,"Екип"),
    h("p",{class:"small muted",style:"margin:0"},"Всеки, който влезе с Google акаунта си, се появява тук, но не вижда нищо, докато мениджър не му даде екип. С отметките избирате кои екипи вижда всеки: видео, сайтове, събития, дизайн и подбор. Мениджърите виждат всичко, включително часовете на целия екип, и управляват клиентите.")));
  const ids=memberIds();
  if(!ids.length)team.append(h("div",{class:"empty"},"Още няма членове."));
  ids.forEach(id=>{const m=S.members[id]||{},mine=id===S.uid,can=(mine||S.isAdmin)&&S.canWrite&&S.db;
    team.append(h("div",{class:"li"},h("div",{class:"g"},h("b",null,nameOf(id)+(mine?" (вие)":"")),can?null:h("span",{class:"small muted"},m.role||"Без посочена роля")),
      can?h("input",{type:"text",id:"m-role-"+id,value:m.role||"",maxLength:40,placeholder:"Роля, напр. монтажист","aria-label":"Роля",
        onchange:e=>tryW(S.db.doc("members/"+id).set(Object.assign({},m,{role:e.target.value.trim(),joined:m.joined||Date.now()})),"Запазено")}):null,
      (S.isAdmin&&S.canWrite&&S.db&&!mine)?h("div",{class:"checks small",style:"flex:1 1 100%"},ALLT.map(t=>h("label",null,h("input",{type:"checkbox",id:"m-t-"+t+"-"+id,checked:((S.depts[id]||{}).teams||[]).includes(t),
        onchange:e=>{const set=new Set((S.depts[id]||{}).teams||[]);if(e.target.checked)set.add(t);else set.delete(t);tryW(S.db.doc("depts/"+id).update({teams:ALLT.filter(x=>set.has(x))}),"Запазено");}}),TNAME[t])),
        h("label",{style:"font-weight:700"},h("input",{type:"checkbox",id:"m-adm-"+id,checked:!!(S.depts[id]||{}).manager,onchange:e=>tryW(S.db.doc("depts/"+id).update({manager:e.target.checked}),"Запазено")}),"Мениджър на екипа"))
        :h("span",{class:"pill"},((S.depts[id]||{}).founder||(mine&&S.isAdmin))?"Основател · вижда всичко":((S.depts[id]||{}).manager?"Мениджър · само своя екип":(teamsOf(id).map(t=>TNAME[t]).join(", ")||"Без достъп")))));});
  const cl=h("section",{class:"panel"},h("div",{class:"box"},h("div",{class:"bar"},h("h2",null,"Клиенти"),h("span",{class:"sp"}),
    h("button",{class:"btn primary a-only w-only",type:"button",onclick:()=>openClient(null)},"+ Клиент"))));
  const cs=Object.entries(S.clients).filter(e=>!e[1].archived).sort((a,b)=>a[1].name.localeCompare(b[1].name,"bg"));
  if(!cs.length)cl.append(h("div",{class:"empty"},S.isAdmin?"Добавете първия клиент, за да засичате време по него.":"Мениджърът още не е добавил клиенти."));
  cs.forEach(([id,c])=>{const l=safeUrl(c.link);
    cl.append(h("div",{class:"li"},h("span",{class:"dot",style:"--c:"+c.color}),
      h("div",{class:"g"},h("b",{style:"overflow-wrap:anywhere"},c.name),h("span",{class:"small muted"},(TNAME[c.team||"media"]||"Видео")+" · "+(c.hours?c.hours+" ч на месец":"Без месечен лимит")),l?h("span",{class:"small"},ext({url:l,label:"Папка с материали"})):null),
      h("button",{class:"btn ghost a-only w-only",type:"button",onclick:()=>openClient(id)},"✎")));});
  root.append(team,cl);return root;
}

/* ---------- dialogs ---------- */
document.querySelectorAll("dialog [data-close]").forEach(b=>b.addEventListener("click",()=>b.closest("dialog").close()));
function arm(btn,fn){btn.addEventListener("click",()=>{if(btn.dataset.armed){delete btn.dataset.armed;btn.textContent=btn.dataset.label;fn();}
  else{btn.dataset.label=btn.textContent;btn.dataset.armed="1";btn.textContent="Потвърдете";setTimeout(()=>{if(btn.dataset.armed){delete btn.dataset.armed;btn.textContent=btn.dataset.label;}},3000);}});}
let cur={};
fill($("#t-act"),ACTS);fill($("#e-act"),ACTS);fill($("#v-stage"),STAGES);fill($("#v-fmt"),FORMATS,"Без формат");$("#t-act").value="edit";
pairSelects("#t-client","#t-video");pairSelects("#e-client","#e-video");pairSelects("#s-client","#s-video");

function openEntry(e){cur.entry=e;fillSelects();
  $("#e-h").textContent=e?"Редакция на запис":"Ръчен запис";$("#e-del").hidden=!e;
  $("#e-desc").value=e?e.d||"":"";$("#e-client").value=e?e.c||"":$("#t-client").value;fill($("#e-video"),videoOpts($("#e-client").value),"Без задача");
  $("#e-video").value=e?e.v||"":"";$("#e-act").value=e?e.a||"other":$("#t-act").value;
  $("#e-date").value=e?e.date:ymd(new Date());$("#e-start").value=e?hm(e.s):"09:00";$("#e-end").value=e?hm(e.e):"10:00";
  $("#d-entry").showModal();}
$("#f-entry").addEventListener("submit",async ev=>{ev.preventDefault();const e=cur.entry,date=$("#e-date").value;
  const at=t=>{const a=t.split(":"),d=pd(date);d.setHours(+a[0],+a[1],0,0);return d.getTime();};
  let s=at($("#e-start").value),en=at($("#e-end").value);if(en<=s)en+=864e5;
  const rec={d:$("#e-desc").value.trim(),c:$("#e-client").value,v:$("#e-video").value,a:$("#e-act").value||"other",s:s,e:en},id=e?e.id:nid();
  try{if(e&&e.date!==date)await writeDay(e.date,es=>{delete es[id];});
    await writeDay(date,es=>{es[id]=rec;});$("#d-entry").close();}catch(x){toast(errMsg(x));}});
arm($("#e-del"),async()=>{const e=cur.entry;if(await tryW(writeDay(e.date,es=>{delete es[e.id];})))$("#d-entry").close();});

function linkRow(l){const row=h("div",{class:"lk"},h("input",{type:"text",placeholder:"Име",value:l.label||"",maxLength:40,"aria-label":"Име на линка"}),
  h("input",{type:"text",placeholder:"https://",value:l.url||"",maxLength:500,"aria-label":"Адрес"}),
  h("button",{type:"button",class:"btn ghost","aria-label":"Премахни линка",onclick:()=>row.remove()},"×"));return row;}
$("#v-addlink").addEventListener("click",()=>{if($("#v-links").children.length<8)$("#v-links").append(linkRow({}));});
function openVideo(id,team,date){cur.video=id;const v=id?S.videos[id]:null;cur.team=v?teamOf(v):(TEAMS[team]?team:"media");const T=TEAMS[cur.team];
  fill($("#v-team"),videoTeams());fillTemplateOptions(cur.team);
  fill($("#v-stage"),T.stages);$("#v-fmt-l").hidden=cur.team!=="media";document.querySelectorAll("#d-video .m-only").forEach(x=>{x.hidden=cur.team!=="media";});document.querySelectorAll("#d-video .e-only").forEach(x=>{x.hidden=cur.team!=="events";});
  $("#v-notes").placeholder=cur.team==="media"?"Бриф, насоки за монтажа, забележки от клиента":"Бриф, изисквания и забележки от клиента";$("#v-edate").value=v?v.edate||"":(date||"");$("#v-eloc").value=v?v.eloc||"":"";$("#v-estart").value=v?v.estart||"":"";$("#v-eend").value=v?v.eend||"":"";
  cur.svc=v&&v.svc?JSON.parse(JSON.stringify(v.svc)):[];renderSvc();$("#v-newsvc").value="";$("#v-newsvcd").value="";fillSelects();
  $("#v-h").textContent=(v?"Редакция: ":"Добавяне: ")+T.one;$("#v-del").hidden=!v;
  $("#v-title").value=v?v.title:"";$("#v-client").value=v?v.client||"":S.fClient;$("#v-team").value=cur.team;$("#v-stage").value=v?stageId(v):T.stages[0][0];
  $("#v-who").value=v?v.who||"":"";$("#v-due").value=v?v.due||"":"";$("#v-est").value=v&&v.est?v.est:"";$("#v-notes").value=v?v.notes||"":"";
  $("#v-fmt").value=v?v.fmt||"":S.fFmt;$("#v-revs").value=v&&v.revs?v.revs:"";
  $("#v-track").value=v?v.track||"":"";$("#v-publink").value=v?v.publink||"":"";$("#v-results").value=v?v.results||"":"";
  cur.check=v&&v.check?JSON.parse(JSON.stringify(v.check)):[];renderCheck();$("#v-newstep").value="";$("#v-newc").value="";
  $("#v-cbox").hidden=!v;if(v)renderComments();
  const box=$("#v-links");box.textContent="";((v&&v.links)||[]).forEach(l=>box.append(linkRow(l)));if(!box.children.length)box.append(linkRow({label:cur.team==="media"?"Суров материал":"Материали"}));
  $("#d-video").showModal();}
$("#v-team").addEventListener("change",()=>{const team=$("#v-team").value;if(!TEAMS[team])return;cur.team=team;fillTemplateOptions(team);fill($("#v-stage"),TEAMS[team].stages);$("#v-stage").value=TEAMS[team].stages[0][0];$("#v-fmt-l").hidden=team!=="media";document.querySelectorAll("#d-video .m-only").forEach(x=>{x.hidden=team!=="media";});document.querySelectorAll("#d-video .e-only").forEach(x=>{x.hidden=team!=="events";});});
$("#v-template").addEventListener("change",()=>{const t=(TASK_TEMPLATES[$("#v-team").value]||[])[$("#v-template").value];if(!t)return;cur.check=t.slice(1).map(x=>({t:x,done:false}));renderCheck();});
$("#f-video").addEventListener("submit",async ev=>{ev.preventDefault();const id=cur.video,old=id?S.videos[id]:null;
  const links=[];let bad=false;[...$("#v-links").children].forEach(r=>{const i=r.querySelectorAll("input"),raw=i[1].value.trim();if(!raw)return;const u=safeUrl(raw);if(!u){bad=true;return;}links.push({label:i[0].value.trim(),url:u});});
  if(bad){toast("Един от линковете не е валиден адрес. Трябва да започва с https://");return;}
  const praw=$("#v-publink").value.trim(),pu=safeUrl(praw);if(praw&&!pu){toast("Линкът към публикацията не е валиден адрес. Трябва да започва с https://");return;}
  const selectedTeam=$("#v-team").value||cur.team;cur.team=selectedTeam;const teamStages=TEAMS[selectedTeam].stages;
  const rec={title:$("#v-title").value.trim(),client:$("#v-client").value,stage:teamStages.some(([s])=>s===$("#v-stage").value)?$("#v-stage").value:teamStages[0][0],who:$("#v-who").value,due:$("#v-due").value,
    est:+$("#v-est").value||0,notes:$("#v-notes").value.trim(),links:links,created:(old&&old.created)||Date.now(),
    fmt:$("#v-fmt").value,revs:Math.max(0,Math.round(+$("#v-revs").value||0)),check:cur.check||[],comments:(old&&old.comments)||[]};
  rec.moved=(old&&old.stage===rec.stage)?(old.moved||0):Date.now();rec.team=cur.team;if(cur.team!=="media")rec.fmt="";
  if(cur.team==="media"){rec.track=$("#v-track").value;rec.publink=pu||"";rec.results=$("#v-results").value.trim();}
  if(cur.team==="events"){rec.edate=$("#v-edate").value;rec.eloc=$("#v-eloc").value.trim();rec.estart=$("#v-estart").value;rec.eend=$("#v-eend").value;rec.svc=cur.svc||[];}
  rec.doneAt=isDone(rec)?((old&&old.doneAt)||Date.now()):0;
  const ref=id?S.db.doc("videos/"+id):S.db.collection("videos").doc();
  if(await tryW(ref.set(rec)))$("#d-video").close();});
function renderCheck(){const box=$("#v-check");box.textContent="";
  if(!cur.check.length)box.append(h("span",{class:"small muted"},"Още няма стъпки."));
  cur.check.forEach((c,i)=>box.append(h("div",{class:"ci"+(c.done?" done":"")},
    h("input",{type:"checkbox",checked:!!c.done,"aria-label":c.t,onchange:e=>{c.done=e.target.checked;saveCheck();renderCheck();}}),h("span",null,c.t),
    h("button",{type:"button",class:"btn ghost","aria-label":"Премахни стъпката",onclick:()=>{cur.check.splice(i,1);saveCheck();renderCheck();}},"×"))));}
function renderSvc(){const box=$("#v-svc");box.textContent="";
  if(!cur.svc.length)box.append(h("span",{class:"small muted"},"Още няма допълнителни услуги."));
  const mv=(i,d)=>{const j=i+d;if(j<0||j>=cur.svc.length)return;const t=cur.svc[i];cur.svc[i]=cur.svc[j];cur.svc[j]=t;saveSvc();renderSvc();};
  cur.svc.forEach((c,i)=>box.append(h("div",{class:"sv"+(c.done?" done":"")},
    h("input",{type:"checkbox",checked:!!c.done,"aria-label":"Готова: "+c.t,onchange:e=>{c.done=e.target.checked;saveSvc();renderSvc();}}),h("span",{class:"no"},(i+1)+"."),
    h("span",{class:"tx"},c.t,c.d?h("span",{class:"small muted"}," · "+c.d):null),
    h("button",{type:"button",class:"btn ghost","aria-label":"Премести нагоре",disabled:i===0,onclick:()=>mv(i,-1)},"↑"),
    h("button",{type:"button",class:"btn ghost","aria-label":"Премести надолу",disabled:i===cur.svc.length-1,onclick:()=>mv(i,1)},"↓"),
    h("button",{type:"button",class:"btn ghost","aria-label":"Премахни услугата",onclick:()=>{cur.svc.splice(i,1);saveSvc();renderSvc();}},"×"))));}
function saveSvc(){if(!cur.video)return;const id=cur.video,val=JSON.parse(JSON.stringify(cur.svc));checkChain=checkChain.then(()=>tryW(S.db.doc("videos/"+id).update({svc:val})));}
function addSvc(){const i=$("#v-newsvc"),d=$("#v-newsvcd"),t=i.value.trim();if(!t||cur.svc.length>=40)return;cur.svc.push({t:t,d:d.value.trim(),done:false});i.value="";d.value="";saveSvc();renderSvc();i.focus();}
$("#v-addsvc").addEventListener("click",addSvc);
["#v-newsvc","#v-newsvcd"].forEach(q=>$(q).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addSvc();}}));
let checkChain=Promise.resolve();
function saveCheck(){if(!cur.video)return;const id=cur.video,val=JSON.parse(JSON.stringify(cur.check));checkChain=checkChain.then(()=>tryW(S.db.doc("videos/"+id).update({check:val})));}
function addStep(){const i=$("#v-newstep"),t=i.value.trim();if(!t||cur.check.length>=30)return;cur.check.push({t:t,done:false});i.value="";saveCheck();renderCheck();}
function renderComments(){const box=$("#v-comments");box.textContent="";const list=((S.videos[cur.video]||{}).comments)||[];
  if(!list.length)box.append(h("span",{class:"small muted"},"Още няма коментари."));
  list.forEach(c=>box.append(h("div",{class:"cm"},h("div",{class:"small muted"},nameOf(c.by)+" · "+new Date(c.at).toLocaleString("bg-BG",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})),h("div",{style:"overflow-wrap:anywhere"},c.t))));}
async function addComment(){const i=$("#v-newc"),t=i.value.trim(),id=cur.video;if(!t||!id||!S.uid)return;
  const list=((S.videos[id]||{}).comments||[]).slice(-99).concat([{by:S.uid,at:Date.now(),t:t}]);i.value="";
  await tryW(S.db.doc("videos/"+id).update({comments:list}));}
$("#v-addstep").addEventListener("click",addStep);$("#v-addc").addEventListener("click",addComment);
$("#v-newstep").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addStep();}});
$("#v-newc").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addComment();}});
arm($("#v-del"),async()=>{if(await tryW(S.db.doc("videos/"+cur.video).delete()))$("#d-video").close();});

function openShoot(id,date){cur.shoot=id;const s=id?S.shoots[id]:null;fillSelects();
  $("#s-h").textContent=s?"Редакция на снимачен ден":"Нов снимачен ден";$("#s-del").hidden=!s;
  $("#s-title").value=s?s.title:"";$("#s-client").value=s?s.client||"":"";fill($("#s-video"),videoOpts($("#s-client").value),"Без задача");$("#s-video").value=s?s.video||"":"";
  $("#s-date").value=s?s.date:(date||ymd(new Date()));$("#s-loc").value=s?s.loc||"":"";$("#s-start").value=s?s.start||"":"";$("#s-end").value=s?s.end||"":"";
  $("#s-gear").value=s?s.gear||"":"";$("#s-link").value=s?s.link||"":"";
  const box=$("#s-crew");box.textContent="";memberIds().forEach(m=>box.append(h("label",null,h("input",{type:"checkbox",value:m,checked:!!(s&&s.crew&&s.crew.includes(m))}),nameOf(m))));
  $("#d-shoot").showModal();}
$("#f-shoot").addEventListener("submit",async ev=>{ev.preventDefault();const id=cur.shoot,raw=$("#s-link").value.trim(),u=safeUrl(raw);
  if(raw&&!u){toast("Линкът не е валиден адрес. Трябва да започва с https://");return;}
  const rec={title:$("#s-title").value.trim(),client:$("#s-client").value,video:$("#s-video").value,date:$("#s-date").value,loc:$("#s-loc").value.trim(),
    start:$("#s-start").value,end:$("#s-end").value,gear:$("#s-gear").value.trim(),link:u||"",crew:[...$("#s-crew").querySelectorAll("input:checked")].map(i=>i.value)};
  const ref=id?S.db.doc("shoots/"+id):S.db.collection("shoots").doc();
  if(await tryW(ref.set(rec))){S.cal=new Date(pd(rec.date).getFullYear(),pd(rec.date).getMonth(),1);$("#d-shoot").close();schedule();}});
arm($("#s-del"),async()=>{if(await tryW(S.db.doc("shoots/"+cur.shoot).delete()))$("#d-shoot").close();});

function openClient(id){cur.client=id;const c=id?S.clients[id]:null;
  $("#c-h").textContent=c?"Редакция на клиент":"Нов клиент";$("#c-del").hidden=!c;
  fill($("#c-team"),Object.entries(TEAMS).map(([k,t])=>[k,t.name]));
  $("#c-name").value=c?c.name:"";$("#c-team").value=c?c.team||"media":"media";$("#c-hours").value=c&&c.hours?c.hours:"";$("#c-link").value=c?c.link||"":"";
  const used=Object.values(S.clients).map(x=>x.color),pick=c?c.color:(COLORS.find(x=>!used.includes(x))||COLORS[0]);
  const box=$("#c-colors");box.textContent="";COLORS.forEach((col,i)=>box.append(h("label",null,h("input",{type:"radio",name:"c-color",id:"c-col-"+i,value:col,checked:col===pick,"aria-label":"Цвят "+(i+1)}),h("span",{style:"--c:"+col}))));
  $("#d-client").showModal();}
$("#f-client").addEventListener("submit",async ev=>{ev.preventDefault();const id=cur.client,raw=$("#c-link").value.trim(),u=safeUrl(raw);
  if(raw&&!u){toast("Линкът не е валиден адрес. Трябва да започва с https://");return;}
  const sel=$("#c-colors").querySelector("input:checked");
  const rec={name:$("#c-name").value.trim(),team:$("#c-team").value||"media",hours:+$("#c-hours").value||0,link:u||"",color:sel?sel.value:COLORS[0],archived:false};
  const ref=id?S.db.doc("clients/"+id):S.db.collection("clients").doc();
  if(await tryW(ref.set(rec)))$("#d-client").close();});
arm($("#c-del"),async()=>{const c=S.clients[cur.client];if(await tryW(S.db.doc("clients/"+cur.client).set(Object.assign({},c,{archived:true}))))$("#d-client").close();});

/* ---------- boot ---------- */
function route(){const t=(location.hash||"").slice(1);S.tab=["today","timer","board","web","events","design","due","calendar","reports","team","hr"].includes(t)?t:"today";schedule();}
window.addEventListener("hashchange",route);
fillSelects();route();

(async function boot(){
  const cl=window.claude;
  if(!cl||!cl.use){S.ready=true;S.booted=true;showBanner("Платформата не е настроена. Попълнете config.js.");schedule();return;}
  const [db,user,dl,mcp]=await Promise.all([cl.use("db"),cl.use("user"),cl.use("downloads"),cl.use("mcp")]);
  S.db=db;S.user=user;S.dl=dl;S.mcp=mcp;S.booted=true;
  if(user){S.uid=await user.id();S.isAdmin=await user.canEdit();const cw=await user.can("data.write");S.canWrite=cw!==false;}
  if(!db){S.ready=true;showBanner("Данните не са достъпни. Влезте отново.");schedule();return;}
  if(!S.canWrite)showBanner("Имате достъп само за преглед.");
  let first=3;const done=()=>{if(first>0&&--first===0){S.ready=true;}};
  subCol("clients",done);subCol("videos",()=>{done();loadProfiles();if($("#d-video").open&&cur.video)renderComments();});subCol("shoots",done);
  subCol("members",()=>{loadProfiles();subReports();});subCol("depts",()=>{S.deptsLoaded=true;});
  if(S.uid){
    db.collection("time/"+S.uid+"/days").where("date",">=",ymd(addDays(new Date(),-14))).onSnapshot(s=>{const o={};s.docs.forEach(d=>{o[d.id]=d.data();});S.myDays=o;schedule();},onErr);
    subReports();
    if(S.canWrite){try{const me=db.doc("members/"+S.uid),snap=await me.get();if(!snap.exists)await me.set({joined:Date.now(),role:""});}catch(e){}}
  }
  loadProfiles();
})();
})();
