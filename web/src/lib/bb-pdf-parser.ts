export const TIPOS_LANCAMENTO_BB = [
  'Pix - Recebido',
  'Transferência enviada',
  'Transferência recebida',
  'Dep dinheiro ATM',
  'BB Rende Fácil',
  'Cobrança',
  'Débito Serviço Cobrança',
  'Tarifa Pix Recebido',
  'Pix - Enviado',
  'Outros',
] as const;

export interface ItemConciliacaoExtraido {
  idTemp: number;
  selecionado: boolean;
  dataLancamento: string; // Coluna 1: Dia/Data (YYYY-MM-DD)
  lote: string; // Coluna 2: Lote (vazio se não houver na linha)
  documento: string; // Coluna 3: Documento
  historico: string; // Coluna 4: Histórico
  valor: number; // Coluna 5: Valor numérico
  tipo: 'CREDITO' | 'DEBITO'; // Baseado em (+) ou (-) na 5ª coluna
  tipoLancamento: string; // Tipo do Lançamento (Pix - Recebido, Transferência enviada, etc.)
  cpf: string; // Extraído apenas quando o tipo possui CPF (ex: Pix - Recebido)
  nomeExtrato: string; // Nome da pessoa extraído do histórico
  desconsiderado?: boolean; // Associação como DESCONSIDERAR (automático para BB Rende Fácil)
  pessoaId: number | null;
}

export interface PdfTextItemPosition {
  str: string;
  x: number;
  y: number;
  width?: number;
}

export interface PdfColumnBounds {
  loteMinX: number;
  docMinX: number;
  histMinX: number;
  valorMinX: number;
}

/**
 * Formata uma sequência de 11 dígitos como CPF (000.000.000-00)
 */
export function formatarCpf(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }
  return digits.trim();
}

/**
 * Identifica o Tipo do Lançamento a partir do texto do Histórico
 */
export function detectarTipoLancamento(historico: string): string {
  const texto = (historico || '').replace(/\s+/g, ' ').trim();
  const lower = texto.toLowerCase();

  // Verificar tarifas e serviços primeiro para que "Tarifa Pix Recebido" não caia em "Pix - Recebido"
  if (lower.startsWith('tarifa pix recebido') || lower.includes('tarifa pix')) {
    return 'Tarifa Pix Recebido';
  }
  if (
    lower.startsWith('débito serviço cobrança') ||
    lower.startsWith('debito servico cobranca') ||
    lower.includes('serviço cobrança') ||
    lower.includes('servico cobranca')
  ) {
    return 'Débito Serviço Cobrança';
  }
  if (
    lower.startsWith('bb rende fácil') ||
    lower.startsWith('bb rende facil') ||
    lower.includes('bb rende f')
  ) {
    return 'BB Rende Fácil';
  }
  if (lower.startsWith('cobrança') || lower.startsWith('cobranca')) {
    return 'Cobrança';
  }
  if (
    /^dep\.?\s*dinheiro\s*atm/i.test(lower) ||
    /^dep[óo]sito\s*dinheiro\s*atm/i.test(lower) ||
    lower.includes('dep dinheiro atm')
  ) {
    return 'Dep dinheiro ATM';
  }
  if (
    /^transfer[êe]ncia\s+enviada/i.test(lower) ||
    /^transf\.?\s+enviada/i.test(lower) ||
    lower.includes('transferência enviada') ||
    lower.includes('transferencia enviada')
  ) {
    return 'Transferência enviada';
  }
  if (
    /^transfer[êe]ncia\s+recebida/i.test(lower) ||
    /^transf\.?\s+recebida/i.test(lower) ||
    lower.includes('transferência recebida') ||
    lower.includes('transferencia recebida')
  ) {
    return 'Transferência recebida';
  }
  if (
    /^pix\s*[-–]?\s*recebido/i.test(lower) ||
    lower.includes('pix-recebido') ||
    lower.includes('pix - recebido')
  ) {
    return 'Pix - Recebido';
  }
  if (
    /^pix\s*[-–]?\s*enviado/i.test(lower) ||
    lower.includes('pix-enviado') ||
    lower.includes('pix - enviado')
  ) {
    return 'Pix - Enviado';
  }

  return 'Outros';
}

/**
 * Verifica se o Tipo do Lançamento informado NÃO possui CPF no histórico
 */
