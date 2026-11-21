(function(){
'use strict';
const LVL = window.LEVEL;
if(!LVL){document.body.innerHTML='<p style="color:#fff;padding:20px">Missing window.LEVEL — open a level HTML file, not game.js directly.</p>';return;}

document.body.insertAdjacentHTML('beforeend',`
<div id="hud">
  <div class="hb"><div id="wn"></div><div id="qc"></div></div>
  <div class="hc"><div id="tb"><div id="tf"></div></div><div id="tl">TIME</div></div>
  <div class="hr"><div id="sc">0</div><div id="cb"></div><div id="lv"></div></div>
</div>
<div id="q"></div><div id="fb"></div><div id="ov"></div>`);

const CV=document.getElementById('c'), CT=CV.getContext('2d');
const E={
  wn:document.getElementById('wn'), qc:document.getElementById('qc'),
  sc:document.getElementById('sc'), cb:document.getElementById('cb'),
  lv:document.getElementById('lv'), tf:document.getElementById('tf'),
  qb:document.getElementById('q'), fb:document.getElementById('fb'),
  ov:document.getElementById('ov')
};

const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const SH=a=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=RI(0,i);[x[i],x[j]]=[x[j],x[i]]}return x};
const ESC=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CL=(v,a,b)=>Math.max(a,Math.min(b,v));

let AC=null;
function B(f,d,t,v){
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),g=AC.createGain();
    o.type=t||'sine';o.frequency.value=f;
    g.gain.setValueAtTime(v||0.05,AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+d);
    o.connect(g);g.connect(AC.destination);
    o.start();o.stop(AC.currentTime+d+0.02);
  }catch(e){}
}

let W=0,H=0,DPR=1;
function RS(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth;H=window.innerHeight;
  CV.width=Math.floor(W*DPR);CV.height=Math.floor(H*DPR);
  CV.style.width=W+'px';CV.style.height=H+'px';
  CT.setTransform(DPR,0,0,DPR,0,0);
  relayout();
}
function relayout(){
  const n=G.targets.length; if(!n) return;
  const slotW=W/n;
  const r=Math.max(44,Math.min(80,slotW*0.42,H*0.15));
  G.targets.forEach((t,i)=>{
    t.ax=slotW*(i+0.5);
    t.r=r;
    t.ay=CL(t.ay, Math.max(180,H*0.24), Math.max(240,H*0.68));
  });
}
window.addEventListener('resize',RS);

const QUESTIONS_PER_RUN = 10;

const G={
  phase:'menu', pool:[], qi:0,
  lives:5, maxLives:5,
  score:0, combo:0, best:0, correct:0, answered:0,
  timeLeft:0, timeMax:22, phaseTimer:0,
  targets:[], bullets:[], parts:[],
  aim:{x:0,y:0}, turret:{x:0,y:0,ang:-Math.PI/2}, muzzle:{x:0,y:0},
  cd:0, shake:0, t:0
};

function startGame(){
  E.ov.classList.remove('show');
  G.score=0; G.lives=G.maxLives; G.combo=0; G.best=0;
  G.correct=0; G.answered=0;
  G.pool = SH(LVL.questions).slice(0, Math.min(QUESTIONS_PER_RUN, LVL.questions.length));
  G.qi = 0;
  G.phase='intro';
  G.phaseTimer=2.2;
  G.targets=[]; G.bullets=[]; G.parts=[];
  hideFB();
  E.qb.classList.remove('on');
  updateHUD();
}

function loadQ(){
  const q=G.pool[G.qi];
  if(!q){ endGame(true); return; }
  G.phase='question'; G.timeLeft=G.timeMax;
  G.bullets=[]; G.parts=[]; G.targets=[]; G.cd=0;
  hideFB();

  const opts=SH([{text:q.a,correct:true}].concat(q.d.map(t=>({text:t,correct:false}))));
  const n=opts.length, slotW=W/n;
  const r=Math.max(44,Math.min(80,slotW*0.42,H*0.15));
  const hues=[190,320,45,150];
  for(let i=0;i<n;i++){
    const ay=R(Math.max(190,H*0.26),Math.max(250,H*0.68));
    G.targets.push({
      ax:slotW*(i+0.5), ay, x:slotW*(i+0.5), y:ay, r,
      text:opts[i].text, correct:opts[i].correct,
      ph:R(0,6.283), sp:R(0.55,1.0), amp:R(7,20),
      scale:0, reveal:null, hue:hues[i%4]
    });
  }
  E.qb.textContent=q.q;
  E.qb.classList.add('on');
  updateHUD();
}

