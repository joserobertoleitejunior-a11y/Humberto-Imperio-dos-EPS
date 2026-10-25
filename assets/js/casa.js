/**
 * Casa inteira de Blocão — 3ª fase do "Por dentro", na MESMA tela fixa (casa3d.js desenha).
 * Depois do "L" (o Blocão desmontado, aberto e de novo inteiro), a rolagem continua: as fichas e botões saem,
 * a camada da casa entra por cima no mesmo lugar e o bloco da casa começa EXATAMENTE onde o Blocão estava
 * (mesma posição, tamanho e ângulo) — a troca é um esmaecimento sobre o mesmo ponto. Aí ele vai pro canto da
 * obra e as paredes sobem a partir dele.
 * - Prepara o 3D ~3 s depois de abrir (página parada) ou quando o "Por dentro" chega perto; no vídeo, já na abertura.
 * - "estatica": imagem pronta da casa + etapas em lista, depois do "L". Sem WebGL: a fase da casa sai (seção volta ao "L").
 * Casa pronta: tocar numa parede tira ela e a câmera entra pela abertura (corte mostra o EPS dentro do Blocão).
 * Sempre (depois do voo do Blocão): arrastar o dedo pro lado gira a casa e a pinça aproxima — zoom SÓ no 3D
 * (a página continua sem zoom). Com a casa completa na tela, o dedo na maquete só gira/inclina ela (a página rola pelo texto).
 * Por dentro: a câmera entra num arco (sobrevoo) pela parede aberta e anda por TOQUE — tocou no chão/num móvel, ela voa
 * (rasante) até lá e para mostrando o lugar; tocou numa parede, a parede sai e mostra o Blocão por dentro; botão troca
 * de andar; "Sair da casa" (ou Esc) volta. "Tour pela casa": sobrevoo automático com legendas (o cliente só assiste).
 * Publica window.ImperioCasa = { pronto(), atualizarAgora() } (usado pela gravação do vídeo).
 */