export function tipoSemCpf(tipoLancamento: string): boolean {
  const t = (tipoLancamento || '').toLowerCase();
  // Apenas Pix - Recebido e Pix - Enviado possuem CPF da pessoa no histórico
  return !t.includes('pix - recebido') && !t.includes('pix - enviado');
}

/**
 * Extrai o Tipo do Lançamento, CPF e Nome da Pessoa do Histórico.
 * - Transferência enviada, Transferência recebida, Dep dinheiro ATM, BB Rende Fácil, Cobrança, Tarifas NÃO possuem CPF.
 * - Pix - Recebido (incluindo Pix-Recebido QR Code) extrai CPF e Nome da pessoa.
 */
export function extrairDadosHistorico(
  historico: string,
  tipoLancamentoForcado?: string,
): {
  tipoLancamento: string;
  cpf: string;
  nomeExtrato: string;
} {
  const texto = (historico || '').replace(/\s+/g, ' ').trim();
  const tipoLancamento =
    tipoLancamentoForcado || detectarTipoLancamento(texto);

  if (tipoSemCpf(tipoLancamento)) {
    return {
      tipoLancamento,
      cpf: '',
      nomeExtrato: '',
    };
  }

  const cpfRegexFormatado = /\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/;
  const cpfRegexDigitos = /\b(\d{11,14})\b/g;

  let cpfEncontrado = '';
  let matchIndex = -1;
  let matchLength = 0;

  const matchFmt = texto.match(cpfRegexFormatado);
  if (matchFmt && matchFmt.index !== undefined) {
    cpfEncontrado = formatarCpf(matchFmt[1]);
    matchIndex = matchFmt.index;
    matchLength = matchFmt[0].length;
  } else {
    const matchesDig = [...texto.matchAll(cpfRegexDigitos)];
    if (matchesDig.length > 0) {
      const chosen =
        matchesDig.find((m) => m[1].length === 11) ||
        matchesDig.find((m) => m[1].length === 14 && m[1].startsWith('000')) ||
        matchesDig[0];

      const rawDigits = chosen[1];
      if (rawDigits.length === 14 && rawDigits.startsWith('000')) {
        cpfEncontrado = formatarCpf(rawDigits.slice(3));
      } else if (rawDigits.length === 11) {
        cpfEncontrado = formatarCpf(rawDigits);
      } else {
        cpfEncontrado = rawDigits;
      }
      matchIndex = chosen.index || 0;
      matchLength = chosen[0].length;
    }
  }

  if (!cpfEncontrado) {
    return {
      tipoLancamento,
      cpf: '',
      nomeExtrato: '',
    };
  }

  const depoisDoCpf = texto
    .substring(matchIndex + matchLength)
    .replace(/^[\s\-–:\/]+/, '')
    .trim();

  let nomeExtrato = depoisDoCpf;

  if (!nomeExtrato || nomeExtrato.length < 2) {
    let antesDoCpf = texto.substring(0, matchIndex).trim();
    antesDoCpf = antesDoCpf
      .replace(
        /^(?:pix\s*[-–]?\s*recebido(?:\s*qr\s*code)?|pix\s*[-–]?\s*enviado|transfer[êe]ncia\s*recebida|transf\.?\s*recebida|dep[óo]sito\s*online|cred\.?\s*autorizado)/i,
        '',
      )
      .replace(/\b\d{2}\/\d{2}(?:\/\d{2,4})?\b/g, '')
      .replace(/\b\d{2}:\d{2}(?::\d{2})?\b/g, '')
      .replace(/^[\s\-–:\/]+|[\s\-–:\/]+$/g, '')
      .trim();
    nomeExtrato = antesDoCpf;
  }

  nomeExtrato = nomeExtrato
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–:]+|[\s\-–:]+$/g, '')
    .trim();

  return {
    tipoLancamento,
    cpf: cpfEncontrado,
    nomeExtrato,
  };
}

/**
 * Verifica se um texto ou linha do PDF é uma linha de Saldo ou cabeçalho/rodapé que deve ser ignorada
 */
