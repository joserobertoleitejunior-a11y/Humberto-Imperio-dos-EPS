/* Motor dos vídeos em formato Stories (base: Pizza em Dobro, adaptado ao Império do EPS). Tudo é função do tempo: quadro(t) desenha o vídeo no instante t.
   - no navegador: um laço rAF chama quadro(t) em tempo real (com a música);
   - na gravação (scripts/renderizar-video.js): chama quadro(t) quadro a quadro, então o MP4 não depende da velocidade da máquina. */
(function(){
"use strict";
var P=new URLSearchParams(location.search), GRAVANDO=P.has('gravar');
if(GRAVANDO)document.body.classList.add('gravando');
var $=function(id){return document.getElementById(id)};
var palco=$('palco'), ifr=$('site'), fone=$('fone'), capEl=$('cap'), fimEl=$('fim'), zapEl=$('zap');
function ajustar(){var s=Math.min(innerWidth/1080,innerHeight/1920);palco.style.transform='translate(-50%,-50%) scale('+s+')';}
addEventListener('resize',ajustar);ajustar();

var clamp=function(x){return Math.max(0,Math.min(1,x));};
var outCubic=function(x){x=clamp(x);return 1-Math.pow(1-x,3);};
var outBack=function(x){x=clamp(x);var c=1.5;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
var inOutSine=function(x){x=clamp(x);return -(Math.cos(Math.PI*x)-1)/2;};
var inOutCubic=function(x){x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};

/* texto → palavras e letras (cada letra aparece da esquerda pra direita) */
function letras(html){
  var box=document.createElement('div'); box.innerHTML=html; var out=document.createElement('span'); out.className='in';
  (function walk(no,ac,dest){
    Array.prototype.forEach.call(no.childNodes,function(n){
      if(n.nodeType===3){
        var partes0=n.textContent.split(/([ \t\r\n]+)/)[0];
        n.textContent.split(/([ \t\r\n]+)/).forEach(function(w){
          if(!w)return;
          if(/^[ \t\r\n]+$/.test(w)){dest.appendChild(document.createTextNode(' '));return;}
          var ult=dest.lastChild,colar=(w===partes0&&ult&&ult.nodeType===1&&ult.classList.contains('p')&&!/^[ \t\r\n]/.test(n.textContent));
          var p=colar?ult:document.createElement('span'); if(!colar)p.className='p'+(ac?' ac-p':'');   // pontuação colada na palavra anterior não quebra sozinha
          w.split('').forEach(function(ch){var l=document.createElement('span');l.className='l'+(ac?' ac':'');l.textContent=ch;p.appendChild(l);});
          if(!colar)dest.appendChild(p);
        });
      }else if(n.nodeType===1){walk(n,ac||n.tagName==='B',dest);}
    });
  })(box,false,out);
  return out;
}
function revelar(el,u,passo,sai){ // u = segundos desde o início
  var ls=el.querySelectorAll('.l');
  for(var i=0;i<ls.length;i++){
    var e=outCubic((u-i*(passo||.028))/.42);
    ls[i].style.opacity=e;
    ls[i].style.transform='translate('+(-52*(1-e))+'px,'+(34*(1-e))+'px)';
    ls[i].style.filter=e<1?'blur('+(7*(1-e))+'px)':'none';
  }
  el.style.setProperty('--ub',outCubic((u-ls.length*(passo||.028)*.55-.1)/.5));
}

var EFEITOS=['rolaV','letras','rolaH','flip3d','pop','glitch','digita'];
function efeitoLegenda(c,u){
  var el=c.el,f=c.efeito,ls=el.querySelectorAll('.l'),ps=el.querySelectorAll('.p'),n=ls.length,i,w,e;
  var ent=el.firstElementChild; ent.style.transform='';ent.style.textShadow='';
  for(i=0;i<n;i++){ls[i].style.transform='';ls[i].style.filter='';ls[i].style.opacity=1;ls[i].style.borderRight='';}
  for(w=0;w<ps.length;w++){ps[w].style.transform='';ps[w].style.opacity=1;}
  if(f==='rolaV'){      // cada palavra sobe de baixo, como uma rolagem vertical dentro de uma janela
    for(w=0;w<ps.length;w++){e=outCubic((u-w*.1)/.55);var L=ps[w].querySelectorAll('.l');for(i=0;i<L.length;i++){L[i].style.transform='translateY('+(118*(1-e))+'%)';L[i].style.opacity=e>0?1:0;}}
  }else if(f==='rolaH'){ // o texto inteiro entra rolando da direita pra esquerda
    e=outCubic(u/.75);ent.style.transform='translateX('+(1-e)*1000+'px)';
  }else if(f==='flip3d'){ // palavras viram em 3D (rotateX)
    for(w=0;w<ps.length;w++){e=outBack((u-w*.11)/.6);ps[w].style.transform='rotateX('+(-100*(1-e))+'deg)';ps[w].style.transformOrigin='50% 100%';ps[w].style.opacity=e>.02?1:0;}
  }else if(f==='pop'){  // letras estouram do centro pra fora
    for(i=0;i<n;i++){var d=Math.abs(i-(n-1)/2)/(n/2);e=outBack((u-d*.4)/.5);ls[i].style.transform='scale('+(.15+.85*e)+') rotate('+(-14*(1-e))+'deg)';ls[i].style.opacity=clamp(e*3);}
  }else if(f==='glitch'){ // separação RGB + tremida que se acalma
    var g=1-clamp(u/.8),sx=Math.round(11*g*Math.sin(u*42));
    ent.style.textShadow=sx+'px 0 rgba(255,40,90,.9),'+(-sx)+'px 0 rgba(0,210,255,.9)';
    ent.style.transform='skewX('+(g*Math.sin(u*57)*9)+'deg)';
    for(i=0;i<n;i++)ls[i].style.opacity=clamp((u-.02*i)/.12);
  }else if(f==='digita'){ // máquina de escrever com cursor
    var k=Math.floor(u*26);
    for(i=0;i<n;i++)ls[i].style.opacity=i<k?1:0;
    if(k>0&&k<=n&&Math.floor(u*4)%2===0||k<n){var q=Math.min(k,n)-1;if(q>=0)ls[q].style.borderRight='4px solid #F5C518';}
  }else{revelar(el,u,.028);}                // letras da esquerda pra direita
  el.style.setProperty('--ub',outCubic((u-.45)/.5));
}
var C=null, caps=[], flags={}, segs=[], ifrOk=false, partes=[], parteEl=null;
var W=function(){return ifr.contentWindow}, D=function(){return ifr.contentDocument};
function el(id){return id.charAt(0)==='@'?D().querySelector(id.slice(1)):D().getElementById(id);} /* '@seletor' = qualquer seletor CSS */
function resolverY(s){
  if(typeof s.y==='number')return s.y;
  if(s.y==='fim')return D().documentElement.scrollHeight;
  var e=el(s.el); var r=e.getBoundingClientRect();
  // s.frac: fração da seção alta (jornada em L) — 0 = início, 1 = fim da parte fixa
  if(s.frac!==undefined)return Math.max(0,r.top+W().scrollY+(r.height-W().innerHeight)*s.frac);
  // "Por dentro" tem 2 fases na mesma tela: pj = fração do "L", pc = fração da casa (o motion.js do site diz onde uma acaba)
  if(s.pj!==undefined||s.pc!==undefined){var j=W().ImperioMotion.jornada(),fim=j&&j.fim||1,fr=s.pj!==undefined?s.pj*fim:fim+s.pc*(1-fim);
    return Math.max(0,r.top+W().scrollY+(r.height-W().innerHeight)*fr);}
  return Math.max(0,r.top+W().scrollY-(s.off||0));
}
function prepararSite(){
  var d=D(),st=d.createElement('style');
  st.textContent='html{scroll-behavior:auto!important}*{content-visibility:visible!important}html{scrollbar-width:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}'+
   '#boas-vindas{display:none!important}[data-revelar]{opacity:1!important;transform:none!important;transition:none!important}.palco3d{transition:none!important}.poster{transition:none!important}';
  d.head.appendChild(st);
}
/* ── WhatsApp: mesma mensagem que o site envia ── */
function negrito(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*(.+?)\*/g,'<b>$1</b>');}
function montarZap(){
  var w=W(),n=new Date(),z=function(x){return String(x).padStart(2,'0');},hora=z(n.getHours())+':'+z(n.getMinutes());
  var f=D().querySelector('[data-calculadora]'),g=function(k){return f.elements[k].value;};
  var e={modo:'medidas',comprimento:g('comprimento'),altura:g('altura'),portas:g('portas'),janelas:g('janelas'),blocoId:g('bloco')};
  var r=w.ImperioCalculo.calcularObra(e,w.IMPERIO_CONFIG);
  var l=[C.zap&&C.zap.texto?C.zap.texto:w.ImperioCalculo.mensagemWhatsApp(r,e,{nome:'Marcos',cidade:'Itapetininga'})]; // zapTexto na cena = mensagem própria
  zapEl.innerHTML='<div class="z-top"><div class="z-av">IE</div><div><div class="z-nome">Império do EPS</div><div class="z-sub">orçamentos do site</div></div></div>'+
   '<div class="z-chat"><div class="z-aviso">Hoje</div><div class="z-msg" id="z-m">'+negrito(l.join('\n'))+'<span class="z-hora">'+hora+'</span></div></div><div class="z-input"><i></i></div>';
}
/* logo da Vibe Coding Process: o mesmo cubo do rodapé do site (arestas douradas #C9A227 + contorno 1,12× a 55%),
   dentro de um quadrado preto leve com estrelas ("espaço") — só atrás da logo da Vibe */
function desenharEspaco(cv,t){
  var c=cv.getContext('2d'),S=cv.width;
  c.clearRect(0,0,S,S);
  var g=c.createRadialGradient(S*.5,S*.45,10,S*.5,S*.5,S*.75);g.addColorStop(0,'#0f1118');g.addColorStop(1,'#020203');
  c.fillStyle=g;c.fillRect(0,0,S,S);
  var neb=c.createRadialGradient(S*.5,S*.5,0,S*.5,S*.5,S*.5);neb.addColorStop(0,'rgba(201,162,39,.13)');neb.addColorStop(1,'rgba(201,162,39,0)');c.fillStyle=neb;c.fillRect(0,0,S,S);
  var sd=7;function rnd(){sd=(sd*16807)%2147483647;return sd/2147483647;}
  for(var i=0;i<70;i++){var x=rnd()*S,y=rnd()*S,r=.6+rnd()*1.7,ph=rnd()*6.28,v=.35+.65*(.5+.5*Math.sin(t*(1.2+rnd()*1.5)+ph));
    c.fillStyle='rgba(255,255,255,'+(v*.9)+')';c.beginPath();c.arc(x,y,r,0,6.283);c.fill();}
  var rx=.4+t*.35,ry=.5+t*.7,h=.575,V=[];
  for(var a=0;a<8;a++)V.push([(a&1?h:-h),(a&2?h:-h),(a&4?h:-h)]);
  var E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  function proj(v,k){var x=v[0]*k,y=v[1]*k,z=v[2]*k,cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry);
    var x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*cx-z1*sx; return [S/2+x1*S/2.6,S/2-y1*S/2.6];}
  function arestas(k,al,lw){c.strokeStyle='rgba(201,162,39,'+al+')';c.lineWidth=lw;c.lineCap='round';
    E.forEach(function(e){var p=proj(V[e[0]],k),q=proj(V[e[1]],k);c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke();});}
  c.shadowColor='rgba(201,162,39,.55)';c.shadowBlur=14;arestas(1,1,S/58*1.4);arestas(1.12,.55,S/58*1.4);c.shadowBlur=0;
}
function montarFim(){
  var f=C.fim;
  fimEl.innerHTML=
   '<div class="fx f-par"><img class="f-logo" src="../assets/img/marca-clara.svg" alt=""></div>'+
   '<div class="fx f-nome"></div><div class="fx f-tag"></div><div class="fx f-linha"></div>'+
   '<div class="fx f-contato"><div class="f-fone"></div><div class="f-jose"></div></div>';
  var q=function(s){return fimEl.querySelector(s);};
  q('.f-nome').appendChild(letras('Fábrica do <b>Blocão</b>'));
  q('.f-tag').appendChild(letras(f.tag));
  q('.f-fone').appendChild(letras('(15) 99121-2917'));
  q('.f-jose').appendChild(letras('WhatsApp · Itapetininga e região'));
}
/* ── fundo: fachada com movimento de câmera lenta, partículas de luz e grão de filme ── */
var part=$('part'),pc=part.getContext('2d'),grao=$('grao'),gc=grao.getContext('2d'),fotoEl=document.getElementById('fundo'),pts=[];
(function(){var sd=3;function r(){sd=(sd*16807)%2147483647;return sd/2147483647;}for(var i=0;i<46;i++)pts.push({x:r()*1080,y:r()*1920,r:6+r()*26,v:8+r()*26,a:.10+r()*.30,f:r()*6.28});})();
function fundoVivo(t){
  var k=1.06+.05*(t/(C.dur||30)); fotoEl.style.transform='translate('+(Math.sin(t*.12)*26)+'px,'+(-t*2.4)+'px) scale('+k+')';
  pc.clearRect(0,0,1080,1920);pc.globalCompositeOperation='lighter';
  pts.forEach(function(p){var y=((p.y-p.v*t)%2100+2100)%2100-90,x=p.x+Math.sin(t*.4+p.f)*22,o=p.a*(.6+.4*Math.sin(t*.9+p.f));
    var g=pc.createRadialGradient(x,y,0,x,y,p.r);g.addColorStop(0,'rgba(255,255,255,'+o+')');g.addColorStop(.55,'rgba(250,250,246,'+o*.9+')');g.addColorStop(1,'rgba(240,238,230,0)');pc.fillStyle=g;pc.beginPath();pc.arc(x,y,p.r,0,6.283);pc.fill();});
  pc.globalCompositeOperation='source-over';
  var id=gc.createImageData(grao.width,grao.height),d=id.data,s=(t*977|0)+1;
  for(var i=0;i<d.length;i+=4){s=(s*1103515245+12345)&0x7fffffff;var v=(s>>16)&255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
  gc.putImageData(id,0,0);
}
/* ── o quadro ── */
function quadro(t){
  if(!ifrOk)return;
  fundoVivo(t);
  var cr=$('credito'); cr.style.opacity=clamp((t-.8)/.6); cr.style.transform='translateX('+(-40*(1-outCubic((t-.8)/.7)))+'px)'; desenharEspaco($('cuboMini'),t);
  /* celular: entra deslizando e flutua levemente */
  var ent=outBack(t/1.1), sai=C.fim?inOutCubic((t-C.fim.t0)/.7):0;
  fone.style.opacity=clamp(t/.5)*(1-sai);
  fone.style.transform='translateY('+(140*(1-ent)+sai*-80)+'px) rotateY('+(Math.sin(t*.6)*3.2*(1-sai))+'deg) rotateX('+(Math.cos(t*.45)*1.6)+'deg) scale('+(.9+.1*ent)+')';
  var br=(t%7)/1; $('brilho').style.transform='translateX('+(-130+260*inOutSine(br<1?br:1))+'%)';
  /* splash do site: animações travadas no tempo do vídeo */
  if(C.splash){
    var st=C.splash.t;
    if(t<st){D().getAnimations({subtree:true}).forEach(function(a){try{a.pause();a.currentTime=t*1000;}catch(e){}});flags.splashPausa=true;}
    else if(!flags.splashAberta){flags.splashAberta=true;D().getAnimations({subtree:true}).forEach(function(a){try{a.play();}catch(e){}});W().ImperioAbertura.fecharSplash();}
  }
  /* rolagens do site (vertical, com início e fim suaves) */
  var velH=0, vel=0;   // velocidade da rolagem agora (px/s do site): as legendas reagem a ela
  segs.forEach(function(s){
    if(t<s.t0)return;
    var alvo=s.inner?el(s.inner):(s.horiz?el(s.horiz):null);
    if(!s.lido){ // primeira vez que entra no trecho: lê de onde partiu e resolve o destino
      s.lido=true;
      if(s.horiz){s.y0=alvo.scrollLeft;s.y1=alvo.querySelectorAll('.promo-slide')[s.slide].offsetLeft-16;}
      else if(s.inner){s.y0=alvo.scrollTop;s.y1=s.y;}
      else{s.y0=W().scrollY;s.y1=resolverY(s);}
    }
    var pp=clamp((t-s.t0)/(s.t1-s.t0)), p=inOutSine(pp), y=s.y0+(s.y1-s.y0)*p;
    if(pp<1&&s.horiz)velH+=(s.y1-s.y0)*(Math.PI/2)*Math.sin(Math.PI*pp)/(s.t1-s.t0);
    else if(pp<1&&!s.inner)vel+=(s.y1-s.y0)*(Math.PI/2)*Math.sin(Math.PI*pp)/(s.t1-s.t0);
    if(s.horiz){alvo.scrollLeft=y;}else if(s.inner){alvo.scrollTop=y;}else{W().scrollTo(0,y);}
  });
  /* digitação */
  (C.digitar||[]).forEach(function(d){
    if(t<d.t0)return; var k=Math.round(d.texto.length*clamp((t-d.t0)/(d.t1-d.t0))), c=el(d.id);
    if(c&&c.value!==d.texto.slice(0,k)){c.value=d.texto.slice(0,k);c.dispatchEvent(new Event('input',{bubbles:true}));}
  });
  /* ações no site (uma vez cada) */
  (C.eventos||[]).forEach(function(e,i){ if(t>=e.t&&!flags['e'+i]){flags['e'+i]=1;try{e.fn(W(),el);}catch(x){console.error('VIDEO-ERRO',x.message);}} });
  /* tour pela casa: cada cena manda num trecho do sobrevoo (pontos i0→i1), no ritmo da fala */
  (C.tours||[]).forEach(function(r){
    if(t<r.t0||t>r.t1+.5||r.feito)return;
    var c=W().ImperioCasa3D; if(!c)return;
    if(!flags.tourOn){flags.tourOn=1;try{c.tour();flags.marcos=c.__tourMarcos();}catch(e){console.error('VIDEO-ERRO',e.message);}}
    var m=flags.marcos; if(!m)return;
    var a=m[Math.min(r.i0,m.length-1)], b=m[Math.min(r.i1,m.length-1)];
    var f=a+(b-a)*clamp((t-r.t0)/(r.t1-r.t0));
    try{c.__irTour(f);}catch(e){}
    if(t>=r.t1)r.feito=true;
  });
  /* rolagem, letras e bloco 3D do site desenhados AGORA (gravação quadro a quadro) */
  try{W().ImperioCena.atualizarAgora();}catch(e){}
  /* WhatsApp dentro do celular */
  if(C.zap){
    var z=C.zap, up=inOutCubic((t-z.t0)/.6)-inOutCubic((t-z.t1)/.5);
    if(t>=z.t0-.05&&!flags.zapMontado){flags.zapMontado=1;montarZap();}
    zapEl.style.transform='translateY('+((1-up)*100)+'%)';
    var m=$('z-m'); if(m){var e=outBack((t-z.t0-.7)/.6);m.style.opacity=clamp((t-z.t0-.7)/.25);m.style.transform='translateY('+(60*(1-e))+'px) scale('+(.94+.06*e)+')';}
  }
  /* legendas com efeitos de scroll e de HTML/CSS: cada legenda usa um efeito (rolagem vertical, horizontal, giro 3D, glitch,
     pop, máquina de escrever, letras da esquerda) e todas reagem à velocidade da rolagem vertical E horizontal do site */
  var v=Math.max(-1,Math.min(2.2,vel/800)), vh=Math.max(-1.5,Math.min(1.5,velH/700));
  caps.forEach(function(c){
    var u=t-c.t0,ativo=t>=c.t0&&t<=c.t1;
    c.el.style.opacity=ativo?1:0; if(!ativo)return;
    efeitoLegenda(c,u);
    var s=clamp((t-(c.t1-.38))/.38),e=s*s;
    c.el.style.opacity=c.efeito==='rolaH'?1:1-e;
    var sai=c.efeito==='rolaH'?(-e*1100):(-vh*34);
    var ty=(c.efeito==='rolaH'?0:-50*e)-14*v;
    c.el.style.transform='translate('+sai+'px,'+ty+'px) scaleY('+(1+.05*Math.abs(v))+')';
    c.el.style.filter=Math.abs(v)>.15?'blur('+(Math.min(1.6,Math.abs(v)*1.2))+'px)':'none';
  });
  /* trilho de rolagem ao lado do celular: mostra onde o site está */
  try{var H=D().documentElement,tot=H.scrollHeight-W().innerHeight,fr=tot>0?clamp(W().scrollY/tot):0,rail=$('rail'),th=rail.firstElementChild;
    var alt=Math.max(.08,W().innerHeight/H.scrollHeight)*1040;th.style.height=alt+'px';th.style.transform='translateY('+((1040-alt)*fr)+'px)';
    rail.style.opacity=(clamp((t-.8)/.6))*(C.fim?1-clamp((t-C.fim.t0+.2)/.5):1);}catch(e){}
  /* etiqueta da parte do site que está sendo mostrada */
  partes.forEach(function(p,i){
    var u=t-(p.t0+.15),ativo=t>=p.t0&&t<=p.t1&&!(C.fim&&t>=C.fim.t0-.1);
    p.el.style.opacity=ativo?1:0; if(!ativo)return;
    revelar(p.el,u,.04);
    var s=clamp((t-(p.t1-.3))/.3); if(i===partes.length-1)s=0;
    p.el.style.opacity=1-s*s;
  });
  /* cartão final */
  if(C.fim){
    var u=t-C.fim.t0, w=inOutCubic(u/.8);
    fimEl.style.clipPath='inset(0 '+((1-w)*100)+'% 0 0)';
    if(u>-.1){
      if(!flags.fimMontado){flags.fimMontado=1;montarFim();}
      var itens=fimEl.querySelectorAll('.fx'),ult=[.5,.95,1.35,1.7,1.9];
      Array.prototype.forEach.call(itens,function(x,i){
        var uu=u-ult[i],e=outCubic(uu/.7);x.style.opacity=e;
        if(i===3)x.style.transform='scaleX('+e+')'; else x.style.transform='translateX('+(-70*(1-e))+'px)';
        if(i===1||i===2||i===4)revelar(x,uu,.026);
      });
    }
  }
}
window.quadro=quadro;

function construir(){
  capEl.innerHTML='';
  var idxCap=0;
  caps=(C.legendas||[]).map(function(l){var d=document.createElement('div');d.className='leg';d.appendChild(letras(l.html));capEl.appendChild(d);d.className+=' fx-'+(l.efeito||EFEITOS[idxCap%EFEITOS.length]);var ef=l.efeito||EFEITOS[idxCap%EFEITOS.length];idxCap++;return {t0:l.t0,t1:l.t1,el:d,efeito:ef};});
  segs=(C.rolagens||[]).map(function(s){return Object.assign({},s);});
  parteEl=$('parte'); parteEl.innerHTML='';
  partes=(C.partes||[]).map(function(p){var d=document.createElement('div');d.className='chip';d.appendChild(letras(p.nome));parteEl.appendChild(d);return {t0:p.t0,t1:p.t1,el:d};});
}
function carregar(){
  try{ if(C.splash)sessionStorage.removeItem('imperio_splash'); else sessionStorage.setItem('imperio_splash','1'); sessionStorage.setItem('imperio_bv','1'); }catch(e){}
  return new Promise(function(res){
    ifr.onload=function(){
      prepararSite();
      var ate=Date.now()+30000;
      (function esp(){ // espera o Blocão 3D ficar pronto
        var ok=false;try{ok=!!(W().ImperioCena&&W().ImperioCena.pronto());}catch(e){}
        if(ok||Date.now()>ate){ifrOk=true;window.__pronto=true;res();}else setTimeout(esp,150);
      })();
    };
    ifr.src='../index.html?video=1&qualidade=media';
  });
}
var raf=0,som=null;
function tocar(comSom){
  cancelAnimationFrame(raf);
  if(comSom&&som){som.currentTime=0;som.play().catch(function(){});}
  var ini=performance.now();
  (function passo(){var t=(performance.now()-ini)/1000;quadro(t);
    if(t<C.dur)raf=requestAnimationFrame(passo);else{window.__fim=true;}})();
}
/* cada vídeo é uma lista de CENAS (parte do site + frase falada). Os tempos vêm de video/tempos-X.json, gerado junto com a locução:
   a cena dura o tempo da fala + folga, então nenhuma frase é cortada */
function montarLinhaDoTempo(cfg,tp){
  var L=[],R=[],E=[],Dg=[],TR=[],zap=null,fim=null,splash=null,partes=[];
  cfg.cenas.forEach(function(s){
    var T=tp.cenas[s.id],t0=T.t0,t1=T.t1,d=t1-t0;
    var cl=function(x){return x<0?d+x:Math.min(x,d-.3);};
    if(s.fim){fim={t0:t0,tag:s.tag};return;}
    L.push({t0:t0,t1:t1,html:s.html,efeito:s.efeito});
    if(s.splash)splash={t:t1-.1};
    if(s.rolar)R.push(Object.assign({},s.rolar,{t0:t0+.2,t1:t1-.35}));
    (s.rolagens||[]).forEach(function(r){R.push(Object.assign({},r,{t0:t0+cl(r.dt0),t1:t0+cl(r.dt1)}));});
    (s.acoes||[]).forEach(function(a){E.push({t:t0+cl(a.dt),fn:a.fn});});
    (s.digitar||[]).forEach(function(g){Dg.push({id:g.id,texto:g.texto,t0:t0+cl(g.dt0),t1:t0+cl(g.dt1)});});
    if(s.zap){zap=zap||{t0:t0,t1:t1,texto:s.zapTexto};zap.t1=t1;}
    if(s.tour)TR.push({t0:t0,t1:t1,i0:s.tour[0],i1:s.tour[1]});
    var p=partes[partes.length-1];if(p&&p.nome===s.parte)p.t1=t1;else partes.push({nome:s.parte,t0:t0,t1:t1});
  });
  return {tema:cfg.tema,dur:tp.dur,legendas:L,rolagens:R,eventos:E,digitar:Dg,tours:TR,zap:zap,fim:fim,splash:splash,partes:partes};
}
/* "toque" no banner: só o cartaz afunda um pouco (sem dedo aparecendo) */
window.VT={toque:function(w,sel,on){var s=w.document.querySelector(sel);if(s)s.classList.toggle('toque',!!on);}};
window.Video={
  iniciar:function(cfg){
    window.__cfg=cfg; palco.className='tema-'+(cfg.tema||'instagram'); som=$('som');
    $('capa').style.display=GRAVANDO?'none':'flex';
    fetch(cfg.tempos+'?v='+Date.now()).then(function(r){return r.json();}).catch(function(){return null;}).then(function(tp){
      if(!tp){window.__semTempos=true;return null;}
      C=montarLinhaDoTempo(cfg,tp); construir(); return carregar();
    }).then(function(){
      if(!C)return;
      quadro(0);
      $('btSom').onclick=function(){$('capa').style.display='none';tocar(true);};
      $('btMudo').onclick=function(){$('capa').style.display='none';tocar(false);};
      $('btRe').onclick=function(){location.reload();};
      if(P.has('auto'))tocar(false);
    });
  }
};
})();