function resolve(hit, correct, reason){
  if(G.phase!=='question') return;
  G.phase='reveal'; G.phaseTimer=4.0; G.answered++;
  const q=G.pool[G.qi];
  G.targets.forEach(t=>{ if(t.correct) t.reveal='good'; });
  if(correct){
    G.correct++; G.combo++;
    if(G.combo>G.best) G.best=G.combo;
    const tb=Math.round(G.timeLeft*8);
    const gained=100+tb+(G.combo-1)*25;
    G.score+=gained;
    for(let i=0;i<26;i++) puff(hit?hit.x:W/2, hit?hit.y:H/2, 150);
    B(880,0.10,'sine',0.06);
    setTimeout(()=>B(1320,0.13,'sine',0.045),85);
    showFB(true,q,gained);
  } else {
    G.combo=0; G.lives--;
    if(hit) hit.reveal='bad';
    for(let i=0;i<20;i++) puff(hit?hit.x:W/2, hit?hit.y:H/2, 355);
    B(160,0.28,'sawtooth',0.05);
    showFB(false,q,0,reason);
  }
  G.shake=Math.min(G.shake+5,10);
  updateHUD();
}

function nextStep(){
  if(G.lives<=0){ endGame(false); return; }
  if(G.qi+1>=G.pool.length){ endGame(true); return; }
  G.qi++; loadQ();
}

function endGame(victory){
  G.phase=victory?'victory':'over';
  G.targets=[];G.bullets=[];G.parts=[];
  hideFB(); E.qb.classList.remove('on');
  const acc=G.answered?Math.round(G.correct/G.answered*100):0;
  const title=victory?'🏆 LEVEL COMPLETE!':'💀 GAME OVER';
  const cls=victory?'good':'bad';

  let navBtns='';
  if(victory){
    if(LVL.prev) navBtns += `<a class="btn" href="${LVL.prev}">← PREV LEVEL</a>`;
    if(LVL.next) navBtns += `<a class="btn primary" href="${LVL.next}">NEXT LEVEL →</a>`;
    else navBtns += `<button class="btn primary" id="again">▶ PLAY AGAIN</button>`;
  } else {
    navBtns += `<button class="btn primary" id="again">↻ RETRY LEVEL</button>`;
    if(LVL.next) navBtns += `<a class="btn" href="${LVL.next}">SKIP TO NEXT →</a>`;
  }

  E.ov.innerHTML=`
    <div class="pnl">
      <h1 class="bt ${cls}">${title}</h1>
      <p class="sub" style="text-align:center">Level ${LVL.num} · ${ESC(LVL.title)}</p>
      <div class="stats">
        <div class="stat"><b>${G.score.toLocaleString()}</b><span>SCORE</span></div>
        <div class="stat"><b>${G.correct}/${G.answered}</b><span>CORRECT</span></div>
        <div class="stat"><b>${acc}%</b><span>ACCURACY</span></div>
        <div class="stat"><b>${G.best}×</b><span>BEST COMBO</span></div>
      </div>
      <div class="btns">
        ${navBtns}
        <button class="btn" id="menu">🏠 MENU</button>
        <button class="btn" id="notes">📖 STUDY NOTES</button>
      </div>
    </div>`;
  E.ov.classList.add('show');
  const ag=document.getElementById('again'); if(ag) ag.onclick=startGame;
  document.getElementById('menu').onclick=showMenu;
  document.getElementById('notes').onclick=showStudy;
  if(victory){B(660,0.15,'sine',0.07);setTimeout(()=>B(880,0.15,'sine',0.07),150);setTimeout(()=>B(1320,0.3,'sine',0.07),300);}
  else B(120,0.5,'sawtooth',0.06);
}

