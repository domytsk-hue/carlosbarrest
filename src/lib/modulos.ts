import {
  LayoutDashboard,
  Armchair,
  IdCard,
  UtensilsCrossed,
  ShoppingBasket,
  Truck,
  ListChecks,
  ListPlus,
  ChefHat,
  CookingPot,
  HandPlatter,
  PackageOpen,
  ShoppingCart,
  BarChart3,
  FolderCog,
  Settings,
  Wallet,
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
};

export const MODULOS: Modulo[] = [
  { slug: "", rotulo: "Dashboard", descricao: "Visão geral do restaurante em tempo real", icone: LayoutDashboard, fase: 0 },
  { slug: "mesas", rotulo: "Mesas", descricao: "Mapa do salão, comandas por mesa, parcial e fechamento", icone: Armchair, atalho: "F3", fase: 1, rapido: true },
  { slug: "comandas", rotulo: "Comandas", descricao: "Comandas individuais numeradas", icone: IdCard, atalho: "F11", fase: 1, rapido: true },
  { slug: "balcao", rotulo: "Balcão", descricao: "Venda para retirada ou entrega com cliente identificado", icone: UtensilsCrossed, atalho: "F4", fase: 1, rapido: true },
  { slug: "pdv", rotulo: "PDV", descricao: "Venda rápida sem identificar cliente", icone: ShoppingBasket, atalho: "F12", fase: 1, rapido: true },
  { slug: "entregas", rotulo: "Entregas", descricao: "Pedidos para entrega, entregadores e tempo de espera", icone: Truck, atalho: "F8", fase: 1, rapido: true },
  { slug: "cozinha", rotulo: "Cozinha", descricao: "Monitor de preparo da cozinha e do bar (KDS)", icone: CookingPot, atalho: "F6", fase: 2, rapido: true },
  { slug: "garcom", rotulo: "App do garçom", descricao: "Mesas, lançamento e chamados no celular do garçom", icone: HandPlatter, fase: 2 },
  { slug: "caixa", rotulo: "Caixa", descricao: "Abertura, sangria, suprimento, despesas e fechamento", icone: Wallet, fase: 1 },
  { slug: "contas", rotulo: "Contas", descricao: "Contas a pagar e a receber", icone: ListChecks, fase: 3, rapido: true },
  { slug: "nova-conta", rotulo: "Nova conta", descricao: "Cadastrar uma conta a pagar ou a receber", icone: ListPlus, atalho: "Ctrl+Ins", fase: 3, rapido: true },
  { slug: "produtos", rotulo: "Produtos", descricao: "Cardápio, categorias, adicionais e ficha técnica", icone: ChefHat, fase: 1, rapido: true },
  { slug: "estoque", rotulo: "Estoque", descricao: "Movimentos, lotes, importação de XML e inventário", icone: PackageOpen, fase: 3, rapido: true },
  { slug: "delivery", rotulo: "Delivery", descricao: "Cardápio online próprio e pedidos do iFood e aiqfome", icone: ShoppingCart, fase: 2, rapido: true },
  { slug: "relatorios", rotulo: "Relatórios", descricao: "Vendas, caixa, financeiro, estoque e DRE", icone: BarChart3, fase: 1 },
  { slug: "cadastros", rotulo: "Cadastros", descricao: "Clientes, fornecedores, funcionários, formas de pagamento e mais", icone: FolderCog, fase: 1 },
  { slug: "configuracoes", rotulo: "Configurações", descricao: "Empresa, impressoras, dispositivos e auditoria", icone: Settings, fase: 0 },
];

export const moduloPorSlug = (slug: string) => MODULOS.find((m) => m.slug === slug);

/** Mapa tecla → rota, usado pelo hook de atalhos. */
export const ATALHOS: Record<string, string> = Object.fromEntries(
  MODULOS.filter((m) => m.atalho).map((m) => [m.atalho!, "/" + m.slug]),
);
