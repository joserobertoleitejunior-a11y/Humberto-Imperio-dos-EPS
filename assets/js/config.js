/**
 * Configuração central do site Império do EPS.
 * ÚNICO lugar a editar quando contato, produtos da ficha técnica,
 * promoções padrão ou as credenciais públicas do Supabase mudarem.
 * O resto do site (e o painel) lê daqui.
 */
window.IMPERIO_CONFIG = {
  nome: "Império do EPS",
  slogan: "Blokão Sanduíche",

  // Fonte: bio e artes do Instagram oficial (@humbertoimperioeps).
  whatsappNumero: "5515991212917",
  whatsappExibicao: "(15) 99121-2917",
  whatsappMensagemPadrao: "Olá! Vim pelo site do Império do EPS e quero um orçamento.",

  instagramUrl: "https://www.instagram.com/humbertoimperioeps/",
  instagramUsuario: "@humbertoimperioeps",
  facebookUrl: "", // PENDENTE: criar página da empresa (hoje o perfil aponta pra um perfil pessoal)

  cidade: "Itapetininga-SP",
  areaAtendimento: "Itapetininga e região",
  enderecoCompleto: "", // PENDENTE: endereço da fábrica/showroom (Vinicius)
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Itapetininga+SP",

  /**
   * Ficha técnica do Blokão (composição publicada no catálogo técnico do
   * próprio Instagram). Espessuras em cm.
   */
  blocos: [
    { id: "b10", nome: "Blokão 10 cm", total: 10, concreto: 2.5, eps: 5, uso: "Paredes internas e divisórias" },
    { id: "b13", nome: "Blokão 13 cm", total: 13, concreto: 3.5, eps: 6, uso: "Paredes internas com mais isolamento" },
    { id: "b15", nome: "Blokão 15 cm", total: 15, concreto: 3.5, eps: 8, uso: "Paredes externas de casas" },
    { id: "b20", nome: "Blokão 20 cm", total: 20, concreto: 3.5, eps: 13, uso: "Máximo conforto térmico e acústico" },
  ],

  /**
   * Medida da face do bloco em METROS (largura × altura), usada pela
   * calculadora para estimar a quantidade de peças.
   * PENDENTE: confirmar com o Vinicius. Enquanto for null, a calculadora
   * mostra a área (m²) e a fábrica confirma a quantidade no WhatsApp.
   */
  medidaBloco: null, // ex.: { largura: 1.0, altura: 0.5 }
  perdaPercentual: 5,

  /** Promoção exibida quando o banco ainda não tem nenhuma cadastrada. */
  promocoesPadrao: [
    {
      titulo: "Condições especiais para o Loteamento Pacaembu",
      descricao: "Morador do Pacaembu tem desconto exclusivo no Blokão e projeto em parceria com Alex Martins Arquitetura.",
      selo: "Exclusivo",
      validade: null,
      imagem_url: "",
    },
  ],

  /** Fotos exibidas enquanto a galeria do banco estiver vazia. */
  galeriaPadrao: [
    {
      titulo: "Paredes em Blokão subindo",
      categoria: "obra",
      cidade: "Itapetininga-SP",
      imagem_url: "assets/img/obra-paredes-blokao.webp",
    },
  ],

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
