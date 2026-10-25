/**
 * Configuração central do site Império do EPS.
 * ÚNICO lugar a editar quando contato, produtos da ficha técnica,
 * promoções padrão ou as credenciais públicas do Supabase mudarem.
 * O resto do site (e o painel) lê daqui.
 */
window.IMPERIO_CONFIG = {
  nome: "Império do EPS",
  slogan: "Fábrica do Blocão",

  // Fonte: bio e artes do Instagram oficial (@humbertoimperioeps).
  whatsappNumero: "5515991212917",
  whatsappExibicao: "(15) 99121-2917",
  whatsappMensagemPadrao: "Olá! Vim pelo site do Império do EPS e quero um orçamento.",

  email: "", // PENDENTE: e-mail da empresa (vazio = o atalho de e-mail fica escondido)
  instagramUrl: "https://www.instagram.com/humbertoimperioeps/",
  instagramUsuario: "@humbertoimperioeps",
  facebookUrl: "", // PENDENTE: criar página da empresa (hoje o perfil aponta pra um perfil pessoal)

  cidade: "Itapetininga-SP",
  areaAtendimento: "Itapetininga e região",
  enderecoCompleto: "", // PENDENTE: endereço da fábrica/showroom (Vinicius)
  // Google: pesquisa pelo nome (mostra Perfil da Empresa, avaliações e rota quando existir).
  // Trocar pelo link curto do Perfil da Empresa (g.page/...) quando o Vinicius criar.
  googleUrl: "https://www.google.com/search?q=Imp%C3%A9rio+do+EPS+Itapetininga",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Itapetininga+SP",

  /**
   * Ficha técnica do Blocão (composição publicada no catálogo técnico do
   * próprio Instagram). Espessuras em cm.
   */
  blocos: [
    { id: "b10", nome: "Blocão 10 cm", total: 10, concreto: 2.5, eps: 5, uso: "Paredes internas e divisórias" },
    { id: "b13", nome: "Blocão 13 cm", total: 13, concreto: 3.5, eps: 6, uso: "Paredes internas com mais isolamento" },
    { id: "b15", nome: "Blocão 15 cm", total: 15, concreto: 3.5, eps: 8, uso: "Paredes externas de casas" },
    { id: "b20", nome: "Blocão 20 cm", total: 20, concreto: 3.5, eps: 13, uso: "Máximo conforto térmico e acústico" },
  ],

  /**
   * Medida da face do bloco em METROS (largura × altura), usada pela
   * calculadora para estimar a quantidade de peças.
   * PENDENTE: confirmar com o Vinicius. Enquanto for null, a calculadora
   * mostra a área (m²) e a fábrica confirma a quantidade no WhatsApp.
   */
  medidaBloco: null, // ex.: { largura: 1.0, altura: 0.5 }
  perdaPercentual: 5,

  /**
   * Peso REAL de cada bloco (kg), pesado na fábrica — PENDENTE com o Vinicius.
   * Ex.: { b10: 0, b13: 0, b15: 0, b20: 0 }. Quando preenchido, substitui a estimativa.
   */
  pesos: {},

  /**
   * Densidades típicas (kg/m³) usadas SÓ pra estimar o peso enquanto `pesos` não vem
   * (e só aparecem quando `medidaBloco` estiver preenchida). Ajustar com o traço da fábrica.
   */
  densidades: { concreto: 2400, eps: 15 },

  /** Promoção exibida quando o banco ainda não tem nenhuma cadastrada. */
  promocoesPadrao: [
    {
      titulo: "Condições especiais para o Loteamento Pacaembu",
      descricao: "Morador do Pacaembu tem desconto exclusivo no Blocão e projeto em parceria com Alex Martins Arquitetura.",
      selo: "Exclusivo",
      validade: null,
      imagem_url: "",
    },
  ],

  /** Fotos exibidas enquanto a galeria do banco estiver vazia. */
  galeriaPadrao: [
    {
      titulo: "Paredes em Blocão subindo",
      categoria: "obra",
      cidade: "Itapetininga-SP",
      imagem_url: "assets/img/obra-paredes-blocao.webp",
    },
  ],

  /**
   * Arte dos 6 quadros do tour da casa (as vantagens nas paredes): uma imagem com 3 colunas × 2 linhas, na ordem
   * Obra rápida · Bem mais leve · Casa mais fresca / Mais silêncio · Sem mofo · Acabamento fácil.
   * Arte atual: gerada no Gemini (recortada do print, cantos limpos). Vazio = os quadros são desenhados pelo site.
   */
  quadrosVantagens: "assets/img/quadros-vantagens.webp?v=20261103d",

  // Supabase (banco do painel). A anon key NÃO é segredo — a proteção é o
  // RLS (ver supabase/schema.sql). Vazio = site funciona só com WhatsApp
  // e o painel abre em modo demonstração.
  supabase: {
    url: "",
    anonKey: "",
  },

  // Sentry (observabilidade). Vazio = desligado. Ver PADROES-AGENCIA.md §3.1.
  sentryDsn: "",
};