export function deveIgnorarLinhaExtratoBB(linha: string): boolean {
  const lower = linha.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!lower) return true;

  const padroesSaldo = [
    /\bs\s+a\s+l\s+d\s+o\b/i,
    /\bsaldo\s+anterior\b/i,
    /\bsaldo\s+atual\b/i,
    /\bsaldo\s+final\b/i,
    /\bsaldo\s+do\s+dia\b/i,
    /\bsaldo\s+dispon[íi]vel\b/i,
    /\bsaldo\s+bloqueado\b/i,
    /\bsaldo\s+total\b/i,
    /\bsaldo\s+provis[óo]rio\b/i,
    /\bsaldo\s+em\s+conta\b/i,
    /\btotal\s+aplica[çc][õo]es\b/i,
  ];

  if (padroesSaldo.some((regex) => regex.test(lower))) {
    return true;
  }

  const semNumerosEPontuacao = lower
    .replace(/\d{2}\/\d{2}(?:\/\d{2,4})?/g, '')
    .replace(/r\$\s*/g, '')
    .replace(/[\d.,+\-()]/g, '')
    .replace(/\b[cd]\b/g, '')
    .trim();

  if (
    semNumerosEPontuacao === 'saldo' ||
    semNumerosEPontuacao === 's a l d o'
  ) {
    return true;
  }

  const cabecalhosRodapes = [
    'extrato de conta corrente',
    'consultas - extrato',
    'sisbb - sistema de informa',
    'central de atendimento bb',
    'dt. balancete',
    'dt. movimento',
    'ag. origem',
    'dia lote documento',
    'data lote documento',
    'histórico documento valor',
    'historico documento valor',
    'lote documento histórico',
    'lote documento historico',
    'sujeito a confirmação',
    'sujeito a confirmacao',
    'ouvidoria bb',
    'sac 0800',
    'período:',
    'periodo:',
    'cliente:',
  ];

  if (cabecalhosRodapes.some((h) => lower.includes(h))) {
    return true;
  }

  if (lower === 'lançamentos' || lower === 'lancamentos') {
    return true;
  }

  return false;
}

/**
 * Extrai diretamente os lançamentos de uma página do PDF.js usando as coordenadas (X, Y)
 * da tabela de 5 colunas do Banco do Brasil:
 * Coluna 1: Dia | Coluna 2: Lote | Coluna 3: Documento | Coluna 4: Histórico (1, 2 ou 3 linhas) | Coluna 5: Valor (+ / -)
 */