function showFB(ok,q,gained,reason){
  E.fb.className=(ok?'ok':'bad')+' show';
  E.fb.innerHTML=`
    <div class="fh">${ok?'✔ CORRECT!  +'+gained:(reason==='timeout'?'⏱ TIME OUT!':'✘ WRONG!')}</div>
    <div class="fa"><b>Answer:</b> ${ESC(q.a)}</div>
    <div class="fe">${ESC(q.e)}</div>`;
}
function hideFB(){ E.fb.className=''; E.fb.innerHTML=''; }

function updateHUD(){
  if(G.phase==='menu') return;
  E.wn.textContent='LEVEL '+LVL.num+' · '+LVL.title;
  E.qc.textContent='Q '+Math.min(G.qi+1,G.pool.length||1)+'/'+(G.pool.length||QUESTIONS_PER_RUN);
  E.sc.textContent=G.score.toLocaleString();
  E.cb.textContent=G.combo>1?('COMBO ×'+G.combo):'';
  let h=''; for(let i=0;i<G.maxLives;i++) h+= i<G.lives?'❤':'♡';
  E.lv.textContent=h;
}

function fire(){
  if(G.phase!=='question'||G.cd>0) return;
  let dx=G.aim.x-G.muzzle.x, dy=G.aim.y-G.muzzle.y;
  const d=Math.hypot(dx,dy)||1; dx/=d; dy/=d;
  G.bullets.push({x:G.muzzle.x+dx*26,y:G.muzzle.y+dy*26,vx:dx*1350,vy:dy*1350,r:6,life:2.2});
  G.cd=0.13;
  G.shake=Math.min(G.shake+1.6,7);
  B(560,0.05,'square',0.028);
}
function puff(x,y,hue){
  const a=R(0,6.283), s=R(60,340);
  G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:R(0.35,0.8),max:0.8,hue:hue+R(-25,25),size:R(1.5,4.5)});
}

