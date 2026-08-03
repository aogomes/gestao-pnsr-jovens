'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader2, FileText, CalendarDays, Users, Download, X } from 'lucide-react';

export default function RelatoriosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<any>(null);
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [carregandoInscritos, setCarregandoInscritos] = useState(false);

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

  const exportarPDF = () => {
    if (!eventoSelecionado) return;

    const doc = new jsPDF();

    // Título do PDF
    doc.setFontSize(18);
    doc.text(`Relatório de Inscrições`, 14, 22);

    doc.setFontSize(12);
    doc.text(`Evento: ${eventoSelecionado.nome}`, 14, 30);
    doc.text(`Total de Inscritos: ${inscritos.length}`, 14, 36);

    const tableColumn = ["Nome", "Telefone", "Comunidade", "Status"];
    const tableRows: any[] = [];
    const statusCount: Record<string, number> = {};

    inscritos.forEach((inscricao) => {
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

            <div className="px-4 sm:px-6 py-4 sm:py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-base sm:text-lg font-black text-[#1351b4] uppercase tracking-tight truncate max-w-[200px] sm:max-w-md">
                  {eventoSelecionado.nome}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 mb-2">Total de {inscritos.length} pessoas</p>
                {inscritos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(inscritos.reduce((acc: any, i: any) => {
                      const s = i.status || 'NÃO DEFINIDO';
                      acc[s] = (acc[s] || 0) + 1;
                      return acc;
                    }, {})).map(([status, qtd]: any) => {
                       let badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                       if (status === 'CONFIRMADO') badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                       else if (status === 'DESISTENCIA' || status === 'CANCELADO') badgeColor = 'bg-rose-50 text-rose-600 border-rose-100';
                       else if (status === 'PENDENTE') badgeColor = 'bg-amber-50 text-amber-600 border-amber-100';
                       return (
                         <span key={status} className={`px-1.5 py-0.5 rounded-sm border text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${badgeColor}`}>
                           {status.replace('_', ' ')}: {qtd}
                         </span>
                       )
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={exportarPDF}
                  disabled={inscritos.length === 0}
                  className="flex items-center gap-2 px-2 py-2 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title='Exportar PDF'
                >
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6 bg-[#f2f3f7]">
              {carregandoInscritos ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="w-8 h-8 text-[#1351b4] animate-spin" />
                </div>
              ) : (
                <div className="md:bg-white md:border md:border-slate-200 md:rounded-sm md:shadow-sm md:overflow-hidden">
                  <table className="w-full text-sm text-left border-separate border-spacing-0 md:border-spacing-0">
                    <thead className="hidden md:table-header-group">
                      <tr className="bg-[#1351b4]">
                        <th className="px-4 py-3 text-sm font-bold text-white border-b border-[#1351b4]">Inscrito</th>
                        <th className="px-4 py-3 text-sm font-bold text-white border-b border-[#1351b4]">Comunidade</th>
                        <th className="px-4 py-3 text-sm font-bold text-white border-b border-[#1351b4] whitespace-nowrap">Pago</th>
                        <th className="w-10 px-2 py-3 text-center text-sm font-bold text-white border-b border-[#1351b4]" title="Status">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-0 md:divide-y md:divide-slate-100">
                      {inscritos.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="block md:table-cell px-4 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-white border border-slate-200 rounded-sm">
                            Nenhum inscrito encontrado para este evento.
                          </td>
                        </tr>
                      ) : (
                        inscritos.map((insc, idx) => {
                          let statusColor = 'bg-slate-300';
                          if (insc.status === 'CONFIRMADO') statusColor = 'bg-emerald-500';
                          else if (insc.status === 'DESISTENCIA') statusColor = 'bg-rose-500';
                          else if (insc.status === 'PENDENTE') statusColor = 'bg-amber-500';

                          return (
                            <tr key={insc.id || idx} className="block md:table-row bg-white hover:bg-slate-50 transition-colors border border-slate-200 md:border-none rounded-sm md:rounded-none mb-3 md:mb-0 p-4 md:p-0 shadow-sm md:shadow-none">

                              <td className="block md:table-cell md:px-4 md:py-3 mb-2 md:mb-0 border-b border-dashed border-slate-100 md:border-none md:pb-0">
                                <div className="font-bold text-slate-700 uppercase text-xs truncate max-w-full sm:max-w-[400px]">
                                  {insc.pessoa?.nome || '-'}
                                </div>
                                <div className="text-slate-400 text-[10px] font-medium">
                                  {insc.pessoa?.telefone || '---'}
                                </div>
                              </td>

                              <td className="block md:table-cell md:px-4 md:py-3 mb-2 md:mb-0 border-b border-dashed border-slate-100 md:border-none  md:pb-0">
                                <div className="text-slate-600 text-xs font-medium truncate max-w-full sm:max-w-none">
                                  {insc.pessoa?.comunidade || '-'}
                                </div>
                              </td>

                              <td className="block md:table-cell md:px-4 md:py-3 mb-2 md:mb-0 border-b border-dashed border-slate-100 md:border-none md:pb-0">
                                <div className="text-emerald-600 text-xs font-bold whitespace-nowrap">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    insc.pagamentos?.reduce((acc: number, p: any) => acc + (p.valor || 0), 0) || 0
                                  )}
                                </div>
                              </td>

                              <td className="block md:table-cell md:px-2 md:py-3 text-left md:text-center align-middle">
                                <div className="flex items-center gap-2 mt-1 md:mt-0 md:justify-center">
                                  <div
                                    className={`w-3 h-3 rounded-full shadow-sm ${statusColor}`}
                                    title={insc.status?.replace('_', ' ') || '-'}
                                  />
                                  <span className="md:hidden text-[10px] font-bold text-slate-500 uppercase">{insc.status?.replace('_', ' ') || '-'}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
