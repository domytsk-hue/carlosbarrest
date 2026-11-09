// Contrato para Pix dinâmico via PSP (Mercado Pago, Efí, Asaas...).
// O PSP gera a cobrança com txid e avisa o sistema pelo webhook quando
// o cliente paga, e o pagamento entra no caixa sozinho.
//
// Para ligar: implemente `ProvedorPix` para o PSP escolhido, cadastre a
// URL https://SEU-DOMINIO/api/webhooks/pix no painel do PSP e defina
// PIX_PROVEDOR e as credenciais nas variáveis de ambiente do servidor.

export type CobrancaPix = {
  txid: string;
  copiaECola: string;
  valor: number;
  expiraEm: string;
};

export type EventoPagamentoPix = { txid: string; valor: number; pagoEm: string; endToEndId: string };

export interface ProvedorPix {
  nome: string;
  criarCobranca(dados: { valor: number; descricao: string; contaId: string }): Promise<CobrancaPix>;
  /** Valida a assinatura/autenticidade do webhook e devolve os pagamentos confirmados. */
  lerWebhook(req: Request): Promise<EventoPagamentoPix[]>;
}

export function provedorConfigurado() {
  return Boolean(process.env.PIX_PROVEDOR);
}
