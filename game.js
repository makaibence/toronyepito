'use strict';
(() => {
const canvas=document.getElementById('scene'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const W=420,H=800,FW=132,FH=48,GROUND=690;
let width=0,height=0,scale=1,ox=0,oy=0,dpr=1;
let state='ready',floors=[],active=null,debris=[],score=0,lives=3,best=0,risk=0,lean=0,angle=0,angularVelocity=0,damage=0,camera=0,clock=0,last=0,spawnDelay=0,toastTime=0,collapseTime=0,landingPulse=0;
try{best=Number(localStorage.getItem('toronyvaros-best'))||0;}catch(_){} $('best').textContent=best;
function resize(){width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);scale=Math.min(width/W,height/H);ox=(width-W*scale)/2;oy=height-H*scale;}
window.addEventListener('resize',resize);resize();
function notify(text,duration=1.4){$('toast').textContent=text;toastTime=duration;$('toast').style.opacity=1;}
function updateHUD(){ $('score').textContent=score;$('district').textContent=facadeFor(score+1).theme.name+' · '+(25-score%25)+' a váltásig';$('best').textContent=best;$('lives').textContent=Array.from({length:3},(_,i)=>i<lives?'●':'○').join(' ');$('lives').setAttribute('aria-label',lives+' élet');$('risk').style.width=Math.min(100,risk*100)+'%';$('risk').style.background=risk>.75?'#ff987f':risk>.4?'#f5cb8e':'#9ce1cd';$('status').textContent=risk>.8?'Billeg! Ellensúlyozz!':risk>.4?'Óvatosan, félrebillen': 'Stabil alapok';}
function spawn(){const top=floors[floors.length-1];active={x:70,y:top.y-150,vy:0,dir:score%2?-1:1,mode:'move',age:0,style:score+1};if(active.dir<0)active.x=W-70;}
// Difficulty grows smoothly; falling floors never receive horizontal drift.
function movementSpeed(level,age){const base=115+Math.min(level*5,190);const variation=level<8?0:Math.min(.22,(level-7)*.012);return base*(1+variation*Math.sin(age*2.2+level*.83));}
function reset(){floors=[{x:W/2,y:GROUND,style:0}];score=0;lives=3;risk=lean=angle=angularVelocity=damage=camera=collapseTime=0;debris=[];spawnDelay=0;state='playing';$('overlay').classList.add('hidden');$('hint').textContent='Érintésre leesik · Szóközzel is játszhatsz';spawn();updateHUD();}
function drop(){if(state==='playing'&&active&&active.mode==='move'){active.mode='fall';active.vy=0;$('hint').textContent='Az ellenkező oldalra építve visszaegyensúlyozhatod';}}
$('start').addEventListener('click',e=>{e.stopPropagation();reset();});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();drop();});
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(state==='playing')drop();else reset();}});
document.addEventListener('visibilitychange',()=>{last=0;});
// Each joint supports every floor above it. Their equal-mass centroid must lie
// inside the actual contact interval. No invisible support beyond the edge.
function stability(stack){let worst=0,direction=0;let sum=0;for(let j=stack.length-1;j>0;j--){sum+=stack[j].x;const count=stack.length-j,com=sum/count,a=stack[j-1],b=stack[j],left=Math.max(a.x-FW/2,b.x-FW/2),right=Math.min(a.x+FW/2,b.x+FW/2),mid=(left+right)/2,half=Math.max(1,(right-left)/2);const ratio=Math.abs(com-mid)/half;const local=Math.max(0,(ratio-.20)/.80);if(local>worst){worst=local;direction=Math.sign(com-mid);}}return {risk:worst,direction};}
function land(){const top=floors[floors.length-1],overlap=FW-Math.abs(active.x-top.x);if(overlap<=FW*.5){active.mode='miss';const side=Math.sign(active.x-top.x)||1;active.spin=side*1.6;active.rot=0;active.vx=side*(overlap>0?65:25);active.vy=overlap>0?80:active.vy;if(overlap>0)notify('Túl kevés alátámasztás!');return;}floors.push({x:active.x,y:top.y-FH,style:active.style});score++;landingPulse=1;if(score>best){best=score;try{localStorage.setItem('toronyvaros-best',String(best));}catch(_){}}const oldRisk=risk;const s=stability(floors);risk=s.risk;lean=s.direction;if(score>0&&score%25===0)notify('Új stílus: '+facadeFor(score+1).theme.name,2.3);else if(score===10)notify('10 emelet · Gyorsul a város',2);else if(score===20)notify('20 emelet · Tartsd a ritmust!',2);else if(score===40)notify('40 emelet · Az ég a határ',2);else if(Math.abs(active.x-top.x)<7)notify('Pontos illesztés!',.9);else if(risk<oldRisk-.12)notify('Vissza az egyensúlyba');else if(risk>.8)notify('Ellensúlyozz a másik oldalon!');active=null;spawnDelay=.22;updateHUD();}
function collapse(){state='collapse';collapseTime=0;active=null;debris=floors.slice(1).map((f,i)=>({...f,vx:lean*(28+i*5)+(Math.random()-.5)*45,vy:-30-i*2,rot:angle,spin:lean*(.3+Math.random()*.8)}));notify('A torony elvesztette az egyensúlyát');}
function finish(reason){state='over';$('overlay').classList.remove('hidden');document.querySelector('.eyebrow').textContent=reason;document.querySelector('h1').innerHTML=score+' emelet.<br>Szép kilátás.';document.querySelector('.panel p').innerHTML='Rekordod: '+best+' emelet<br>Építs egy még magasabb várost!';$('start').innerHTML='Új torony <span>↻</span>';}
function tick(dt){clock+=dt;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0;}landingPulse=Math.max(0,landingPulse-dt*4);if(state==='playing'){
const desired=Math.max(0,(floors.length-1)*FH-275);camera+=(desired-camera)*Math.min(1,dt*4);
const target=lean*Math.min(risk,1.6)*.009;angularVelocity+=((target-angle)*24-angularVelocity*10)*dt;angle+=angularVelocity*dt;
if(risk>1)damage+=dt*(risk-1)*.65;else damage=Math.max(0,damage-dt*.45);if(damage>1){collapse();return;}
if(!active){spawnDelay-=dt;if(spawnDelay<=0)spawn();}
if(active){if(active.mode==='move'){active.age+=dt;active.x+=active.dir*movementSpeed(score,active.age)*dt;if(active.x>W-50){active.x=W-50;active.dir=-1;}if(active.x<50){active.x=50;active.dir=1;}}
else {active.vy+=1600*dt;active.y+=active.vy*dt;if(active.mode==='miss'){active.x+=active.vx*dt;active.rot+=active.spin*dt;}if(active.mode==='fall'&&active.y>=floors[floors.length-1].y-FH){active.y=floors[floors.length-1].y-FH;land();}else if(active&&active.mode==='miss'&&active.y+camera>H+100){active=null;lives--;notify(lives?'Mellé ment. Még '+lives+' életed van.':'Elfogyott a három élet');updateHUD();if(!lives)finish('EZ MOST MELLÉMENT');else spawnDelay=.4;}}}
}else if(state==='collapse'){collapseTime+=dt;for(const f of debris){f.vy+=750*dt;f.y+=f.vy*dt;f.x+=f.vx*dt;f.rot+=f.spin*dt;}if(collapseTime>2.3)finish('AZ EGYENSÚLY DÖNTÖTT');}}
const clamp01=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const skyStops=[
[0,['#304f73','#a58eab','#f3c6a0']],
[12,['#3d4779','#c7829b','#ffc88f']],
[26,['#313c72','#8b7bac','#e6afbd']],
[44,['#111c43','#344677','#8f7caa']],
[66,['#050c23','#142345','#3c5875']],
[95,['#100b29','#242146','#3a365c']]
];
function atmosphere(altitude){if(altitude>95){const r=cosmicRegion(altitude);const rgb=h=>h.slice(1).match(/../g).map(c=>parseInt(c,16));return {colors:r.palette.map((c,k)=>{const a=rgb(c),b=rgb(r.next[k]);return `rgb(${a.map((n,j)=>Math.round(n+(b[j]-n)*r.blend)).join(',')})`;}),city:0,stars:1,space:1};}let i=0;while(i<skyStops.length-2&&altitude>skyStops[i+1][0])i++;const a=skyStops[i],b=skyStops[i+1],t=smooth(a[0],b[0],altitude);const mix=(x,y)=>{const rgb=h=>h.slice(1).match(/../g).map(c=>parseInt(c,16));const u=rgb(x),v=rgb(y);return `rgb(${u.map((n,k)=>Math.round(n+(v[k]-n)*t)).join(',')})`;};return {colors:a[1].map((c,k)=>mix(c,b[1][k])),city:1-smooth(9,21,altitude),stars:smooth(28,50,altitude),space:smooth(57,78,altitude)};}
// Reusable shaded cloud sprites: all gradients are rasterized once, not per frame.
const cloudSprites=['warm','violet','night'].map((tone,index)=>{
const sprite=document.createElement('canvas');sprite.width=300;sprite.height=150;const c=sprite.getContext('2d');
const shades=[['255,239,220','187,148,164'],['239,228,248','119,125,164'],['159,178,212','65,85,126']][index];
const puffs=[[61,90,37],[103,70,43],[151,56,48],[195,76,41],[238,94,31],[146,100,48]];
c.beginPath();for(const [x,y,r] of puffs){c.moveTo(x+r*1.2,y);c.ellipse(x,y,r*1.2,r*.86,0,0,Math.PI*2);}const body=c.createLinearGradient(0,10,0,145);body.addColorStop(0,`rgba(${shades[0]},.98)`);body.addColorStop(.45,`rgba(${shades[0]},.94)`);body.addColorStop(1,`rgba(${shades[1]},.8)`);c.fillStyle=body;c.fill();c.save();c.clip();
for(const [x,y,r] of puffs){const g=c.createRadialGradient(x-r*.2,y-r*.35,0,x,y,r);g.addColorStop(0,'rgba(255,249,239,.24)');g.addColorStop(1,'rgba(255,249,239,0)');c.fillStyle=g;c.fillRect(x-r*1.2,y-r,r*2.4,r*2);}
const shade=c.createLinearGradient(0,75,0,145);shade.addColorStop(0,`rgba(${shades[1]},0)`);shade.addColorStop(1,`rgba(${shades[1]},.34)`);c.fillStyle=shade;c.fillRect(0,75,300,75);c.restore();return sprite;
});
const stars=Array.from({length:115},(_,i)=>({x:((Math.sin(i*127.1+8)*43758.5453)%1+1)%1*W,y:((Math.sin(i*269.5+3)*18341.19)%1+1)%1*H,r:i%11===0?1.35:.45+(i%4)*.18}));
const cosmicPalettes=[['#100b29','#242146','#3a365c'],['#061a26','#123347','#244d5b'],['#200c24','#422240','#65415a'],['#0a102c','#202a54','#384c76'],['#1b1127','#3c2b48','#61506a'],['#071d25','#163d43','#2e5757']];
function cosmicRegion(altitude){const travel=Math.max(0,(altitude-95)/50),index=Math.floor(travel),blend=smooth(.58,1,travel-index);return {index,blend,progress:travel-index,palette:cosmicPalettes[index%cosmicPalettes.length],next:cosmicPalettes[(index+1)%cosmicPalettes.length]};}
const cosmicSprites=cosmicPalettes.map((palette,variant)=>{
const sprite=document.createElement('canvas');sprite.width=520;sprite.height=520;const c=sprite.getContext('2d');
for(let i=0;i<14;i++){const x=60+i*31,y=260+Math.sin(i*.38+variant)*95,r=80+(i%3)*24;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,palette[2]+'90');g.addColorStop(.4,palette[1]+'60');g.addColorStop(1,palette[1]+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}return sprite;
});
const planets=Array.from({length:4},(_,kind)=>{
const sprite=document.createElement('canvas');sprite.width=280;sprite.height=240;const c=sprite.getContext('2d'),x=140,y=120,r=kind===1?56:68;
if(kind===1){c.save();c.translate(x,y);c.rotate(-.35);c.strokeStyle='#e9ceb190';c.lineWidth=13;c.beginPath();c.ellipse(0,0,116,27,0,0,Math.PI*2);c.stroke();c.strokeStyle='#a6c3d060';c.lineWidth=4;c.beginPath();c.ellipse(0,0,103,23,0,0,Math.PI*2);c.stroke();c.restore();}
const colors=[['#a4d9e7','#386f9e','#11243c'],['#f1d7b6','#ae8e83','#28233e'],['#dcb5cf','#9c5d85','#23172e'],['#ade5cc','#437b80','#112d3c']][kind];
const g=c.createRadialGradient(x-25,y-28,2,x+10,y+8,r+12);g.addColorStop(0,colors[0]);g.addColorStop(.55,colors[1]);g.addColorStop(1,colors[2]);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.save();c.clip();
for(let i=0;i<7;i++){c.strokeStyle=i%2?'#fff0db16':'#101b3620';c.lineWidth=5+i%3*3;c.beginPath();c.ellipse(x,y-42+i*15,r+5,12, .15,0,Math.PI*2);c.stroke();}c.restore();
if(kind===1){c.save();c.translate(x,y);c.rotate(-.35);c.strokeStyle='#ead8bb99';c.lineWidth=9;c.beginPath();c.ellipse(0,0,116,27,0,0,Math.PI);c.stroke();c.restore();}return sprite;
});
const galaxySprite=(()=>{const sprite=document.createElement('canvas');sprite.width=440;sprite.height=300;const c=sprite.getContext('2d');const glow=c.createRadialGradient(220,150,0,220,150,130);glow.addColorStop(0,'#fff0d1c0');glow.addColorStop(.15,'#c6b5e970');glow.addColorStop(1,'#8b8bdb00');c.fillStyle=glow;c.fillRect(0,0,440,300);for(let arm=0;arm<3;arm++)for(let i=0;i<200;i++){const r=i*.83,t=i*.055+arm*Math.PI*2/3,x=220+Math.cos(t)*r,y=150+Math.sin(t)*r*.42;c.globalAlpha=.12+(1-i/200)*.5;c.fillStyle=i%4===0?'#ffddbc':'#b7c2f4';c.beginPath();c.arc(x,y,i%5===0?1.4:.7,0,7);c.fill();}return sprite;})();
function drawCosmos(altitude){
const reveal=smooth(96,118,altitude);if(!reveal)return;const region=cosmicRegion(altitude);
ctx.save();ctx.globalAlpha=reveal*(1-region.blend)*.8;ctx.drawImage(cosmicSprites[region.index%6],-60,60+Math.sin(altitude*.016)*55,540,540);
ctx.globalAlpha=reveal*region.blend*.8;ctx.drawImage(cosmicSprites[(region.index+1)%6],-60,60+Math.sin(altitude*.016)*55,540,540);
const visibility=smooth(0,.16,region.progress)*(1-smooth(.74,1,region.progress));
ctx.globalAlpha=reveal*visibility*.85;
if(region.index%3===2){ctx.save();ctx.translate(285,300+region.progress*150);ctx.rotate(-.4);ctx.drawImage(galaxySprite,-180,-120,360,245);ctx.restore();}
else{const size=region.index%2===0?210:245,x=region.index%2===0?235:-35,y=190+region.progress*240;ctx.drawImage(planets[region.index%4],x,y,size,size*240/280);}
ctx.restore();
}

