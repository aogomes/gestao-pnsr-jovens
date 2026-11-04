'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ItemConciliacaoExtraido,
  PdfColumnBounds,
  TIPOS_LANCAMENTO_BB,
  parseLinhasExtratoBB,
  extrairLancamentosDePaginaPdfBB,
  extrairDadosHistorico,
  detectarTipoLancamento,
  tipoSemCpf,
} from '@/lib/bb-pdf-parser';
import {
  Plus,
  Search,
  Trash2,
  X,
  Loader2,
  FileText,
  CheckCircle2,
  UserCheck,
  UserPlus,
  ArrowLeft,
  Calendar,
  Sparkles,
  Check,
  Ban,
  Download,
  RefreshCw,
} from 'lucide-react';

const MESES = [
  { valor: 1, nome: 'Janeiro' },
  { valor: 2, nome: 'Fevereiro' },
  { valor: 3, nome: 'Março' },
  { valor: 4, nome: 'Abril' },
  { valor: 5, nome: 'Maio' },
  { valor: 6, nome: 'Junho' },
  { valor: 7, nome: 'Julho' },
  { valor: 8, nome: 'Agosto' },
  { valor: 9, nome: 'Setembro' },
  { valor: 10, nome: 'Outubro' },
  { valor: 11, nome: 'Novembro' },
  { valor: 12, nome: 'Dezembro' },
];

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () =>
      reject(new Error('Erro ao carregar PDF.js do CDN.'));
    document.head.appendChild(script);
  });
};

