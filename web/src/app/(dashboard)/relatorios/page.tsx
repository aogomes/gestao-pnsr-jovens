'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader2, FileText, CalendarDays, Users, Download, X, Search, CheckCircle2, Clock } from 'lucide-react';

export default function RelatoriosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<any>(null);
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [carregandoInscritos, setCarregandoInscritos] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [busca, setBusca] = useState<string>('');

  useEffect(() => {
    buscarEventos();
  }, []);

  const buscarEventos = async () => {
    try {
      const res = await api.get('/eventos');
      const eventosAtivos = res.data.filter((e: any) => e.status === 'ATIVO');
      setEventos(eventosAtivos);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalEvento = async (evento: any) => {
    setEventoSelecionado(evento);
    setFiltroStatus('TODOS');
    setBusca('');
    setModalAberto(true);
    setCarregandoInscritos(true);
    try {
      const res = await api.get(`/inscricoes?eventoId=${evento.id}`);
      const ordenados = res.data.sort((a: any, b: any) => {
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

  const totalConfirmados = inscritos.filter((i) => i.status === 'CONFIRMADO').length;
  const totalPendentes = inscritos.filter((i) => i.status === 'PENDENTE').length;
  const totalDesistencias = inscritos.filter(
    (i) => i.status === 'DESISTENCIA' || i.status === 'CANCELADO'
  ).length;

  const inscritosFiltrados = inscritos.filter((insc) => {
    if (filtroStatus !== 'TODOS') {
      if (filtroStatus === 'DESISTENCIA') {
        if (insc.status !== 'DESISTENCIA' && insc.status !== 'CANCELADO') return false;
      } else if (insc.status !== filtroStatus) {
        return false;
      }
    }

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const nome = (insc.pessoa?.nome || '').toLowerCase();
      const tel = (insc.pessoa?.telefone || '').toLowerCase();
      const comunidade = (insc.pessoa?.comunidade || '').toLowerCase();
      return nome.includes(termo) || tel.includes(termo) || comunidade.includes(termo);
    }

    return true;
  });

  const exportarPDF = () => {
    if (!eventoSelecionado) return;

    const doc = new jsPDF();

    // Título do PDF
    doc.setFontSize(18);
    doc.text(`Relatório de Inscrições`, 14, 22);

    const filtroDescricao =
      filtroStatus === 'TODOS'
        ? 'Todos'
        : filtroStatus === 'CONFIRMADO'
          ? 'Confirmados'
          : filtroStatus === 'PENDENTE'
            ? 'Pendentes'
            : filtroStatus === 'DESISTENCIA'
              ? 'Desistências'
              : filtroStatus;

    doc.setFontSize(12);
    doc.text(`Evento: ${eventoSelecionado.nome}`, 14, 30);
    doc.text(
      `Filtro: ${filtroDescricao} | Total: ${inscritosFiltrados.length} inscrito(s)`,
      14,
      36
    );

    const tableColumn = ["Nome", "Telefone", "Comunidade", "Status"];
    const tableRows: any[] = [];
    const statusCount: Record<string, number> = {};

    inscritosFiltrados.forEach((inscricao) => {
      const pessoa = inscricao.pessoa;
      const statusLabel = inscricao.status || 'NÃO DEFINIDO';

      const rowData = [
        pessoa?.nome || '-',
        pessoa?.telefone || '-',
        pessoa?.comunidade || '-',
        statusLabel
      ];
      tableRows.push(rowData);

      statusCount[statusLabel] = (statusCount[statusLabel] || 0) + 1;
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const status = data.cell.raw;
          data.cell.styles.fontStyle = 'bold';
          if (status === 'CONFIRMADO') {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          } else if (status === 'DESISTENCIA' || status === 'CANCELADO') {
            data.cell.styles.textColor = [225, 29, 72]; // rose-600
          } else if (status === 'PENDENTE') {
            data.cell.styles.textColor = [217, 119, 6]; // amber-600
          } else {
            data.cell.styles.textColor = [71, 85, 105]; // slate-600
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 42;

    // Totalizador por status
    if (Object.keys(statusCount).length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("Resumo por Status:", 14, finalY + 12);

      let xPos = 14;
      let yPos = finalY + 18;

      doc.setFontSize(9);

      Object.entries(statusCount).forEach(([status, count]) => {
        let bgColor = [248, 250, 252];
        let textColor = [71, 85, 105];
        let borderColor = [226, 232, 240];

        if (status === 'CONFIRMADO') {
          bgColor = [236, 253, 245]; textColor = [5, 150, 105]; borderColor = [209, 250, 229];
        } else if (status === 'DESISTENCIA' || status === 'CANCELADO') {
          bgColor = [255, 241, 242]; textColor = [225, 29, 72]; borderColor = [255, 228, 230];
        } else if (status === 'PENDENTE') {
          bgColor = [255, 251, 235]; textColor = [217, 119, 6]; borderColor = [254, 243, 199];
        }

        const text = `${status.replace('_', ' ')}: ${count}`;
        const textWidth = doc.getTextWidth(text);
        const rectWidth = textWidth + 6;
        const rectHeight = 6;

        if (xPos + rectWidth > 200) {
          xPos = 14;
          yPos += 10;
        }

        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.2);
        doc.rect(xPos, yPos - 4.5, rectWidth, rectHeight, 'FD');

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(text, xPos + 3, yPos);

        xPos += rectWidth + 4;
      });
    }

    doc.save(`relatorio_${eventoSelecionado.nome.replace(/\s+/g, '_')}.pdf`);
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
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Relatórios</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Visualize e exporte relatórios do sistema</p>
        </div>
      </div>

      {eventos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-sm shadow-sm">
          <CalendarDays className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum evento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos.map((evento) => (
            <div
              key={evento.id}
              onClick={() => abrirModalEvento(evento)}
              className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-[#1351b4]/30 transition-all group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#1351b4] group-hover:bg-[#1351b4] group-hover:text-white transition-colors">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-slate-800 text-lg leading-tight uppercase truncate">{evento.nome}</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase mt-1 truncate">Relatório de Inscrições</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span className="font-black text-lg">{evento._count?.inscricoes || 0}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase">Inscritos</span>
                </div>
                <FileText className="w-5 h-5 text-slate-300 group-hover:text-[#1351b4] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DO RELATÓRIO */}
      {modalAberto && eventoSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-lg sm:rounded-md shadow-2xl overflow-hidden flex flex-col h-[92vh] sm:h-auto sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">

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
                  onClick={exportarPDF}
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
              {/* FILTROS DE STATUS (SCROLL HORIZONTAL NO MOBILE) */}
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
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'TODOS'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
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
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'CONFIRMADO'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-200/70 text-emerald-800'
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
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'PENDENTE'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-200/70 text-amber-800'
                      }`}
                  >
                    {totalPendentes}
                  </span>
                </button>

                {totalDesistencias > 0 && (
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('DESISTENCIA')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md sm:rounded-sm text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${filtroStatus === 'DESISTENCIA'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                      }`}
                  >
                    <span>Desistências</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filtroStatus === 'DESISTENCIA'
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-200/70 text-rose-800'
                        }`}
                    >
                      {totalDesistencias}
                    </span>
                  </button>
                )}
              </div>

              {/* BUSCA POR TEXTO */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar nome, fone..."
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
                  {/* VISUALIZAÇÃO MOBILE (CARDS RESPONSIVOS) */}
                  <div className="block md:hidden space-y-2">
                    {inscritosFiltrados.map((insc, idx) => {
                      let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                      let dotColor = 'bg-slate-400';
                      if (insc.status === 'CONFIRMADO') {
                        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        dotColor = 'bg-emerald-500';
                      } else if (insc.status === 'DESISTENCIA' || insc.status === 'CANCELADO') {
                        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                        dotColor = 'bg-rose-500';
                      } else if (insc.status === 'PENDENTE') {
                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        dotColor = 'bg-amber-500';
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
                              {/* <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {insc.status?.replace('_', ' ') || '-'} */}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* VISUALIZAÇÃO DESKTOP (TABELA) */}
                  <div className="hidden md:block bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1351b4]">
                          <th className="px-5 py-3 text-xs font-bold text-white uppercase tracking-wider">Inscrito</th>
                          <th className="px-5 py-3 text-xs font-bold text-white uppercase tracking-wider">Comunidade</th>
                          <th className="w-36 px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inscritosFiltrados.map((insc, idx) => {
                          let badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                          let dotColor = 'bg-slate-400';
                          if (insc.status === 'CONFIRMADO') {
                            badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            dotColor = 'bg-emerald-500';
                          } else if (insc.status === 'DESISTENCIA' || insc.status === 'CANCELADO') {
                            badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                            dotColor = 'bg-rose-500';
                          } else if (insc.status === 'PENDENTE') {
                            badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                            dotColor = 'bg-amber-500';
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
                                  {insc.pessoa?.comunidade || '-'}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                  {insc.status?.replace('_', ' ') || '-'}
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