function background(){
const altitude=camera/FH,sky=atmosphere(altitude);
const g=ctx.createLinearGradient(0,-100,0,H);g.addColorStop(0,sky.colors[0]);g.addColorStop(.62,sky.colors[1]);g.addColorStop(1,sky.colors[2]);ctx.fillStyle=g;ctx.fillRect(-2000,-2000,4500,4500);
// Sunset glow retreats with the city, rather than cycling back to daylight.
const sunAlpha=1-smooth(25,43,altitude),sunY=350+altitude*9;
if(sunAlpha>0){ctx.save();ctx.globalAlpha=sunAlpha;const halo=ctx.createRadialGradient(318,sunY,10,318,sunY,210);halo.addColorStop(0,'#ffd59a80');halo.addColorStop(.45,'#ffa98628');halo.addColorStop(1,'#ffa98600');ctx.fillStyle=halo;ctx.fillRect(80,sunY-220,480,440);ctx.fillStyle='#ffe3b6';ctx.beginPath();ctx.arc(318,sunY,34,0,Math.PI*2);ctx.fill();ctx.restore();}
if(sky.stars>0){ctx.save();for(let i=0;i<stars.length;i++){const s=stars[i],y=((s.y+altitude*(i%3+1)*1.4)%H);ctx.globalAlpha=sky.stars*(.5+.25*Math.sin(clock*.65+i*1.7));ctx.fillStyle=i%5===0?'#b6d7ff':'#f2efff';ctx.beginPath();ctx.arc(s.x,y,s.r,0,Math.PI*2);ctx.fill();if(i%22===0){ctx.fillRect(s.x-3,y-.35,6,.7);ctx.fillRect(s.x-.35,y-3,.7,6);}}ctx.restore();
// Crescent moon stays in the sky as the clouds pass below it.
ctx.save();ctx.globalAlpha=sky.stars*(1-sky.space*.65)*(1-smooth(95,125,altitude));ctx.translate(315,235+altitude*.6);ctx.rotate(-.35);ctx.fillStyle='#e6eaff';ctx.beginPath();ctx.arc(0,0,23,-Math.PI/2,Math.PI/2);ctx.bezierCurveTo(24,15,24,-15,0,-23);ctx.fill();ctx.restore();}
drawCosmos(altitude);
if(sky.city>0){ctx.save();ctx.globalAlpha=sky.city;
for(let layer=0;layer<3;layer++){const baseline=GROUND+70+layer*20+camera*(.45+layer*.14);for(let i=-5;i<20;i++){const seed=Math.abs(Math.sin(i*74.3+layer*31)),bw=35+seed*35,bh=60+Math.abs(Math.cos(i*21.8+layer))*160,x=i*49+layer*16;if(baseline-bh>H+50)continue;ctx.fillStyle=['#64718b','#435b76','#293f59'][layer];ctx.fillRect(x,baseline-bh,bw,bh);ctx.fillStyle='#ffffff0d';ctx.fillRect(x,baseline-bh,3,bh);if(layer>0){for(let r=0;r<bh/17-1;r++)for(let c=0;c<3;c++){ctx.fillStyle=(r+c+i)%4===0?'#f6ce9490':'#b9cbd31b';ctx.fillRect(x+7+c*13,baseline-bh+12+r*17,4,7);}}}}
ctx.restore();}
// Finite cloud belts have world-space heights. They descend out of view once
// passed; no wrapping or reappearing city/cloud columns during ascent.
for(let belt=0;belt<6;belt++){const base=11+belt*11;for(let j=0;j<2;j++){const depth=j===1?.7:1,y=360+(altitude-base)*27*depth+j*95;if(y< -190||y>H+150)continue;const x=-90+j*190+Math.sin(clock*.025+belt*2+j)*25,sz=j===1?1.1:.8;const night=smooth(28,48,altitude),warm=1-smooth(15,29,altitude),cloudAlpha=(1-smooth(54,72,altitude))*(j===1?.3:.52);ctx.save();ctx.globalAlpha=cloudAlpha;const sprite=cloudSprites[night>.5?2:warm>.5?0:1];ctx.drawImage(sprite,x,y,300*sz,150*sz);ctx.restore();}}
if(sky.space>0){ctx.save();ctx.globalAlpha=sky.space*(1-smooth(115,165,altitude));const radius=1200-smooth(70,140,altitude)*650,cy=H+radius-80;const glow=ctx.createRadialGradient(W/2,cy,radius-15,W/2,cy,radius+45);glow.addColorStop(0,'#36799a00');glow.addColorStop(.38,'#72d6ed65');glow.addColorStop(.6,'#568deb1c');glow.addColorStop(1,'#568deb00');ctx.fillStyle=glow;ctx.fillRect(-500,H-150,1500,250);const earth=ctx.createLinearGradient(0,H-90,0,H+50);earth.addColorStop(0,'#557fa1');earth.addColorStop(.12,'#21486c');earth.addColorStop(1,'#0c1e3a');ctx.fillStyle=earth;ctx.beginPath();ctx.arc(W/2,cy,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b3e5ef90';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
ctx.fillStyle='#162e42';ctx.fillRect(-100,GROUND+FH+camera,620,400);ctx.fillStyle='#a7b0b5';ctx.fillRect(104,GROUND+FH+camera,212,7);
}

const houseThemes=[
{name:'Klasszikus bérház',wall:'#dcc9ab',trim:'#f7e7c9',glass:'#365366',accent:'#8d6958',kind:'classic'},
{name:'Téglás loft',wall:'#a76c56',trim:'#d9b38b',glass:'#283e4d',accent:'#303b40',kind:'brick'},
{name:'Mediterrán ház',wall:'#efcf9d',trim:'#fff0ce',glass:'#4c777d',accent:'#45847b',kind:'med'},
{name:'Art déco',wall:'#586678',trim:'#d6bd85',glass:'#24364c',accent:'#e8cd8f',kind:'deco'},
{name:'Üvegtorony',wall:'#739caf',trim:'#b9d8dc',glass:'#315c76',accent:'#d4e9e9',kind:'glass'},
{name:'Függőkert',wall:'#a6b9a1',trim:'#e7e4c8',glass:'#375e57',accent:'#426951',kind:'garden'},
{name:'Neonváros',wall:'#32344f',trim:'#697396',glass:'#1c2945',accent:'#ec8bc5',kind:'neon'},
{name:'Orbitális állomás',wall:'#c1cbd1',trim:'#eef4e7',glass:'#29465a',accent:'#73d4df',kind:'orbital'},
{name:'Rézpalota',wall:'#846359',trim:'#e2b286',glass:'#333d53',accent:'#93c7bc',kind:'deco'},
{name:'Kristályváros',wall:'#929abf',trim:'#e2dbef',glass:'#4a527f',accent:'#b8f0ef',kind:'glass'}
];
function facadeFor(level){const section=Math.floor(Math.max(0,level-1)/25),local=level===0?1:(level-1)%25+1;return {theme:houseThemes[section%houseThemes.length],tier:Math.floor((local-1)/5),local,section,next:(section+1)*25};}
function building(f,rotation=0){
if(f.y+camera< -150||f.y+camera>H+150)return;
const {theme:t,tier,local}=facadeFor(f.style),kind=t.kind,lit=(f.style%3)!==1;
ctx.save();ctx.translate(f.x,f.y+camera);ctx.rotate(rotation);
ctx.fillStyle='#0a152a40';ctx.fillRect(-61,4,FW,FH);ctx.fillStyle=t.wall;ctx.fillRect(-66,0,FW,FH);
const face=ctx.createLinearGradient(-66,0,66,FH);face.addColorStop(0,'#ffffff15');face.addColorStop(1,'#00000018');ctx.fillStyle=face;ctx.fillRect(-66,0,FW,FH);
if(kind==='brick'){ctx.save();ctx.beginPath();ctx.rect(-66,0,132,48);ctx.clip();ctx.strokeStyle='#edc5a02c';ctx.lineWidth=.7;for(let r=5;r<46;r+=7){ctx.beginPath();ctx.moveTo(-66,r);ctx.lineTo(66,r);ctx.stroke();for(let x=-66+(r%2)*8;x<66;x+=17)ctx.strokeRect(x,r,17,7);}ctx.restore();}
if(kind==='glass'||kind==='orbital'){ctx.fillStyle=t.glass;ctx.fillRect(-61,4,122,36);ctx.fillStyle='#d2f3ff22';ctx.beginPath();ctx.moveTo(-58,4);ctx.lineTo(-22,4);ctx.lineTo(-45,40);ctx.lineTo(-61,40);ctx.closePath();ctx.fill();}
if(kind==='deco'){ctx.fillStyle=t.trim;for(const x of [-62,-33,29,59])ctx.fillRect(x,3,2,39);if(tier>=1){ctx.beginPath();ctx.moveTo(-8,3);ctx.lineTo(0,11);ctx.lineTo(8,3);ctx.strokeStyle=t.accent;ctx.stroke();}}
ctx.fillStyle=t.trim;ctx.fillRect(-66,0,132,2);ctx.fillRect(-68,43,136,3);ctx.fillStyle='#00000027';ctx.fillRect(-66,46,132,2);
const count=kind==='brick'?3:4,ww=kind==='brick'?25:17,spacing=kind==='brick'?39:29,start=kind==='brick'?-51:-52;
for(let i=0;i<count;i++){
const x=start+i*spacing,door=tier>=2&&(i===1||i===2),wh=door?31:25,y=door?8:9;
ctx.fillStyle=tier>=1?t.trim:t.accent;ctx.fillRect(x-1.5,y-1.5,ww+3,wh+3);
ctx.fillStyle=lit&&(i+f.style)%3!==0?(kind==='neon'?'#d9a5dd':'#f9d496'):t.glass;ctx.fillRect(x,y,ww,wh);
ctx.fillStyle='#ffffff24';ctx.fillRect(x+2,y+1,3,wh-2);
ctx.fillStyle=t.trim;ctx.fillRect(x+ww/2-.6,y,1.2,wh);
if(tier>=1){ctx.fillRect(x,y+wh*.5,ww,1);ctx.fillRect(x-3,y+wh+1,ww+6,2);}
if(kind==='med'){ctx.fillStyle=t.accent;ctx.fillRect(x-5,y,3,wh);ctx.fillRect(x+ww+2,y,3,wh);}
if(door){const balconyWidth=tier>=3?ww+10:ww+5,bx=x-(balconyWidth-ww)/2;ctx.fillStyle=t.accent;ctx.fillRect(bx,37,balconyWidth,3);ctx.strokeStyle=kind==='glass'?'#bde8ed99':t.accent;ctx.lineWidth=.9;ctx.strokeRect(bx,29,balconyWidth,9);for(let b=bx+3;b<bx+balconyWidth;b+=5){ctx.beginPath();ctx.moveTo(b,29);ctx.lineTo(b,38);ctx.stroke();}
if(tier>=3&&(i+f.style)%2===0){ctx.fillStyle='#a66f51';ctx.fillRect(x,33,ww,4);ctx.fillStyle=kind==='garden'?'#3a7952':'#4e7657';for(let b=0;b<4;b++){ctx.beginPath();ctx.ellipse(x+2+b*4,31-(b%2)*2,3,4,.3,0,Math.PI*2);ctx.fill();}if(kind==='garden'){ctx.strokeStyle='#49774e';ctx.beginPath();ctx.moveTo(x+3,35);ctx.quadraticCurveTo(x+9,48,x+5,46);ctx.stroke();}}
}
if(tier>=4&&(i+local)%2===0&&kind!=='orbital'&&kind!=='glass'){ctx.fillStyle=t.accent;ctx.beginPath();ctx.moveTo(x-3,7);ctx.lineTo(x+ww+3,7);ctx.lineTo(x+ww+5,14);ctx.lineTo(x-5,14);ctx.closePath();ctx.fill();ctx.fillStyle=t.trim;for(let stripe=0;stripe<ww+4;stripe+=7)ctx.fillRect(x-2+stripe,8,3,6);}
}
if(tier>=3){for(const x of [-61,59]){const glow=ctx.createRadialGradient(x,21,0,x,21,11);glow.addColorStop(0,kind==='neon'?'#e88acf60':'#ffe0a960');glow.addColorStop(1,'#ffe0a900');ctx.fillStyle=glow;ctx.fillRect(x-11,10,22,22);ctx.fillStyle=t.accent;ctx.fillRect(x-1.5,18,3,7);ctx.fillStyle='#fff0c4';ctx.fillRect(x-1,19,2,3);}}
if(kind==='neon'||kind==='orbital'){ctx.fillStyle=t.accent;ctx.fillRect(-62,4,2,35);ctx.fillRect(60,4,2,35);if(tier>=2){ctx.fillRect(-59,40,118,1);ctx.fillRect(-20,2,40,1);}}
if(tier===4){ctx.fillStyle=t.trim;ctx.fillRect(-66,3,132,1);if(kind==='orbital'){ctx.strokeStyle=t.accent;for(const x of [-45,42])ctx.strokeRect(x,34,7,6);}else{for(const x of [-63,60])ctx.fillRect(x,3,3,39);}}
ctx.restore();
}

function render(){
ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);background();
// Falling and placed floors share the SAME coordinate frame, so landing never
// changes their horizontal position. Previously only placed floors were rotated.
ctx.save();
if(state!=='collapse'&&!(state==='over'&&debris.length)){
ctx.translate(W/2,GROUND+FH+camera);ctx.rotate(angle);ctx.translate(-W/2,-GROUND-FH-camera);
for(const f of floors)building(f);
}else{building(floors[0]);for(const f of debris)building(f,f.rot);}
if(active)building(active,active.rot||0);
if(landingPulse>0){ctx.globalAlpha=landingPulse*.2;ctx.fillStyle='#fff5d2';const f=floors[floors.length-1];ctx.fillRect(f.x-FW/2-3,f.y+camera+FH-5,FW+6,5);ctx.globalAlpha=1;}
ctx.restore();
}
function frame(now){const dt=last?Math.min((now-last)/1000,.033):0;last=now;tick(dt);render();requestAnimationFrame(frame);}floors=[{x:W/2,y:GROUND,style:0}];requestAnimationFrame(frame);
// Pure geometry is exported for deterministic regression checks, independent of rendering.
window.TowerPhysics=Object.freeze({stability,width:FW});
})();