function normalizarTexto(str?: string | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function apenasDigitos(str?: string | null): string {
  if (!str) return '';
  return str.replace(/\D/g, '');
}

interface Props {
  contas: any[];
  podeEditar: boolean;
}

export default function ConciliacaoBancariaTab({ contas, podeEditar }: Props) {
  const hoje = new Date();
  const [modoVisao, setModoVisao] = useState<'lista' | 'nova' | 'detalhe'>(
    'lista',
  );

  // Lista de conciliações
  const [conciliacoes, setConciliacoes] = useState<any[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [filtroMesLista, setFiltroMesLista] = useState<string>('');
  const [filtroAnoLista, setFiltroAnoLista] = useState<string>('');

  // Pessoas para associação manual
  const [pessoas, setPessoas] = useState<any[]>([]);

  // Estados de Nova Conciliação (Importação PDF BB)
  const [mesForm, setMesForm] = useState<number>(hoje.getMonth() + 1);
  const [anoForm, setAnoForm] = useState<number>(hoje.getFullYear());
  const [descricaoForm, setDescricaoForm] = useState<string>('');
  const [contaIdForm, setContaIdForm] = useState<string>('');
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [lendoPdf, setLendoPdf] = useState(false);
  const [statusPdfMsg, setStatusPdfMsg] = useState('');
  const [itensExtraidos, setItensExtraidos] = useState<
    ItemConciliacaoExtraido[]
  >([]);
  const [salvandoConciliacao, setSalvandoConciliacao] = useState(false);

  // Estados de Detalhe da Conciliação selecionada
  const [conciliacaoAtual, setConciliacaoAtual] = useState<any | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [buscaItem, setBuscaItem] = useState('');
  const [filtroTipoLancamentoItem, setFiltroTipoLancamentoItem] =
    useState<string>('TODOS');
  const [filtroPessoaItem, setFiltroPessoaItem] = useState<string>('TODAS');
  const [filtroAssociacaoItem, setFiltroAssociacaoItem] = useState<
    'TODOS' | 'PENDENTES' | 'ASSOCIADOS' | 'DESCONSIDERADOS'
  >('TODOS');

  // Modal de Associação Manual de Pessoa
  const [itemParaAssociar, setItemParaAssociar] = useState<any | null>(null);
  const [buscaPessoaModal, setBuscaPessoaModal] = useState('');
  const [pessoaSelecionadaId, setPessoaSelecionadaId] = useState<number | null>(
    null,
  );
  const [atualizarCpfPessoa, setAtualizarCpfPessoa] = useState(false);
  const [salvandoAssociacao, setSalvandoAssociacao] = useState(false);
  const [gerandoRelatorioId, setGerandoRelatorioId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    carregarConciliacoes();
    carregarPessoas();
  }, [filtroMesLista, filtroAnoLista]);

  const carregarConciliacoes = async () => {
    setCarregandoLista(true);
    try {
      const params = new URLSearchParams();
      if (filtroMesLista) params.append('mes', filtroMesLista);
      if (filtroAnoLista) params.append('ano', filtroAnoLista);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/conciliacao${query}`);
      setConciliacoes(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar conciliações:', err);
    } finally {
      setCarregandoLista(false);
    }
  };

  const carregarPessoas = async () => {
    try {
      const res = await api.get('/pessoas');
      setPessoas(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar pessoas:', err);
    }
  };

  const abrirDetalheConciliacao = async (id: number) => {
    setCarregandoDetalhe(true);
    setBuscaItem('');
    setFiltroTipoLancamentoItem('TODOS');
    setFiltroPessoaItem('TODAS');
    setFiltroAssociacaoItem('TODOS');
    setModoVisao('detalhe');
    try {
      const res = await api.get(`/conciliacao/${id}`);
      setConciliacaoAtual(res.data);
    } catch (err) {
      alert('Erro ao carregar detalhes da conciliação.');
      setModoVisao('lista');
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const iniciarNovaConciliacao = () => {
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const nomeMes = MESES.find((m) => m.valor === mesAtual)?.nome || '';
    setMesForm(mesAtual);
    setAnoForm(anoAtual);
    setDescricaoForm(`Extrato Banco do Brasil - ${nomeMes}/${anoAtual}`);
    setContaIdForm(contas[0]?.id ? String(contas[0].id) : '');
    setArquivoPdf(null);
    setItensExtraidos([]);
    setModoVisao('nova');
  };

  const processarArquivoPdfBB = async (
    file: File,
    mesRef: number,
    anoRef: number,
  ) => {
    setArquivoPdf(file);
    setItensExtraidos([]);
    setLendoPdf(true);

    try {
      setStatusPdfMsg('Carregando leitor PDF.js...');
      const pdfjsLib = await loadPdfJs();

      setStatusPdfMsg('Extraindo 5 colunas do extrato do Banco do Brasil...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const extractedByCoords: Omit<ItemConciliacaoExtraido, 'idTemp'>[] = [];
      const fallbackLines: string[] = [];
      let colBounds: PdfColumnBounds | undefined = undefined;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setStatusPdfMsg(
          `Lendo página ${pageNum} de ${numPages} do extrato...`,
        );
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        const { lancamentosPagina, detectedBounds } =
          extrairLancamentosDePaginaPdfBB(items, colBounds);
        if (detectedBounds) {
          colBounds = detectedBounds;
        }
        extractedByCoords.push(...lancamentosPagina);

        // Guardar linhas simples caso o PDF não siga o layout de coordenadas do BB
        const rowsMap: { y: number; items: { x: number; str: string }[] }[] =
          [];
        items.forEach((it: any) => {
          if (!it.str || !it.str.trim()) return;
          const x = it.transform[4];
          const y = it.transform[5];
          const r = rowsMap.find((row) => Math.abs(row.y - y) <= 3);
          if (r) r.items.push({ x, str: it.str.trim() });
          else rowsMap.push({ y, items: [{ x, str: it.str.trim() }] });
        });
        rowsMap.sort((a, b) => b.y - a.y);
        rowsMap.forEach((r) => {
          r.items.sort((a, b) => a.x - b.x);
          fallbackLines.push(r.items.map((i) => i.str).join(' '));
        });
      }

      setStatusPdfMsg(
        'Ignorando linhas de saldo e classificando tipos de lançamento...',
      );
      const parsed: ItemConciliacaoExtraido[] =
        extractedByCoords.length > 0
          ? extractedByCoords.map((item, idx) => ({
            ...item,
            idTemp: idx + 1,
          }))
          : parseLinhasExtratoBB(fallbackLines, mesRef, anoRef);
      setItensExtraidos(parsed);

      if (parsed.length === 0) {
        alert(
          'Nenhum lançamento válido foi encontrado no PDF (ou o arquivo contém apenas linhas de saldo/imagem). Verifique o arquivo enviado.',
        );
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLendoPdf(false);
      setStatusPdfMsg('');
    }
  };

  const salvarNovaConciliacao = async () => {
    if (!descricaoForm.trim()) {
      alert('Informe uma descrição para a conciliação.');
      return;
    }
    const selecionados = itensExtraidos.filter((i) => i.selecionado);
    if (selecionados.length === 0) {
      alert('Selecione ao menos um item para salvar a conciliação.');
      return;
    }

    setSalvandoConciliacao(true);
    try {
      const payload = {
        mes: Number(mesForm),
        ano: Number(anoForm),
        descricao: descricaoForm.trim(),
        contaId: contaIdForm ? Number(contaIdForm) : null,
        itens: selecionados.map((item) => {
          const isRendeFacil = item.tipoLancamento === 'BB Rende Fácil';
          const desconsiderado = Boolean(item.desconsiderado || isRendeFacil);
          return {
            dataLancamento: item.dataLancamento,
            lote: item.lote ? item.lote.trim() : undefined,
            documento: item.documento ? item.documento.trim() : undefined,
            historico: item.historico,
            tipoLancamento: item.tipoLancamento || undefined,
            cpf: item.cpf || undefined,
            nomeExtrato: item.nomeExtrato || undefined,
            valor: Number(item.valor),
            tipo: item.tipo,
            desconsiderado,
            pessoaId: desconsiderado ? null : item.pessoaId || null,
          };
        }),
      };

      const res = await api.post('/conciliacao', payload);
      await carregarConciliacoes();
      setConciliacaoAtual(res.data);
      setModoVisao('detalhe');
    } catch (err: any) {
      console.error(err);
      alert(
        'Erro ao salvar conciliação: ' +
        (err.response?.data?.message || err.message),
      );
    } finally {
      setSalvandoConciliacao(false);
    }
  };

  const excluirConciliacao = async (id: number) => {
    if (
      !confirm(
        'Tem certeza que deseja excluir esta conciliação e todos os seus itens?',
      )
    )
      return;
    try {
      await api.delete(`/conciliacao/${id}`);
      if (conciliacaoAtual?.id === id) {
        setConciliacaoAtual(null);
        setModoVisao('lista');
      }
      carregarConciliacoes();
    } catch (err) {
      alert('Erro ao excluir conciliação.');
    }
  };

  // Busca sugestão de pessoa pelo CPF ou Nome extraído do histórico
  const encontrarSugestaoPessoa = (item: any) => {
    if (!item || (!item.cpf && !item.nomeExtrato)) {
      return null;
    }

    const cpfItem = apenasDigitos(item.cpf);
    if (cpfItem && cpfItem.length >= 11) {
      const porCpf = pessoas.find(
        (p) => apenasDigitos(p.documento) === cpfItem,
      );
      if (porCpf) return { pessoa: porCpf, motivo: 'CPF idêntico' };
    }

    const nomeItem = normalizarTexto(item.nomeExtrato);
    if (nomeItem && nomeItem.length >= 4) {
      const porNomeExato = pessoas.find(
        (p) => normalizarTexto(p.nome) === nomeItem,
      );
      if (porNomeExato) return { pessoa: porNomeExato, motivo: 'Nome exato' };

      const partesItem = nomeItem.split(' ');
      if (partesItem.length >= 2) {
        const primeiro = partesItem[0];
        const ultimo = partesItem[partesItem.length - 1];
        const porNomeParcial = pessoas.find((p) => {
          const n = normalizarTexto(p.nome);
          return n.startsWith(primeiro + ' ') && n.endsWith(' ' + ultimo);
        });
        if (porNomeParcial)
          return { pessoa: porNomeParcial, motivo: 'Nome similar' };
      }
    }

    return null;
  };

  const abrirModalAssociar = (item: any) => {
    setItemParaAssociar(item);
    setPessoaSelecionadaId(item.pessoaId || null);
    setBuscaPessoaModal(item.nomeExtrato || item.cpf || '');
    setAtualizarCpfPessoa(false);
  };

  const confirmarAssociacaoManual = async (
    itemId: number,
    pessoaId: number | null,
    atualizarCpf = false,
    desconsiderado = false,
  ) => {
    setSalvandoAssociacao(true);
    try {
      const res = await api.patch(`/conciliacao/itens/${itemId}/pessoa`, {
        pessoaId: desconsiderado ? null : pessoaId,
        desconsiderado,
        atualizarCpfCadastro: desconsiderado ? false : atualizarCpf,
      });

      if (conciliacaoAtual) {
        setConciliacaoAtual({
          ...conciliacaoAtual,
          itens: conciliacaoAtual.itens.map((it: any) =>
            it.id === itemId ? res.data : it,
          ),
        });
      }

      if (!desconsiderado && atualizarCpf) {
        carregarPessoas();
      }
      setItemParaAssociar(null);
    } catch (err: any) {
      alert(
        'Erro ao associar item: ' +
        (err.response?.data?.message || err.message),
      );
    } finally {
      setSalvandoAssociacao(false);
    }
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const formatarData = (isoString: string) => {
    if (!isoString) return '';
    const [year, month, day] = isoString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const gerarRelatorioPdfConciliacao = (conciliacaoDados: any) => {
    if (!conciliacaoDados) return;
    const itens: any[] = conciliacaoDados.itens || [];
    const mesPad = String(conciliacaoDados.mes).padStart(2, '0');
    const nomeMes =
      MESES.find((m) => m.valor === conciliacaoDados.mes)?.nome ||
      String(conciliacaoDados.mes);

    const doc = new jsPDF();

    // =========================================================================
    // PARTE 1: TODOS OS ITENS IMPORTADOS (Dia, Histórico, Valor, Nome da Pessoa Associada)
    // =========================================================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(19, 81, 180);
    doc.text('Relatório de Conciliação Bancária', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Período: ${mesPad}/${conciliacaoDados.ano} (${nomeMes})  |  Descrição: ${conciliacaoDados.descricao || '-'}`,
      14,
      17.5,
    );
    doc.text(
      `Conta: ${conciliacaoDados.conta?.nome || 'Não informada'}  |  Total de Itens Importados: ${itens.length}`,
      14,
      21,
    );

    const colunasItens = [
      'Dia',
      'Lote',
      'Documento',
      'Histórico',
      'Valor',
      'Nome da Pessoa Associada',
    ];

    const linhasItens = itens.map((item: any) => {
      const isCredito = item.tipo === 'CREDITO' || item.tipo === 'RECEITA';
      const valorFormatado = `${formatarMoeda(item.valor)} ${isCredito ? '(+)' : '(-)'}`;
      const tipoLanc =
        item.tipoLancamento || detectarTipoLancamento(item.historico || '');
      const isPixRecebido = /^pix\s*[-–]?\s*recebido/i.test(tipoLanc.trim());
      const nomeAssociado = item.pessoa?.nome
        ? item.pessoa.nome.toUpperCase()
        : item.desconsiderado
          ? isPixRecebido
            ? '>> NÃO IDENTIFICADO NA PNSR <<'
            : ''
          : 'NÃO ASSOCIADO';

      return [
        formatarData(item.dataLancamento),
        item.lote || '',
        item.documento || '',
        (item.historico || '-').toUpperCase(),
        valorFormatado,
        nomeAssociado,
      ];
    });

    autoTable(doc, {
      head: [colunasItens],
      body: linhasItens,
      startY: 24,
      theme: 'grid',
      headStyles: {
        fillColor: [19, 81, 180],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 5.5,
        cellPadding: 1,
      },
      styles: {
        fontSize: 5,
        cellPadding: 0.9,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 22 },
        3: { cellWidth: 65 },
        4: { halign: 'right', cellWidth: 22 },
        5: { cellWidth: 46 },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          const rawVal = String(data.cell.raw || '');
          data.cell.styles.fontStyle = 'bold';
          if (rawVal.includes('(+)')) {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (rawVal.includes('(-)')) {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
        if (data.section === 'body' && data.column.index === 5) {
          const rawAssoc = String(data.cell.raw || '');
          if (rawAssoc === '>> NÃO IDENTIFICADO NA PNSR <<') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = '5.5';
          } else if (rawAssoc === 'NÃO ASSOCIADO') {
            data.cell.styles.textColor = [180, 83, 9];
          } else if (rawAssoc) {
            data.cell.styles.textColor = [6, 95, 70];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // =========================================================================
    // PARTE 2: NOVA PÁGINA - PESSOAS ASSOCIADAS EM ORDEM ASC + TOTAL AGRUPADO + TOTAL GERAL
    // =========================================================================
    doc.addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(19, 81, 180);
    doc.text(
      'Resumo dos Lançamentos por Pessoa Associada',
      14,
      13,
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Período: ${mesPad}/${conciliacaoDados.ano} (${nomeMes})  |  Descrição: ${conciliacaoDados.descricao || '-'}`,
      14,
      17.5,
    );

    // Agrupar itens que possuem pessoa associada
    const mapaPessoas: Record<
      number,
      { nome: string; qtd: number; total: number }
    > = {};

    itens.forEach((item: any) => {
      if (item.pessoaId && item.pessoa?.nome && !item.desconsiderado) {
        const pid = Number(item.pessoaId);
        if (!mapaPessoas[pid]) {
          mapaPessoas[pid] = {
            nome: item.pessoa.nome.toUpperCase().trim(),
            qtd: 0,
            total: 0,
          };
        }
        mapaPessoas[pid].qtd += 1;
        mapaPessoas[pid].total += Number(item.valor || 0);
      }
    });

    // Ordenar pessoas em ordem ASC pelo nome
    const pessoasAgrupadasAsc = Object.values(mapaPessoas).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );

    const totalGeralAssociado = pessoasAgrupadasAsc.reduce(
      (acc, p) => acc + p.total,
      0,
    );
    const totalLancamentosAssociados = pessoasAgrupadasAsc.reduce(
      (acc, p) => acc + p.qtd,
      0,
    );

    doc.text(
      `Pessoas Associadas: ${pessoasAgrupadasAsc.length}  |  Lançamentos Associados a Pessoas: ${totalLancamentosAssociados}  |  Total Associado: ${formatarMoeda(totalGeralAssociado)}`,
      14,
      21,
    );

    const colunasPessoas = [
      '#',
      'Nome da Pessoa Associada',
      'Qtd. Lançamentos',
      'Total Associado',
    ];

    const linhasPessoas =
      pessoasAgrupadasAsc.length > 0
        ? pessoasAgrupadasAsc.map((p, idx) => [
          String(idx + 1),
          p.nome,
          String(p.qtd),
          formatarMoeda(p.total),
        ])
        : [['-', 'NENHUMA PESSOA ASSOCIADA NESTA CONCILIAÇÃO', '0', formatarMoeda(0)]];

    autoTable(doc, {
      head: [colunasPessoas],
      body: linhasPessoas,
      foot: [
        [
          '',
          'TOTAL ASSOCIADO',
          String(totalLancamentosAssociados),
          formatarMoeda(totalGeralAssociado),
        ],
      ],
      showFoot: 'lastPage',
      startY: 24,
      theme: 'grid',
      headStyles: {
        fillColor: [19, 81, 180],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 5.5,
        cellPadding: 1.1,
      },
      styles: {
        fontSize: 5,
        cellPadding: 1,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      footStyles: {
        fillColor: [236, 253, 245],
        textColor: [6, 95, 70],
        fontStyle: 'bold',
        fontSize: 6,
        cellPadding: 1.4,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { cellWidth: 108 },
        2: { halign: 'center', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'foot') {
          if (data.column.index === 2) {
            data.cell.styles.halign = 'center';
          }
          if (data.column.index === 3) {
            data.cell.styles.halign = 'right';
          }
        }
      },
    });

    const nomeArquivo = `relatorio_conciliacao_${mesPad}_${conciliacaoDados.ano}.pdf`;
    doc.save(nomeArquivo);
  };

  const baixarRelatorioPorId = async (id: number) => {
    setGerandoRelatorioId(id);
    try {
      const res = await api.get(`/conciliacao/${id}`);
      gerarRelatorioPdfConciliacao(res.data);
    } catch (err) {
      alert('Erro ao carregar dados da conciliação para gerar o relatório.');
    } finally {
      setGerandoRelatorioId(null);
    }
  };

  const isItemAssociado = (it: any) =>
    it.pessoaId !== null || Boolean(it.desconsiderado);

  const pessoasAssociadasConciliacao = useMemo(() => {
    if (!conciliacaoAtual?.itens) return [];
    const mapa: Record<
      number,
      { id: number; nome: string; qtd: number; total: number }
    > = {};
    conciliacaoAtual.itens.forEach((it: any) => {
      if (it.pessoaId && it.pessoa?.nome && !it.desconsiderado) {
        const pid = Number(it.pessoaId);
        if (!mapa[pid]) {
          mapa[pid] = {
            id: pid,
            nome: it.pessoa.nome,
            qtd: 0,
            total: 0,
          };
        }
        mapa[pid].qtd += 1;
        mapa[pid].total += Number(it.valor || 0);
      }
    });
    return Object.values(mapa).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [conciliacaoAtual]);

  const itensDetalheFiltrados = useMemo(() => {
    if (!conciliacaoAtual?.itens) return [];
    return conciliacaoAtual.itens.filter((it: any) => {
      const associado = it.pessoaId !== null || Boolean(it.desconsiderado);
      if (
        filtroTipoLancamentoItem !== 'TODOS' &&
        (it.tipoLancamento || 'Outros') !== filtroTipoLancamentoItem
      ) {
        return false;
      }
      if (
        filtroPessoaItem !== 'TODAS' &&
        (it.desconsiderado || String(it.pessoaId || '') !== filtroPessoaItem)
      ) {
        return false;
      }
      if (filtroAssociacaoItem === 'PENDENTES' && associado) return false;
      if (
        filtroAssociacaoItem === 'ASSOCIADOS' &&
        (it.pessoaId === null || Boolean(it.desconsiderado))
      ) {
        return false;
      }
      if (
        filtroAssociacaoItem === 'DESCONSIDERADOS' &&
        !Boolean(it.desconsiderado)
      ) {
        return false;
      }

      if (buscaItem.trim()) {
        const termo = normalizarTexto(buscaItem);
        const matchHist = normalizarTexto(it.historico).includes(termo);
        const matchTipo = normalizarTexto(it.tipoLancamento).includes(termo);
        const matchCpf = (it.cpf || '').toLowerCase().includes(termo);
        const matchNomeExt = normalizarTexto(it.nomeExtrato).includes(termo);
        const matchDoc = (it.documento || '').toLowerCase().includes(termo);
        const matchLote = (it.lote || '').toLowerCase().includes(termo);
        const matchPessoa = normalizarTexto(it.pessoa?.nome).includes(termo);
        const matchDesconsiderado =
          Boolean(it.desconsiderado) &&
          'desconsiderar desconsiderado'.includes(termo);
        const matchValor = String(it.valor).includes(termo);
        return (
          matchHist ||
          matchTipo ||
          matchCpf ||
          matchNomeExt ||
          matchDoc ||
          matchLote ||
          matchPessoa ||
          matchDesconsiderado ||
          matchValor
        );
      }

      return true;
    });
  }, [
    conciliacaoAtual,
    filtroTipoLancamentoItem,
    filtroPessoaItem,
    filtroAssociacaoItem,
    buscaItem,
  ]);

  const pessoasFiltradasModal = useMemo(() => {
    if (!buscaPessoaModal.trim()) return pessoas.slice(0, 50);
    const termo = normalizarTexto(buscaPessoaModal);
    const termoDig = apenasDigitos(buscaPessoaModal);
    return pessoas
      .filter((p) => {
        const matchNome = normalizarTexto(p.nome).includes(termo);
        const matchDoc =
          termoDig.length > 0 && apenasDigitos(p.documento).includes(termoDig);
        const matchEmail = normalizarTexto(p.email).includes(termo);
        return matchNome || matchDoc || matchEmail;
      })
      .slice(0, 50);
  }, [pessoas, buscaPessoaModal]);

  // ============================================================================
  // VISÃO 1: LISTA DE CONCILIAÇÕES POR MÊS/ANO
  // ============================================================================
  if (modoVisao === 'lista') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
            <div>
              <h2 className="text-sm font-black text-[#1351b4] uppercase tracking-tight">
                Conciliações Bancárias (Banco do Brasil)
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                Importação mensal por PDF (Dia, Lote, Documento, Histórico e Valor (+) / (-))
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={filtroMesLista}
                onChange={(e) => setFiltroMesLista(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-sm text-[10px] font-black text-slate-700 uppercase"
              >
                <option value="">Todos os Meses</option>
                {MESES.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {String(m.valor).padStart(2, '0')} - {m.nome}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Ano"
                value={filtroAnoLista}
                onChange={(e) => setFiltroAnoLista(e.target.value)}
                className="w-28 px-3 py-2 bg-white border border-slate-200 rounded-sm text-[10px] font-black text-slate-700 uppercase"
              />

              {podeEditar && (
                <button
                  onClick={iniciarNovaConciliacao}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Importar Extrato PDF
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-[#1351b4] text-white">
                  <th className="pl-6 pr-3 py-2.5 text-xs font-bold">
                    Mês / Ano
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold">Descrição</th>
                  {/* <th className="px-3 py-2.5 text-xs font-bold">Conta</th> */}
                  <th className="px-3 py-2.5 text-xs font-bold text-center">
                    Total Itens
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold text-center">
                    Itens com CPF (Pix)
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold text-center">
                    Itens Associados
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold text-right">
                    Entradas (+)
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold text-right">
                    Saídas (-)
                  </th>
                  <th className="px-3 py-2.5 text-xs font-bold text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregandoLista ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1351b4]" />
                    </td>
                  </tr>
                ) : conciliacoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]"
                    >
                      Nenhuma conciliação importada ainda. Clique em
                      &quot;Importar Extrato PDF (BB)&quot; para começar.
                    </td>
                  </tr>
                ) : (
                  conciliacoes.map((c) => {
                    const nomeMes =
                      MESES.find((m) => m.valor === c.mes)?.nome || c.mes;
                    const total = c.resumo?.totalItens || 0;
                    const assoc = c.resumo?.itensAssociados || 0;
                    const comCpf = c.resumo?.itensComCpf || 0;
                    const comCpfAssoc = c.resumo?.itensComCpfAssociados || 0;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="pl-6 pr-3 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#1351b4] font-black text-xs rounded-sm border border-blue-100">
                            <Calendar className="w-3.5 h-3.5" />
                            {String(c.mes).padStart(2, '0')}/{c.ano} ({nomeMes})
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-xs text-slate-700 uppercase">
                          {c.descricao}
                        </td>
                        {/* <td className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">
                          {c.conta?.nome || '-'}
                        </td> */}
                        <td className="px-3 py-3 text-center font-black text-xs text-slate-700">
                          {total}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-sm text-[11px] font-black">
                            {comCpfAssoc} / {comCpf} associados
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm text-[11px] font-black">
                            {assoc} / {total}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-black text-xs text-emerald-600 whitespace-nowrap">
                          {formatarMoeda(c.resumo?.totalCreditos || 0)} (+)
                        </td>
                        <td className="px-3 py-3 text-right font-black text-xs text-rose-600 whitespace-nowrap">
                          {formatarMoeda(c.resumo?.totalDebitos || 0)} (-)
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => abrirDetalheConciliacao(c.id)}
                              className="px-3 py-1.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-wider hover:bg-[#0047b7] transition-colors flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Conciliação
                            </button>
                            <button
                              onClick={() => baixarRelatorioPorId(c.id)}
                              disabled={gerandoRelatorioId === c.id}
                              title="Gerar Relatório PDF da Conciliação"
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-sm text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {gerandoRelatorioId === c.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Relatório
                            </button>
                            {podeEditar && (
                              <button
                                onClick={() => excluirConciliacao(c.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-sm transition-colors"
                                title="Excluir conciliação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISÃO 2: NOVA IMPORTAÇÃO DE EXTRATO PDF BANCO DO BRASIL
  // ============================================================================
  if (modoVisao === 'nova') {
    const selecionados = itensExtraidos.filter((i) => i.selecionado);
    const totalComCpf = selecionados.filter((i) => !!i.cpf).length;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModoVisao('lista')}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-[#1351b4] uppercase tracking-tight">
                  Nova Conciliação Bancária - Extrato PDF Banco do Brasil
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Separação em 5 colunas (Dia, Lote, Documento, Histórico e
                  Valor (+) / (-)) + Tipo do Lançamento
                </p>
              </div>
            </div>
          </div>

          {/* Cabeçalho da Conciliação (Mês, Ano, Descrição, Conta) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mês da Conciliação *
              </label>
              <select
                value={mesForm}
                onChange={(e) => {
                  const novoMes = Number(e.target.value);
                  setMesForm(novoMes);
                  const nomeMes =
                    MESES.find((m) => m.valor === novoMes)?.nome || '';
                  setDescricaoForm(
                    `Extrato Banco do Brasil - ${nomeMes}/${anoForm}`,
                  );
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 uppercase outline-none focus:border-[#1351b4]"
              >
                {MESES.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {String(m.valor).padStart(2, '0')} - {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ano da Conciliação *
              </label>
              <input
                type="number"
                min={2020}
                max={2100}
                value={anoForm}
                onChange={(e) => {
                  const novoAno = Number(e.target.value);
                  setAnoForm(novoAno);
                  const nomeMes =
                    MESES.find((m) => m.valor === mesForm)?.nome || '';
                  setDescricaoForm(
                    `Extrato Banco do Brasil - ${nomeMes}/${novoAno}`,
                  );
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none focus:border-[#1351b4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Descrição da Conciliação *
              </label>
              <input
                type="text"
                value={descricaoForm}
                onChange={(e) => setDescricaoForm(e.target.value)}
                placeholder="Ex: Conciliação BB Maio/2026"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 uppercase outline-none focus:border-[#1351b4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Conta Vinculada (Opcional)
              </label>
              <select
                value={contaIdForm}
                onChange={(e) => setContaIdForm(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 uppercase outline-none focus:border-[#1351b4]"
              >
                <option value="">Sem conta específica</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload do PDF */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Arquivo PDF do Extrato (Banco do Brasil)
            </label>
            <div
              onClick={() =>
                document.getElementById('input-pdf-bb-conciliacao')?.click()
              }
              className="border-2 border-dashed border-slate-200 hover:border-[#1351b4]/50 bg-slate-50 hover:bg-[#1351b4]/5 cursor-pointer rounded-sm p-8 flex flex-col items-center justify-center text-center transition-all group"
            >
              <input
                id="input-pdf-bb-conciliacao"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processarArquivoPdfBB(file, mesForm, anoForm);
                }}
              />
              <FileText className="w-10 h-10 text-slate-300 group-hover:text-[#1351b4] transition-colors mb-3" />
              {arquivoPdf ? (
                <div>
                  <p className="text-xs font-black text-slate-700 uppercase">
                    {arquivoPdf.name}
                  </p>
                  <p className="text-[10px] text-[#1351b4] font-black uppercase mt-1">
                    {(arquivoPdf.size / 1024).toFixed(1)} KB • Clique para
                    substituir o PDF
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-black text-slate-600 uppercase">
                    Clique para selecionar o PDF do extrato do Banco do Brasil
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Separa em 5 colunas (Dia, Lote, Documento, Histórico, Valor
                    (+) / (-)) e classifica o Tipo do Lançamento
                  </p>
                </div>
              )}
            </div>
          </div>

          {lendoPdf && (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#1351b4] animate-spin" />
              <p className="text-xs font-black text-[#1351b4] uppercase tracking-widest">
                {statusPdfMsg}
              </p>
            </div>
          )}

          {/* Pré-visualização dos itens extraídos */}
          {itensExtraidos.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                    Itens Extraídos do PDF ({selecionados.length} selecionados •{' '}
                    <span className="text-amber-600">
                      {totalComCpf} com CPF identificado
                    </span>
                    )
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    Confira as 5 colunas + Tipo do Lançamento antes de gravar.
                    Transferência enviada/recebida e Dep dinheiro ATM não
                    possuem CPF.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setItensExtraidos((prev) =>
                        prev.map((i) => ({ ...i, selecionado: true })),
                      )
                    }
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-slate-200"
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setItensExtraidos((prev) =>
                        prev.map((i) => ({ ...i, selecionado: false })),
                      )
                    }
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-slate-200"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-sm max-h-[520px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 sticky top-0 z-10 text-[9px] font-black uppercase tracking-wider text-slate-500">
                      <th className="p-2.5 text-center w-10">Sel.</th>
                      <th className="p-2.5 w-32">1. Dia / Data</th>
                      <th className="p-2.5 w-24">2. Lote</th>
                      <th className="p-2.5 w-28">3. Documento</th>
                      <th className="p-2.5 w-44">Tipo do Lançamento</th>
                      <th className="p-2.5">4. Histórico</th>
                      <th className="p-2.5 w-36">CPF</th>
                      <th className="p-2.5 w-44">Nome Extraído</th>
                      <th className="p-2.5 w-28 text-center">Sinal (+ / -)</th>
                      <th className="p-2.5 w-32 text-right">5. Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensExtraidos.map((item, idx) => {
                      const semCpf = tipoSemCpf(item.tipoLancamento);
                      return (
                        <tr
                          key={item.idTemp}
                          className={`hover:bg-slate-50 ${item.selecionado ? '' : 'opacity-40'
                            }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.selecionado}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? { ...it, selecionado: checked }
                                      : it,
                                  ),
                                );
                              }}
                              className="w-4 h-4 text-[#1351b4] rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="date"
                              value={item.dataLancamento}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? { ...it, dataLancamento: val }
                                      : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-bold text-slate-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.lote}
                              placeholder="(Vazio)"
                              onChange={(e) => {
                                const novoLote = e.target.value;
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, lote: novoLote } : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-bold text-slate-700 text-center placeholder:text-slate-300"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.documento}
                              placeholder="(Vazio)"
                              onChange={(e) => {
                                const val = e.target.value;
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, documento: val } : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-bold text-slate-700 placeholder:text-slate-300"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.tipoLancamento}
                              onChange={(e) => {
                                const novoTipoLanc = e.target.value;
                                const extra = extrairDadosHistorico(
                                  item.historico,
                                  novoTipoLanc,
                                );
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? {
                                        ...it,
                                        tipoLancamento: novoTipoLanc,
                                        cpf: extra.cpf,
                                        nomeExtrato: extra.nomeExtrato,
                                        desconsiderado:
                                          novoTipoLanc === 'BB Rende Fácil',
                                      }
                                      : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-black text-[#1351b4]"
                            >
                              {TIPOS_LANCAMENTO_BB.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.historico}
                              onChange={(e) => {
                                const novoHist = e.target.value;
                                const extra = extrairDadosHistorico(novoHist);
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? {
                                        ...it,
                                        historico: novoHist,
                                        tipoLancamento: extra.tipoLancamento,
                                        cpf: extra.cpf,
                                        nomeExtrato: extra.nomeExtrato,
                                        desconsiderado:
                                          extra.tipoLancamento ===
                                          'BB Rende Fácil',
                                      }
                                      : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-bold text-slate-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.cpf}
                              disabled={semCpf}
                              placeholder={semCpf ? 'Sem CPF' : 'CPF...'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, cpf: val } : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.nomeExtrato}
                              disabled={semCpf}
                              placeholder={semCpf ? '-' : 'Nome extraído...'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? { ...it, nomeExtrato: val }
                                      : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-bold text-slate-700 uppercase disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.tipo}
                              onChange={(e) => {
                                const val = e.target.value as
                                  | 'CREDITO'
                                  | 'DEBITO';
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, tipo: val } : it,
                                  ),
                                );
                              }}
                              className={`w-full p-1.5 border rounded-sm text-[10px] font-black uppercase ${item.tipo === 'CREDITO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                            >
                              <option value="CREDITO">(+) Entrada</option>
                              <option value="DEBITO">(-) Saída</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.valor}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setItensExtraidos((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, valor: val } : it,
                                  ),
                                );
                              }}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded-sm text-[11px] font-black text-slate-700 text-right"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModoVisao('lista')}
                  className="px-6 py-3 border border-slate-200 text-slate-600 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarNovaConciliacao}
                  disabled={salvandoConciliacao || selecionados.length === 0}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {salvandoConciliacao ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Salvar Conciliação ({selecionados.length} Itens)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISÃO 3: DETALHES DA CONCILIAÇÃO E ASSOCIAÇÃO MANUAL DE PESSOA (id_pessoa)
  // ============================================================================
  if (carregandoDetalhe || !conciliacaoAtual) {
    return (
      <div className="p-20 bg-white border border-slate-200 rounded-sm flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1351b4]" />
      </div>
    );
  }

  const totalItens = conciliacaoAtual.itens?.length || 0;
  const totalAssociados =
    conciliacaoAtual.itens?.filter((i: any) => isItemAssociado(i)).length || 0;
  const qtdPendentes =
    conciliacaoAtual.itens?.filter((i: any) => !isItemAssociado(i)).length || 0;
  const qtdAssociadosPessoa =
    conciliacaoAtual.itens?.filter(
      (i: any) => i.pessoaId !== null && !Boolean(i.desconsiderado),
    ).length || 0;
  const qtdDesconsiderados =
    conciliacaoAtual.itens?.filter((i: any) => Boolean(i.desconsiderado))
      .length || 0;
  const nomeMesConciliacao =
    MESES.find((m) => m.valor === conciliacaoAtual.mes)?.nome ||
    conciliacaoAtual.mes;
  const pessoaSelecionadaFiltro =
    filtroPessoaItem !== 'TODAS'
      ? pessoasAssociadasConciliacao.find(
        (p) => String(p.id) === filtroPessoaItem,
      ) || null
      : null;
  const totalFiltradoItens = itensDetalheFiltrados.reduce(
    (acc: number, it: any) => acc + Number(it.valor || 0),
    0,
  );
  const labelStatusFiltro =
    filtroAssociacaoItem === 'PENDENTES'
      ? 'Pendentes'
      : filtroAssociacaoItem === 'ASSOCIADOS'
        ? 'Associados'
        : filtroAssociacaoItem === 'DESCONSIDERADOS'
          ? 'Desconsiderados'
          : 'Todos os Status';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Topo da Conciliação */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setConciliacaoAtual(null);
                setModoVisao('lista');
                carregarConciliacoes();
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-[#1351b4] text-white text-[10px] font-black uppercase rounded-sm">
                  {String(conciliacaoAtual.mes).padStart(2, '0')}/
                  {conciliacaoAtual.ano} - {nomeMesConciliacao}
                </span>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {conciliacaoAtual.descricao}
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Associação manual de pessoas aos itens do extrato (Apenas
                Conferência/Auditoria)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Progresso de Associação
              </span>
              <span className="text-sm font-black text-emerald-600">
                {totalAssociados} de {totalItens} itens associados
              </span>
            </div>

            <button
              type="button"
              onClick={() => gerarRelatorioPdfConciliacao(conciliacaoAtual)}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Gerar Relatório PDF
            </button>
          </div>
        </div>

        {/* Filtros dos Itens */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por CPF, Nome extraído, Tipo, Histórico, Documento, Lote, Valor ou Pessoa..."
              value={buscaItem}
              onChange={(e) => setBuscaItem(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-700 focus:outline-none focus:border-[#1351b4]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filtroPessoaItem}
              onChange={(e) => setFiltroPessoaItem(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-sm text-[10px] font-black text-[#1351b4] uppercase max-w-xs"
            >
              <option value="TODAS">
                Todas as Pessoas Associadas ({pessoasAssociadasConciliacao.length})
              </option>
              {pessoasAssociadasConciliacao.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nome.toUpperCase()} ({p.qtd})
                </option>
              ))}
            </select>

            <select
              value={filtroTipoLancamentoItem}
              onChange={(e) => setFiltroTipoLancamentoItem(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-sm text-[10px] font-black text-slate-700 uppercase"
            >
              <option value="TODOS">Todos os Tipos</option>
              {TIPOS_LANCAMENTO_BB.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={filtroAssociacaoItem}
              onChange={(e) =>
                setFiltroAssociacaoItem(
                  e.target.value as
                  | 'TODOS'
                  | 'PENDENTES'
                  | 'ASSOCIADOS'
                  | 'DESCONSIDERADOS',
                )
              }
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-sm text-[10px] font-black text-slate-700 uppercase"
            >
              <option value="TODOS">Todos os Status ({totalItens})</option>
              <option value="PENDENTES">Pendentes ({qtdPendentes})</option>
              <option value="ASSOCIADOS">
                Associados ({qtdAssociadosPessoa})
              </option>
              <option value="DESCONSIDERADOS">
                Desconsiderados ({qtdDesconsiderados})
              </option>
            </select>
          </div>
        </div>

        {/* Resumo do Total quando filtrado por Pessoa ou por Status */}
        {(filtroPessoaItem !== 'TODAS' || filtroAssociacaoItem !== 'TODOS') && (
          <div className="px-3.5 py-2 bg-emerald-50/70 border border-emerald-200 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-600 text-white rounded-sm">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">
                  {filtroPessoaItem !== 'TODAS' &&
                    filtroAssociacaoItem !== 'TODOS'
                    ? `Filtro: Pessoa + Status (${labelStatusFiltro}):`
                    : filtroPessoaItem !== 'TODAS'
                      ? 'Pessoa Filtrada:'
                      : 'Status Filtrado:'}
                </span>
                <span className="text-xs font-black text-emerald-950 uppercase">
                  {filtroPessoaItem !== 'TODAS'
                    ? pessoaSelecionadaFiltro?.nome || 'Pessoa Selecionada'
                    : labelStatusFiltro}
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  ({itensDetalheFiltrados.length}{' '}
                  {itensDetalheFiltrados.length === 1
                    ? 'lançamento'
                    : 'lançamentos'}
                  )
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">
                  Total:
                </span>
                <span className="text-sm font-black text-emerald-800">
                  {formatarMoeda(totalFiltradoItens)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFiltroPessoaItem('TODAS');
                  setFiltroAssociacaoItem('TODOS');
                }}
                className="px-2 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-sm text-[9px] font-black uppercase hover:bg-emerald-100 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Tabela de Itens da Conciliação (conciliacao_itens) */}
        <div className="overflow-x-auto border border-slate-200 rounded-sm">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#1351b4] text-white">
                <th className="pl-4 pr-2 py-2.5 font-bold w-24">Dia</th>
                <th className="px-2 py-2.5 font-bold w-20 text-center">
                  Lote
                </th>
                {/* <th className="px-2 py-2.5 font-bold w-28">Documento</th> */}
                <th className="px-2 py-2.5 font-bold w-35">
                  Tipo
                </th>
                <th className="px-2 py-2.5 font-bold w-40">Histórico</th>
                <th className="px-2 py-2.5 font-bold w-35">
                  Nome / CPF
                </th>
                <th className="px-2 py-2.5 font-bold w-36 text-right">
                  Valor (+ / -)
                </th>
                <th className="pl-2 pr-4 py-2.5 font-bold w-40">
                  Associação (Pessoa / Desconsiderar)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensDetalheFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]"
                  >
                    Nenhum item encontrado para os filtros selecionados
                  </td>
                </tr>
              ) : (
                itensDetalheFiltrados.map((item: any) => {
                  const isCredito =
                    item.tipo === 'CREDITO' || item.tipo === 'RECEITA';
                  const associado = isItemAssociado(item);
                  const sugestao = !associado
                    ? encontrarSugestaoPessoa(item)
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${associado
                        ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                        : 'hover:bg-slate-50'
                        }`}
                    >
                      <td className="pl-4 pr-2 py-1.5 font-bold text-slate-600 whitespace-nowrap">
                        {formatarData(item.dataLancamento)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {item.lote ? (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-black bg-slate-100 text-slate-700">
                            {item.lote}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                      {/* <td className="px-2 py-1.5 font-mono text-[11px] font-bold text-slate-500">
                        {item.documento || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td> */}
                      <td className="px-2 py-1.5">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-[#1351b4] border border-blue-100 rounded-sm text-[10px] font-black uppercase">
                          {item.tipoLancamento || 'Outros'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-bold text-slate-700 uppercase text-[11px]">
                        {item.historico}
                      </td>
                      <td className="px-2 py-1.5">
                        {item.cpf || item.nomeExtrato ? (
                          <div className="flex flex-col">
                            {item.nomeExtrato && (
                              <span className="font-black text-[11px] text-slate-800 uppercase">
                                {item.nomeExtrato}
                              </span>
                            )}
                            {item.cpf && (
                              <span className="font-mono text-[10px] font-bold text-amber-700">
                                CPF: {item.cpf}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px] font-bold uppercase">
                            Sem CPF
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-2 py-1.5 font-black text-right whitespace-nowrap ${isCredito ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                      >
                        {formatarMoeda(item.valor)}{' '}
                        <span className="text-[10px] font-black">
                          {isCredito ? '(+)' : '(-)'}
                        </span>
                      </td>
                      <td className="pl-2 pr-4 py-1.5">
                        {item.pessoa ? (
                          <div className="flex items-center justify-between gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-sm">
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-[10px] text-emerald-900 uppercase truncate">
                                {item.pessoa.nome}
                              </span>
                              {item.pessoa.documento && (
                                <span className="text-[9px] font-bold text-emerald-700">
                                  Doc: {item.pessoa.documento}
                                </span>
                              )}
                            </div>
                            {podeEditar && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => abrirModalAssociar(item)}
                                  title="Trocar associação"
                                  className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-sm transition-colors"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    confirmarAssociacaoManual(
                                      item.id,
                                      null,
                                      false,
                                      false,
                                    )
                                  }
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-sm transition-colors"
                                  title="Desvincular pessoa"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : item.desconsiderado ? (
                          <div className="flex items-center justify-between gap-1.5 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-sm">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Ban className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-black text-[10px] text-slate-700 uppercase truncate">
                                  DESCONSIDERAR
                                </span>
                                <span className="text-[8px] font-bold text-emerald-700 uppercase">
                                  Item Associado
                                </span>
                              </div>
                            </div>
                            {podeEditar && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => abrirModalAssociar(item)}
                                  title="Trocar associação"
                                  className="p-1 text-slate-600 hover:bg-slate-200 rounded-sm transition-colors"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    confirmarAssociacaoManual(
                                      item.id,
                                      null,
                                      false,
                                      false,
                                    )
                                  }
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-sm transition-colors"
                                  title="Remover associação DESCONSIDERAR"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {sugestao && podeEditar && (
                              <div className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-sm">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[8px] font-black text-[#1351b4] uppercase flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Sugestão ({sugestao.motivo})
                                  </span>
                                  <span className="font-black text-[10px] text-slate-800 uppercase truncate">
                                    {sugestao.pessoa.nome}
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    confirmarAssociacaoManual(
                                      item.id,
                                      sugestao.pessoa.id,
                                      false,
                                      false,
                                    )
                                  }
                                  disabled={salvandoAssociacao}
                                  className="px-2 py-1 bg-[#1351b4] text-white rounded-sm text-[9px] font-black uppercase hover:bg-[#0047b7] shrink-0 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Vincular
                                </button>
                              </div>
                            )}

                            {podeEditar ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => abrirModalAssociar(item)}
                                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:border-[#1351b4] text-slate-600 hover:text-[#1351b4] rounded-sm text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  Associar Pessoa
                                </button>
                                <button
                                  onClick={() =>
                                    confirmarAssociacaoManual(
                                      item.id,
                                      null,
                                      false,
                                      true,
                                    )
                                  }
                                  disabled={salvandoAssociacao}
                                  title="Associar este item como DESCONSIDERAR"
                                  className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 rounded-sm text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shrink-0"
                                >
                                  <Ban className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Não associado
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Associação Manual de Pessoa */}
      {itemParaAssociar && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-[#1351b4] uppercase tracking-tight">
                  Associar Pessoa ao Lançamento
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  Data: {formatarData(itemParaAssociar.dataLancamento)} • Valor:{' '}
                  {formatarMoeda(itemParaAssociar.valor)}{' '}
                  {itemParaAssociar.tipo === 'CREDITO' ? '(+)' : '(-)'}
                </p>
              </div>
              <button
                onClick={() => setItemParaAssociar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Resumo do Item do Extrato */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
                  <span>
                    Tipo: {itemParaAssociar.tipoLancamento || 'Outros'}
                  </span>
                  <span>Lote: {itemParaAssociar.lote || '(Vazio)'}</span>
                  <span>Doc: {itemParaAssociar.documento || '(Vazio)'}</span>
                </div>
                <p className="text-xs font-black text-slate-700 uppercase">
                  {itemParaAssociar.historico}
                </p>
                {(itemParaAssociar.cpf || itemParaAssociar.nomeExtrato) && (
                  <div className="pt-1 flex items-center gap-3 text-xs font-black text-amber-700">
                    {itemParaAssociar.nomeExtrato && (
                      <span>Nome Extraído: {itemParaAssociar.nomeExtrato}</span>
                    )}
                    {itemParaAssociar.cpf && (
                      <span>CPF Extraído: {itemParaAssociar.cpf}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Campo de Busca de Pessoa */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Pesquisar Pessoa Cadastrada (Nome ou CPF)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaPessoaModal}
                    onChange={(e) => setBuscaPessoaModal(e.target.value)}
                    placeholder="Digite o nome ou CPF da pessoa..."
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-sm text-xs font-bold text-slate-700 focus:outline-none focus:border-[#1351b4]"
                  />
                  {buscaPessoaModal && (
                    <button
                      type="button"
                      onClick={() => setBuscaPessoaModal('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Pessoas */}
              <div className="border border-slate-200 rounded-sm max-h-64 overflow-y-auto divide-y divide-slate-100">
                {pessoasFiltradasModal.length === 0 ? (
                  <div className="p-6 text-center text-[11px] font-bold text-slate-400 uppercase">
                    Nenhuma pessoa encontrada com esse termo. Limpe a busca para
                    ver todas.
                  </div>
                ) : (
                  pessoasFiltradasModal.map((p) => {
                    const selecionada = pessoaSelecionadaId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPessoaSelecionadaId(p.id)}
                        className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${selecionada
                          ? 'bg-blue-50 border-l-4 border-l-[#1351b4]'
                          : 'hover:bg-slate-50'
                          }`}
                      >
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">
                            {p.nome}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            CPF: {p.documento || 'Não informado'}{' '}
                            {p.comunidade ? `• ${p.comunidade}` : ''}
                          </p>
                        </div>
                        {selecionada && (
                          <CheckCircle2 className="w-5 h-5 text-[#1351b4]" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Opção de salvar o CPF extraído no cadastro da pessoa caso o item tenha CPF */}
              {itemParaAssociar.cpf && pessoaSelecionadaId && (
                <label className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={atualizarCpfPessoa}
                    onChange={(e) => setAtualizarCpfPessoa(e.target.checked)}
                    className="w-4 h-4 text-[#1351b4] rounded"
                  />
                  <span className="text-[11px] font-bold text-amber-900">
                    Salvar/atualizar também o CPF{' '}
                    <strong>{itemParaAssociar.cpf}</strong> no cadastro desta
                    pessoa
                  </span>
                </label>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              {/* <button
                type="button"
                disabled={salvandoAssociacao}
                onClick={() =>
                  confirmarAssociacaoManual(
                    itemParaAssociar.id,
                    null,
                    false,
                    true,
                  )
                }
                className="px-4 py-2.5 border border-slate-300 bg-slate-100 text-slate-700 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                DESCONSIDERAR
              </button> */}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setItemParaAssociar(null)}
                  className="px-5 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!pessoaSelecionadaId || salvandoAssociacao}
                  onClick={() =>
                    confirmarAssociacaoManual(
                      itemParaAssociar.id,
                      pessoaSelecionadaId,
                      atualizarCpfPessoa,
                      false,
                    )
                  }
                  className="px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] disabled:opacity-50 flex items-center gap-2"
                >
                  {salvandoAssociacao && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Confirmar Associação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