function update(dt){
  G.t+=dt;
  if(G.shake>0) G.shake=Math.max(0,G.shake-dt*22);
  if(G.cd>0) G.cd-=dt;
  G.turret.x=W/2; G.turret.y=H-8;
  G.turret.ang=Math.atan2(G.aim.y-G.turret.y,G.aim.x-G.turret.x);
  G.muzzle.x=G.turret.x+Math.cos(G.turret.ang)*46;
  G.muzzle.y=G.turret.y+Math.sin(G.turret.ang)*46;

  if(G.phase==='intro'){
    G.phaseTimer-=dt;
    if(G.phaseTimer<=0) loadQ();
  } else if(G.phase==='question'){
    G.timeLeft-=dt;
    const pct=Math.max(0,G.timeLeft/G.timeMax);
    E.tf.style.width=(pct*100)+'%';
    E.tf.style.background = pct>0.5?'linear-gradient(90deg,#3cff8c,#38e8ff)'
                          : pct>0.25?'linear-gradient(90deg,#ffc24d,#ff8a3c)'
                          :'linear-gradient(90deg,#ff4a5e,#ff2d55)';
    if(G.timeLeft<=0){ G.timeLeft=0; resolve(null,false,'timeout'); }
  } else if(G.phase==='reveal'){
    G.phaseTimer-=dt;
    if(G.phaseTimer<=0) nextStep();
  }

  G.targets.forEach(t=>{
    if(t.scale<1) t.scale=Math.min(1,t.scale+dt*4.5);
    t.x=t.ax+Math.sin(G.t*t.sp+t.ph)*t.amp;
    t.y=t.ay+Math.cos(G.t*t.sp*0.82+t.ph)*t.amp*0.55;
  });

  for(let i=G.bullets.length-1;i>=0;i--){
    const b=G.bullets[i];
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    let rm=false;
    if(G.phase==='question'){
      for(const t of G.targets){
        if(t.reveal) continue;
        if(Math.hypot(b.x-t.x,b.y-t.y)<t.r*t.scale+b.r){ resolve(t,t.correct); rm=true; break; }
      }
    }
    if(rm||b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60) G.bullets.splice(i,1);
  }
  for(let i=G.parts.length-1;i>=0;i--){
    const p=G.parts[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vx*=0.97; p.vy=p.vy*0.97+150*dt;
    p.life-=dt;
    if(p.life<=0) G.parts.splice(i,1);
  }
}

function wrap(text,maxW){
  const words=text.split(' '), lines=[]; let cur='';
  for(const w of words){
    const t=cur?cur+' '+w:w;
    if(CT.measureText(t).width<=maxW||!cur) cur=t;
    else{ lines.push(cur); cur=w; }
  }
  if(cur) lines.push(cur);
  return lines;
}
function rr(x,y,w,h,r){
  CT.beginPath();
  CT.moveTo(x+r,y);
  CT.arcTo(x+w,y,x+w,y+h,r);
  CT.arcTo(x+w,y+h,x,y+h,r);
  CT.arcTo(x,y+h,x,y,r);
  CT.arcTo(x,y,x+w,y,r);
  CT.closePath();
}

function drawTarget(t){
  const r=t.r*t.scale; if(r<1) return;
  let rc = t.reveal==='good'?'#3cff8c' : t.reveal==='bad'?'#ff4a5e' : 'hsla('+t.hue+',95%,66%,0.95)';
  CT.save(); CT.translate(t.x,t.y);
  CT.shadowColor = t.reveal==='good'?'rgba(60,255,140,.95)' : t.reveal==='bad'?'rgba(255,74,94,.95)' : 'hsla('+t.hue+',95%,60%,.55)';
  CT.shadowBlur = t.reveal?42:24;
  const g=CT.createRadialGradient(-r*0.32,-r*0.36,r*0.08,0,0,r);
  g.addColorStop(0,'rgba(255,255,255,0.22)');
  g.addColorStop(0.5,'hsla('+t.hue+',68%,24%,0.94)');
  g.addColorStop(1,'hsla('+t.hue+',80%,10%,0.97)');
  CT.fillStyle=g;
  CT.beginPath(); CT.arc(0,0,r,0,6.2832); CT.fill();
  CT.shadowBlur=0;
  CT.lineWidth=t.reveal?4.5:2.5;
  CT.strokeStyle=rc;
  CT.beginPath(); CT.arc(0,0,r-1.5,0,6.2832); CT.stroke();
  CT.setLineDash([4,7]); CT.lineWidth=1;
  CT.strokeStyle=t.reveal?'rgba(255,255,255,.45)':'hsla('+t.hue+',90%,70%,.32)';
  CT.beginPath(); CT.arc(0,0,r*0.9,0,6.2832); CT.stroke();
  CT.setLineDash([]);

  const maxW=r*1.55;
  let size=Math.min(18,r*0.30), lines=[];
  for(;;){
    CT.font='700 '+size+'px ui-sans-serif,system-ui,sans-serif';
    lines=wrap(t.text,maxW);
    if(lines.length*size*1.22<=r*1.62||size<=9) break;
    size-=1;
  }
  const lh=size*1.22;
  let y=-((lines.length-1)*lh)/2;
  CT.textAlign='center'; CT.textBaseline='middle';
  CT.fillStyle='#f2fbff';
  CT.shadowColor='rgba(0,0,0,.85)'; CT.shadowBlur=6;
  for(const ln of lines){ CT.fillText(ln,0,y); y+=lh; }
  CT.shadowBlur=0;
  CT.restore();
}

function drawTurret(){
  const t=G.turret;
  CT.save(); CT.translate(t.x,t.y);
  CT.save(); CT.rotate(t.ang);
  const bg=CT.createLinearGradient(0,-9,0,9);
  bg.addColorStop(0,'#9df6ff'); bg.addColorStop(0.5,'#38e8ff'); bg.addColorStop(1,'#0f4a63');
  CT.fillStyle=bg;
  CT.shadowColor='rgba(56,232,255,.8)'; CT.shadowBlur=16;
  rr(4,-9,52,18,9); CT.fill();
  CT.shadowBlur=0;
  CT.restore();
  const g2=CT.createRadialGradient(0,-20,4,0,0,32);
  g2.addColorStop(0,'#a8f8ff'); g2.addColorStop(0.6,'#1d6f92'); g2.addColorStop(1,'#08202e');
  CT.fillStyle=g2;
  CT.beginPath(); CT.arc(0,0,27,Math.PI,0); CT.closePath(); CT.fill();
  CT.strokeStyle='rgba(56,232,255,.85)'; CT.lineWidth=2; CT.stroke();
  CT.restore();
}

function drawCross(){
  if(G.phase!=='question') return;
  const x=G.aim.x,y=G.aim.y;
  CT.save();
  CT.strokeStyle='rgba(56,232,255,.85)'; CT.lineWidth=1.6;
  CT.shadowColor='rgba(56,232,255,.9)'; CT.shadowBlur=10;
  CT.beginPath(); CT.arc(x,y,13,0,6.2832); CT.stroke();
  CT.beginPath();
  CT.moveTo(x-20,y);CT.lineTo(x-6,y);
  CT.moveTo(x+6,y);CT.lineTo(x+20,y);
  CT.moveTo(x,y-20);CT.lineTo(x,y-6);
  CT.moveTo(x,y+6);CT.lineTo(x,y+20);
  CT.stroke();
  CT.fillStyle='rgba(56,232,255,.9)';
  CT.beginPath(); CT.arc(x,y,1.8,0,6.2832); CT.fill();
  CT.restore();
}

function drawIntro(){
  CT.save();
  CT.fillStyle='rgba(5,10,20,.80)'; CT.fillRect(0,0,W,H);
  CT.textAlign='center'; CT.textBaseline='middle';
  const f1=Math.min(58,Math.max(26,W*0.055));
  const f2=Math.min(36,Math.max(19,W*0.035));
  const f3=Math.min(17,Math.max(12,W*0.018));
  CT.fillStyle='#38e8ff'; CT.shadowColor='rgba(56,232,255,.9)'; CT.shadowBlur=30;
  CT.font='900 '+f1+'px ui-sans-serif,system-ui,sans-serif';
  CT.fillText('LEVEL '+LVL.num,W/2,H/2-70);
  CT.shadowBlur=0;
  CT.fillStyle='#fff'; CT.font='800 '+f2+'px ui-sans-serif,system-ui,sans-serif';
  CT.fillText(LVL.title,W/2,H/2);
  CT.fillStyle='rgba(255,255,255,.55)'; CT.font='600 '+f3+'px ui-sans-serif,system-ui,sans-serif';
  CT.fillText('Get ready…',W/2,H/2+52);
  CT.restore();
}

function render(){
  const bg=CT.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a1424'); bg.addColorStop(0.55,'#070d19'); bg.addColorStop(1,'#03060d');
  CT.fillStyle=bg; CT.fillRect(0,0,W,H);
  CT.strokeStyle='rgba(56,232,255,0.045)'; CT.lineWidth=1;
  CT.beginPath();
  const gs=64;
  for(let x=0;x<W;x+=gs){CT.moveTo(x,0);CT.lineTo(x,H)}
  for(let y=0;y<H;y+=gs){CT.moveTo(0,y);CT.lineTo(W,y)}
  CT.stroke();
  const gl=CT.createRadialGradient(W/2,H+40,10,W/2,H+40,Math.max(W,H)*0.65);
  gl.addColorStop(0,'rgba(56,232,255,.10)');
  gl.addColorStop(1,'rgba(56,232,255,0)');
  CT.fillStyle=gl; CT.fillRect(0,H*0.5,W,H*0.5);

  CT.save();
  if(G.shake>0.2) CT.translate(R(-G.shake,G.shake),R(-G.shake,G.shake));
  G.targets.forEach(drawTarget);
  G.bullets.forEach(b=>{
    CT.save();
    CT.shadowColor='rgba(120,255,255,.95)'; CT.shadowBlur=18;
    const bgd=CT.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r*2.4);
    bgd.addColorStop(0,'#fff'); bgd.addColorStop(0.45,'#7ff3ff'); bgd.addColorStop(1,'rgba(56,232,255,0)');
    CT.fillStyle=bgd;
    CT.beginPath(); CT.arc(b.x,b.y,b.r*2.4,0,6.2832); CT.fill();
    CT.restore();
  });
  G.parts.forEach(p=>{
    const a=Math.max(0,p.life/p.max);
    CT.save(); CT.globalAlpha=a;
    CT.shadowColor='hsla('+p.hue+',100%,65%,.95)'; CT.shadowBlur=14;
    CT.fillStyle='hsla('+p.hue+',100%,72%,1)';
    CT.beginPath(); CT.arc(p.x,p.y,p.size*a,0,6.2832); CT.fill();
    CT.restore();
  });
  CT.restore();

  if(G.phase==='question'||G.phase==='intro'||G.phase==='reveal') drawTurret();
  drawCross();
  if(G.phase==='intro') drawIntro();
}

