import {
  LayoutDashboard,
  Armchair,
  IdCard,
  UtensilsCrossed,
  PackageCheck,
  Users,
  Truck,
  ListChecks,
  ChefHat,
  CookingPot,
  HandPlatter,
  PackageOpen,
  ShoppingCart,
  BarChart3,
  FolderCog,
  Settings,
  Wallet,
  BadgePercent,
  BotMessageSquare,
  GraduationCap,
  LifeBuoy,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type Modulo = {
  slug: string;
  rotulo: string;
  descricao: string;
  icone: LucideIcon;
  /** Tecla de atalho (ver docs/plano.md, "Princípios de interface") */
  atalho?: string;
  /** Fase do plano em que o módulo é construído */
  fase: number;
  /** Aparece na barra de acesso rápido */
  rapido?: boolean;
  /** Módulo desligado por enquanto: aparece apagado no menu, com este aviso */
  desabilitado?: string;
};

export const MODULOS: Modulo[] = [
  { slug: "", rotulo: "Dashboard", descricao: "Visão geral do restaurante em tempo real", icone: LayoutDashboard, fase: 0 },
  { slug: "mesas", rotulo: "Mesas", descricao: "Mapa do salão, comandas por mesa, parcial e fechamento", icone: Armchair, atalho: "F3", fase: 1, rapido: true },
  { slug: "comandas", rotulo: "Comandas", descricao: "Comandas individuais numeradas", icone: IdCard, atalho: "F11", fase: 1, rapido: true },
  { slug: "balcao", rotulo: "Balcão", descricao: "Venda para retirada ou entrega com cliente identificado", icone: UtensilsCrossed, atalho: "F4", fase: 1, rapido: true },
  { slug: "retiradas", rotulo: "Retiradas", descricao: "Pedidos para o cliente buscar no balcão: preparo, pronto e retirado", icone: PackageCheck, fase: 1, rapido: true },
  { slug: "entregas", rotulo: "Entregas", descricao: "Pedidos para entrega, entregadores e tempo de espera", icone: Truck, atalho: "F8", fase: 1, rapido: true },
  { slug: "cozinha", rotulo: "Cozinha", descricao: "Painel da cozinha e do bar para tablet: novos, em produção e prontos", icone: CookingPot, fase: 2, rapido: true },
  { slug: "garcom", rotulo: "App do garçom", descricao: "Mesas, lançamento e chamados no celular do garçom", icone: HandPlatter, fase: 2 },
  { slug: "caixa", rotulo: "Caixa", descricao: "Abertura, sangria, suprimento, despesas e fechamento", icone: Wallet, fase: 1 },
  { slug: "contas", rotulo: "Contas", descricao: "Fiado dos clientes, contas a pagar e a receber", icone: ListChecks, fase: 3, rapido: true },
  { slug: "produtos", rotulo: "Produtos", descricao: "Cardápio, categorias, adicionais e ficha técnica", icone: ChefHat, fase: 1, rapido: true },
  { slug: "estoque", rotulo: "Estoque", descricao: "Movimentos, lotes, importação de XML e inventário", icone: PackageOpen, fase: 3, desabilitado: "Volta em março" },
  { slug: "delivery", rotulo: "Delivery", descricao: "Cardápio online próprio e pedidos do iFood e aiqfome", icone: ShoppingCart, fase: 2, rapido: true },
  { slug: "promocoes", rotulo: "Promoções", descricao: "Cupons, happy hour e combos", icone: BadgePercent, fase: 5 },
  { slug: "chatbot", rotulo: "Chatbot", descricao: "Atendimento automático no WhatsApp", icone: BotMessageSquare, fase: 5 },
  { slug: "relatorios", rotulo: "Relatórios", descricao: "Vendas, caixa, financeiro, estoque e DRE", icone: BarChart3, fase: 1 },
  { slug: "funcionarios", rotulo: "Funcionários", descricao: "Equipe e comissão individual por atendimento", icone: Users, fase: 1 },
  { slug: "cadastros", rotulo: "Cadastros", descricao: "Clientes, fornecedores, mesas, formas de pagamento e mais", icone: FolderCog, fase: 1 },
  { slug: "treinamentos", rotulo: "Treinamentos", descricao: "Trilha por função e agenda ao vivo da equipe", icone: GraduationCap, fase: 5 },
  { slug: "ajuda", rotulo: "Ajuda", descricao: "Central de ajuda com passo a passo de cada tela", icone: LifeBuoy, atalho: "F1", fase: 5 },
  { slug: "assinatura", rotulo: "Assinatura", descricao: "Planos e mudança de plano", icone: CreditCard, fase: 5 },
  { slug: "configuracoes", rotulo: "Configurações", descricao: "Empresa, impressoras, dispositivos e auditoria", icone: Settings, fase: 0 },
];

export const moduloPorSlug = (slug: string) => MODULOS.find((m) => m.slug === slug);

/** Mapa tecla → rota, usado pelo hook de atalhos. */
export const ATALHOS: Record<string, string> = Object.fromEntries(
  MODULOS.filter((m) => m.atalho).map((m) => [m.atalho!, "/" + m.slug]),
);