(function () {
  "use strict";

  // altura estável da tela (dispositivo.js): a barra de endereço do celular não mexe no 3D
  function alturaTela() { return window.ImperioTela ? window.ImperioTela.altura() : window.innerHeight; }

  var html = document.documentElement;
  var parado = html.getAttribute("data-qualidade") === "estatica";
  var camada = null;
  var jornadaEl = null;
  var ancora = null;
  var palco = null;
  var etapas = [];
  var contador = null;
  var ficha = null;
  var botoesTipo = [];
  var C3 = null;
  var carregando = false;
  var ultimaEtapa = -1;
  var ultimoCont = -1;
  var ultimoQ = -1;
  var ultimaOp = -1;
  var ancoraFim = -1;

  // limites de cada etapa (o casa3d.js manda os do tipo escolhido; estes são os da casa média)
  var LIMITES = [0, 0.12, 0.4, 0.47, 0.74, 0.86];
  var ultimoP = 0;
  var TROCA = 0.035; // trecho em que a camada da casa esmaece por cima do Blocão (o bloco da casa fica parado no mesmo ponto)

  function limitar(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function temWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  function pintar(p) {
    ultimoP = p;
    var e = 0;
    for (var i = 0; i < LIMITES.length; i++) if (p >= LIMITES[i]) e = i;
    if (e !== ultimaEtapa) {
      ultimaEtapa = e;
      etapas.forEach(function (li, k) { li.classList.toggle("ativa", k === e); });
    }
    camada.style.setProperty("--ouro", (limitar((p - 0.86) / 0.14)).toFixed(3));
    var kc = limitar((p - 0.9) / 0.08);
    camada.style.setProperty("--paisagem", (kc * kc * (3 - 2 * kc)).toFixed(3)); // céu da paisagem (CSS, leve)
    camada.classList.toggle("casa--pronta", p > 0.88); // igual ao PRONTA do casa3d.js (dá pra tirar parede)
    camada.classList.toggle("casa--maquete", p > 0.97); // casa completa: o dedo na maquete não rola a página
  }

  /** Etapas e ficha do tipo atual (simples tem 5 etapas: não tem 2º andar). */
  function montarEtapas() {
    var lista = camada.querySelector(".casa__etapas");
    var dados = C3.etapas();
    LIMITES = dados.map(function (d) { return d[0]; });
    lista.innerHTML = dados.map(function (d, i) {
      return '<li data-etapa="' + i + '"><b>' + String(i + 1).padStart(2, "0") + "</b> " + d[1] + "</li>";
    }).join("");
    etapas = Array.prototype.slice.call(lista.querySelectorAll("[data-etapa]"));
    if (ficha) ficha.textContent = C3.ficha();
    ultimaEtapa = -1;
    pintar(ultimoP);
  }

  function escolherTipo(id) {
    botoesTipo.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-casa-tipo") === id)); });
    if (!C3) return;
    C3.tipo(id);
    montarEtapas();
  }

  /* ---------- tour do drone pelas vantagens: parece um vídeo, mas o dedo pode girar a vista ---------- */
  var timerFim = 0;
  function ligarVantagens() {
    var card = camada.querySelector("[data-casa-vantagem]");
    C3.aoPonto(function (e) {
      camada.classList.toggle("casa--foco", !!e.ativo);
      camada.classList.toggle("casa--tourpontos", !!(e.tour || (e.ativo && C3.emTourPontos())));
      camada.classList.toggle("casa--fimtour", !!e.fim);
      clearTimeout(timerFim);
      if (!C3.emTourPontos()) travarRolagem(false); // tour acabou (ou foi interrompido): o site continua
      if (!card) return;
      var mostrar = !!(e.ativo || e.fim);
      card.hidden = !mostrar;
      card.classList.toggle("casa__vantagem--fim", !!e.fim);
      if (mostrar && card.getAttribute("data-id") !== e.id) {
        card.setAttribute("data-id", e.id);
        card.querySelector("[data-vantagem-passo]").textContent = e.passo ? e.passo + " de " + e.total : "";
        card.querySelector("[data-vantagem-titulo]").textContent = e.titulo;
        card.querySelector("[data-vantagem-texto]").textContent = e.texto;
        card.classList.remove("entra");
        void card.offsetWidth;
        card.classList.add("entra");
      }
      if (!mostrar) card.removeAttribute("data-id");
      // fim do tour: a chamada fica um tempo com o botão "Quero construir a minha" logo abaixo e some sozinha
      if (e.fim && e.acabou) timerFim = setTimeout(fecharFim, 9000);
    });
    function fecharFim() {
      if (!camada.classList.contains("casa--fimtour") || C3.emTourPontos()) return;
      camada.classList.remove("casa--fimtour");
      card.hidden = true;
      card.removeAttribute("data-id");
    }
    // depois do tour: tocou na maquete ou rolou = a chamada sai e o site segue
    palco.addEventListener("pointerdown", function () { if (!C3.emTourPontos()) fecharFim(); });
    window.addEventListener("scroll", fecharFim, { passive: true });
    ligarTourAuto();
  }

  /**
   * Durante o tour a página não rola (é o "vídeo" da maquete, ≤ 20 s): só o dedo na maquete, que gira a vista.
   * Acabou o tour, a rolagem volta e o site continua.
   */
  var rolagemTravada = false;
  var TECLAS_ROLAGEM = { ArrowDown: 1, ArrowUp: 1, PageDown: 1, PageUp: 1, Home: 1, End: 1, " ": 1 };
  function bloquearRolagem(ev) {
    if (ev.type === "keydown" && !TECLAS_ROLAGEM[ev.key]) return;
    ev.preventDefault();
  }
  function travarRolagem(sim) {
    if (sim === rolagemTravada) return;
    rolagemTravada = sim;
    ["wheel", "touchmove", "keydown"].forEach(function (tipo) {
      if (sim) window.addEventListener(tipo, bloquearRolagem, { passive: false });
      else window.removeEventListener(tipo, bloquearRolagem, { passive: false });
    });
  }

  /** O tour começa sozinho assim que a maquete termina de ser construída na rolagem — uma vez por visita. */
  function ligarTourAuto() {
    var feito = false;
    var tentar = function () {
      if (feito || !camada.classList.contains("casa--maquete")) return;
      if (!C3.tourPontos()) return;
      feito = true;
      travarRolagem(true);
      setTimeout(function () { if (!C3.emTourPontos()) travarRolagem(false); }, 25000); // segurança: nunca prende a página
    };
    if (window.ImperioMotion) window.ImperioMotion.aoRolar(function () { if (!feito) requestAnimationFrame(tentar); });
  }

  function aoDesenhar(info) {
    if (contador && info.assentados !== ultimoCont) {
      ultimoCont = info.assentados;
      contador.textContent = info.assentados;
    }
  }

  /** âncora #casa (menu "A casa") no começo da fase da casa */
  function posicionarAncora(j) {
    if (!ancora || !j || j.fim === ancoraFim) return;
    ancoraFim = j.fim;
    var total = jornadaEl.offsetHeight - alturaTela();
    ancora.style.top = Math.round((j.fim + (1 - j.fim) * 0.06) * total) + "px";
  }

  function atualizar(j) {
    if (!camada || parado || !j) return;
    posicionarAncora(j);
    var q = j.dentro ? j.casa : j.pTotal >= 1 ? 1 : 0;
    if (q === ultimoQ) return;
    ultimoQ = q;
    var op = limitar((q - 0.012) / (TROCA - 0.012)); // ...depois a casa entra (cruzam só um pouquinho, sem letras sobrepostas)
    if (op !== ultimaOp) { ultimaOp = op; camada.style.opacity = op; }
    var p = limitar((q - TROCA) / (1 - TROCA));
    pintar(p);
    if (C3) {
      // de onde o bloco da casa sai: o lugar/tamanho/ângulo do Blocão no fim do "L" (calculado pela cena do bloco)
      if (window.ImperioCena && window.ImperioCena.alvoFinal) C3.guiaTela(window.ImperioCena.alvoFinal());
      C3.progresso(p);
    }
  }

  function iniciar3D() {
    if (carregando || !temWebGL()) return;
    carregando = true;
    var canvas = document.createElement("canvas");
    canvas.className = "casa__canvas";
    canvas.setAttribute("aria-hidden", "true");
    palco.appendChild(canvas);
    import("./casa3d.js?v=20261103b")
      .then(function () { return window.ImperioCasa3D.iniciar(canvas); })
      .then(function () {
        C3 = window.ImperioCasa3D;
        C3.aoDesenhar(aoDesenhar);
        // paredes móveis: com a casa pronta, tocar numa parede tira ela e a câmera entra pela abertura
        corte = camada.querySelector("[data-casa-corte]");
        var passeioEl = camada.querySelector("[data-casa-passeio]");
        var botaoAndar = camada.querySelector("[data-casa-andar]");
        var estavaDentro = false;
        C3.aoInterior(function (e) {
          var dentro = !!e.dentro && !C3.emTour(); // parede tirada por um ponto estratégico não é "entrar na casa"
          camada.classList.toggle("casa--dentro", dentro);
          if (passeioEl) passeioEl.hidden = !dentro;
          atualizarAndar();
          // tocou numa parede por dentro: aviso rápido do que aparece no corte
          if (e.corte) avisoCorte();
          // etiqueta "Dentro do Blocão" presa no corte, quando a câmera termina de entrar (só na entrada)
          if (dentro === estavaDentro) return;
          estavaDentro = dentro;
          clearTimeout(timerCorte);
          if (corte) corte.hidden = true;
          if (corte && e.dentro) timerCorte = setTimeout(posicionarCorte, 1400);
        });
        function atualizarAndar() {
          var info = C3.passeioInfo();
          if (!botaoAndar) return;
          botaoAndar.hidden = !info || info.andares < 2;
          if (info) {
            // seta desenhada (svg do botão) vira pra baixo no andar de cima
            botaoAndar.classList.toggle("casa__botao--desce", !!info.andar);
            botaoAndar.querySelector("span").textContent = info.andar ? "Ir pro térreo" : "Andar de cima";
          }
        }
        ligarToque();
        ligarMargens();
        ligarTour();
        ligarVantagens();
        if (botaoAndar) botaoAndar.addEventListener("click", function () { C3.trocarAndar(); atualizarAndar(); if (corte) corte.hidden = true; });
        var rec = camada.querySelector("[data-casa-recolocar]");
        if (rec) rec.addEventListener("click", function () { C3.recolocar(); });
        // Esc: sai da casa / para o tour
        document.addEventListener("keydown", function (ev) {
          if (ev.key !== "Escape") return;
          if (C3.emTour()) C3.pararTour();
          else if (camada.classList.contains("casa--dentro")) C3.recolocar();
        });
        var marcado = botoesTipo.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })[0];
        if (marcado) C3.tipo(marcado.getAttribute("data-casa-tipo"));
        montarEtapas();
        camada.classList.add("casa--3d");
        ultimoQ = -1;
        atualizar(window.ImperioMotion && window.ImperioMotion.jornada());
      })
      .catch(function (erro) {
        console.warn("[Império] casa 3D indisponível:", erro);
        canvas.remove();
        semCasa();
      });
  }

  /**
   * Celular: a maquete é enquadrada no espaço LIVRE entre o cabeçalho e o bloco de texto (medido de verdade,
   * muda quando aparece o botão, o cartão etc.) — nenhum texto fica na frente da casa.
   */
  function ligarMargens() {
    var txt = camada.querySelector(".casa__txt");
    var cab = document.querySelector("[data-cabecalho]");
    var medir = function () {
      if (!C3 || !C3.margens) return;
      var r = camada.getBoundingClientRect();
      var t = txt.getBoundingClientRect();
      var topo = (cab ? cab.offsetHeight : 64) + 12;
      C3.margens(topo, Math.max(0, r.height - (t.top - r.top)) + 12);
    };
    if (window.ResizeObserver) new ResizeObserver(medir).observe(txt);
    window.addEventListener("resize", medir, { passive: true });
    medir();
  }

  var corte = null;
  var timerCorte = 0;
  /** etiqueta "Dentro do Blocão" presa no corte (some se o corte sai da tela) */
  function posicionarCorte() {
    if (!corte || !C3) return;
    var pt = C3.pontoCorte();
    var r = camada.getBoundingClientRect();
    if (!pt || pt.x < r.left + 8 || pt.x > r.right - 8 || pt.y < r.top + 80 || pt.y > r.bottom - 120) { corte.hidden = true; return; }
    corte.style.left = Math.round(Math.min(r.width - 150, Math.max(12, pt.x - r.left))) + "px";
    corte.style.top = Math.round(pt.y - r.top) + "px";
    corte.hidden = false;
  }

  /**
   * Dedo/mouse na maquete: arrastar pro lado GIRA a casa (dentro dela, vira o olhar); arrastar na vertical continua
   * rolando a página (touch-action: pan-y); toque parado tira a parede tocada. No mouse, arrastar também inclina.
   */
  function ligarToque() {
    var pts = {};          // dedos/mouse na tela: id → { x, y }
    var x0 = 0, y0 = 0, xa = 0, ya = 0, ta = 0, girando = false, vertical = false, pinca = false, distA = 0, cyA = 0, tipoPt = "";
    var dentro = function () { return camada.classList.contains("casa--dentro"); };
    // maquete pronta na tela: o dedo mexe SÓ na maquete (gira e inclina), a página não rola por cima dela
    var maquete = function () { return camada.classList.contains("casa--maquete"); };
    var nPts = function () { return Object.keys(pts).length; };
    function centroY() {
      var l = Object.keys(pts).map(function (k) { return pts[k].y; });
      return l.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, l.length);
    }
    function distancia() {
      var l = Object.keys(pts).map(function (k) { return pts[k]; });
      return l.length < 2 ? 0 : Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y);
    }
    palco.addEventListener("pointerdown", function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      tipoPt = e.pointerType;
      if (e.pointerType === "mouse" || dentro()) { try { palco.setPointerCapture(e.pointerId); } catch (er) { /* sem captura */ } }
      if (nPts() === 1) { girando = false; vertical = false; pinca = false; x0 = xa = e.clientX; y0 = ya = e.clientY; ta = e.timeStamp; }
      else if (nPts() === 2) { pinca = true; girando = false; distA = distancia(); cyA = centroY(); C3.soltar(); } // 2 dedos: zoom só no 3D
    });
    palco.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinca) {
        var d = distancia();
        var cy = centroY();
        if (distA > 0 && d > 0) C3.pinca(d / distA, cyA - cy); // abrir/fechar = frente/trás; 2 dedos subindo = o drone sobe
        distA = d;
        cyA = cy;
        if (corte) corte.hidden = true;
        return;
      }
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (!girando && !vertical && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        // por dentro qualquer arrasto vira o olhar; por fora, na vertical a página rola (a obra anda)
        // arrastar pro lado gira (por fora a maquete, por dentro a vista em volta do ponto); na vertical a página rola
        // (com a maquete completa na tela, o dedo mexe só nela)
        if ((maquete() && !dentro()) || tipoPt === "mouse" || Math.abs(dx) > Math.abs(dy)) girando = true;
        else vertical = true;
        if (girando) camada.classList.add("casa--girando");
      }
      if (girando) C3.girar(e.clientX - xa, (maquete() && !dentro()) || tipoPt === "mouse" ? e.clientY - ya : 0, e.timeStamp - ta);
      xa = e.clientX; ya = e.clientY; ta = e.timeStamp;
    });
    function soltar(e, cancelado) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      if (nPts() > 0) return; // ainda tem dedo na tela (fim de pinça)
      camada.classList.remove("casa--girando");
      if (girando) C3.soltar(); // inércia: continua girando e vai parando
      var parado = !cancelado && !girando && !vertical && !pinca && Math.abs(e.clientX - x0) < 10 && Math.abs(e.clientY - y0) < 10;
      pinca = false;
      if (!parado) return;
      var eraDentro = dentro();
      C3.tocar(e.clientX, e.clientY); // por fora tira a parede; por dentro voa até o ponto (ou tira a parede tocada)
      if (eraDentro && corte) { corte.hidden = true; clearTimeout(timerCorte); timerCorte = setTimeout(posicionarCorte, 750); }
    }
    palco.addEventListener("pointerup", function (e) { soltar(e, false); });
    palco.addEventListener("pointercancel", function (e) { soltar(e, true); }); // o navegador assumiu a rolagem
    // roda do mouse: por dentro anda pra frente/trás; por fora, Ctrl + roda (ou pinça do touchpad) aproxima a maquete
    palco.addEventListener("wheel", function (e) {
      if (!e.ctrlKey || dentro()) return; // roda normal = rolar a página (por fora a obra continua; por dentro sai da casa)
      e.preventDefault();
      C3.pinca(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
      if (corte) corte.hidden = true;
    }, { passive: false });
  }

  /** aviso "Dentro do Blocão" ao tirar uma parede por dentro (some sozinho) */
  var timerAviso = 0;
  function avisoCorte() {
    var a = camada.querySelector("[data-casa-aviso]");
    if (!a) return;
    a.hidden = false;
    a.classList.remove("entra");
    void a.offsetWidth;
    a.classList.add("entra");
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { a.hidden = true; }, 3200);
  }

  /** Tour: botão "Tour pela casa" (casa pronta), legendas do sobrevoo e "Parar o tour" */
  function ligarTour() {
    var legenda = camada.querySelector("[data-casa-legenda]");
    var barra = camada.querySelector("[data-casa-tourbarra]");
    C3.aoTour(function (e) {
      camada.classList.toggle("casa--tour", e.ativo);
      if (barra) barra.hidden = !e.ativo || !!e.site; // tour do site: as vantagens estão nos quadros, sem legenda
      if (!legenda || e.site) return;
      if (!e.ativo || !e.legenda) { legenda.hidden = !e.ativo; if (!e.ativo) legenda.textContent = ""; return; }
      legenda.hidden = false;
      legenda.textContent = e.legenda;
      legenda.classList.remove("entra");
      void legenda.offsetWidth;
      legenda.classList.add("entra");
    });
    camada.querySelectorAll("[data-casa-tour]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (corte) corte.hidden = true;
        if (!C3.tour()) return;
        camada.classList.remove("casa--dentro");
        var pe = camada.querySelector("[data-casa-passeio]");
        if (pe) pe.hidden = true;
      });
    });
    var parar = camada.querySelector("[data-casa-parar-tour]");
    if (parar) parar.addEventListener("click", function () { C3.pararTour(); });
  }

  /** Nível "estatica": os botões trocam a imagem pronta de cada casa. */
  function ligarImagens() {
    var img = camada.querySelector(".casa__estatica");
    var FICHAS = { simples: "Casa térrea 6,5 × 7,5 m · 2 quartos · ≈ 49 m²", media: "Sobrado 9 × 7 m · 2 andares · ≈ 125 m²", casarao: "Casarão 15 × 10 m · 2 andares · piscina · ≈ 285 m²" };
    botoesTipo.forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-casa-tipo");
        img.src = "assets/img/casa-" + id + ".webp";
        if (ficha) ficha.textContent = FICHAS[id];
      });
    });
  }

  /** Sem 3D fora do nível "estatica": a fase da casa sai e o "Por dentro" volta a ter só o "L". */
  function semCasa() {
    if (jornadaEl) jornadaEl.classList.add("jornada--sem-casa");
    if (camada) camada.hidden = true;
    window.dispatchEvent(new Event("resize"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    camada = document.querySelector("[data-casa]");
    if (!camada) return;
    jornadaEl = camada.closest("[data-jornada]");
    ancora = jornadaEl && jornadaEl.querySelector(".jornada__ancora-casa");
    palco = camada.querySelector("[data-casa-palco]");
    etapas = Array.prototype.slice.call(camada.querySelectorAll("[data-etapa]"));
    contador = camada.querySelector("[data-casa-contador]");
    ficha = camada.querySelector("[data-casa-ficha]");
    botoesTipo = Array.prototype.slice.call(camada.querySelectorAll("[data-casa-tipo]"));
    botoesTipo.forEach(function (b) {
      b.addEventListener("click", function () { escolherTipo(b.getAttribute("data-casa-tipo")); });
    });
    if (parado) { camada.classList.add("casa--sem3d"); ligarImagens(); return; }
    if (!temWebGL()) { semCasa(); return; }
    pintar(0);
    // prepara a casa num momento ocioso (não no meio da rolagem): celular antigo não engasga
    var quandoOcioso = function () {
      if (window.requestIdleCallback) window.requestIdleCallback(iniciar3D, { timeout: 1200 });
      else setTimeout(iniciar3D, 60);
    };
    if (window.__gravandoVideo) iniciar3D();
    else {
      // a casa é preparada só com a página PARADA (nunca no meio da rolagem) e só depois que o Blocão já está na tela:
      // ~5 s depois de abrir, ou quando o visitante chega no meio do "L"; se ele correr até a casa antes, prepara na hora
      var ultimaRolagem = 0;
      window.addEventListener("scroll", function () { ultimaRolagem = Date.now(); }, { passive: true });
      var tentar = function () {
        if (carregando) return;
        if (Date.now() - ultimaRolagem < 700) { setTimeout(tentar, 1000); return; }
        quandoOcioso();
      };
      // prepara cedo (assim que a página fica parada depois de abrir): quem rola rápido até a casa não pega a montagem no caminho
      window.addEventListener("load", function () { setTimeout(tentar, 1500); }, { once: true });
      if (window.ImperioMotion) window.ImperioMotion.aoRolar(function (j) {
        if (carregando || !j || !j.dentro) return;
        if (j.casa > 0) iniciar3D();
        else if (j.p > 0.02) tentar();
      });
    }
    if (window.ImperioMotion) window.ImperioMotion.aoRolar(atualizar);
    window.addEventListener("resize", function () { ultimoQ = -1; ancoraFim = -1; }, { passive: true });
  });

  window.ImperioCasa = {
    /** voo do Blocão do site até a obra (lido pela cena do bloco a cada quadro da fase da casa) */
    voo: function () { return C3 && C3.voo ? C3.voo() : null; },
    /** troca o tipo de casa (vídeo e testes) */
    tipo: function (id) { escolherTipo(id); },
    pronto: function () { return parado || !camada || camada.hidden || camada.classList.contains("casa--sem3d") || !!C3; },
    /** vídeo quadro a quadro: lê a rolagem e desenha já */
    atualizarAgora: function () {
      if (!C3) return;
      ultimoQ = -1;
      atualizar(window.ImperioMotion && window.ImperioMotion.jornada());
      C3.renderAgora();
    },
  };
})();
