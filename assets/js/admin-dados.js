/**
 * Camada de dados do painel. Duas fontes com a mesma interface:
 *  - Supabase (real): login de admin + tabelas de supabase/schema.sql.
 *  - Demonstração: cenário fictício em memória pra apresentar ao cliente
 *    antes de ligar o banco (nada é gravado em lugar nenhum).
 */
(function () {
  "use strict";

  var cfg = window.IMPERIO_CONFIG || {};
  var demo = null;
  var modoDemo = false;

  /* ------------------------------------------------------------------ */
  /* Demonstração                                                        */
  /* ------------------------------------------------------------------ */
  var NOMES = ["Ana Paula", "Carlos Eduardo", "Marcos Vinícius", "Juliana", "Roberto", "Fernanda", "Paulo Henrique", "Luciana", "André", "Patrícia", "Ricardo", "Tatiane", "José Carlos", "Camila", "Diego", "Sônia", "Rafael", "Aline", "Gustavo", "Márcia"];
  var CIDADES = ["Itapetininga", "Itapetininga", "Itapetininga", "Sorocaba", "Angatuba", "Capão Bonito", "Guareí", "São Miguel Arcanjo", "Sarapuí", "Alambari"];
  var ORIGENS = ["https://www.instagram.com/", "https://www.instagram.com/", "https://www.google.com/", "", "https://wa.me/", "https://www.facebook.com/"];
  var PERFIS = ["construir", "construir", "reformar", "profissional"];

  function semente(s) { return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  function gerarDemo() {
    var r = semente(42);
    var pick = function (l) { return l[Math.floor(r() * l.length)]; };
    var agora = Date.now();
    var dia = 86400000;
    var quando = function (maxDias) {
      var d = new Date(agora - Math.floor(r() * maxDias) * dia);
      d.setHours(7 + Math.floor(r() * 14), Math.floor(r() * 60));
      return d.toISOString();
    };
    var visitas = [];
    var cliques = [];
    var clientes = [];
    var orcamentos = [];
    for (var i = 0; i < 1400; i++) {
      var vid = "v" + Math.floor(r() * 620);
      visitas.push({ criado_em: quando(60), visitante_id: vid, referencia: pick(ORIGENS), pagina: "/" });
    }
    for (var j = 0; j < 260; j++) cliques.push({ criado_em: quando(60), tipo: pick(["whatsapp", "whatsapp", "calculadora", "instagram", "promocao", "mapa"]), detalhe: "" });
    for (var k = 0; k < 64; k++) {
      var w = "1599" + String(1000000 + Math.floor(r() * 8999999)).slice(0, 7);
      clientes.push({ id: k + 1, nome: pick(NOMES) + " " + pick(["Silva", "Souza", "Oliveira", "Lima", "Pereira", "Almeida"]), whatsapp: w, cidade: pick(CIDADES), perfil: pick(PERFIS), criado_em: quando(60) });
    }
    var blocos = (cfg.blocos || []).map(function (b) { return b.nome; });
    for (var m = 0; m < 92; m++) {
      var c = r() < 0.7 ? pick(clientes) : null;
      var area = Math.round((40 + r() * 260) * 100) / 100;
      orcamentos.push({
        id: m + 1,
        nome: c ? c.nome : "",
        whatsapp: c ? c.whatsapp : "",
        cidade: c ? c.cidade : "",
        bloco: pick(blocos.concat([blocos[2], blocos[2]])),
        area_m2: area,
        blocos_estimados: null,
        status: pick(["novo", "novo", "atendendo", "atendendo", "fechado", "perdido"]),
        criado_em: quando(60),
      });
    }
    return {
      visitas: visitas,
      cliques: cliques,
      clientes: clientes,
      orcamentos: orcamentos,
      promocoes: (cfg.promocoesPadrao || []).map(function (p, i) { return Object.assign({ id: i + 1, ativo: true, ordem: i }, p); }),
      galeria: (cfg.galeriaPadrao || []).map(function (g, i) { return Object.assign({ id: i + 1, ativo: true, ordem: i }, g); }),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Supabase                                                            */
  /* ------------------------------------------------------------------ */
  function sb() { return window.ImperioSupabase.cliente(true); }

  async function tabela(nome, desde, ordem) {
    var c = await sb();
    var q = c.from(nome).select("*");
    if (desde) q = q.gte("criado_em", desde);
    q = q.order(ordem || "criado_em", { ascending: ordem === "ordem" }).limit(10000);
    var r = await q;
    if (r.error) throw r.error;
    return r.data || [];
  }

  function checar(r) { if (r.error) throw r.error; return r.data; }

  var API = {
    configurado: function () { return !!(window.ImperioSupabase && window.ImperioSupabase.pronto); },
    demo: function () { return modoDemo; },

    entrarDemo: function () { modoDemo = true; demo = gerarDemo(); },

    entrar: async function (email, senha) {
      var c = await sb();
      checar(await c.auth.signInWithPassword({ email: email, password: senha }));
      var adm = checar(await c.rpc("is_admin"));
      if (!adm) {
        await c.auth.signOut();
        throw new Error("Este usuário não tem acesso ao painel.");
      }
      modoDemo = false;
    },

    sessaoAtiva: async function () {
      if (!API.configurado()) return false;
      var c = await sb();
      var s = await c.auth.getSession();
      if (!s.data.session) return false;
      return !!checar(await c.rpc("is_admin"));
    },

    sair: async function () {
      if (modoDemo) { modoDemo = false; demo = null; return; }
      var c = await sb();
      await c.auth.signOut();
    },

    carregar: async function () {
      if (modoDemo) return demo;
      var desde = new Date(Date.now() - 120 * 86400000).toISOString();
      var r = await Promise.all([
        tabela("paginas_vistas", desde),
        tabela("cliques", desde),
        tabela("clientes"),
        tabela("orcamentos"),
        tabela("promocoes", null, "ordem"),
        tabela("galeria", null, "ordem"),
      ]);
      return { visitas: r[0], cliques: r[1], clientes: r[2], orcamentos: r[3], promocoes: r[4], galeria: r[5] };
    },

    mudarStatus: async function (id, status) {
      if (modoDemo) { demo.orcamentos.forEach(function (o) { if (o.id === id) o.status = status; }); return; }
      var c = await sb();
      checar(await c.from("orcamentos").update({ status: status }).eq("id", id));
    },

    salvar: async function (nomeTabela, linha) {
      if (modoDemo) {
        var lista = demo[nomeTabela];
        if (linha.id) {
          lista.forEach(function (l, i) { if (l.id === linha.id) lista[i] = Object.assign({}, l, linha); });
        } else {
          linha.id = Date.now();
          linha.criado_em = new Date().toISOString();
          lista.unshift(linha);
        }
        return linha;
      }
      var c = await sb();
      var id = linha.id;
      var dados = Object.assign({}, linha);
      delete dados.id;
      delete dados.criado_em;
      if (id) return checar(await c.from(nomeTabela).update(dados).eq("id", id).select().single());
      return checar(await c.from(nomeTabela).insert(dados).select().single());
    },

    remover: async function (nomeTabela, id) {
      if (modoDemo) { demo[nomeTabela] = demo[nomeTabela].filter(function (l) { return l.id !== id; }); return; }
      var c = await sb();
      checar(await c.from(nomeTabela).delete().eq("id", id));
    },

    /** Envia a foto pro bucket "fotos" e devolve a URL pública. */
    enviarFoto: async function (arquivo) {
      if (modoDemo) return URL.createObjectURL(arquivo);
      var c = await sb();
      var ext = (arquivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      var caminho = new Date().toISOString().slice(0, 10) + "/" + Date.now().toString(36) + "." + ext;
      checar(await c.storage.from("fotos").upload(caminho, arquivo, { cacheControl: "31536000", contentType: arquivo.type }));
      return c.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
    },
  };

  window.ImperioAdminDados = API;
})();
