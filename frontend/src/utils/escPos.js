import { PRINTER_MAX_CHARS } from './printerConfig';

/**
 * Utilitário para codificar dados no formato binário ESC/POS para impressoras de 58mm.
 * A maioria das impressoras térmicas de 58mm aceita 32 caracteres por linha no tamanho de fonte normal.
 */

// Remover acentos para compatibilidade máxima com impressoras antigas/baratas (ASCII)
function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[cC]ç/g, 'c')
    .replace(/[Ç]/g, 'C')
    .replace(/[^ -~\n]/g, '?'); // Substitui caracteres não-ASCII visíveis
}

// Cria uma linha formatada com texto alinhado à esquerda e preço à direita
function formatLine(leftText, rightText, maxChars = PRINTER_MAX_CHARS) {
  const normalizedLeft = normalizeText(leftText);
  const normalizedRight = normalizeText(rightText);
  
  const spaceNeeded = maxChars - normalizedLeft.length - normalizedRight.length;
  
  if (spaceNeeded <= 0) {
    // Se não couber na mesma linha, quebra a linha do texto esquerdo e empurra o preço
    return normalizedLeft + '\n' + ' '.repeat(maxChars - normalizedRight.length) + normalizedRight;
  }
  
  return normalizedLeft + ' '.repeat(spaceNeeded) + normalizedRight;
}

// Gera o buffer de bytes ESC/POS
export function generateEscPosReceipt(order, items, settings) {
  const encoder = new TextEncoder();
  const commands = [];

  // Comandos auxiliares
  const addBytes = (bytes) => commands.push(...bytes);
  const addText = (text, ln = true) => {
    const normalized = normalizeText(text) + (ln ? '\n' : '');
    addBytes(encoder.encode(normalized));
  };

  // 1. Inicializa a impressora: ESC @
  addBytes([0x1B, 0x40]);

  // 2. Centraliza o texto: ESC a 1
  addBytes([0x1B, 0x61, 0x01]);

  // 3. Cabeçalho do Estabelecimento (Negrito e tamanho duplo)
  addBytes([0x1B, 0x45, 0x01]); // Negrito ON
  addBytes([0x1D, 0x21, 0x11]); // Tamanho duplo (L/A)
  addText('RESTAURANTE');
  addText(settings.businessName || '');
  addBytes([0x1D, 0x21, 0x00]); // Voltar tamanho normal
  addBytes([0x1B, 0x45, 0x00]); // Negrito OFF

  // Informações adicionais do cabeçalho
  if (settings.cnpj) addText(`CNPJ: ${settings.cnpj}`);
  if (settings.address) addText(settings.address);
  if (settings.phone) addText(`Tel: ${settings.phone}`);
  
  // Divisória dashed
  addText('--------------------------------');

  // Detalhes do Pedido
  addBytes([0x1B, 0x61, 0x00]); // Alinhamento à esquerda: ESC a 0
  addBytes([0x1B, 0x45, 0x01]); // Negrito ON
  addText(`PEDIDO: #${order.id}`);
  addBytes([0x1B, 0x45, 0x00]); // Negrito OFF
  
  const dateStr = new Date(order.created_at.replace(" ", "T") + "Z").toLocaleString('pt-BR');
  addText(`Data: ${dateStr}`);
  addText(`Tipo: ${order.order_type}`);
  if (order.table_number) addText(`Mesa: ${order.table_number}`);
  if (order.customer_name) addText(`Cliente: ${order.customer_name}`);

  addText('--------------------------------');

  // Cabeçalho dos Itens
  addText(formatLine('Item', 'Valor'));
  addText('--------------------------------');

  // Listagem dos itens
  items.forEach(item => {
    const qtyName = `${item.quantity}x ${item.product_name}`;
    const priceStr = `R$ ${(item.quantity * item.unit_price).toFixed(2)}`;
    addText(formatLine(qtyName, priceStr));
    if (item.notes) {
      addText(`  Obs: ${item.notes}`);
    }
  });

  addText('--------------------------------');

  // Totais
  addText(formatLine('Subtotal:', `R$ ${parseFloat(order.subtotal).toFixed(2)}`));
  if (parseFloat(order.discount) > 0) {
    addText(formatLine('Desconto:', `-R$ ${parseFloat(order.discount).toFixed(2)}`));
  }
  
  addBytes([0x1B, 0x45, 0x01]); // Negrito ON
  addText(formatLine('TOTAL:', `R$ ${parseFloat(order.total).toFixed(2)}`));
  addBytes([0x1B, 0x45, 0x00]); // Negrito OFF

  addText('--------------------------------');
  addText(`Forma de Pgto: ${order.payment_method}`);
  addText(`Status: ${order.status}`);
  addText('--------------------------------');

  // Rodapé
  addBytes([0x1B, 0x61, 0x01]); // Centraliza o texto: ESC a 1
  if (settings.footerMessage) {
    addText(settings.footerMessage);
  } else {
    addText('Obrigado pela preferencia!');
    addText('Volte sempre!');
  }

  // Avança papel (espaço em branco no final para poder rasgar)
  addText('\n\n\n\n');

  // Cortar papel (se suportado pela impressora): GS V 66 0
  addBytes([0x1D, 0x56, 0x42, 0x00]);

  return new Uint8Array(commands);
}
