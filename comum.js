/* comum.js — código compartilhado entre o app (index.html) e o planejador (planejador-corrida.html).
   Carregado ANTES do script principal de cada um (<script src="comum.js">). Tudo aqui vale igual
   nos dois arquivos: tipos e cálculos de corrida (pace, blocos, estrutura), listas fixas
   (grupos musculares, mobilidade, exercícios conhecidos), sugestão/confirmação de nome de
   exercício, formulários de corrida/plano que são idênticos, espaço usado na nuvem,
   sincronização com mesclagem e cópia de segurança.
   IMPORTANTE: este arquivo precisa estar publicado no site junto com o index.html (o app no
   celular carrega ele de lá) e na mesma pasta do planejador no PC. */
const $=id=>document.getElementById(id);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fdate=d=>new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
const FIRESTORE_DOC_LIMIT=1048576;
function utf8ByteLength(str){
  // string.length conta "caracteres" (UTF-16), não bytes — com acentos/emojis isso subestima
  // o tamanho real. Este truque clássico (encodeURIComponent + unescape) devolve o total real
  // de bytes em UTF-8, que é o que o Firestore de fato conta.
  try{return unescape(encodeURIComponent(str)).length;}
  catch(e){return str.length;}
}
function cloudStorageInfo(){
  const bytes=utf8ByteLength(JSON.stringify(S));
  return {bytes,limit:FIRESTORE_DOC_LIMIT,pct:Math.min(100,(bytes/FIRESTORE_DOC_LIMIT)*100)};
}
function fmtBytes(n){
  if(n<1024)return n+' B';
  if(n<1024*1024)return (n/1024).toFixed(0)+' KB';
  return (n/(1024*1024)).toFixed(2)+' MB';
}
// barra de espaço usado na nuvem (Ajustes do app e do planejador)
function cloudStorageBarHTML(style){
  const st=cloudStorageInfo();
  const col=st.pct>=90?'#e0453f':st.pct>=70?'#ffb020':'var(--accent2)';
  return `<div class="card"${style?` style="${style}"`:''}>
    <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px">
      <span style="color:var(--txt);font-weight:600">${fmtBytes(st.bytes)} de ${fmtBytes(st.limit)} usados</span>
      <span style="color:var(--dim)">${st.pct.toFixed(1)}%</span></div>
    <div style="height:7px;background:var(--surface2);border-radius:4px;overflow:hidden">
      <div style="height:100%;width:${st.pct}%;background:${col};border-radius:4px"></div></div>
    <div style="font-size:11.5px;color:var(--dim);margin-top:6px">
      ${fmtBytes(Math.max(0,st.limit-st.bytes))} livres · espaço do backup na nuvem (documento único no Firestore)</div>
  </div>`;
}
function goals(){
  return Object.assign({week:3,month:12,year:150},S.goals||{});
}
let OF=null;
const OTHER_DEFAULT_NAME='Treino diferente';
function otherItemsOn(k){
  return (S.other||[]).filter(o=>dayKey(o.date)===k);
}
const RUN_TYPES=[
  ['rodagem','Rodagem','🏃','#7d9fc2'],
  ['limiar','Limiar','🔥','#e06a5a'],
  ['regen','Regenerativo','🌿','#5f9e8f'],
  ['long','Longão','🛣️','#9c6f8e'],
  ['inter','Tiros','⚡','#e0973f'],
  ['fartlek','Fartlek','🌊','#5b8def'],
];
const HAS_WU={limiar:1,inter:1,fartlek:1,rodagem:1,regen:1,long:1};
const SURF=[['esteira','Esteira','🏃‍♂️'],['rua','Rua','🛣️']];
const MUSCLE_GROUPS=[
  ['peito','Peito','💥'],
  ['costas','Costas','🔙'],
  ['ombro','Ombro','🤷'],
  ['biceps','Bíceps','💪'],
  ['triceps','Tríceps','🔻'],
  ['perna','Perna','🦵'],
  ['abdomen','Abdômen','🔷'],
];
const MUSCLE_COMBOS=[
  [['peito','costas','ombro','biceps','triceps','perna','abdomen'],'Full body'],
  [['peito','costas','ombro','biceps','triceps'],'Superior'],
  [['perna','abdomen'],'Inferior'],
  [['peito','ombro','triceps'],'Push (Empurrão)'],
  [['costas','biceps'],'Pull (Puxada)'],
  [['peito','triceps'],'Peito e Tríceps'],
  [['costas','ombro'],'Costas e Ombro'],
];
const muscleG=k=>MUSCLE_GROUPS.find(x=>x[0]===k);
const BUILTIN_EXERCISE_NAMES=[
  'Supino reto','Supino inclinado','Supino declinado','Supino reto com halteres',
  'Supino inclinado com halteres','Crucifixo','Crucifixo inclinado','Crossover',
  'Voador peitoral (peck deck)','Mergulho (dips)','Flexão de braço',
  'Puxada frontal','Puxada na polia alta','Remada curvada','Remada cavalinho',
  'Remada baixa','Remada unilateral','Remada cavalo','Barra fixa','Levantamento terra',
  'Pulldown','Face pull','Encolhimento (shrug)',
  'Desenvolvimento militar','Desenvolvimento com halteres','Elevação lateral',
  'Elevação frontal','Elevação posterior','Remada alta','Arnold press',
  'Rosca direta','Rosca alternada','Rosca martelo','Rosca scott','Rosca concentrada',
  'Rosca 21','Tríceps testa','Tríceps corda','Tríceps francês','Tríceps coice',
  'Tríceps banco','Agachamento livre','Agachamento no smith','Leg press',
  'Cadeira extensora','Mesa flexora','Cadeira flexora','Stiff','Afundo',
  'Passada','Cadeira adutora','Cadeira abdutora','Glúteo na polia','Elevação pélvica',
  'Panturrilha em pé','Panturrilha sentado','Abdominal supra','Abdominal infra',
  'Abdominal oblíquo','Prancha','Prancha lateral','Elevação de pernas',
];
function normEx(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim();
}
function levDist(a,b){
  const m=a.length,n=b.length;
  if(!m)return n; if(!n)return m;
  const dp=[];
  for(let i=0;i<=m;i++)dp.push([i]);
  for(let j=1;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)
    for(let j=1;j<=n;j++)
      dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j-1],dp[i-1][j],dp[i][j-1]);
  return dp[m][n];
}
function allKnownExerciseNames(){
  const fromWorkouts=[];
  (S.workouts||[]).forEach(w=>(w.exercises||[]).forEach(e=>{
    const n=typeof e==='string'?e:e.name;
    if(n)fromWorkouts.push(n);
  }));
  return [...BUILTIN_EXERCISE_NAMES,...(S.exDict||[]),...fromWorkouts];
}
function matchExerciseName(name){
  const norm=normEx(name);
  if(!norm)return{status:'empty'};
  const known=allKnownExerciseNames();
  if(known.some(k=>normEx(k)===norm))return{status:'ok'};
  let best=null,bestDist=Infinity;
  known.forEach(k=>{
    const d=levDist(norm,normEx(k));
    if(d<bestDist){bestDist=d;best=k;}
  });
  const threshold=Math.max(1,Math.ceil(norm.length*0.3));
  if(best&&bestDist>0&&bestDist<=threshold)return{status:'suggest',suggestion:best};
  return{status:'new'};
}
const MOBILITY_REGIONS=[
  ['superior','Superior','⬆️'],
  ['inferior','Inferior','⬇️'],
  ['corpo','Corpo todo','🧘'],
];
const MOBILITY_TAGS=[
  ['flex','Flexibilidade','🤸'],
  ['postural','Postural','🧍'],
  ['ativ','Ativação','🔥'],
  ['relax','Relaxamento','😌'],
];
const mobRegionG=k=>MOBILITY_REGIONS.find(x=>x[0]===k);
const mobTagG=k=>MOBILITY_TAGS.find(x=>x[0]===k);
function suggestMobName(regions,tags){
  const rOrdered=MOBILITY_REGIONS.filter(g=>(regions||[]).includes(g[0])).map(g=>g[1]);
  const tOrdered=MOBILITY_TAGS.filter(g=>(tags||[]).includes(g[0])).map(g=>g[1]);
  if(!rOrdered.length&&!tOrdered.length)return '';
  let base=rOrdered.length
    ?(rOrdered.length===1?rOrdered[0]:rOrdered.slice(0,-1).join(', ')+' e '+rOrdered[rOrdered.length-1])
    :'Mobilidade';
  if(tOrdered.length)base+=' — '+tOrdered.join(', ');
  return base;
}
const rType=k=>RUN_TYPES.find(t=>t[0]===k)||RUN_TYPES[0];
const RUN_LEVELS=[
  ['leve','Leve','😌','#5f9e8f'],
  ['moderado','Moderado','🙂','#5b8def'],
  ['forte','Forte','😤','#e0973f'],
  ['muitoforte','Muito forte','🥵','#e06a5a'],
];
const LEVEL_DESC={
  leve:'Conversa fácil — dá pra falar frases inteiras sem esforço.',
  moderado:'Conversa em frases curtas — dá pra falar, mas já ofega.',
  forte:'Apenas palavras soltas — só sai uma palavra de cada vez.',
  muitoforte:'Não consegue falar.',
};
const runLvl=k=>RUN_LEVELS.find(l=>l[0]===k)||null;
function runLevel(r){
  if(r.level)return r.level;
  if(r.rpe){
    const v=r.rpe;
    return v<=3?'leve':v<=5?'moderado':v<=7?'forte':'muitoforte';
  }
  return null;
}
function paceOf(km,sec){ // segundos por km
  return km>0&&sec>0?sec/km:0;
}
function paceMS(km,sec){
  if(!km||!sec)return{m:'',s:''};
  const sp=Math.round(sec/km);
  return{m:Math.floor(sp/60),s:sp%60};
}
function timeFromPaceKm(pm,ps,km){
  const spk=(parseInt(pm)||0)*60+(parseInt(ps)||0);
  return Math.round(spk*(parseFloat(String(km).replace(',','.'))||0));
}
function timeFromSpeedKm(v,km){
  v=parseFloat(String(v).replace(',','.'))||0;
  km=parseFloat(String(km).replace(',','.'))||0;
  if(!v||!km)return 0;
  return Math.round(km/v*3600);
}
function speedOf(km,sec){ return kmhOf(paceOf(km,sec)); }
function fmtPace(sp){
  if(!sp||!isFinite(sp))return '—';
  const m=Math.floor(sp/60), s=Math.round(sp%60);
  return s===60?`${m+1}'00"`:`${m}'${String(s).padStart(2,'0')}"`;
}
function fmtDur(sec){
  if(!sec)return '—';
  const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=Math.round(sec%60);
  return h?`${h}h${String(m).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
const kmhOf=sp=>sp>0?3600/sp:0;
const runs=()=>S.runs||[];
const surfOf=r=>SURF.find(s=>s[0]===((r&&r.surf)||'rua'))||SURF[0];
let RF=null;
const blank=()=>({km:'',m:'',s:''});
const blkSec=b=>(parseInt(b.m)||0)*60+(parseInt(b.s)||0);
const blkKm=b=>parseFloat(String(b.km).replace(',','.'))||0;
window.rfNum=(k,v)=>{RF[k]=v;updPace()};
window.rfBlk=(b,k,v)=>{RF[b][k]=v;updPace()};
window.rfFk=(w,k,v)=>{RF.fk[w][k]=v;updPace()};
window.rfRwMode=v=>{RF.rwMode=v;drawRunForm()};
window.rfRwReps=n=>{RF.rwReps=Math.max(1,Math.min(60,n));drawRunForm()};
window.rfRw=(w,k,v)=>{RF.rw[w][k]=v;updPace()};
window.rfShot=(i,k,v)=>{RF.shots[i][k]=v;updPace()};
window.rfCopy=i=>{ // copia o tiro anterior para os seguintes
  const src=RF.shots[i];
  for(let j=i+1;j<RF.shots.length;j++)RF.shots[j]=Object.assign({},src);
  drawRunForm();
};
window.rfBlkPace=(key,field,val)=>{
  const b=RF[key];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfFkPace=(w,field,val)=>{
  const b=RF.fk[w];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfRwPace=(w,field,val)=>{
  const b=RF.rw[w];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfShotPace=(i,field,val)=>{
  const b=RF.shots[i];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfNumPace=(field,val)=>{
  const km=parseFloat(String(RF.km).replace(',','.'))||0;
  const cur=paceMS(km,rfSecs());
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,km);
  RF.h=Math.floor(sec/3600); RF.m=Math.floor((sec%3600)/60); RF.s=sec%60;
  updPace();
};
window.rfBlkSpeed=(key,val)=>{
  const b=RF[key];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfRwSpeed=(w,val)=>{
  const b=RF.rw[w];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfFkSpeed=(w,val)=>{
  const b=RF.fk[w];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfShotSpeed=(i,val)=>{
  const b=RF.shots[i];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPace();
};
window.rfNumSpeed=val=>{
  const km=parseFloat(String(RF.km).replace(',','.'))||0;
  const sec=timeFromSpeedKm(val,km);
  RF.h=Math.floor(sec/3600); RF.m=Math.floor((sec%3600)/60); RF.s=sec%60;
  updPace();
};
window.rfShotM=(i,v)=>{
  RF.shots[i].km=v===''?'':String((parseFloat(v)||0)/1000);
  updPace();
};
function rfSecs(){
  return (parseInt(RF.h)||0)*3600+(parseInt(RF.m)||0)*60+(parseInt(RF.s)||0);
}
function structTotals(obj){
  const t=obj.type;
  if(!HAS_WU[t])return null;
  let km=blkKm(obj.wu)+blkKm(obj.cd), sec=blkSec(obj.wu)+blkSec(obj.cd);
  let mainKm=0, mainSec=0, restSec=0;
  if(t==='inter'){
    obj.shots.forEach(s=>{
      mainKm+=blkKm(s);
      mainSec+=blkSec(s);
      restSec+=(parseInt(s.rm)||0)*60+(parseInt(s.rs)||0);
    });
  }else if(t==='fartlek'){
    const n=obj.reps||1;
    mainKm=(blkKm(obj.fk.on)+blkKm(obj.fk.off))*n;
    mainSec=(blkSec(obj.fk.on)+blkSec(obj.fk.off))*n;
  }else if(t==='limiar'){
    mainKm=blkKm(obj.fk.on);
    mainSec=blkSec(obj.fk.on);
  }else if(t==='rodagem'&&obj.rwMode==='on'&&obj.rw){
    // rodagem intercalando corrida e caminhada: soma (corrida+caminhada) × nº de vezes intercalado
    const n=obj.rwReps||1;
    mainKm=(blkKm(obj.rw.run)+blkKm(obj.rw.walk))*n;
    mainSec=(blkSec(obj.rw.run)+blkSec(obj.rw.walk))*n;
  }else if(t==='rodagem'&&Array.isArray(obj.blocks)&&obj.blocks.length){
    // rodagem contínua em blocos: soma de todos os blocos da parte principal
    obj.blocks.forEach(b=>{mainKm+=blkKm(b);mainSec+=rbSec(b);});
  }else{ // rodagem contínua (formato antigo), regenerativo e longão: parte principal direta (distância + tempo)
    mainKm=parseFloat(String(obj.km).replace(',','.'))||0;
    mainSec=(parseInt(obj.h)||0)*3600+(parseInt(obj.m)||0)*60+(parseInt(obj.s)||0);
  }
  return {km:km+mainKm,sec:sec+mainSec+restSec,
    wuKm:blkKm(obj.wu),wuSec:blkSec(obj.wu),
    cdKm:blkKm(obj.cd),cdSec:blkSec(obj.cd),
    mainKm,mainSec,restSec};
}
function updPace(){
  const st=structTotals(RF);
  const box=$('pcbox');
  if(st){
    const el=$('calcbox');
    if(el){
      el.innerHTML=`
        ${st.wuKm||st.wuSec?`<div class="ct2"><span>Aquecimento</span><b>${st.wuKm.toFixed(2)} km · ${fmtDur(st.wuSec)}</b></div>`:''}
        <div class="ct2"><span>Parte principal</span><b>${st.mainKm.toFixed(2)} km · ${fmtDur(st.mainSec)}</b></div>
        ${st.restSec?`<div class="ct2"><span>Descanso total</span><b>${fmtDur(st.restSec)}</b></div>`:''}
        ${st.cdKm||st.cdSec?`<div class="ct2"><span>Desaquecimento</span><b>${st.cdKm.toFixed(2)} km · ${fmtDur(st.cdSec)}</b></div>`:''}
        <div class="ct2 tt"><span>Total do treino</span><b>${st.km.toFixed(2)} km · ${fmtDur(st.sec)}</b></div>
        <div class="ct2"><span>Pace médio geral</span><b>${fmtPace(paceOf(st.km,st.sec))}/km</b></div>`;
    }
    return;
  }
  if(!box)return;
  const km=parseFloat(String(RF.km).replace(',','.'))||0, sec=rfSecs();
  const sp=paceOf(km,sec);
  box.innerHTML=sp?`<b>${fmtPace(sp)}</b><span>pace médio / km</span>
    <div class="alt">${kmhOf(sp).toFixed(1)} km/h · ${fmtDur(sec)} para ${km.toFixed(2)} km</div>`
    :`<b style="color:var(--dim)">—</b><span>preencha distância e tempo</span>`;
}
function blkHTML(obj,setter,key,icon,title){
  const b=obj[key];
  const km=blkKm(b), sec=blkSec(b);
  const mode=obj.tmode||'time';
  const pv=paceMS(km,sec);
  const sv=speedOf(km,sec);
  return `<div class="blk">
    <div class="blk-h"><span class="bi">${icon}</span><span class="bt">${title}</span>
      <span class="bs">${km||sec?`${km.toFixed(2)} km · ${fmtDur(sec)}`:'—'}</span></div>
    <div class="mini-row">
      <div class="mini-f"><label>Distância (km)</label>
        <input type="number" inputmode="decimal" step="0.01" value="${esc(b.km)}"
          placeholder="2.00" oninput="${setter}('${key}','km',this.value)"></div>
      ${mode==='pace'?`<div class="mini-f"><label>Pace (min : s /km)</label>
        <div class="dur2">
          <input type="number" inputmode="numeric" value="${pv.m}" placeholder="5" oninput="${setter}Pace('${key}','m',this.value)">
          <div class="sep">:</div>
          <input type="number" inputmode="numeric" value="${pv.s}" placeholder="00" oninput="${setter}Pace('${key}','s',this.value)">
        </div></div>`:
      mode==='speed'?`<div class="mini-f"><label>Velocidade (km/h)</label>
        <input type="number" inputmode="decimal" step="0.1" value="${sv?sv.toFixed(1):''}"
          placeholder="10.0" oninput="${setter}Speed('${key}',this.value)"></div>`:
      `<div class="mini-f"><label>Tempo (min : s)</label>
        <div class="dur2">
          <input type="number" inputmode="numeric" value="${esc(b.m)}" placeholder="12" oninput="${setter}('${key}','m',this.value)">
          <div class="sep">:</div>
          <input type="number" inputmode="numeric" value="${esc(b.s)}" placeholder="00" oninput="${setter}('${key}','s',this.value)">
        </div></div>`}
    </div></div>`;
}
function fkPaceHTML(b,setter,key){
  const pv=paceMS(blkKm(b),blkSec(b));
  return `<div class="mini-f"><label>Pace (min : s /km)</label>
    <div class="dur2">
      <input type="number" inputmode="numeric" value="${pv.m}" placeholder="5" oninput="${setter}('${key}','m',this.value)">
      <div class="sep">:</div>
      <input type="number" inputmode="numeric" value="${pv.s}" placeholder="00" oninput="${setter}('${key}','s',this.value)">
    </div></div>`;
}
function fkSpeedHTML(b,setter,key){
  const sv=speedOf(blkKm(b),blkSec(b));
  return `<div class="mini-f"><label>Velocidade (km/h)</label>
    <input type="number" inputmode="decimal" step="0.1" value="${sv?sv.toFixed(1):''}"
      placeholder="10.0" oninput="${setter}('${key}',this.value)"></div>`;
}
const rbBlank=()=>({km:'',h:'',m:'',s:''});
const rbSec=b=>(parseInt(b.h)||0)*3600+(parseInt(b.m)||0)*60+(parseInt(b.s)||0);
function rbEnsure(o){
  if(!o||o.type!=='rodagem')return;
  if(!Array.isArray(o.blocks)||!o.blocks.length)
    o.blocks=[{km:o.km??'',h:o.h??'',m:o.m??'',s:o.s??''}];
}
function rbSync(o){
  if(!o||!Array.isArray(o.blocks))return;
  const km=o.blocks.reduce((a,b)=>a+blkKm(b),0);
  const sec=o.blocks.reduce((a,b)=>a+rbSec(b),0);
  o.km=km?String(+km.toFixed(3)):'';
  o.h=Math.floor(sec/3600)||''; o.m=sec?Math.floor((sec%3600)/60):''; o.s=sec%60||'';
}
function rbClean(o){
  const bs=(o.blocks||[]).map(b=>({km:b.km??'',h:b.h??'',m:b.m??'',s:b.s??''}));
  const filled=bs.filter(b=>blkKm(b)||rbSec(b));
  return filled.length?filled:bs.slice(0,1);
}
function rbSumTxt(b){
  const km=blkKm(b), sec=rbSec(b);
  if(!km&&!sec)return '—';
  const sp=paceOf(km,sec);
  return `${km.toFixed(2)} km · ${fmtDur(sec)}${sp?` · ${fmtPace(sp)}/km`:''}`;
}
function rbListHTML(o,w,isPlan,readonly){
  const dis=readonly?'disabled':'';
  const n=o.blocks.length, alvo=isPlan?' alvo':'';
  let h='';
  o.blocks.forEach((b,i)=>{
    const km=blkKm(b), sec=rbSec(b), pv=paceMS(km,sec), sv=speedOf(km,sec);
    h+=`<div class="blk">
      <div class="blk-h"><span class="bi">🏃</span><span class="bt">${n>1?'Bloco '+(i+1):'Parte principal'}</span>
        <span class="bs" id="rbs-${w}-${i}">${rbSumTxt(b)}</span>
        ${n>1&&!readonly?`<button type="button" class="rb-del" title="Remover bloco" onclick="rbDel('${w}',${i})">✕</button>`:''}</div>
      <div class="mini-row">
        <div class="mini-f"><label>Distância (km)</label>
          <input type="number" inputmode="decimal" step="0.01" value="${esc(b.km)}" ${dis}
            placeholder="${n>1?'3.00':'10.00'}" oninput="rbNum('${w}',${i},'km',this.value)"></div>
        ${o.tmode==='pace'?`<div class="mini-f"><label>Pace${alvo} (min : s /km)</label>
          <div class="dur2">
            <input type="number" inputmode="numeric" value="${pv.m}" placeholder="5" ${dis} oninput="rbPace('${w}',${i},'m',this.value)">
            <div class="sep">:</div>
            <input type="number" inputmode="numeric" value="${pv.s}" placeholder="00" ${dis} oninput="rbPace('${w}',${i},'s',this.value)">
          </div></div>`:
        o.tmode==='speed'?`<div class="mini-f"><label>Velocidade${alvo} (km/h)</label>
          <input type="number" inputmode="decimal" step="0.1" value="${sv?sv.toFixed(1):''}" ${dis}
            placeholder="10.0" oninput="rbSpeed('${w}',${i},this.value)"></div>`:
        `<div class="mini-f"><label>Tempo${alvo} (h:min:s)</label>
          <div class="dur-row">
            <input type="number" inputmode="numeric" value="${esc(b.h)}" placeholder="0" ${dis} oninput="rbNum('${w}',${i},'h',this.value)">
            <div class="sep">:</div>
            <input type="number" inputmode="numeric" value="${esc(b.m)}" placeholder="${n>1?'15':'45'}" ${dis} oninput="rbNum('${w}',${i},'m',this.value)">
            <div class="sep">:</div>
            <input type="number" inputmode="numeric" value="${esc(b.s)}" placeholder="00" ${dis} oninput="rbNum('${w}',${i},'s',this.value)">
          </div></div>`}
      </div></div>`;
  });
  if(!readonly)h+=`<button type="button" class="rb-add" onclick="rbAdd('${w}')">+ Adicionar bloco</button>`;
  return h;
}
const rbObj=w=>w==='pf'?PF:RF;
const rbRedraw=w=>w==='pf'?drawPlanForm():drawRunForm();
function rbAfter(w){
  const o=rbObj(w); if(!o)return;
  rbSync(o);
  o.blocks.forEach((b,i)=>{const el=document.getElementById('rbs-'+w+'-'+i); if(el)el.textContent=rbSumTxt(b);});
  if(w==='pf')updPlanCalc(); else updPace();
}
window.rbNum=(w,i,k,v)=>{
  const o=rbObj(w), b=o&&o.blocks&&o.blocks[i]; if(!b)return;
  b[k]=v; rbAfter(w);
};
window.rbPace=(w,i,field,val)=>{
  const o=rbObj(w), b=o&&o.blocks&&o.blocks[i]; if(!b)return;
  const km=blkKm(b), cur=paceMS(km,rbSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,km);
  b.h=Math.floor(sec/3600); b.m=Math.floor((sec%3600)/60); b.s=sec%60;
  rbAfter(w);
};
window.rbSpeed=(w,i,val)=>{
  const o=rbObj(w), b=o&&o.blocks&&o.blocks[i]; if(!b)return;
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.h=Math.floor(sec/3600); b.m=Math.floor((sec%3600)/60); b.s=sec%60;
  rbAfter(w);
};
window.rbAdd=w=>{
  const o=rbObj(w); if(!o)return;
  rbEnsure(o); o.blocks.push(rbBlank()); rbSync(o); rbRedraw(w);
};
window.rbDel=(w,i)=>{
  const o=rbObj(w); if(!o||!o.blocks||o.blocks.length<=1)return;
  o.blocks.splice(i,1); rbSync(o); rbRedraw(w);
};
window.rfDate=v=>{
  const [y,m,d]=v.split('-').map(Number);
  const o=new Date(RF.date); o.setFullYear(y,m-1,d); RF.date=o.getTime();
};
const dayKey=ts=>{const d=new Date(ts);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho',
  'agosto','setembro','outubro','novembro','dezembro'];
let __exNameResolve=null;
let __exNamePending=null;
function askExerciseNameCheck(typed,suggestion){
  return new Promise(resolve=>{
    __exNameResolve=resolve;
    __exNamePending={typed,suggestion};
    const box=document.getElementById('confirm');
    if(suggestion){
      box.innerHTML='<div class="modal" style="z-index:300;align-items:center" onclick="if(event.target===this)exNameDone(false)">'+
        '<div class="ask-box">'+
        '<h3>Nome parecido encontrado</h3>'+
        '<p>Você digitou "'+esc(typed)+'". Quis dizer <b>'+esc(suggestion)+'</b>?</p>'+
        '<div class="ask-row">'+
        '<button class="btn-ghost" onclick="exNameDone(false)">Manter "'+esc(typed)+'"</button>'+
        '<button class="btn-a" onclick="exNameDone(true)">Usar "'+esc(suggestion)+'"</button>'+
        '</div></div></div>';
    }else{
      box.innerHTML='<div class="modal" style="z-index:300;align-items:center" onclick="if(event.target===this)exNameDone(false)">'+
        '<div class="ask-box">'+
        '<h3>Exercício novo</h3>'+
        '<p>"'+esc(typed)+'" ainda não está na lista de exercícios. É isso mesmo que você quis dizer?</p>'+
        '<div class="ask-row">'+
        '<button class="btn-ghost" onclick="exNameDone(null)">Corrigir</button>'+
        '<button class="btn-a" onclick="exNameDone(true)">Sim, é isso</button>'+
        '</div></div></div>';
    }
  });
}
window.exNameDone=useIt=>{
  document.getElementById('confirm').innerHTML='';
  const pending=__exNamePending; __exNamePending=null;
  const r=__exNameResolve; __exNameResolve=null;
  if(!pending||!r)return;
  if(pending.suggestion){
    const finalName=useIt?pending.suggestion:pending.typed;
    if(!useIt)learnExerciseName(pending.typed); // usuário insistiu na própria grafia
    r(finalName);
  }else{
    if(useIt===null){r(null);return;} // "Corrigir": não muda nada, deixa o usuário editar
    learnExerciseName(pending.typed);
    r(pending.typed);
  }
};
async function checkExerciseNameThen(typed,applyFn){
  const t=String(typed||'').trim();
  const m=matchExerciseName(t);
  if(m.status==='empty'||m.status==='ok')return;
  const result=await askExerciseNameCheck(t,m.status==='suggest'?m.suggestion:null);
  if(result!=null&&applyFn)applyFn(result);
}
window.__exSugList=[];
window.__exSugTarget=null;
function exSuggestMatches(query){
  const q=normEx(query);
  if(!q)return[];
  const known=[...new Set(allKnownExerciseNames())];
  const starts=known.filter(n=>normEx(n).startsWith(q));
  const contains=known.filter(n=>!normEx(n).startsWith(q)&&normEx(n).includes(q));
  return[...starts,...contains].slice(0,6);
}
function renderExSuggestions(boxId,query,applyFn){
  const box=document.getElementById(boxId);
  if(!box)return;
  const list=exSuggestMatches(query);
  if(!list.length){
    box.innerHTML='';box.classList.remove('on');
    if(window.__exSugTarget&&window.__exSugTarget.boxId===boxId)window.__exSugTarget=null;
    return;
  }
  window.__exSugList=list;
  window.__exSugTarget={boxId,applyFn};
  box.classList.add('on');
  box.innerHTML=list.map((n,i)=>
    `<button type="button" onmousedown="event.preventDefault();pickExSug(${i})">${esc(n)}</button>`).join('');
}
function hideExSuggestions(boxId){
  const box=document.getElementById(boxId);
  if(box){box.innerHTML='';box.classList.remove('on');}
  if(window.__exSugTarget&&window.__exSugTarget.boxId===boxId)window.__exSugTarget=null;
}
window.pickExSug=i=>{
  const t=window.__exSugTarget;
  if(!t)return;
  const name=window.__exSugList[i];
  hideExSuggestions(t.boxId);
  if(name)t.applyFn(name);
};
function unlinkPlanDone(id){
  (S.plans||[]).forEach(p=>{ if(p.doneId===id)p.doneId=null; });
}
let PF=null;
function pfBlank(){
  return{wu:blank(),cd:blank(),reps:6,shots:[],fk:{on:blank(),off:blank()},tmode:'pace',level:'moderado',
    h:'',m:'',s:'',rwMode:'off',rw:{run:blank(),walk:blank()},rwReps:6};
}
function pfSecs(){return (parseInt(PF.h)||0)*3600+(parseInt(PF.m)||0)*60+(parseInt(PF.s)||0);}
function pfSyncShots(){
  if(PF.type!=='inter')return;
  const n=PF.reps||1;
  while(PF.shots.length<n)PF.shots.push({km:'',m:'',s:'',rm:'',rs:''});
  PF.shots.length=n;
}
window.pfBlk=(b,k,v)=>{PF[b][k]=v;updPlanCalc()};
window.pfNum=(k,v)=>{PF[k]=v;updPlanCalc();};
window.pfNumPace=(field,val)=>{
  const km=parseFloat(String(PF.km).replace(',','.'))||0;
  const cur=paceMS(km,pfSecs());
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,km);
  PF.h=Math.floor(sec/3600); PF.m=Math.floor((sec%3600)/60); PF.s=sec%60;
  updPlanCalc();
};
window.pfFk=(w,k,v)=>{PF.fk[w][k]=v;updPlanCalc()};
window.pfRwMode=v=>{PF.rwMode=v;drawPlanForm()};
window.pfRwReps=n=>{PF.rwReps=Math.max(1,Math.min(60,n));drawPlanForm()};
window.pfRw=(w,k,v)=>{PF.rw[w][k]=v;updPlanCalc()};
window.pfShot=(i,k,v)=>{PF.shots[i][k]=v;updPlanCalc()};
window.pfReps=n=>{
  PF.reps=Math.max(1,Math.min(40,n));
  pfSyncShots();drawPlanForm();
};
window.pfCopy=i=>{
  const src=PF.shots[i];
  for(let j=i+1;j<PF.shots.length;j++)PF.shots[j]=Object.assign({},src);
  drawPlanForm();
};
window.pfBlkPace=(key,field,val)=>{
  const b=PF[key];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfFkPace=(w,field,val)=>{
  const b=PF.fk[w];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfRwPace=(w,field,val)=>{
  const b=PF.rw[w];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfShotPace=(i,field,val)=>{
  const b=PF.shots[i];
  const cur=paceMS(blkKm(b),blkSec(b));
  const pm=field==='m'?val:cur.m, ps=field==='s'?val:cur.s;
  const sec=timeFromPaceKm(pm,ps,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfShotM=(i,v)=>{
  PF.shots[i].km=v===''?'':String((parseFloat(v)||0)/1000);
  updPlanCalc();
};
window.pfNumSpeed=val=>{
  const km=parseFloat(String(PF.km).replace(',','.'))||0;
  const sec=timeFromSpeedKm(val,km);
  PF.h=Math.floor(sec/3600); PF.m=Math.floor((sec%3600)/60); PF.s=sec%60;
  updPlanCalc();
};
window.pfBlkSpeed=(key,val)=>{
  const b=PF[key];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfRwSpeed=(w,val)=>{
  const b=PF.rw[w];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfFkSpeed=(w,val)=>{
  const b=PF.fk[w];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfShotSpeed=(i,val)=>{
  const b=PF.shots[i];
  const sec=timeFromSpeedKm(val,blkKm(b));
  b.m=Math.floor(sec/60); b.s=sec%60;
  updPlanCalc();
};
window.pfExSet=(i,k,v)=>{PF.exercises[i][k]=v;};
function exGroups(list){
  // devolve, por índice, {gi,pos,size,first,last} quando o exercício faz parte de um conjugado
  const info=list.map(()=>null);
  let i=0, gi=0;
  while(i<list.length){
    let j=i+1;
    while(j<list.length&&list[j].link)j++;
    if(j-i>1){
      for(let k=i;k<j;k++)
        info[k]={gi,pos:k-i+1,size:j-i,first:k===i,last:k===j-1};
      gi++;
    }
    i=j;
  }
  return info;
}
const GRP_LETTER=n=>String.fromCharCode(65+(n%26));
function supersetSummary(exs){
  const gi=exGroups(exs), out=[]; let cur=null;
  exs.forEach((e,i)=>{
    const g=gi[i];
    if(!g){cur=null;return;}
    if(g.first){cur={l:GRP_LETTER(g.gi),names:[e.name]};out.push(cur);}
    else if(cur)cur.names.push(e.name);
  });
  return out;
}

/* ==================== SINCRONIZAÇÃO COM MESCLAGEM (app + planejador) ====================
   Os dois arquivos gravam o MESMO documento na nuvem (users/{uid}/data/main, com o S inteiro).
   Antes, valia o último que gravasse — e um aparelho com cópia antiga podia apagar da nuvem o
   que o outro tinha registrado. Agora cada gravação é uma MESCLAGEM EM 3 VIAS, item a item:
     base   = como a nuvem estava na última sincronização DESTE aparelho (guardada localmente)
     local  = como está aqui agora
     remoto = como a nuvem está agora
   Pra cada treino/corrida/plano (pelo id): o que só um lado mudou, vale a mudança; o que foi
   criado de um lado, entra; o que foi apagado de um lado (e não mexido do outro), sai. Se os
   dois lados mudaram O MESMO item, vale a versão do lado que gravou por último.
   A leitura+gravação na nuvem é feita numa transação do Firestore (window.__cloudTx), então
   duas gravações simultâneas (celular e PC) não se atropelam. */
const _jeq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const _isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const _isIdList=v=>Array.isArray(v)&&v.length>0&&v.every(x=>_isObj(x)&&'id' in x);
function _pick3(b,l,r,localWins){
  if(_jeq(l,r))return l;
  if(_jeq(l,b))return r;
  if(_jeq(r,b))return l;
  return localWins?l:r;
}
function _mergeIdList(B,L,R,localWins){
  B=Array.isArray(B)?B:[]; L=Array.isArray(L)?L:[]; R=Array.isArray(R)?R:[];
  const mb=new Map(B.map(x=>[x.id,x])), ml=new Map(L.map(x=>[x.id,x])), mr=new Map(R.map(x=>[x.id,x]));
  const keep=new Map();
  new Set([...ml.keys(),...mr.keys()]).forEach(id=>{
    const b=mb.get(id), l=ml.get(id), r=mr.get(id);
    if(l&&r)keep.set(id,_pick3(b,l,r,localWins));
    else if(l){ if(!b||!_jeq(l,b))keep.set(id,l); }   // novo aqui (ou mexido aqui depois de apagado lá)
    else     { if(!b||!_jeq(r,b))keep.set(id,r); }    // novo lá (ou mexido lá depois de apagado aqui)
  });
  // ordem (ex.: reordenar treinos): se a ordem daqui mudou em relação à base, vale a daqui
  const common=L.map(x=>x.id).filter(id=>mb.has(id));
  const baseOrd=B.map(x=>x.id).filter(id=>ml.has(id));
  const localFirst=!_jeq(common,baseOrd);
  const out=[], seen=new Set();
  [...(localFirst?L:R),...(localFirst?R:L)].forEach(x=>{
    if(!seen.has(x.id)&&keep.has(x.id)){seen.add(x.id);out.push(keep.get(x.id));}
  });
  return out;
}
function _mergeVal(b,l,r,localWins){
  if(_jeq(l,r))return l;
  if(l===undefined)return (b!==undefined&&_jeq(r,b))?undefined:r;
  if(r===undefined)return (b!==undefined&&_jeq(l,b))?undefined:l;
  if(Array.isArray(l)&&Array.isArray(r)&&(_isIdList(l)||_isIdList(r)||_isIdList(b)))
    return _mergeIdList(b,l,r,localWins);
  if(Array.isArray(l)&&Array.isArray(r)&&[...l,...r].every(x=>x===null||typeof x!=='object')){
    const B=new Set(Array.isArray(b)?b:[]), Ls=new Set(l), Rs=new Set(r);
    const out=[];
    [...r,...l].forEach(x=>{
      if(out.includes(x))return;
      const inL=Ls.has(x), inR=Rs.has(x), inB=B.has(x);
      if((inL&&inR)||(inL&&!inB)||(inR&&!inB))out.push(x);
    });
    return out;
  }
  if(_isObj(l)&&_isObj(r)){
    const bo=_isObj(b)?b:{}, o={};
    new Set([...Object.keys(r),...Object.keys(l)]).forEach(k=>{
      const v=_mergeVal(bo[k],l[k],r[k],localWins);
      if(v!==undefined)o[k]=v;
    });
    return o;
  }
  return _pick3(b,l,r,localWins);
}
// mescla o estado inteiro. base=null → primeira sincronização com mesclagem neste aparelho:
// se a cópia daqui for mais antiga que a da nuvem, vale a da nuvem (como era antes); se for
// mais nova, junta as duas (nada é descartado).
function mergeState(base,local,remote){
  if(!remote)return JSON.parse(JSON.stringify(local));
  if(!local)return JSON.parse(JSON.stringify(remote));
  const lt=local._updatedAt||0, rt=remote._updatedAt||0;
  if(!base){
    if(lt<=rt)return JSON.parse(JSON.stringify(remote));
    base={};
  }
  const strip=o=>{const c=Object.assign({},o);delete c._updatedAt;return c;};
  const out=_mergeVal(strip(base),strip(local),strip(remote),lt>rt)||{};
  out._updatedAt=Math.max(lt,rt);
  return JSON.parse(JSON.stringify(out));
}
// "base" desta cópia local: guardada junto com os dados locais (chave própria de cada arquivo)
const syncBaseKey=()=>LS_KEY+'-base';
function loadSyncBase(){try{const r=localStorage.getItem(syncBaseKey());return r?JSON.parse(r):null;}catch(e){return null;}}
function storeSyncBase(o){try{localStorage.setItem(syncBaseKey(),JSON.stringify(o));}catch(e){}}
// motor de sincronização: um envio por vez; se houver mudança durante o envio, sincroniza de novo.
// Cada arquivo define: persistLocal() (grava S no aparelho) e afterCloudMerge() (normaliza/redesenha).
const SYNC={busy:false,again:false,force:false,lastOk:0};
async function cloudSync(opts){
  if(opts&&opts.force)SYNC.force=true;
  if(typeof window.__cloudTx!=='function')return false;
  if(SYNC.busy){SYNC.again=true;return false;}
  SYNC.busy=true;
  let ok=false;
  try{
    do{
      SYNC.again=false;
      const force=SYNC.force; SYNC.force=false;
      const sent=JSON.parse(JSON.stringify(S));
      const base=loadSyncBase();
      const merged=await Promise.race([
        window.__cloudTx(remote=>force?JSON.parse(JSON.stringify(sent)):mergeState(base,sent,remote)),
        new Promise(res=>setTimeout(()=>res(null),20000))]);
      if(!merged){ if(force)SYNC.force=true; ok=false; break; }
      storeSyncBase(merged);
      // incorpora o que veio da nuvem sem perder o que mudou aqui enquanto enviava
      const next=mergeState(sent,S,merged);
      const changed=!_jeq(next,S);
      S=next;
      persistLocal();
      if(changed&&typeof afterCloudMerge==='function')afterCloudMerge();
      ok=true; SYNC.lastOk=Date.now();
    }while(SYNC.again);
  }catch(e){ ok=false; }
  finally{ SYNC.busy=false; }
  return ok;
}
// voltou a internet: tenta sincronizar o que ficou pendente
window.addEventListener('online',()=>{cloudSync();});

/* ==================== CÓPIA DE SEGURANÇA (arquivo) ==================== */
const BACKUP_EVERY_DAYS=15;
function backupPayload(){
  return {formato:'treinos-backup',versao:1,criadoEm:new Date().toISOString(),dados:JSON.parse(JSON.stringify(S))};
}
function parseBackup(text){
  let d;
  try{d=JSON.parse(text);}catch(e){throw new Error('Arquivo inválido (não é um JSON).');}
  if(!d||d.formato!=='treinos-backup'||!_isObj(d.dados))throw new Error('Este arquivo não é uma cópia de segurança do app de treinos.');
  return d;
}
function backupSummary(dados){
  const n=k=>Array.isArray(dados[k])?dados[k].length:0;
  return `${n('history')} sessão(ões) de musculação · ${n('runs')} corrida(s) · ${n('mobility')} mobilidade · `+
    `${n('other')} treino(s) diferente(s) · ${n('plans')} plano(s) · ${n('workouts')} treino(s) salvo(s)`;
}
function daysSinceBackup(){
  const t=S&&S.backupAt; if(!t)return Infinity;
  return Math.floor((Date.now()-t)/86400000);
}