export function extrairLancamentosDePaginaPdfBB(
  rawItems: { str: string; transform: number[]; width?: number }[],
  prevBounds?: PdfColumnBounds,
): {
  lancamentosPagina: Omit<ItemConciliacaoExtraido, 'idTemp'>[];
  detectedBounds?: PdfColumnBounds;
} {
  const items: PdfTextItemPosition[] = [];
  rawItems.forEach((it) => {
    if (!it.str || !it.str.trim()) return;
    items.push({
      str: it.str.trim(),
      x: it.transform[4],
      y: it.transform[5],
      width: it.width || 0,
    });
  });

  if (items.length === 0) {
    return { lancamentosPagina: [], detectedBounds: prevBounds };
  }

  // 1. Detectar cabeçalho da tabela ("Dia", "Lote", "Documento", "Histórico", "Valor")
  let bounds: PdfColumnBounds = prevBounds || {
    loteMinX: 110,
    docMinX: 195,
    histMinX: 330,
    valorMinX: 700,
  };
  let headerY = Infinity;

  // Agrupar itens próximos em Y para achar a linha do cabeçalho
  const tempRows: { y: number; items: PdfTextItemPosition[] }[] = [];
  items.forEach((it) => {
    const r = tempRows.find((row) => Math.abs(row.y - it.y) <= 3);
    if (r) r.items.push(it);
    else tempRows.push({ y: it.y, items: [it] });
  });

  for (const r of tempRows) {
    const sorted = [...r.items].sort((a, b) => a.x - b.x);
    const textLower = sorted.map((i) => i.str.toLowerCase()).join(' ');
    if (
      textLower.includes('lote') &&
      textLower.includes('documento') &&
      (textLower.includes('hist') || textLower.includes('valor'))
    ) {
      headerY = r.y;
      const loteIt = sorted.find((i) => i.str.toLowerCase() === 'lote' || i.str.toLowerCase().includes('lote'));
      const docIt = sorted.find((i) => i.str.toLowerCase().includes('documento'));
      const histIt = sorted.find((i) => i.str.toLowerCase().includes('hist'));
      const valIt = sorted.find((i) => i.str.toLowerCase().includes('valor'));

      if (loteIt && docIt && histIt) {
        bounds = {
          loteMinX: loteIt.x - 15,
          docMinX: docIt.x - 15,
          histMinX: histIt.x - 15,
          valorMinX: valIt ? valIt.x - 75 : histIt.x + 220,
        };
      }
      break;
    }
  }

  // Filtrar apenas os itens abaixo do cabeçalho da tabela
  const bodyItems = items.filter((it) => it.y < headerY - 2);

  // 2. Encontrar todas as âncoras de linha pela Coluna 1 (Dia: DD/MM/AAAA)
  const dateAnchorsRaw = bodyItems.filter(
    (it) =>
      it.x < bounds.loteMinX && /^\d{2}\/\d{2}\/\d{4}$/.test(it.str),
  );

  // Ordenar de cima para baixo (Y decrescente) e deduplicar caso haja dois itens no mesmo Y
  dateAnchorsRaw.sort((a, b) => b.y - a.y);
  const anchors: {
    y: number;
    diaStr: string;
    isSaldo: boolean;
    isSingleLine: boolean;
  }[] = [];

  dateAnchorsRaw.forEach((d) => {
    const existing = anchors.find((a) => Math.abs(a.y - d.y) <= 3);
    if (!existing) {
      // Verificar se nessa mesma linha Y existe "Saldo Anterior", "Saldo do dia" ou "S A L D O"
      const sameYText = bodyItems
        .filter((it) => Math.abs(it.y - d.y) <= 3.5)
        .map((it) => it.str)
        .join(' ');
      const isSaldo = deveIgnorarLinhaExtratoBB(sameYText);
      const isSingleLine =
        isSaldo ||
        (/\bcobran[çc]a\b/i.test(sameYText) &&
          !/servi[çc]o\s+cobran[çc]a/i.test(sameYText));
      anchors.push({ y: d.y, diaStr: d.str, isSaldo, isSingleLine });
    }
  });

  if (anchors.length === 0) {
    return { lancamentosPagina: [], detectedBounds: bounds };
  }

  // 3. Definir a faixa vertical [yLower, yUpper) de cada linha da tabela
  // Como Dia, Lote, Documento e Valor ficam centralizados verticalmente na linha da tabela,
  // e o Histórico pode ter 1, 2 ou 3 linhas simétricas ao redor de Y_k, a fronteira entre duas linhas consecutivas é o ponto médio!
  // Além disso, linhas de Saldo têm apenas 1 linha de altura (±3pt), funcionando como barreira exata.
  const rowRanges = anchors.map((anchor, k) => {
    let yUpper: number;
    if (k === 0) {
      yUpper = headerY - 2;
    } else {
      const prev = anchors[k - 1];
      if (prev.isSingleLine) {
        yUpper = prev.y - 3.5;
      } else if (anchor.isSingleLine) {
        yUpper = anchor.y + 3.5;
      } else {
        yUpper = (prev.y + anchor.y) / 2;
      }
    }

    let yLower: number;
    if (k === anchors.length - 1) {
      yLower = anchor.y - 24;
    } else {
      const next = anchors[k + 1];
      if (anchor.isSingleLine) {
        yLower = anchor.y - 3.5;
      } else if (next.isSingleLine) {
        yLower = next.y + 3.5;
      } else {
        yLower = (anchor.y + next.y) / 2;
      }
    }

    return {
      ...anchor,
      yUpper,
      yLower,
    };
  });

  // 4. Montar as 5 colunas para cada linha que não seja Saldo
  const lancamentosPagina: Omit<ItemConciliacaoExtraido, 'idTemp'>[] = [];
  const valorRegex =
    /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(\(\+\)|\(\-\)|[CDcd]|\+|\-)?/;

  for (const row of rowRanges) {
    if (row.isSaldo) continue;

    const rowItems = bodyItems.filter(
      (it) => it.y <= row.yUpper && it.y > row.yLower,
    );

    const [dd, mm, yyyy] = row.diaStr.split('/');
    const dataLancamento = `${yyyy}-${mm}-${dd}`;

    // Separar itens pelas faixas X das Colunas 2 (Lote), 3 (Documento), 4 (Histórico) e 5 (Valor)
    const loteItems = rowItems.filter(
      (it) => it.x >= bounds.loteMinX && it.x < bounds.docMinX,
    );
    const docItems = rowItems.filter(
      (it) => it.x >= bounds.docMinX && it.x < bounds.histMinX,
    );
    const valorItems = rowItems
      .filter((it) => it.x >= bounds.valorMinX)
      .sort((a, b) => a.x - b.x);
    const histItems = rowItems.filter(
      (it) => it.x >= bounds.histMinX && it.x < bounds.valorMinX,
    );

    const lote = loteItems
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join('')
      .trim();

    const documento = docItems
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join('')
      .trim();

    // Ordenar linhas do Histórico de cima para baixo (Y decrescente com tolerância de 2.5pt) e da esquerda para a direita (X crescente)
    const histSubLines: { y: number; items: PdfTextItemPosition[] }[] = [];
    histItems.forEach((it) => {
      const sub = histSubLines.find((s) => Math.abs(s.y - it.y) <= 2.5);
      if (sub) sub.items.push(it);
      else histSubLines.push({ y: it.y, items: [it] });
    });
    histSubLines.sort((a, b) => b.y - a.y);

    const historico = histSubLines
      .map((sub) =>
        sub.items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(' '),
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!historico || deveIgnorarLinhaExtratoBB(historico)) {
      continue;
    }

    const valorTexto = valorItems.map((i) => i.str).join(' ');
    const valMatch = valorTexto.match(valorRegex);
    if (!valMatch) continue;

    const valorNumerico = parseFloat(
      valMatch[1].replace(/\./g, '').replace(',', '.'),
    );
    if (isNaN(valorNumerico) || valorNumerico === 0) continue;

    const sinalToken = valMatch[2] || '';
    const isDebito =
      sinalToken.includes('-') ||
      sinalToken.toLowerCase() === 'd' ||
      valorTexto.includes('(-)');

    const tipo: 'CREDITO' | 'DEBITO' = isDebito ? 'DEBITO' : 'CREDITO';
    const { tipoLancamento, cpf, nomeExtrato } =
      extrairDadosHistorico(historico);

    lancamentosPagina.push({
      selecionado: true,
      dataLancamento,
      lote,
      documento,
      historico,
      tipoLancamento,
      cpf,
      nomeExtrato,
      valor: Math.abs(valorNumerico),
      tipo,
      desconsiderado: tipoLancamento === 'BB Rende Fácil',
      pessoaId: null,
    });
  }

  return { lancamentosPagina, detectedBounds: bounds };
}