let lastT=performance.now();
function loop(now){
  const dt=Math.min((now-lastT)/1000,0.05);
  lastT=now;
  if(G.phase!=='menu'&&G.phase!=='over'&&G.phase!=='victory') update(dt);
  else if(G.shake>0) G.shake=Math.max(0,G.shake-dt*22);
  render();
  requestAnimationFrame(loop);
}

function pos(e){
  const r=CV.getBoundingClientRect();
  return {x:e.clientX-r.left,y:e.clientY-r.top};
}
CV.addEventListener('pointermove',e=>{const p=pos(e);G.aim.x=p.x;G.aim.y=p.y});
CV.addEventListener('pointerdown',e=>{
  const p=pos(e);G.aim.x=p.x;G.aim.y=p.y;
  if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(err){}}
  if(G.phase==='question') fire();
  else if(G.phase==='reveal'&&G.phaseTimer<=3.0) nextStep();
});
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&G.phase==='question'){e.preventDefault();fire()}
  if(e.code==='Enter'&&G.phase==='reveal'&&G.phaseTimer<=3.0) nextStep();
});
window.addEventListener('contextmenu',e=>e.preventDefault());

function showMenu(){
  G.phase='menu';
  G.targets=[];G.bullets=[];G.parts=[];
  hideFB(); E.qb.classList.remove('on');
  const qCount=Math.min(QUESTIONS_PER_RUN,LVL.questions.length);
  let nav='';
  if(LVL.prev) nav+=`<a class="btn" href="${LVL.prev}">← PREV LEVEL</a>`;
  if(LVL.next) nav+=`<a class="btn" href="${LVL.next}">NEXT LEVEL →</a>`;
  E.ov.innerHTML=`
    <div class="pnl menu">
      <h1>DERMA<span>BLASTER</span></h1>
      <p class="sub">Level ${LVL.num} · ${ESC(LVL.title)}</p>
      <p class="desc">
        Read the question at the top, aim with your mouse and <b>shoot the bubble with the correct answer</b>
        before the timer runs out. Each hit teaches you the fact behind it.<br><br>
        <b>${qCount} questions</b> drawn from this level's bank (${LVL.questions.length} total).
      </p>
      <div class="btns">
        <button class="btn primary" id="start">▶ START LEVEL</button>
        <button class="btn" id="study">📖 STUDY NOTES</button>
      </div>
      <div class="btns" style="margin-top:14px">${nav}</div>
    </div>`;
  E.ov.classList.add('show');
  document.getElementById('start').onclick=startGame;
  document.getElementById('study').onclick=showStudy;
}

