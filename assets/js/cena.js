/**
 * Liga a rolagem da página ao Blocão 3D (bloco3d.js).
 * - Só baixa o Three.js depois que a página abriu (load + ocioso): não atrasa a primeira tela.
 * - PC: um único <canvas> fixo atrás do conteúdo serve à hero E à jornada em "L"
 *   (o bloco "viaja" de uma pra outra sem corte). Seções com fundo próprio cobrem o canvas.
 * - CELULAR: o canvas MORA dentro do que rola (palco da hero → parte fixa da jornada). Assim quem move o
 *   bloco é o próprio navegador, junto com a página (canvas fixo + JS sempre fica 1-2 quadros atrás
 *   da rolagem do celular e o bloco "escorrega").
 * - Fora da hero/jornada o desenho para (0 % de GPU).
 * - Sem WebGL ou nível "estatica": ficam as imagens prontas (assets/img/bloco-*.webp).
 */
(function () {
  "use strict";

  // altura estável da tela (dispositivo.js): a barra de endereço do celular não mexe no 3D
  function alturaTela() { return window.ImperioTela ? window.ImperioTela.altura() : window.innerHeight; }

  var html = document.documentElement;
  var nivel = html.getAttribute("data-qualidade");
  var B = null;
  var canvas = null;
  var heroVisivel = true;

  function limitar(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function suave(x) { x = limitar(x); return x * x * (3 - 2 * x); }
  function mix(a, b, t) { return a + (b - a) * t; }

  function temWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  function alvoHero() {
    var a = document.querySelector('[data-ancora="hero"]');
    var r = a.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height * 0.52, larg: r.width * 0.9, abertura: 0, giro: -0.55, inclinar: 0.3 };
  }

  /**
   * Roteiro do bloco na jornada (p = 0..1 da seção):
   *   0,00–0,08  chega e vira de lado
   *   0,08–0,22  VISTA EXPLODIDA (só demonstração: no bloco real o concreto NÃO solta do EPS): as peças se afastam
   *   0,26–0,38  ABRE AO MEIO (já desmontado: 6 peças, corte à mostra)
   *   0,42–0,50  fecha o corte (continua desmontado) — curva do "L"
   *   0,50–1,00  horizontal: cada ficha acende a sua peça; na ficha do bloco real as peças se juntam de novo
   */
  function alvoJornada(j) {
    var w = window.innerWidth;
    var h = alturaTela();
    var celular = w < 760;
    var p = j.p;
    var sep = suave((p - 0.08) / 0.14);
    var aberto = suave((p - 0.26) / 0.12) * (1 - suave((p - 0.42) / 0.08));
    var curva = suave((p - 0.42) / 0.12);
    var foco = curva > 0.5 && j.foco !== undefined ? j.foco : -1;
    if (foco >= 3) sep = 0; // ficha "Montado" (e o convite final): o bloco volta a ser um só
    var giro = mix(-0.55, -1.05, sep);
    giro = mix(giro, -0.12, aberto);
    giro = mix(giro, foco >= 3 ? -0.5 : -0.95, curva);
    // celular: o bloco fica na "zona" de cima; os botões e o texto ficam embaixo (CSS --zona), sem sobrepor
    var zona = Math.max(h * 0.44, 310);
    var cm = 68 + (zona - 68) * 0.58;
    var v = {
      separacao: sep,
      abertura: aberto,
      cx: mix(w * (celular ? 0.5 : 0.64), w * (celular ? 0.5 : 0.68), curva),
      cy: celular ? cm : mix(h * 0.58, h * 0.36, curva),
      larg: celular
        ? Math.min(w * (mix(0.72, 0.66, curva) - 0.2 * aberto), (zona - 68) * 0.98) // maior no celular; encolhe só aberto ao meio (ocupa mais largura)
        : Math.min(mix(Math.min(w * 0.4, 640), Math.min(w * 0.32, 500), curva), h * 0.72), // tela baixa (celular deitado): bloco cabe na altura
      giro: giro,
      inclinar: mix(0.28, 0.2, aberto),
      dim0: foco >= 0 && foco <= 2 && foco !== 0 ? 1 : 0,
      dim1: foco >= 0 && foco <= 2 && foco !== 1 ? 1 : 0,
      dim2: foco >= 0 && foco <= 2 && foco !== 2 ? 1 : 0,
    };
    v.rotulos = sep * (1 - suave((p - 0.24) / 0.05)) * (1 - curva); // etiquetas só com o bloco desmontado e ainda inteiro
    return v;
  }

  function espessuraEscolhida() {
    var b = window.ImperioEspessura && window.ImperioEspessura.atual();
    return b ? b.total : 15;
  }

  /* ---------- Celular: canvas dentro do palco da hero ou da parte fixa da jornada ---------- */
  var celular = false;
  var casa = null;          // elemento onde o canvas está agora
  var palco = null;
  var fixo = null;
  var palcoVisivel = true;
  var tamPalco = null;      // medidas em cache (só mudam no resize)
  var fundoPalco = null;    // fundo do palco da hero, em px da página (cache: ler a posição a cada quadro travava)

  function modoCelular() { return window.innerWidth < 760; }

  function morarEm(el) {
    if (casa === el) return;
    casa = el;
    el.appendChild(canvas);
    tamPalco = null;
    B.redimensionar();
  }

  function trocarModo() {
    celular = modoCelular();
    canvas.classList.toggle("palco3d--local", celular);
    if (!celular) { casa = null; document.body.appendChild(canvas); B.redimensionar(); }
  }

  /**
   * Fase da casa: o PRÓPRIO Blocão voa (sem cópia → sem "fantasma") do lugar onde terminou o "L" até o canto da
   * obra, por cima da maquete; quando assenta, some e a casa mostra o 1º bloco no mesmíssimo lugar.
   * Devolve null fora da fase da casa; { visivel } dentro dela (alvo já ajustado).
   */
  function vooDaCasa(j, alvo) {
    if (!j || !(j.casa > 0)) return null;
    var v = window.ImperioCasa && window.ImperioCasa.voo ? window.ImperioCasa.voo() : null;
    if (!v) return { visivel: j.casa < 0.06 }; // casa ainda carregando: o bloco só sai de cena
    ["cx", "cy", "larg", "giro", "inclinar"].forEach(function (k) { alvo[k] = mix(alvo[k], v.alvo[k], v.e); });
    alvo.separacao = 0;
    alvo.abertura = 0;
    alvo.dim0 = alvo.dim1 = alvo.dim2 = 0;
    alvo.rotulos = 0;
    return { visivel: v.e < 1 };
  }

  var ultimaFaseCasa = false;
  /** a fase da casa muda o tamanho do canvas no celular (ocupa a tela toda pra o bloco voar até a obra) */
  function conferirFaseCasa(j) {
    var f = !!(j && j.casa > 0);
    if (f === ultimaFaseCasa) return;
    ultimaFaseCasa = f;
    B.redimensionar();
  }

  function atualizarCelular(j) {
    // confere a posição de verdade (o observador às vezes não avisa quando a página rola logo depois de abrir)
    if (palco && j && j.dentro) {
      if (fundoPalco === null) fundoPalco = palco.getBoundingClientRect().bottom + window.scrollY; // 1× por resize
      palcoVisivel = fundoPalco - window.scrollY > 56;
    }
    var naJornada = j && j.dentro && j.entrada > 0 && !palcoVisivel;
    morarEm(naJornada ? fixo : palco);
    var alvo;
    var voo = null;
    if (naJornada) {
      alvo = alvoJornada(j);  // coordenadas da parte fixa = da tela quando ela gruda no topo
      conferirFaseCasa(j);
      voo = vooDaCasa(j, alvo);
    } else {
      if (!tamPalco) tamPalco = { pw: palco.offsetWidth, ph: palco.offsetHeight, cw: canvas.clientWidth, ch: canvas.clientHeight };
      var t = tamPalco;
      alvo = { cx: t.cw / 2, cy: t.ch / 2 + t.ph * 0.02, larg: t.pw * 0.9, abertura: 0, giro: -0.55, inclinar: 0.3, separacao: 0, dim0: 0, dim1: 0, dim2: 0, rotulos: 0 };
    }
    alvo.espessura = espessuraEscolhida();
    if (areaToque && naJornada) {
      var chave = Math.round(alvo.cx) + "," + Math.round(alvo.cy) + "," + Math.round(alvo.larg);
      if (chave !== ultimaArea) {
        ultimaArea = chave;
        areaToque.style.setProperty("--bx", alvo.cx + "px");
        areaToque.style.setProperty("--by", alvo.cy + "px");
        areaToque.style.setProperty("--bw", alvo.larg + "px");
      }
    }
    var opRotulos = naJornada ? alvo.rotulos : 0;
    if (rotulos && opRotulos !== ultimaOpRot) { ultimaOpRot = opRotulos; rotulos.style.opacity = opRotulos; }
    var visivel = naJornada ? (voo ? voo.visivel : true) : palcoVisivel;
    if (visivel !== ultimaVis) { ultimaVis = visivel; canvas.style.opacity = visivel ? 1 : 0; }
    B.pausar(!visivel);
    B.respirar(!naJornada);
    delete alvo.rotulos;
    if (voo && visivel) B.instantaneo(alvo); // voo preso à rolagem, sem atraso: assenta exatamente no lugar
    else B.estado(alvo);
  }

  function atualizar(j) {
    if (!B) return;
    if (celular !== modoCelular()) trocarModo();
    if (celular) return atualizarCelular(j);
    var hero = alvoHero();
    var dentroJ = j && j.dentro;
    var e = j ? suave(j.entrada) : 0;
    var alvo = Object.assign({ separacao: 0, dim0: 0, dim1: 0, dim2: 0 }, hero);
    var opRotulos = 0;
    if (dentroJ && e > 0) {
      var jj = alvoJornada(j);
      ["cx", "cy", "larg", "abertura", "giro", "inclinar", "separacao", "dim0", "dim1", "dim2"].forEach(function (k) { alvo[k] = mix(alvo[k], jj[k], e); });
      opRotulos = jj.rotulos * e;
    }
    alvo.espessura = espessuraEscolhida();
    var voo = dentroJ ? vooDaCasa(j, alvo) : null;
    if (voo) opRotulos = 0;
    // área de toque da jornada acompanha o bloco
    if (areaToque) {
      var chave = Math.round(alvo.cx) + "," + Math.round(alvo.cy) + "," + Math.round(alvo.larg);
      if (chave !== ultimaArea) {
        ultimaArea = chave;
        areaToque.style.setProperty("--bx", alvo.cx + "px");
        areaToque.style.setProperty("--by", alvo.cy + "px");
        areaToque.style.setProperty("--bw", alvo.larg + "px");
      }
    }
    if (rotulos && opRotulos !== ultimaOpRot) { ultimaOpRot = opRotulos; rotulos.style.opacity = opRotulos; }
    var visivel = heroVisivel || (dentroJ && (voo ? voo.visivel : true));
    if (visivel !== ultimaVis) { ultimaVis = visivel; canvas.style.opacity = visivel ? 1 : 0; }
    B.pausar(!visivel);
    B.respirar(heroVisivel && !dentroJ);
    if (voo && visivel) B.instantaneo(alvo); // voo preso à rolagem, sem atraso: assenta exatamente no lugar
    else B.estado(alvo);
  }

  /** Etiquetas (concreto / EPS / concreto) presas no topo de cada peça. */
  var rotulos = null;
  var areaToque = null;
  var larguras = [];
  var ultimaArea = "";
  var ultimaOpRot = -1;
  var ultimaVis = null;
  var larguraTela = 0;
  function posicionarRotulos(pos) {
    if (!rotulos || rotulos.style.opacity === "0") return;
    var itens = rotulos.querySelectorAll("[data-rot]");
    if (larguras.length && window.innerWidth !== larguraTela) { larguras = []; }
    larguraTela = window.innerWidth;
    pos.forEach(function (pt, k) {
      // escalonadas na altura (a do meio mais alta) pra não se sobreporem com o bloco de lado
      var sobe = (window.innerWidth < 760 ? [0, 26, 52] : [0, 40, 80])[k];
      if (!itens[k]) return;
      // etiqueta nunca sai da tela (largura medida uma vez por etiqueta)
      if (!larguras[k]) larguras[k] = itens[k].offsetWidth || 120;
      var larg = larguras[k];
      var x = Math.min(window.innerWidth - larg / 2 - 8, Math.max(larg / 2 + 8, pt.x));
      itens[k].style.transform = "translate3d(" + x.toFixed(1) + "px," + (pt.y - sobe).toFixed(1) + "px,0) translate(-50%,-115%)";
      itens[k].style.opacity = pt.visivel ? 1 : 0; // "Só EPS" / "Só concreto": some a etiqueta da peça escondida
    });
  }

  function iniciar() {
    if (B || !temWebGL()) return;
    canvas = document.createElement("canvas");
    canvas.className = "palco3d";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    import("./bloco3d.js?v=20261104b")
      .then(function () {
        B = window.ImperioBloco3D;
        return B.iniciar(canvas);
      })
      .then(function () {
        var heroEl = document.querySelector(".hero");
        if ("IntersectionObserver" in window && heroEl) {
          new IntersectionObserver(function (en) {
            heroVisivel = en[0].isIntersecting;
            atualizar(window.ImperioMotion && window.ImperioMotion.jornada());
          }).observe(heroEl);
        }
        rotulos = document.querySelector("[data-jornada-rotulos]");
        areaToque = document.querySelector(".jornada__toque");
        palco = document.querySelector('[data-ancora="hero"]');
        fixo = document.querySelector(".jornada__fixo");
        if ("IntersectionObserver" in window && palco) {
          new IntersectionObserver(function (en) {
            palcoVisivel = en[0].isIntersecting;
            atualizar(window.ImperioMotion && window.ImperioMotion.jornada());
          }, { rootMargin: "-56px 0px 0px 0px" }).observe(palco);
        }
        window.addEventListener("resize", function () { tamPalco = null; fundoPalco = null; }, { passive: true });
        window.addEventListener("load", function () { fundoPalco = null; }, { once: true });
        celular = !modoCelular(); // força a primeira arrumação em atualizar()
        B.aoPosicionar(posicionarRotulos);
        if (window.ImperioMotion) window.ImperioMotion.aoRolar(atualizar);
        if (window.ImperioEspessura) window.ImperioEspessura.aoMudar(function () { atualizar(window.ImperioMotion && window.ImperioMotion.jornada()); });
        B.renderAgora();
        requestAnimationFrame(function () { html.classList.add("com-3d"); });
      })
      .catch(function (erro) {
        console.warn("[Império] 3D indisponível, ficam as imagens:", erro);
        if (canvas) canvas.remove();
      });
  }

  if (nivel === "estatica") return;

  function quandoOcioso() {
    if (window.__gravandoVideo) return iniciar();
    if (window.requestIdleCallback) window.requestIdleCallback(iniciar, { timeout: 1500 });
    else setTimeout(iniciar, 400);
  }
  if (document.readyState === "complete") quandoOcioso();
  else window.addEventListener("load", quandoOcioso, { once: true });

  window.ImperioCena = {
    /** Vídeo quadro a quadro: recalcula a rolagem e desenha já. */
    atualizarAgora: function () {
      if (window.ImperioMotion) window.ImperioMotion.atualizarAgora();
      if (B) B.renderAgora();
      if (window.ImperioCasa) window.ImperioCasa.atualizarAgora();
    },
    // pronto = bloco 3D carregado (+ a casa 3D, só na gravação do vídeo: no site ela carrega quando a seção chega perto)
    /** Onde o Blocão termina o "L" (px na tela + ângulo): a casa começa o bloco dela EXATAMENTE aí. */
    alvoFinal: function () {
      var v = alvoJornada({ p: 1, foco: 4 });
      return { cx: v.cx, cy: v.cy, larg: v.larg, giro: v.giro, inclinar: v.inclinar };
    },
    pronto: function () { return !!B && (!window.__gravandoVideo || !window.ImperioCasa || window.ImperioCasa.pronto()); },
  };
})();