/**
 * Faz o parse de linhas de texto corrido (OCR ou texto simples) do extrato do Banco do Brasil
 * separando sempre nas 5 colunas:
 * 1. Dia (Data) | 2. Lote (vazio se não houver) | 3. Documento | 4. Histórico (1 a 3 linhas) | 5. Valor (+ / -)
 */
export function parseLinhasExtratoBB(
  allLines: string[],
  mesConciliacao: number,
  anoConciliacao: number,
): ItemConciliacaoExtraido[] {
  const mesPad = String(mesConciliacao).padStart(2, '0');
  const anoStr = String(anoConciliacao);

  interface RawLancamento {
    dataLancamento: string;
    lote: string;
    documento: string;
    historicoParts: string[];
    valor: number;
    tipo: 'CREDITO' | 'DEBITO';
  }

  const lancamentos: RawLancamento[] = [];

  const valorRegexGlobal =
    /(?:-\s*)?(?:R\$\s*)?-?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*(?:\(\+\)|\(\-\)|[CDcd]|\+|\-))?/g;

  for (let i = 0; i < allLines.length; i++) {
    const rawLine = allLines[i].replace(/\s+/g, ' ').trim();
    if (!rawLine) continue;

    if (deveIgnorarLinhaExtratoBB(rawLine)) {
      continue;
    }

    const matchFullDate = rawLine.match(
      /^(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+\d{2}\/\d{2}\/\d{2,4})?\s+(.+)$/,
    );
    const matchShortDate = !matchFullDate
      ? rawLine.match(/^(\d{2})\/(\d{2})\s+(.+)$/)
      : null;
    const matchDayOnly =
      !matchFullDate && !matchShortDate
        ? rawLine.match(/^([0-3]?\d)\s+(.+)$/)
        : null;

    const valueMatches = [...rawLine.matchAll(valorRegexGlobal)];

    if (
      (matchFullDate || matchShortDate || matchDayOnly) &&
      valueMatches.length > 0
    ) {
      let dataIso = `${anoStr}-${mesPad}-01`;
      let restanteLinha = rawLine;

      if (matchFullDate) {
        const dia = matchFullDate[1];
        const mes = matchFullDate[2];
        let ano = matchFullDate[3];
        if (ano.length === 2) ano = '20' + ano;
        dataIso = `${ano}-${mes}-${dia}`;
        restanteLinha = matchFullDate[4].trim();
      } else if (matchShortDate) {
        const dia = matchShortDate[1];
        const mes = matchShortDate[2];
        dataIso = `${anoStr}-${mes}-${dia}`;
        restanteLinha = matchShortDate[3].trim();
      } else if (matchDayOnly) {
        const diaNum = Number(matchDayOnly[1]);
        if (diaNum < 1 || diaNum > 31) continue;
        const dia = matchDayOnly[1].padStart(2, '0');
        dataIso = `${anoStr}-${mesPad}-${dia}`;
        restanteLinha = matchDayOnly[2].trim();
      }

      const innerValueMatches = [...restanteLinha.matchAll(valorRegexGlobal)];
      if (innerValueMatches.length === 0) continue;

      const valMatch =
        innerValueMatches.length >= 2
          ? innerValueMatches[innerValueMatches.length - 2]
          : innerValueMatches[0];

      const valRaw = valMatch[0];
      const valToken = valRaw.trim();
      const valIndex = valMatch.index ?? restanteLinha.lastIndexOf(valRaw);

      // Capturar tanto o texto antes do valor quanto eventual texto após o valor (comum em OCR quando o valor vem antes do Histórico na linha)
      let antesDoValor = restanteLinha.substring(0, valIndex).trim();
      const depoisDoValor = restanteLinha
        .substring(valIndex + valRaw.length)
        .trim();

      const isDebitoExplicito =
        valToken.includes('(-)') ||
        /[Dd]$/.test(valToken) ||
        valToken.startsWith('-') ||
        valToken.endsWith('-');
      const isCreditoExplicito =
        valToken.includes('(+)') ||
        /[Cc]$/.test(valToken) ||
        valToken.endsWith('+');

      const numLimpo = valToken
        .replace(/[R$CDcd()+\-\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const valorNumerico = parseFloat(numLimpo);
      if (isNaN(valorNumerico) || valorNumerico === 0) continue;

      antesDoValor = antesDoValor.replace(/^0000\s+(?=\d)/, '');

      let lote = '';
      let documento = '';
      let historico = '';

      if (antesDoValor.includes('|')) {
        const cols = antesDoValor.split('|').map((c) => c.trim());
        lote = cols[0] || '';
        documento = cols[1] || '';
        historico = [cols.slice(2).join(' ').trim(), depoisDoValor]
          .filter(Boolean)
          .join(' ')
          .trim();
      } else {
        // 1. Lote + Documento + Histórico (antes do valor)
        const matchLoteDocHist = antesDoValor.match(
          /^(\d{4,5})\s+([\d.]{1,20})\s+([A-Za-zÀ-ÿ].*)$/,
        );
        // 2. Apenas Lote + Documento antes do valor (Histórico veio depois do valor ou nas linhas seguintes!)
        const matchApenasLoteDoc = !matchLoteDocHist
          ? antesDoValor.match(/^(\d{4,5})\s+([\d.]{1,20})$/)
          : null;
        // 3. Lote + Histórico + Documento
        const matchLoteHistDoc =
          !matchLoteDocHist && !matchApenasLoteDoc
            ? antesDoValor.match(/^(\d{4,5})\s+([A-Za-zÀ-ÿ].+?)\s+([\d.]{1,20})$/)
            : null;
        // 4. Lote vazio + Documento + Histórico
        const matchVazioDocHist =
          !matchLoteDocHist && !matchApenasLoteDoc && !matchLoteHistDoc
            ? antesDoValor.match(/^([\d.]{1,20})\s+([A-Za-zÀ-ÿ].*)$/)
            : null;
        // 5. Lote vazio + apenas Documento antes do valor (Histórico depois do valor ou na linha seguinte)
        const matchApenasDoc =
          !matchLoteDocHist &&
          !matchApenasLoteDoc &&
          !matchLoteHistDoc &&
          !matchVazioDocHist
            ? antesDoValor.match(/^([\d.]{1,20})$/)
            : null;
        // 6. Lote vazio + Histórico + Documento
        const matchVazioHistDoc =
          !matchLoteDocHist &&
          !matchApenasLoteDoc &&
          !matchLoteHistDoc &&
          !matchVazioDocHist &&
          !matchApenasDoc
            ? antesDoValor.match(/^([A-Za-zÀ-ÿ].+?)\s+([\d.]{1,20})$/)
            : null;

        if (matchLoteDocHist) {
          lote = matchLoteDocHist[1].trim();
          documento = matchLoteDocHist[2].trim();
          historico = [matchLoteDocHist[3].trim(), depoisDoValor]
            .filter(Boolean)
            .join(' ');
        } else if (matchApenasLoteDoc) {
          lote = matchApenasLoteDoc[1].trim();
          documento = matchApenasLoteDoc[2].trim();
          historico = depoisDoValor;
        } else if (matchLoteHistDoc) {
          lote = matchLoteHistDoc[1].trim();
          historico = [matchLoteHistDoc[2].trim(), depoisDoValor]
            .filter(Boolean)
            .join(' ');
          documento = matchLoteHistDoc[3].trim();
        } else if (matchVazioDocHist) {
          lote = '';
          documento = matchVazioDocHist[1].trim();
          historico = [matchVazioDocHist[2].trim(), depoisDoValor]
            .filter(Boolean)
            .join(' ');
        } else if (matchApenasDoc) {
          lote = '';
          documento = matchApenasDoc[1].trim();
          historico = depoisDoValor;
        } else if (matchVazioHistDoc) {
          lote = '';
          historico = [matchVazioHistDoc[1].trim(), depoisDoValor]
            .filter(Boolean)
            .join(' ');
          documento = matchVazioHistDoc[2].trim();
        } else {
          lote = '';
          documento = '';
          historico = [antesDoValor, depoisDoValor].filter(Boolean).join(' ');
        }
      }

      if (
        (historico && deveIgnorarLinhaExtratoBB(historico)) ||
        lote === '00000'
      ) {
        continue;
      }

      let tipo: 'CREDITO' | 'DEBITO' = 'CREDITO';
      if (isDebitoExplicito) {
        tipo = 'DEBITO';
      } else if (!isCreditoExplicito) {
        const histLower = historico.toLowerCase();
        const palavrasDebito = [
          'enviado',
          'transferência enviada',
          'transferencia enviada',
          'pagamento',
          'pagto',
          'tarifa',
          'debito',
          'débito',
          'compra',
          'saque',
          'retirada',
        ];
        if (palavrasDebito.some((p) => histLower.includes(p))) {
          tipo = 'DEBITO';
        }
      }

      lancamentos.push({
        dataLancamento: dataIso,
        lote,
        documento,
        historicoParts: historico ? [historico] : [],
        valor: Math.abs(valorNumerico),
        tipo,
      });
    } else if (valueMatches.length === 0 && lancamentos.length > 0) {
      const cleanContinuation = rawLine
        .replace(/\|/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (
        cleanContinuation &&
        !/^p[áa]gina\s+\d+/i.test(cleanContinuation) &&
        !/^[-=_*]{3,}$/.test(cleanContinuation) &&
        !cleanContinuation.toLowerCase().includes('agência:') &&
        !cleanContinuation.toLowerCase().includes('conta:') &&
        !cleanContinuation.toLowerCase().includes('cliente:')
      ) {
        const ultimo = lancamentos[lancamentos.length - 1];
        ultimo.historicoParts.push(cleanContinuation);
      }
    }
  }

  return lancamentos.map((lanc, idx) => {
    const historicoCompleto = lanc.historicoParts
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const { tipoLancamento, cpf, nomeExtrato } =
      extrairDadosHistorico(historicoCompleto);

    return {
      idTemp: idx + 1,
      selecionado: true,
      dataLancamento: lanc.dataLancamento,
      lote: lanc.lote,
      documento: lanc.documento,
      historico: historicoCompleto,
      tipoLancamento,
      cpf,
      nomeExtrato,
      valor: lanc.valor,
      tipo: lanc.tipo,
      desconsiderado: tipoLancamento === 'BB Rende Fácil',
      pessoaId: null,
    };
  });
}
