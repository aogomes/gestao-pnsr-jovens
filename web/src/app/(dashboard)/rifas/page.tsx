'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Ticket,
  Plus,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  UserPlus,
  Trash2,
  FileDown,
  Pencil,
  Pause,
  Play,
  TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RifasPage() {
  const [rifas, setRifas] = useState<any[]>([]);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [paroquias, setParoquias] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberta, setModalAberta] = useState(false);
  const [modalAlocarAberta, setModalAlocarAberta] = useState(false);
  const [modalStatsAberta, setModalStatsAberta] = useState(false);
  const [rifaSelecionada, setRifaSelecionada] = useState<any>(null);
  const [estatisticasRifa, setEstatisticasRifa] = useState<any>(null);
  const [menuAtivo, setMenuAtivo] = useState<string | null>(null);

  // Helpers robustos de parsing de datas para evitar quebras por split/format
  const splitDataSeguro = (dataStr: any) => {
    if (!dataStr) return '';
    try {
      const stringData = typeof dataStr === 'string' ? dataStr : dataStr.toISOString ? dataStr.toISOString() : String(dataStr);
      return stringData.split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const formatarDataSegura = (dataStr: any) => {
    const dataLimpa = splitDataSeguro(dataStr);
    if (!dataLimpa) return '-';
    try {
      const partes = dataLimpa.split('-');
      if (partes.length === 3) {
        const [ano, mes, dia] = partes;
        return `${dia}/${mes}/${ano}`;
      }
      return dataLimpa;
    } catch (e) {
      return '-';
    }
  };

  const verificarExpiradaSegura = (dataStr: any) => {
    const dataLimpa = splitDataSeguro(dataStr);
    if (!dataLimpa) return false;
    try {
      const dataFimObj = new Date(dataLimpa + 'T23:59:59');
      return dataFimObj < new Date();
    } catch (e) {
      return false;
    }
  };

  // Form para nova Rifa
  const [novaRifa, setNovaRifa] = useState<any>({
    nome: '',
    titulo: '',
    descricao: '',
    dataInicio: '',
    dataFim: '',
    dataSorteio: '',
    valorNumero: 10,
    numerosPorCartela: 50,
    totalNumeros: 1000,
    percentualRateio: 100,
    eventoId: '',
    premioVendedor: '',
    chavePix: '',
    tipoChavePix: 'EMAIL',
    premios: [
      { descricao: '1º Prêmio', posicao: 1 },
      { descricao: '2º Prêmio', posicao: 2 },
      { descricao: '3º Prêmio', posicao: 3 }
    ]
  });

  const isRifaReadOnly = novaRifa.status === 'FINALIZADA' || novaRifa.status === 'SORTEADA';

  // Form para Alocação
  const [alocacao, setAlocacao] = useState({
    pessoaId: '',
    quantidade: 50
  });

  useEffect(() => {
    carregarDados();
  }, []);

  // Removido contasFiltradas baseada em paroquiaId direto na rifa

  const carregarDados = async () => {
    try {
      const [resRifas, resPessoas, resParoquias, resEventos] = await Promise.all([
        api.get('/rifas').catch(err => {
          console.error('Falha ao carregar /rifas:', err);
          return { data: [] };
        }),
        api.get('/pessoas').catch(err => {
          console.error('Falha ao carregar /pessoas:', err);
          return { data: [] };
        }),
        api.get('/paroquias').catch(err => {
          console.error('Falha ao carregar /paroquias:', err);
          return { data: [] };
        }),
        api.get('/eventos').catch(err => {
          console.error('Falha ao carregar /eventos:', err);
          return { data: [] };
        })
      ]);
      setRifas(Array.isArray(resRifas.data) ? resRifas.data : []);
      setPessoas(Array.isArray(resPessoas.data) ? resPessoas.data : []);
      setParoquias(Array.isArray(resParoquias.data) ? resParoquias.data : []);
      setEventos(Array.isArray(resEventos.data) ? resEventos.data : []);
    } catch (error) {
      console.error('Erro ao carregar rifas:', error);
      setRifas([]);
      setPessoas([]);
      setParoquias([]);
      setEventos([]);
    } finally {
      setCarregando(false);
    }
  };

  const handleCriarRifa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...novaRifa,
        eventoId: Number(novaRifa.eventoId)
      };

      if (novaRifa.id) {
        await api.patch(`/rifas/${novaRifa.id}`, payload);
      } else {
        await api.post('/rifas', payload);
      }
      setModalAberta(false);
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao processar rifa');
    }
  };

  const abrirEdicao = (rifa: any) => {
    setNovaRifa({
      ...rifa,
      dataInicio: splitDataSeguro(rifa.dataInicio),
      dataFim: splitDataSeguro(rifa.dataFim),
      dataSorteio: splitDataSeguro(rifa.dataSorteio),
    });
    setModalAberta(true);
    setMenuAtivo(null);
  };

  const abrirEstatisticas = async (rifa: any) => {
    try {
      const res = await api.get(`/rifas/${rifa.id}/resumo`);
      setEstatisticasRifa(res.data);
      setRifaSelecionada(rifa);
      setModalStatsAberta(true);
      setMenuAtivo(null);
    } catch (error) {
      alert('Erro ao carregar estatísticas');
    }
  };

  const handleAlocar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rifas/alocar', {
        pessoaId: Number(alocacao.pessoaId),
        quantidade: Number(alocacao.quantidade),
        rifaId: rifaSelecionada.id
      });
      setModalAlocarAberta(false);
      carregarDados();
      alert('Cartela alocada com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao alocar cartela');
    }
  };

  const toggleStatusRifa = async (rifa: any) => {
    const novoStatus = rifa.status === 'PAUSADA' ? 'ATIVA' : 'PAUSADA';
    const confirmacao = confirm(`Deseja realmente ${novoStatus === 'PAUSADA' ? 'PAUSAR' : 'REATIVAR'} esta campanha?`);

    if (!confirmacao) return;

    try {
      await api.patch(`/rifas/${rifa.id}`, { status: novoStatus });
      carregarDados();
      setMenuAtivo(null);
    } catch (error) {
      alert('Erro ao alterar status da rifa');
    }
  };

  const excluirRifa = async (rifa: any) => {
    const confirmacao = confirm(`ATENÇÃO: Deseja realmente EXCLUIR a campanha "${rifa.nome}"?\n\nEsta ação é irreversível e excluirá todos os bilhetes e alocações associados.`);

    if (!confirmacao) return;

    try {
      await api.delete(`/rifas/${rifa.id}`);
      carregarDados();
      setMenuAtivo(null);
      alert('Campanha excluída com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao excluir campanha. Certifique-se de que não há números vendidos ou reservados.');
    }
  };

  const gerarPDFDetalhado = (vendedor: any) => {
    const doc = new jsPDF();
    const dataSorteio = format(new Date(rifaSelecionada.dataSorteio.split('T')[0] + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    // Cabeçalho
    doc.setFillColor(19, 81, 180); // Cor #1351b4
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text((rifaSelecionada.titulo || rifaSelecionada.nome).toUpperCase(), 105, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    if (rifaSelecionada.evento?.paroquia?.nome) {
      doc.text(rifaSelecionada.evento.paroquia.nome.toUpperCase(), 105, 26, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`RELATÓRIO DETALHADO POR VENDEDOR: ${vendedor.nome.toUpperCase()}`, 105, 34, { align: 'center' });

    // Informações da Rifa
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES DA CAMPANHA', 15, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data do Sorteio: ${dataSorteio}`, 15, 62);
    doc.text(`Vendedor: ${vendedor.nome}`, 15, 67);

    // Prêmios
    let yPos = 80;
    doc.setFont('helvetica', 'bold');
    doc.text('PREMIAÇÃO:', 15, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    (rifaSelecionada.premios ? [...rifaSelecionada.premios].sort((a: any, b: any) => a.posicao - b.posicao) : []).forEach((p: any) => {
      doc.text(`${p.posicao}º Prêmio: ${p.descricao}`, 20, yPos);
      yPos += 5;
    });

    // Tabela de Números
    const tableData = (vendedor.bilhetes ? [...vendedor.bilhetes].sort((a: any, b: any) => a.numero - b.numero) : []).map((b: any) => [
      b.numero.toString().padStart(4, '0'),
      b.status,
      b.nomeCliente || '-',
      b.foneCliente || '-'
    ]);

    autoTable(doc, {
      startY: yPos + 10,
      head: [['NÚMERO', 'STATUS', 'CLIENTE', 'TELEFONE']],
      body: tableData,
      headStyles: { fillColor: [19, 81, 180], fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 30 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const status = data.cell.raw;
          if (status === 'VENDIDO') data.cell.styles.textColor = [16, 185, 129]; // Emerald 500
          if (status === 'RESERVADO') data.cell.styles.textColor = [245, 158, 11]; // Amber 500
        }
      }
    });

    doc.save(`Relatorio_${vendedor.nome.replace(/\s+/g, '_')}_${rifaSelecionada.nome.replace(/\s+/g, '_')}.pdf`);
  };

  const adicionarPremio = () => {
    setNovaRifa({
      ...novaRifa,
      premios: [
        ...novaRifa.premios,
        { descricao: '', posicao: novaRifa.premios.length + 1 }
      ]
    });
  };

  const removerPremio = (index: number) => {
    const novosPremios = novaRifa.premios.filter((_: any, i: number) => i !== index);
    // Reordenar posições
    const reordenados = novosPremios.map((p: any, i: number) => ({ ...p, posicao: i + 1 }));
    setNovaRifa({ ...novaRifa, premios: reordenados });
  };

  const atualizarPremio = (index: number, valor: string) => {
    const novosPremios = [...novaRifa.premios];
    novosPremios[index].descricao = valor;
    setNovaRifa({ ...novaRifa, premios: novosPremios });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Gestão de Rifas</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Administre campanhas, prêmios e distribuição de bilhetes.</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rifas.length} campanha{rifas.length !== 1 ? 's' : ''} localizada{rifas.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => {
              setNovaRifa({
                nome: '',
                titulo: '',
                descricao: '',
                dataInicio: '',
                dataFim: '',
                dataSorteio: '',
                valorNumero: 10,
                numerosPorCartela: 50,
                totalNumeros: 1000,
                percentualRateio: 100,
                premioVendedor: '',
                chavePix: '',
                tipoChavePix: 'EMAIL',
                premios: [
                  { descricao: '1º Prêmio', posicao: 1 },
                  { descricao: '2º Prêmio', posicao: 2 },
                  { descricao: '3º Prêmio', posicao: 3 }
                ]
              });
              setModalAberta(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            Nova Campanha
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#1351b4] sticky top-0 z-10 backdrop-blur-md">
                <th className="pl-6 pr-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Campanha</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Prêmios</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Sorteio</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Progresso de Vendas</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Alocações & Rateio</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Status</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rifas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Ticket className="w-16 h-16" />
                      <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhuma campanha cadastrada</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rifas.map((rifa) => {
                  const percentual = rifa.totalNumeros ? Math.round(((rifa.stats?.vendidos || 0) / rifa.totalNumeros) * 100) : 0;
                  const isExpirada = verificarExpiradaSegura(rifa.dataFim);

                  return (
                    <tr key={rifa.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* CAMPANHA */}
                      <td className="pl-6 pr-2 py-1 border-b border-slate-100">
                        <div className="flex flex-col space-y-1 max-w-[280px]">
                          <span className="font-bold text-[12px] text-slate-700 uppercase leading-tight">{rifa.nome}</span>
                          <span className="text-xs text-slate-400 mt-0.5 line-clamp-2 uppercase">{rifa.descricao}</span>
                        </div>
                      </td>

                      {/* PRÊMIOS */}
                      <td className="px-2 py-1 border-b border-slate-100">
                        <div className="flex flex-col space-y-1.5 min-w-[150px]">
                          {(rifa.premios ? [...rifa.premios].sort((a: any, b: any) => a.posicao - b.posicao) : []).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 text-[8px] text-slate-500 uppercase tracking-tight">
                              <span className="text-[#1351b4] font-bold">{p.posicao}º</span>
                              <span className="truncate max-w-[120px]">{p.descricao}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* DATA DO SORTEIO */}
                      <td className="px-2 py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-bold text-xs uppercase whitespace-nowrap">
                          {formatarDataSegura(rifa.dataSorteio)}
                        </span>
                      </td>

                      {/* PROGRESSO DE VENDAS */}
                      <td className="px-2 py-1 border-b border-slate-100">
                        <div className="flex flex-col space-y-2 min-w-[160px]">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <span>Progresso</span>
                            <span className="text-[#1351b4]">{percentual}%</span>
                          </div>

                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-[#1351b4] transition-all duration-500"
                              style={{ width: `${percentual}%` }}
                            />
                          </div>

                          {/* Stats Detalhado */}
                          <div className="flex items-center gap-3 mt-2">
                            {/* Vendido */}
                            <div className="relative group/tooltip cursor-pointer flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600/10 shadow-sm" />
                              <span className="text-[10px] font-bold text-slate-500">{rifa.stats?.vendidos || 0}</span>
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-xl z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                                {rifa.stats?.vendidos || 0} Vendido{rifa.stats?.vendidos !== 1 ? 's' : ''}
                              </div>
                            </div>

                            {/* Reservado */}
                            <div className="relative group/tooltip cursor-pointer flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-blue-600/10 shadow-sm" />
                              <span className="text-[10px] font-bold text-slate-500">{rifa.stats?.reservados || 0}</span>
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-xl z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                                {rifa.stats?.reservados || 0} Reservado{rifa.stats?.reservados !== 1 ? 's' : ''}
                              </div>
                            </div>

                            {/* Livre */}
                            <div className="relative group/tooltip cursor-pointer flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-500/10 shadow-sm" />
                              <span className="text-[10px] font-bold text-slate-500">{rifa.stats?.livres || 0}</span>
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-xl z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                                {rifa.stats?.livres || 0} Livre{rifa.stats?.livres !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ALOCAÇÕES E RATEIO */}
                      <td className="px-2 py-1 border-b border-slate-100">
                        <div className="flex flex-col space-y-2 min-w-[160px]">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                            <Ticket className="w-3.5 h-3.5 text-[#1351b4]" />
                            <span>{rifa.alocacoes?.length || 0} Cartelas</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Alocar Cartela */}
                            {rifa.status !== 'FINALIZADA' && rifa.status !== 'SORTEADA' ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await api.get(`/rifas/${rifa.id}`);
                                    setRifaSelecionada(res.data);
                                    setModalAlocarAberta(true);
                                  } catch (err) {
                                    alert('Erro ao carregar participantes do evento.');
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[#1351b4] hover:text-[#0047b7] text-[10px] font-black uppercase tracking-widest hover:underline"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Alocar
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest cursor-not-allowed select-none">
                                Finalizada
                              </span>
                            )}

                            {/* Ratear Arrecadação */}
                            {isExpirada && rifa.status !== 'FINALIZADA' && rifa.status !== 'SORTEADA' && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Deseja realizar o rateio final da campanha "${rifa.nome}"? O saldo da paróquia e dos promotores será atualizado e a rifa será marcada como FINALIZADA.`)) {
                                    try {
                                      const res = await api.post(`/rifas/${rifa.id}/ratear`);
                                      alert(`Rateio concluído!\n\nArrecadação Total: R$ ${res.data.valorTotal}\nPara a Paróquia: R$ ${res.data.valorConta}\nComissão de Promotores: R$ ${res.data.valorVendedores}`);
                                      carregarDados();
                                    } catch (error: any) {
                                      alert(error.response?.data?.message || 'Erro ao realizar o rateio.');
                                    }
                                  }
                                }}
                                className="bg-emerald-600 text-white px-2.5 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                              >
                                Executar Rateio
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="px-2 py-1 border-b border-slate-100">
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-widest shadow-sm border ${(isExpirada && (rifa.status === 'ATIVA' || rifa.status === 'PAUSADA')) ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          rifa.status === 'ATIVA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            rifa.status === 'PAUSADA' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              rifa.status === 'FINALIZADA' ? 'bg-blue-50 text-[#1351b4] border-[#1351b4]/20' :
                                'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          {(isExpirada && (rifa.status === 'ATIVA' || rifa.status === 'PAUSADA')) ? 'ENCERRADA' : rifa.status}
                        </span>
                      </td>

                      {/* AÇÕES */}
                      <td className="px-2 py-1 border-b border-slate-100">
                        <div className="flex items-center justify-center gap-2">
                          {/* Estatísticas */}
                          <button
                            onClick={() => abrirEstatisticas(rifa)}
                            className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-[#1351b4] hover:bg-blue-50 rounded-sm border border-slate-200 transition-all shadow-sm"
                            title="Ver Estatísticas"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => abrirEdicao(rifa)}
                            className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-[#1351b4] hover:bg-blue-50 rounded-sm border border-slate-200 transition-all shadow-sm"
                            title={rifa.status === 'FINALIZADA' || rifa.status === 'SORTEADA' ? "Visualizar Campanha" : "Editar Campanha"}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Pausar / Reativar */}
                          {rifa.status !== 'FINALIZADA' && rifa.status !== 'SORTEADA' && (
                            <button
                              onClick={() => toggleStatusRifa(rifa)}
                              className={`w-7 h-7 flex items-center justify-center bg-slate-50 rounded-sm border border-slate-200 transition-all shadow-sm ${rifa.status === 'PAUSADA' ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700' : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              title={rifa.status === 'PAUSADA' ? 'Reativar Campanha' : 'Pausar Campanha'}
                            >
                              {rifa.status === 'PAUSADA' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Excluir */}
                          {rifa.status !== 'FINALIZADA' && rifa.status !== 'SORTEADA' && (
                            <button
                              onClick={() => excluirRifa(rifa)}
                              className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-sm border border-slate-200 transition-all shadow-sm"
                              title="Excluir Campanha"
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

      {/* Modal Nova Rifa */}
      {modalAberta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1351b4] text-white rounded-sm flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    {isRifaReadOnly ? 'Visualizar Campanha' : 'Configurar Campanha'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {isRifaReadOnly ? 'Dados da campanha em modo de visualização' : 'Preencha os dados da nova rifa'}
                  </p>
                </div>
              </div>
              <button onClick={() => setModalAberta(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleCriarRifa} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-full">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome da Campanha</label>
                  <textarea
                    rows={1}
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="Ex: Rifa Beneficente 2024"
                    value={novaRifa.nome}
                    onChange={(e) => setNovaRifa({ ...novaRifa, nome: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Evento Associado (Herda a Conta do Evento)</label>
                  <select
                    required
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all appearance-none font-bold text-slate-700 disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.eventoId || ''}
                    onChange={(e) => setNovaRifa({ ...novaRifa, eventoId: e.target.value })}
                  >
                    <option value="">Selecione um evento...</option>
                    {eventos.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.nome} (Conta: {ev.conta?.nome})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Título da Campanha (Chamativo)</label>
                  <input
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="Ex: Grande Sorteio da Paróquia - Concorra a um Carro!"
                    value={novaRifa.titulo || ''}
                    onChange={(e) => setNovaRifa({ ...novaRifa, titulo: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Descrição</label>
                  <textarea
                    rows={2}
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.descricao || ''}
                    onChange={(e) => setNovaRifa({ ...novaRifa, descricao: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Início</label>
                  <input
                    type="date"
                    required
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.dataInicio}
                    onChange={(e) => setNovaRifa({ ...novaRifa, dataInicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fim das Vendas</label>
                  <input
                    type="date"
                    required
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.dataFim}
                    onChange={(e) => setNovaRifa({ ...novaRifa, dataFim: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Data do Sorteio</label>
                  <input
                    type="date"
                    required
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.dataSorteio}
                    onChange={(e) => setNovaRifa({ ...novaRifa, dataSorteio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Valor por Número</label>
                  <input
                    type="number"
                    required
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.valorNumero}
                    onChange={(e) => setNovaRifa({ ...novaRifa, valorNumero: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Total de Números</label>
                  <input
                    type="number"
                    required
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.totalNumeros}
                    onChange={(e) => setNovaRifa({ ...novaRifa, totalNumeros: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Números por Cartela</label>
                  <input
                    type="number"
                    required
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.numerosPorCartela}
                    onChange={(e) => setNovaRifa({ ...novaRifa, numerosPorCartela: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Percentual de Rateio (%)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    value={novaRifa.percentualRateio}
                    onChange={(e) => setNovaRifa({ ...novaRifa, percentualRateio: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tipo da Chave</label>
                      <select
                        disabled={isRifaReadOnly}
                        className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all font-bold text-slate-700 disabled:opacity-75 disabled:cursor-not-allowed"
                        value={novaRifa.tipoChavePix || 'EMAIL'}
                        onChange={(e) => setNovaRifa({ ...novaRifa, tipoChavePix: e.target.value })}
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="EMAIL">E-MAIL</option>
                        <option value="TELEFONE">CELULAR / TELEFONE</option>
                        <option value="ALEATORIA">CHAVE ALEATÓRIA</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Chave PIX</label>
                      <input
                        disabled={isRifaReadOnly}
                        className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all font-bold text-slate-700 disabled:opacity-75 disabled:cursor-not-allowed"
                        placeholder="Insira a chave aqui..."
                        value={novaRifa.chavePix || ''}
                        onChange={(e) => setNovaRifa({ ...novaRifa, chavePix: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium ml-1">Esta chave será usada para gerar os QR Codes nas cartelas.</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Prêmio para o Vendedor</label>
                  <input
                    type="text"
                    disabled={isRifaReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="Ex: R$ 100,00 ou um brinde"
                    value={novaRifa.premioVendedor || ''}
                    onChange={(e) => setNovaRifa({ ...novaRifa, premioVendedor: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Lista de Prêmios</label>
                    {!isRifaReadOnly && (
                      <button
                        type="button"
                        onClick={adicionarPremio}
                        className="text-[10px] font-black text-[#1351b4] uppercase tracking-widest hover:underline"
                      >
                        + Adicionar Prêmio
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {novaRifa.premios.map((premio: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-12 h-12 bg-slate-100 rounded-sm flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                          {idx + 1}º
                        </div>
                        <input
                          type="text"
                          required
                          disabled={isRifaReadOnly}
                          placeholder={`Descrição do ${idx + 1}º prêmio`}
                          className="flex-1 bg-white border border-slate-200 rounded-sm px-4 py-2 text-xs outline-none focus:border-[#1351b4] transition-all text-xs disabled:opacity-75 disabled:cursor-not-allowed"
                          value={premio.descricao}
                          onChange={(e) => atualizarPremio(idx, e.target.value)}
                        />
                        {novaRifa.premios.length > 1 && !isRifaReadOnly && (
                          <button
                            type="button"
                            onClick={() => removerPremio(idx)}
                            className="p-2 text-slate-300 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>

            <div className="px-10 py-6 border-t border-slate-100 flex gap-4 bg-slate-50/50">
              {isRifaReadOnly ? (
                <button
                  type="button"
                  onClick={() => setModalAberta(false)}
                  className="flex-1 px-6 py-4 rounded-sm font-black text-[10px] uppercase tracking-widest text-white bg-[#1351b4] hover:bg-[#0047b7] transition-all text-center"
                >
                  Fechar
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setModalAberta(false)} className="flex-1 px-6 py-4 rounded-sm font-black text-[10px] uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all">Cancelar</button>
                  <button onClick={() => {
                    const form = document.querySelector('form');
                    if (form) form.requestSubmit();
                  }} className="flex-1 px-6 py-4 rounded-sm font-black text-[10px] uppercase tracking-widest text-white bg-[#1351b4] hover:bg-[#0047b7] transition-all shadow-lg shadow-blue-900/20">
                    Salvar Rifa
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Alocar Cartela */}
      {modalAlocarAberta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Alocar Números</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Distribua cartelas para um vendedor</p>
              </div>
              <button onClick={() => setModalAlocarAberta(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleAlocar} className="p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-slate-500 bg-blue-50 p-4 rounded-sm border border-blue-100">
                  A cartela será gerada automaticamente a partir do último número livre.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Vendedor (Apenas Inscritos no Evento)</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4] font-bold text-slate-700"
                    value={alocacao.pessoaId}
                    onChange={(e) => setAlocacao({ ...alocacao, pessoaId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {rifaSelecionada?.evento?.inscricoes?.map((i: any) => (
                      <option key={i.pessoaId} value={i.pessoaId}>
                        {i.pessoa?.nome}
                      </option>
                    )) || []}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Quantidade de Números</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs outline-none focus:border-[#1351b4]"
                    value={alocacao.quantidade}
                    onChange={(e) => setAlocacao({ ...alocacao, quantidade: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="w-full px-6 py-4 rounded-sm font-bold text-white bg-[#1351b4] hover:bg-[#1351b4]/90 transition-all">Confirmar Alocação</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Estatísticas */}
      {modalStatsAberta && estatisticasRifa && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-sm flex items-center justify-center shadow-lg shadow-emerald-100">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase">Estatísticas da Rifa</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{rifaSelecionada?.nome}</p>
                </div>
              </div>
              <button onClick={() => setModalStatsAberta(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-sm transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              {/* Visão Financeira */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-sm">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Arrecadado</p>
                  <p className="text-2xl font-black text-emerald-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticasRifa.financeiro.arrecadado)}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Rateio ({estatisticasRifa.financeiro.percentualRateio}%)</p>
                  </div>
                  <p className="text-2xl font-black text-blue-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticasRifa.financeiro.rateio)}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-sm">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Fundo Reserva ({100 - estatisticasRifa.financeiro.percentualRateio}%)</p>
                  <p className="text-2xl font-black text-amber-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticasRifa.financeiro.reserva)}
                  </p>
                </div>
              </div>

              {/* Lista por Vendedor */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Desempenho por Vendedor</h4>
                <div className="space-y-2">
                  {estatisticasRifa.vendedores.map((v: any, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-100 p-2 rounded-sm flex items-center justify-between hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {v.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{v.nome}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{v.total} bilhetes alocados</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Vendido */}
                        <div className="relative group/tooltip cursor-pointer flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600/10 shadow-sm" />
                          <span className="text-[10px] font-bold text-slate-500">{v.vendidos || 0}</span>
                          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-xl z-[110] whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                            {v.vendidos || 0} Vendido{v.vendidos !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Reservado */}
                        <div className="relative group/tooltip cursor-pointer flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-amber-500 border border-blue-600/10 shadow-sm" />
                          <span className="text-[10px] font-bold text-slate-500">{v.reservados || 0}</span>
                          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-xl z-[110] whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                            {v.reservados || 0} Reservado{v.reservados !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Livre */}
                        <div className="relative group/tooltip cursor-pointer flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-slate-400 border border-slate-500/10 shadow-sm" />
                          <span className="text-[10px] font-bold text-slate-500">{v.livres || 0}</span>
                          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-xl z-[110] whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                            {v.livres || 0} Livre{v.livres !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <button
                          onClick={() => gerarPDFDetalhado(v)}
                          className="ml-2 p-2 bg-slate-50 hover:bg-[#1351b4] text-slate-400 hover:text-white rounded-lg transition-all flex items-center justify-center"
                          title="Gerar Relatório PDF Detalhado"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  );
}
