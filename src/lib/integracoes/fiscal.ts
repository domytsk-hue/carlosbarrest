// NFC-e (modelo 65) pelo Focus NFe (https://focusnfe.com.br/doc/#nfce).
// O token fica só no servidor (FOCUS_NFE_TOKEN). O certificado digital A1 e o
// CSC da SEFAZ-BA são cadastrados no painel do Focus NFe, não aqui.
import { arred, itensValidos } from "../dominio/calculos";
import type { Conta, FormaPagamento, Produto, TipoPagamento } from "../dominio/tipos";
import type { ConfigFiscal } from "../loja/estado";

const CODIGO_PAGAMENTO: Record<TipoPagamento, string> = {
  dinheiro: "01",
  credito: "03",
  debito: "04",
  credito_cliente: "05",
  voucher: "11",
  pix: "17",
  fiado: "05",
};

const n2 = (v: number) => v.toFixed(2);

/** Monta o JSON da NFC-e no formato do Focus NFe a partir da conta paga. */
export function montarNfceFocus(conta: Conta, produtos: Produto[], formas: FormaPagamento[], fiscal: ConfigFiscal) {
  const itens = itensValidos(conta);
  const bruto = arred(itens.reduce((s, i) => s + i.preco * i.qtd, 0));
  let descontoRestante = arred(Math.min(conta.desconto, bruto));
  const linhas = itens.map((i, k) => {
    const p = produtos.find((x) => x.id === i.produtoId);
    const valor = arred(i.preco * i.qtd);
    const desc = k === itens.length - 1 ? descontoRestante : arred((conta.desconto * valor) / (bruto || 1));
    descontoRestante = arred(descontoRestante - desc);
    return {
      numero_item: String(k + 1),
      codigo_produto: p?.codigo || i.produtoId.slice(0, 20),
      descricao: i.nome.slice(0, 120),
      codigo_ncm: p?.ncm || "21069090",
      cfop: p?.cfop || "5102",
      unidade_comercial: p?.porKg ? "KG" : "UN",
      quantidade_comercial: i.qtd.toFixed(4),
      valor_unitario_comercial: i.preco.toFixed(4),
      unidade_tributavel: p?.porKg ? "KG" : "UN",
      quantidade_tributavel: i.qtd.toFixed(4),
      valor_unitario_tributavel: i.preco.toFixed(4),
      valor_bruto: n2(valor),
      valor_desconto: n2(desc),
      icms_origem: "0",
      // Simples Nacional: CSOSN 102 (sem crédito); regime normal: CST 00 deve ser ajustado com o contador
      icms_situacao_tributaria: fiscal.regime === "simples" ? "102" : "00",
    };
  });
  const totalNota = arred(bruto - conta.desconto + conta.taxaEntrega);
  // Pagamentos proporcionais ao valor da nota (taxa de serviço não entra na NFC-e)
  const pagos = conta.pagamentos.reduce((s, p) => s + p.valor, 0) || totalNota;
  let resto = totalNota;
  const pagamentos = conta.pagamentos.length
    ? conta.pagamentos.map((p, k) => {
        const v = k === conta.pagamentos.length - 1 ? resto : arred((p.valor * totalNota) / pagos);
        resto = arred(resto - v);
        return { forma_pagamento: CODIGO_PAGAMENTO[formas.find((f) => f.id === p.formaId)?.tipo ?? "dinheiro"] ?? "99", valor_pagamento: n2(v) };
      })
    : [{ forma_pagamento: "01", valor_pagamento: n2(totalNota) }];

  return {
    cnpj_emitente: fiscal.cnpj.replace(/\D/g, ""),
    data_emissao: new Date().toISOString(),
    natureza_operacao: "VENDA AO CONSUMIDOR",
    presenca_comprador: conta.canal === "delivery" || conta.canal === "entrega" ? "4" : "1",
    modalidade_frete: "9",
    local_destino: "1",
    valor_outras_despesas: conta.taxaEntrega ? n2(conta.taxaEntrega) : undefined,
    items: linhas,
    formas_pagamento: pagamentos,
  };
}

export const urlFocus = (ambiente: ConfigFiscal["ambiente"]) => (ambiente === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br");