function showStudy(){
  let html='<div class="pnl study"><h2>📖 Level '+LVL.num+' — '+ESC(LVL.title)+'</h2>'+
           '<p class="hint">Every fact used in this level. Read it, then go shoot it.</p>';
  LVL.questions.forEach(q=>{
    html+='<div class="si">'+
          '<div class="sq">'+ESC(q.q)+'</div>'+
          '<div class="sa">→ '+ESC(q.a)+'</div>'+
          '<div class="se">'+ESC(q.e)+'</div>'+
          '</div>';
  });
  let nav='';
  if(LVL.prev) nav+=`<a class="btn" href="${LVL.prev}">← PREV LEVEL</a>`;
  if(LVL.next) nav+=`<a class="btn" href="${LVL.next}">NEXT LEVEL →</a>`;
  html+='<div class="btns" style="margin-top:22px">'+
        '<button class="btn" id="back">← BACK</button>'+
        '<button class="btn primary" id="go">▶ START LEVEL</button>'+
        '</div><div class="btns" style="margin-top:12px">'+nav+'</div></div>';
  E.ov.innerHTML=html;
  E.ov.classList.add('show');
  document.getElementById('back').onclick=showMenu;
  document.getElementById('go').onclick=startGame;
}

RS();
G.aim.x=W/2; G.aim.y=H*0.45;
showMenu();
requestAnimationFrame(loop);

})();
