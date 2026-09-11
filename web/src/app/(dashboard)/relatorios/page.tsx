'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Loader2,
  FileText,
  CalendarDays,
  Users,
  Download,
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wallet,
  Scale,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export default function RelatoriosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Controle de Aba Principal: Inscrições ou Extrato da Conta
  const [abaAtiva, setAbaAtiva] = useState<'INSCRICOES' | 'EXTRATO'>('INSCRICOES');

  // --- ESTADOS DO RELATÓRIO DE INSCRIÇÕES (MODAL) ---
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<any>(null);
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [carregandoInscritos, setCarregandoInscritos] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [busca, setBusca] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<{
    coluna: 'nome' | 'paroquia' | 'comunidade' | 'status';
    direcao: 'asc' | 'desc';
  }>({
    coluna: 'nome',
    direcao: 'asc',
  });

  // --- ESTADOS DO EXTRATO DA CONTA DO EVENTO ATIVO ---
  const [eventoExtrato, setEventoExtrato] = useState<any>(null);
  const [extratoData, setExtratoData] = useState<any>(null);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);
  const [agrupamentoExtrato, setAgrupamentoExtrato] = useState<'PESSOA' | 'TRANSACOES'>('PESSOA');
  const [filtroTipoExtrato, setFiltroTipoExtrato] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS');
  const [buscaExtrato, setBuscaExtrato] = useState<string>('');
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    buscarEventos();
  }, []);

  const buscarEventos = async () => {
    try {
      const res = await api.get('/eventos');
      const eventosAtivos = res.data.filter((e: any) => e.status === 'ATIVO');
      setEventos(eventosAtivos);

      if (eventosAtivos.length > 0) {
        carregarExtrato(eventosAtivos[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const carregarExtrato = async (evento: any) => {
    if (!evento) return;
    setEventoExtrato(evento);
    setCarregandoExtrato(true);
    setBuscaExtrato('');
    setExpandidos({});
    try {
      const res = await api.get(`/transacoes/extrato?eventoId=${evento.id}&contaId=${evento.contaId}`);
      setExtratoData(res.data);
    } catch (err) {
      console.error('Erro ao carregar extrato da conta do evento:', err);
    } finally {
      setCarregandoExtrato(false);
    }
  };

  const abrirModalEvento = async (evento: any) => {
    setEventoSelecionado(evento);
    setFiltroStatus('TODOS');
    setBusca('');
    setOrdenacao({ coluna: 'nome', direcao: 'asc' });
    setModalAberto(true);
    setCarregandoInscritos(true);
    try {
      const res = await api.get(`/inscricoes?eventoId=${evento.id}`);
      const permitidos = ['CONFIRMADO', 'PENDENTE', 'EM_ANALISE'];
      const filtrados = (res.data || []).filter((i: any) =>
        permitidos.includes(i.status)
      );
      const ordenados = filtrados.sort((a: any, b: any) => {
        const nomeA = a.pessoa?.nome || '';
        const nomeB = b.pessoa?.nome || '';
        return nomeA.localeCompare(nomeB);
      });
      setInscritos(ordenados);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoInscritos(false);
    }
  };

  const toggleExpandido = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleOrdenacao = (coluna: 'nome' | 'paroquia' | 'comunidade' | 'status') => {
    if (ordenacao.coluna === coluna) {
      setOrdenacao({ coluna, direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenacao({ coluna, direcao: 'asc' });
    }
  };

  const renderIconeOrdenacao = (coluna: 'nome' | 'paroquia' | 'comunidade' | 'status') => {
    if (ordenacao.coluna !== coluna) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 shrink-0" />;
    }
    return ordenacao.direcao === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-white shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-white shrink-0" />
    );
  };

  // --- FORMATAÇÕES UTILITÁRIAS ---
  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatarData = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  // --- FILTROS DE INSCRIÇÕES ---
  const totalConfirmados = inscritos.filter((i) => i.status === 'CONFIRMADO').length;
  const totalPendentes = inscritos.filter((i) => i.status === 'PENDENTE').length;
  const totalEmAnalise = inscritos.filter((i) => i.status === 'EM_ANALISE').length;

  const inscritosFiltrados = inscritos
    .filter((insc) => {
      if (filtroStatus !== 'TODOS' && insc.status !== filtroStatus) {
        return false;
      }

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const nome = (insc.pessoa?.nome || '').toLowerCase();
        const tel = (insc.pessoa?.telefone || '').toLowerCase();
        const comunidade = (insc.pessoa?.comunidade || '').toLowerCase();
        const paroquia = (insc.pessoa?.paroquia?.nome || '').toLowerCase();
        return (
          nome.includes(termo) ||
          tel.includes(termo) ||
          comunidade.includes(termo) ||
          paroquia.includes(termo)
        );
      }

      return true;
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';

      if (ordenacao.coluna === 'nome') {
        valA = a.pessoa?.nome || '';
        valB = b.pessoa?.nome || '';
      } else if (ordenacao.coluna === 'paroquia') {
        valA = a.pessoa?.paroquia?.nome || '';
        valB = b.pessoa?.paroquia?.nome || '';
      } else if (ordenacao.coluna === 'comunidade') {
        valA = a.pessoa?.comunidade || '';
        valB = b.pessoa?.comunidade || '';
      } else if (ordenacao.coluna === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      }

      const comp = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
      return ordenacao.direcao === 'asc' ? comp : -comp;
    });

  // --- FILTROS E AGRUPAMENTOS DO EXTRATO DA CONTA ---
  const transacoesFiltradas = (extratoData?.transacoes || []).filter((t: any) => {
    if (filtroTipoExtrato === 'RECEITA' && t.tipo !== 'RECEITA') {
      return false;
    }
    if (filtroTipoExtrato === 'DESPESA' && t.tipo !== 'DESPESA' && t.tipo !== 'TRANSFERENCIA') {
      return false;
    }

    if (buscaExtrato.trim()) {
      const termo = buscaExtrato.toLowerCase();
      const nomePessoa = (t.pessoa?.nome || '').toLowerCase();
      const paroquia = (t.pessoa?.paroquia?.nome || '').toLowerCase();
      const comunidade = (t.pessoa?.comunidade || '').toLowerCase();
      const nomeConta = (t.conta?.nome || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const metodo = (t.metodo || '').toLowerCase();
      return (
        nomePessoa.includes(termo) ||
        paroquia.includes(termo) ||
        comunidade.includes(termo) ||
        nomeConta.includes(termo) ||
        desc.includes(termo) ||
        metodo.includes(termo)
      );
    }

    return true;
  });

  // Agrupamento por Pessoa (pessoaId)
  const agrupadoPorPessoa = Object.values(
    transacoesFiltradas.reduce((acc: Record<string, any>, t: any) => {
      const key = t.pessoaId ? `p_${t.pessoaId}` : 'sem_pessoa';
      if (!acc[key]) {
        acc[key] = {
          id: key,
          pessoaId: t.pessoaId,
          pessoa: t.pessoa || null,
          nome: t.pessoa?.nome || 'CAIXA',
          paroquia: t.pessoa?.paroquia?.nome || '',
          comunidade: t.pessoa?.comunidade || '',
          telefone: t.pessoa?.telefone || '',
          receitas: 0,
          despesas: 0,
          saldo: 0,
          transacoes: [],
        };
      }
      if (t.tipo === 'RECEITA') {
        acc[key].receitas += t.valor;
      } else if (t.tipo === 'DESPESA' || t.tipo === 'TRANSFERENCIA') {
        acc[key].despesas += t.valor;
      }
      acc[key].saldo = acc[key].receitas - acc[key].despesas;
      acc[key].transacoes.push(t);
      return acc;
    }, {})
  ).sort((a: any, b: any) => {
    if (!a.pessoaId && b.pessoaId) return 1;
    if (a.pessoaId && !b.pessoaId) return -1;
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
  });

  // Totais do Extrato Filtrado
  const totalReceitasFiltradas = transacoesFiltradas
    .filter((t: any) => t.tipo === 'RECEITA')
    .reduce((acc: number, t: any) => acc + t.valor, 0);

  const totalDespesasFiltradas = transacoesFiltradas
    .filter((t: any) => t.tipo === 'DESPESA' || t.tipo === 'TRANSFERENCIA')
    .reduce((acc: number, t: any) => acc + t.valor, 0);

  const saldoLiquidoFiltrado = totalReceitasFiltradas - totalDespesasFiltradas;

  // --- EXPORTAR PDF DE INSCRIÇÕES ---
  const exportarPDFInscricoes = () => {
    if (!eventoSelecionado) return;

    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(19, 81, 180);
    doc.text(`Relatório de Inscrições`, 14, 18);

    const filtroDescricao =
      filtroStatus === 'TODOS'
        ? 'Todos'
        : filtroStatus === 'CONFIRMADO'
          ? 'Confirmados'
          : filtroStatus === 'PENDENTE'
            ? 'Pendentes'
            : filtroStatus === 'EM_ANALISE'
              ? 'Em Análise'
              : filtroStatus;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Evento: ${eventoSelecionado.nome}`, 14, 25);
    doc.text(
      `Filtro: ${filtroDescricao} | Total: ${inscritosFiltrados.length} inscrito(s)`,
      14,
      30
    );

    const tableColumn = ['Nome', 'Data Nasc.', 'Paróquia', 'Comunidade', 'Status'];
    const tableRows: any[] = [];
    const statusCount: Record<string, number> = {};

    inscritosFiltrados.forEach((inscricao) => {
      const pessoa = inscricao.pessoa;
      let statusLabel = inscricao.status || 'NÃO DEFINIDO';
      if (inscricao.status === 'CONFIRMADO') statusLabel = 'Confirmado';
      else if (inscricao.status === 'PENDENTE') statusLabel = 'Pendente';
      else if (inscricao.status === 'EM_ANALISE') statusLabel = 'Em Análise';

      const rowData = [
        pessoa?.nome || '-',
        pessoa?.dataNascimento ? formatarData(pessoa.dataNascimento) : '-',
        pessoa?.paroquia?.nome || '-',
        pessoa?.comunidade || '-',
        statusLabel,
      ];
      tableRows.push(rowData);
      statusCount[statusLabel] = (statusCount[statusLabel] || 0) + 1;
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: {
        fillColor: [19, 81, 180],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        1: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 28 },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          const status = data.cell.raw;
          data.cell.styles.fontStyle = 'bold';
          if (status === 'Confirmado' || status === 'CONFIRMADO') {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (status === 'Pendente' || status === 'PENDENTE') {
            data.cell.styles.textColor = [217, 119, 6];
          } else if (status === 'Em Análise' || status === 'EM_ANALISE') {
            data.cell.styles.textColor = [79, 70, 229];
          } else {
            data.cell.styles.textColor = [71, 85, 105];
          }
        }
      },
    });

    doc.save(`relatorio_inscricoes_${eventoSelecionado.nome.replace(/\s+/g, '_')}.pdf`);
  };

  // --- EXPORTAR PDF DO EXTRATO DA CONTA ---
  const exportarPDFExtrato = () => {
    if (!eventoExtrato || !extratoData) return;

    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(19, 81, 180);
    doc.text(`Extrato Financeiro do Evento`, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Evento: ${eventoExtrato.nome}`, 14, 25);
    doc.text(`Fundo de Caixa: ${extratoData.conta?.nome || 'N/A'} (Saldo: ${formatarMoeda(extratoData.saldoConta)})`, 14, 30);
    doc.text(
      `Saldo do Extrato: ${formatarMoeda(saldoLiquidoFiltrado)}`,
      14,
      35
    );

    let startY = 41;

    if (agrupamentoExtrato === 'PESSOA') {
      const tableColumn = ['Pessoa / Inscrito', 'Paróquia', 'Comunidade', 'Entradas', 'Saídas', 'Saldo'];
      const tableRows = agrupadoPorPessoa.map((p: any) => [
        p.nome,
        p.paroquia || '-',
        p.comunidade || '-',
        formatarMoeda(p.receitas),
        formatarMoeda(p.despesas),
        formatarMoeda(p.saldo),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY,
        theme: 'grid',
        headStyles: {
          fillColor: [19, 81, 180],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [51, 65, 85],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    } else {
      const tableColumn = ['Data', 'Descrição', 'Pessoa', 'Paróquia', 'Tipo', 'Valor'];
      const tableRows = transacoesFiltradas.map((t: any) => [
        formatarData(t.data),
        t.descricao || '-',
        t.pessoa?.nome || '-',
        t.pessoa?.paroquia?.nome || '-',
        t.tipo,
        formatarMoeda(t.valor),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY,
        theme: 'grid',
        headStyles: {
          fillColor: [19, 81, 180],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [51, 65, 85],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'right' },
        },
      });
    }

    doc.save(`extrato_${eventoExtrato.nome.replace(/\s+/g, '_')}.pdf`);
  };

  if (carregando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#1351b4] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Relatórios do Sistema</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            Inscrições de participantes e extrato financeiro da conta do evento
          </p>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg border border-slate-300/60 shadow-inner">
          <button
            type="button"
            onClick={() => setAbaAtiva('INSCRICOES')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${abaAtiva === 'INSCRICOES'
              ? 'bg-white text-[#1351b4] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Users className="w-4 h-4" />
            Inscrições
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('EXTRATO')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${abaAtiva === 'EXTRATO'
              ? 'bg-[#1351b4] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Wallet className="w-4 h-4" />
            Extrato da Conta
          </button>
        </div>
      </div>

      {eventos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-sm shadow-sm">
          <CalendarDays className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum evento ativo encontrado</p>
        </div>
      ) : abaAtiva === 'INSCRICOES' ? (
        /* ============================================================== */
        /* ABA 1: LISTAGEM DE EVENTOS PARA RELATÓRIO DE INSCRIÇÕES         */
        /* ============================================================== */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map((evento) => (
              <div
                key={evento.id}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-[#1351b4]/40 transition-all group"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#1351b4] group-hover:bg-[#1351b4] group-hover:text-white transition-colors">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-slate-800 text-base leading-tight uppercase truncate">{evento.nome}</h3>
                      <p className="text-xs text-slate-400 font-medium uppercase mt-0.5 truncate">
                        Conta: {evento.conta?.nome || 'Não vinculada'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 py-3 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span className="font-black text-base">{evento._count?.inscricoes || 0}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">Inscritos</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => abrirModalEvento(evento)}
                    className="w-full py-2.5 px-3 bg-slate-50 hover:bg-[#1351b4] text-[#1351b4] hover:text-white rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border border-slate-200/80 hover:border-[#1351b4]"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Inscrições
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      carregarExtrato(evento);
                      setAbaAtiva('EXTRATO');
                    }}
                    className="w-full py-2.5 px-3 bg-[#1351b4] hover:bg-[#0047b7] text-white rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Extrato Conta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* ABA 2: EXTRATO DA CONTA DO EVENTO ATIVO                        */
        /* ============================================================== */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* SELETOR DE EVENTO & AÇÕES */}
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Evento Ativo:
              </label>
              <select
                value={eventoExtrato?.id || ''}
                onChange={(e) => {
                  const ev = eventos.find((ev) => ev.id === Number(e.target.value));
                  if (ev) carregarExtrato(ev);
                }}
                className="py-2 px-3 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-700 uppercase focus:outline-none focus:border-[#1351b4]"
              >
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nome} ({ev.conta?.nome || 'Sem Conta'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={exportarPDFExtrato}
                disabled={!extratoData || transacoesFiltradas.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1351b4] text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Exportar Extrato PDF
              </button>
            </div>
          </div>

          {/* CARDS DE RESUMO FINANCEIRO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CARD 1: SALDO NA CONTA-CORRENTE (DESTAQUE) */}
            <div className="bg-gradient-to-br from-[#1351b4] to-[#0d3880] text-white p-5 rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                  Saldo na Conta-Corrente
                </span>
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono text-white">
                  {formatarMoeda(saldoLiquidoFiltrado)}
                </div>
                <div className="text-[11px] font-medium text-blue-200 mt-1">
                  Saldo do extrato bancário BB
                </div>
              </div>
            </div>

            {/* CARD 2: FUNDO DE CAIXA */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Fundo de Caixa
                </span>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono text-slate-800">
                  {formatarMoeda(extratoData?.saldoConta || 0)}
                </div>
                <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase truncate">
                  {extratoData?.conta?.nome || 'Conta Não Identificada'}
                </div>
              </div>
            </div>
          </div>

          {/* BARRA DE CONTROLE: AGRUPAMENTO, FILTRO TIPO E BUSCA */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* SELEÇÃO DO MODO DE AGRUPAMENTO */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 hidden sm:inline">
                Agrupar por:
              </span>
              <button
                type="button"
                onClick={() => setAgrupamentoExtrato('PESSOA')}
                className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${agrupamentoExtrato === 'PESSOA'
                  ? 'bg-[#1351b4] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                Por Pessoa ({agrupadoPorPessoa.length})
              </button>

              <button
                type="button"
                onClick={() => setAgrupamentoExtrato('TRANSACOES')}
                className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${agrupamentoExtrato === 'TRANSACOES'
                  ? 'bg-[#1351b4] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Extrato Geral ({transacoesFiltradas.length})
              </button>
            </div>

            {/* FILTROS DE TIPO & CAMPO DE BUSCA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar pessoa, paróquia, comunidade, conta..."
                  value={buscaExtrato}
                  onChange={(e) => setBuscaExtrato(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:bg-white focus:border-[#1351b4] font-medium text-slate-700"
                />
                {buscaExtrato && (
                  <button
                    type="button"
                    onClick={() => setBuscaExtrato('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CONTEÚDO PRINCIPAL DO EXTRATO */}
          {carregandoExtrato ? (
            <div className="flex justify-center items-center h-48 bg-white border border-slate-200 rounded-lg">
              <Loader2 className="w-8 h-8 text-[#1351b4] animate-spin" />
            </div>
          ) : transacoesFiltradas.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">
                Nenhuma transação encontrada para os filtros selecionados.
              </p>
            </div>
          ) : agrupamentoExtrato === 'PESSOA' ? (
            /* ============================================================== */
            /* VISUALIZAÇÃO AGRUPADA POR PESSOA                               */
            /* ============================================================== */
            <div className="space-y-3">
              {agrupadoPorPessoa.map((item: any) => {
                const isExpanded = !!expandidos[item.id];
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden transition-all"
                  >
                    {/* Linha Resumo da Pessoa */}
                    <div
                      onClick={() => toggleExpandido(item.id)}
                      className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm uppercase truncate">
                            {item.nome}
                          </h4>
                          {(item.paroquia || item.comunidade) && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5 font-medium">
                              {item.paroquia && (
                                <span className="font-semibold text-slate-700 truncate">{item.paroquia}</span>
                              )}
                              {item.paroquia && item.comunidade && (
                                <span className="text-slate-300">•</span>
                              )}
                              {item.comunidade && (
                                <span className="text-slate-500 truncate">{item.comunidade}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-end md:self-auto w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Entradas</span>
                          <span className="font-bold text-xs text-emerald-600 font-mono">
                            + {formatarMoeda(item.receitas)}
                          </span>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Saídas</span>
                          <span className="font-bold text-xs text-rose-600 font-mono">
                            - {formatarMoeda(item.despesas)}
                          </span>
                        </div>

                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Líquido</span>
                          <span
                            className={`font-black text-sm font-mono ${item.saldo >= 0 ? 'text-slate-800' : 'text-rose-600'
                              }`}
                          >
                            {formatarMoeda(item.saldo)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                            {item.transacoes.length} lanç{item.transacoes.length === 1 ? 'amento' : 'amentos'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento de Transações Expandidas */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 border-t border-slate-100 p-3 sm:p-4">
                        <div className="space-y-1.5">
                          {item.transacoes.map((t: any) => (
                            <div
                              key={t.id}
                              className="bg-white p-2.5 rounded border border-slate-200/80 flex items-center justify-between text-xs gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap">
                                  {formatarData(t.data)}
                                </span>
                                <span className="font-semibold text-slate-700 truncate">{t.descricao}</span>
                                {t.metodo && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase shrink-0">
                                    {t.metodo}
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0 font-mono font-bold">
                                {t.tipo === 'RECEITA' ? (
                                  <span className="text-emerald-600">+ {formatarMoeda(t.valor)}</span>
                                ) : (
                                  <span className="text-rose-600">- {formatarMoeda(t.valor)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================== */
            /* VISUALIZAÇÃO DETALHADA / EXTRATO CORRIDO                       */
            /* ============================================================== */
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1351b4] text-white text-xs font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Pessoa</th>
                      <th className="px-4 py-3">Conta</th>
                      <th className="px-4 py-3 text-center">Tipo</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transacoesFiltradas.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono font-bold text-slate-500 whitespace-nowrap">
                          {formatarData(t.data)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-800 max-w-xs truncate">
                          {t.descricao || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate">
                          <div className="font-semibold text-slate-700 truncate">
                            {t.pessoa?.nome || '-'}
                          </div>
                          {(t.pessoa?.paroquia?.nome || t.pessoa?.comunidade) && (
                            <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                              {t.pessoa?.paroquia?.nome && <span>{t.pessoa.paroquia.nome}</span>}
                              {t.pessoa?.paroquia?.nome && t.pessoa?.comunidade && <span>•</span>}
                              {t.pessoa?.comunidade && <span>{t.pessoa.comunidade}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                          {t.conta?.nome || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.tipo === 'RECEITA'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                          >
                            {t.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-xs whitespace-nowrap">
                          {t.tipo === 'RECEITA' ? (
                            <span className="text-emerald-600">+ {formatarMoeda(t.valor)}</span>
                          ) : (
                            <span className="text-rose-600">- {formatarMoeda(t.valor)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE RELATÓRIO DE INSCRIÇÕES (JÁ EXISTENTE E RESPONSIVO)   */}
      {/* ============================================================== */}
      {modalAberto && eventoSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-lg sm:rounded-md shadow-2xl overflow-hidden flex flex-col h-[92vh] sm:h-auto sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* CABEÇALHO DO MODAL */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm sm:text-base md:text-lg font-black text-[#1351b4] uppercase tracking-tight truncate">
                  {eventoSelecionado.nome}
                </h4>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                  {inscritosFiltrados.length === inscritos.length
                    ? `Total de ${inscritos.length} pessoa${inscritos.length === 1 ? '' : 's'}`
                    : `Exibindo ${inscritosFiltrados.length} de ${inscritos.length} pessoa${inscritos.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={exportarPDFInscricoes}
                  disabled={inscritosFiltrados.length === 0}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-[#1351b4] text-white rounded-md sm:rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Exportar PDF filtrado"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
                <button
                  onClick={() => setModalAberto(false)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-900 rounded-md sm:rounded-sm hover:bg-slate-200/60 transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BARRA DE FILTROS & BUSCA */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row gap-2.5 sm:gap-4 items-stretch sm:items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setFiltroStatus('TODOS')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md sm:rounded-sm text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${filtroStatus === 'TODOS'
                    ? 'bg-[#1351b4] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Todos</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'TODOS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                  >
                    {inscritos.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroStatus('CONFIRMADO')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md sm:rounded-sm text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${filtroStatus === 'CONFIRMADO'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmados</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'CONFIRMADO' ? 'bg-white/20 text-white' : 'bg-emerald-200/70 text-emerald-800'
                      }`}
                  >
                    {totalConfirmados}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroStatus('PENDENTE')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md sm:rounded-sm text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${filtroStatus === 'PENDENTE'
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendentes</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'PENDENTE' ? 'bg-white/20 text-white' : 'bg-amber-200/70 text-amber-800'
                      }`}
                  >
                    {totalPendentes}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroStatus('EM_ANALISE')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md sm:rounded-sm text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${filtroStatus === 'EM_ANALISE'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                    }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Em Análise</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'EM_ANALISE' ? 'bg-white/20 text-white' : 'bg-indigo-200/70 text-indigo-800'
                      }`}
                  >
                    {totalEmAnalise}
                  </span>
                </button>
              </div>

              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar nome, fone, paróquia..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-md sm:rounded-sm text-xs focus:outline-none focus:bg-white focus:border-[#1351b4] font-medium text-slate-700 placeholder:text-slate-400"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* CORPO / LISTA DE INSCRITOS */}
            <div className="flex-1 overflow-auto custom-scrollbar p-3 sm:p-5 bg-[#f2f3f7]">
              {carregandoInscritos ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="w-8 h-8 text-[#1351b4] animate-spin" />
                </div>
              ) : inscritosFiltrados.length === 0 ? (
                <div className="p-8 sm:p-12 text-center bg-white border border-slate-200 rounded-lg sm:rounded-sm shadow-sm">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider">
                    Nenhum inscrito encontrado com os filtros aplicados.
                  </p>
                  {(filtroStatus !== 'TODOS' || busca) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroStatus('TODOS');
                        setBusca('');
                      }}
                      className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#1351b4] rounded-md sm:rounded-sm text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="block md:hidden space-y-2">
                    {/* Barra rápida de ordenação no mobile */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Ordenar:
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {(['nome', 'paroquia', 'comunidade', 'status'] as const).map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => toggleOrdenacao(col)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${ordenacao.coluna === col
                              ? 'bg-[#1351b4] text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                          >
                            <span>
                              {col === 'nome'
                                ? 'Nome'
                                : col === 'paroquia'
                                  ? 'Paróquia'
                                  : col === 'comunidade'
                                    ? 'Comunidade'
                                    : 'Status'}
                            </span>
                            {ordenacao.coluna === col &&
                              (ordenacao.direcao === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-white" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-white" />
                              ))}
                          </button>
                        ))}
                      </div>
                    </div>
                    {inscritosFiltrados.map((insc, idx) => {
                      let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                      let dotColor = 'bg-slate-400';
                      let labelStatus = insc.status?.replace('_', ' ') || '-';
                      if (insc.status === 'CONFIRMADO') {
                        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        dotColor = 'bg-emerald-500';
                        labelStatus = 'Confirmado';
                      } else if (insc.status === 'PENDENTE') {
                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        dotColor = 'bg-amber-500';
                        labelStatus = 'Pendente';
                      } else if (insc.status === 'EM_ANALISE') {
                        badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                        dotColor = 'bg-indigo-500';
                        labelStatus = 'Em Análise';
                      }

                      return (
                        <div
                          key={insc.id || idx}
                          className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-xs uppercase truncate">
                              {insc.pessoa?.nome || '-'}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                              {insc.pessoa?.paroquia?.nome && (
                                <span className="text-slate-700 font-semibold truncate">{insc.pessoa.paroquia.nome}</span>
                              )}
                              {insc.pessoa?.paroquia?.nome && (insc.pessoa?.comunidade || insc.pessoa?.telefone) && (
                                <span className="text-slate-300">•</span>
                              )}
                              {insc.pessoa?.comunidade && (
                                <span className="text-slate-600 truncate">{insc.pessoa.comunidade}</span>
                              )}
                              {insc.pessoa?.comunidade && insc.pessoa?.telefone && (
                                <span className="text-slate-300">•</span>
                              )}
                              {insc.pessoa?.telefone && (
                                <span className="text-slate-400 font-mono text-[10px]">{insc.pessoa.telefone}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {labelStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden md:block bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1351b4]">
                          <th
                            className="px-5 py-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f449a] transition-colors select-none"
                            onClick={() => toggleOrdenacao('nome')}
                            title="Clique para ordenar por Inscrito"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Inscrito</span>
                              {renderIconeOrdenacao('nome')}
                            </div>
                          </th>
                          <th
                            className="px-5 py-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f449a] transition-colors select-none"
                            onClick={() => toggleOrdenacao('paroquia')}
                            title="Clique para ordenar por Paróquia"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Paróquia</span>
                              {renderIconeOrdenacao('paroquia')}
                            </div>
                          </th>
                          <th
                            className="px-5 py-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f449a] transition-colors select-none"
                            onClick={() => toggleOrdenacao('comunidade')}
                            title="Clique para ordenar por Comunidade"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Comunidade</span>
                              {renderIconeOrdenacao('comunidade')}
                            </div>
                          </th>
                          <th
                            className="w-36 px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#0f449a] transition-colors select-none"
                            onClick={() => toggleOrdenacao('status')}
                            title="Clique para ordenar por Status"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span>Status</span>
                              {renderIconeOrdenacao('status')}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inscritosFiltrados.map((insc, idx) => {
                          let badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                          let dotColor = 'bg-slate-400';
                          let labelStatus = insc.status?.replace('_', ' ') || '-';
                          if (insc.status === 'CONFIRMADO') {
                            badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            dotColor = 'bg-emerald-500';
                            labelStatus = 'Confirmado';
                          } else if (insc.status === 'PENDENTE') {
                            badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                            dotColor = 'bg-amber-500';
                            labelStatus = 'Pendente';
                          } else if (insc.status === 'EM_ANALISE') {
                            badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                            dotColor = 'bg-indigo-500';
                            labelStatus = 'Em Análise';
                          }

                          return (
                            <tr key={insc.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-bold text-slate-700 uppercase text-xs truncate max-w-xs">
                                  {insc.pessoa?.nome || '-'}
                                </div>
                                <div className="text-slate-400 text-[10px] font-medium font-mono">
                                  {insc.pessoa?.telefone || '---'}
                                </div>
                              </td>

                              <td className="px-5 py-3">
                                <div className="text-slate-600 text-xs font-medium truncate max-w-xs">
                                  {insc.pessoa?.paroquia?.nome || '-'}
                                </div>
                              </td>

                              <td className="px-5 py-3">
                                <div className="text-slate-600 text-xs font-medium truncate max-w-xs">
                                  {insc.pessoa?.comunidade || '-'}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                  {labelStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
