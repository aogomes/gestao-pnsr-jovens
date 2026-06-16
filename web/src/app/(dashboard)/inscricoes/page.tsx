'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Plus,
  Search,
  Trash2,
  X,
  Loader2,
  User as UserIcon,
  CalendarDays,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Users,
  Trophy,
  Clock,
  ArrowRight,
  DollarSign,
  History,
  Wallet,
  MoreVertical,
  UserMinus,
  Eye
} from 'lucide-react';

export default function InscricoesPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [inscricoes, setInscricoes] = useState<any[]>([]);
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState<string>('');
  const [carregando, setCarregando] = useState(true);
  const [carregandoInscricoes, setCarregandoInscricoes] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  // Estado do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [menuAcaoAbertoId, setMenuAcaoAbertoId] = useState<number | null>(null);
  const [dadosForm, setDadosForm] = useState({ pessoaId: '' });
  const [enviando, setEnviando] = useState(false);

  // Modal de Pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [inscricaoParaPagar, setInscricaoParaPagar] = useState<any>(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('SALDO');
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  // Modal de Desistência
  const [modalDesistenciaAberto, setModalDesistenciaAberto] = useState(false);
  const [inscricaoParaDesistencia, setInscricaoParaDesistencia] = useState<any>(null);
  const [opcaoDesistencia, setOpcaoDesistencia] = useState('SALDO');
  const [targetPessoaId, setTargetPessoaId] = useState('');
  const [salvandoDesistencia, setSalvandoDesistencia] = useState(false);

  // Modal de Visualização
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false);
  const [inscricaoParaVisualizar, setInscricaoParaVisualizar] = useState<any>(null);

  useEffect(() => {
    buscarDadosIniciais();
  }, []);

  useEffect(() => {
    if (eventoSelecionadoId) {
      buscarInscricoes();
    } else {
      setInscricoes([]);
    }
  }, [eventoSelecionadoId]);

  const buscarDadosIniciais = async () => {
    try {
      const [eventsRes, personsRes] = await Promise.all([
        api.get('/eventos'),
        api.get('/pessoas')
      ]);
      const eventosAtivos = eventsRes.data.filter((e: any) => e.status === 'ATIVO');
      setEventos(eventosAtivos);
      setPessoas(personsRes.data);
      if (eventosAtivos.length > 0) {
        setEventoSelecionadoId(String(eventosAtivos[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const buscarInscricoes = async () => {
    setCarregandoInscricoes(true);
    try {
      const res = await api.get(`/inscricoes?eventoId=${eventoSelecionadoId}`);
      setInscricoes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoInscricoes(false);
    }
  };

  const abrirModal = () => {
    setDadosForm({ pessoaId: '' });
    setModalAberto(true);
  };

  const confirmarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoSelecionadoId) return;
    setEnviando(true);
    try {
      await api.post('/inscricoes', {
        pessoaId: Number(dadosForm.pessoaId),
        eventoId: Number(eventoSelecionadoId)
      });
      setModalAberto(false);
      buscarInscricoes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao realizar inscrição.');
    } finally {
      setEnviando(false);
    }
  };

  const atualizarStatus = async (id: number, novoStatus: string) => {
    try {
      await api.patch(`/inscricoes/${id}/status`, { status: novoStatus });
      buscarInscricoes();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert(msg ? `Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}` : 'Erro ao atualizar status da inscrição.');
    }
  };

  const confirmarExclusao = async (id: number) => {
    if (!confirm('Remover esta pessoa deste evento?')) return;
    try {
      await api.delete(`/inscricoes/${id}`);
      buscarInscricoes();
    } catch (err) {
      alert('Erro ao excluir inscrição.');
    }
  };
  const abrirModalPagamento = (insc: any) => {
    setInscricaoParaPagar(insc);
    setValorPagamento('');
    setMetodoPagamento('SALDO');
    setModalPagamentoAberto(true);
  };

  const abrirModalVisualizacao = (inscricao: any) => {
    setInscricaoParaVisualizar(inscricao);
    setModalVisualizacaoAberto(true);
  };

  const confirmarDesistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inscricaoParaDesistencia) return;
    setSalvandoDesistencia(true);
    try {
      await api.post(`/inscricoes/${inscricaoParaDesistencia.id}/desistencia`, {
        opcao: opcaoDesistencia,
        targetPessoaId: opcaoDesistencia === 'SALDO' && targetPessoaId ? Number(targetPessoaId) : undefined
      });
      setModalDesistenciaAberto(false);
      setInscricaoParaDesistencia(null);
      setTargetPessoaId('');
      setOpcaoDesistencia('SALDO');
      buscarInscricoes();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao registrar desistência.';
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setSalvandoDesistencia(false);
    }
  };

  const confirmarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(valorPagamento.replace(',', '.'));
    if (!valor || isNaN(valor) || valor <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    setSalvandoPagamento(true);
    try {
      await api.post(`/inscricoes/${inscricaoParaPagar.id}/pagamentos`, {
        valor,
        metodo: metodoPagamento,
        inscricaoId: inscricaoParaPagar.id
      });
      setModalPagamentoAberto(false);
      buscarInscricoes();
      alert('Pagamento registrado com sucesso!');
    } catch (err) {
      alert('Erro ao registrar pagamento.');
    } finally {
      setSalvandoPagamento(false);
    }
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatarData = (isoString: string) => {
    if (!isoString) return '';
    const [year, month, day] = isoString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const eventoSelecionado = eventos.find(e => String(e.id) === String(eventoSelecionadoId));
  const eventoAbertoInscricao = eventoSelecionado && eventoSelecionado.status === 'ATIVO' && new Date() <= new Date(eventoSelecionado.limiteInscricao);

  // Filtrar pessoas que NÃO estão inscritas no evento
  const pessoasDisponiveis = pessoas.filter(p => !inscricoes.some(r => r.pessoaId === p.id));

  // Cálculos financeiros do Evento (Receitas de pagamentos e Despesas de estornos)
  const totalReceitas = inscricoes.reduce((acc, insc) => {
    const recs = insc.pagamentos?.filter((p: any) => p.valor > 0)
      .reduce((sum: number, p: any) => sum + p.valor, 0) || 0;
    return acc + recs;
  }, 0);

  const totalDespesas = inscricoes.reduce((acc, insc) => {
    const exps = insc.pagamentos?.filter((p: any) => p.valor < 0)
      .reduce((sum: number, p: any) => sum + Math.abs(p.valor), 0) || 0;
    return acc + exps;
  }, 0);

  const saldoEvento = totalReceitas - totalDespesas;

  // Stats Inscrições
  const totalInscritos = inscricoes.length;
  const inscritosConfirmados = inscricoes.filter(i => i.status === 'CONFIRMADO').length;
  // const inscritosPendentes = inscricoes.filter(i => i.status === 'PENDENTE').length;
  const somaPagosConfirmados = inscricoes
    .filter(i => i.status === 'CONFIRMADO')
    .reduce((acc, insc) => {
      const pago = insc.pagamentos?.reduce((sum: number, p: any) => sum + p.valor, 0) || 0;
      return acc + pago;
    }, 0);

  if (carregando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#1351b4] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 pb-10">

      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Gestão de Inscrições</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Controle de participantes por evento</p>
        </div>
        <div className="lg:w-1/3 space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Evento
          </h4>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:text-[#1351b4] transition-colors">
              <Trophy className="w-4 h-4" />
            </div>
            <select
              value={eventoSelecionadoId}
              onChange={(e) => setEventoSelecionadoId(e.target.value)}
              className="w-full pl-12 pr-10 py-2 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer uppercase tracking-tight"
            >
              {eventos.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: LISTA DE INSCRITOS (HORIZONTAL / FULL WIDTH) */}
      <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between bg-slate-50/30 gap-4">
          {/* Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex flex-col items-center justify-center px-3 py-1 bg-blue-50 border border-blue-100 rounded-sm" title="Total de Inscritos">
              <span className="text-[10px] font-black text-blue-600 tracking-widest">Inscritos</span>
              <span className="text-xs font-black text-blue-800">{totalInscritos}</span>
            </div>
            <div className="flex flex-col items-center justify-center px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-sm" title="Inscrições Confirmadas">
              <span className="text-[10px] font-black text-emerald-600 tracking-widest">Confirmados</span>
              <span className="text-xs font-black text-emerald-800">{inscritosConfirmados}</span>
            </div>
            {/* <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-sm" title="Inscrições Pendentes">
              <span className="text-[9px] font-black text-amber-600 tracking-widest">Pendente: </span>
              <span className="text-xs font-black text-amber-800">{inscritosPendentes}</span>
            </div> */}
            <div className="flex flex-col items-center justify-center px-3 py-1 bg-amber-50 border border-amber-100 rounded-sm" title="Soma dos valores pagos pelas inscrições confirmadas">
              <span className="text-[10px] font-black text-[#1351b4] tracking-widest mb-0.5">Pagamentos</span>
              <span className="text-sm font-black text-[#1351b4] leading-none">{formatarMoeda(somaPagosConfirmados)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-9 pr-4 py-2.5 md:py-2 bg-white border border-slate-200 rounded-sm text-[10px] font-bold text-slate-700 uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4] w-full md:w-70 shadow-sm"
              />
            </div>
            <button
              disabled={!eventoAbertoInscricao}
              onClick={abrirModal}
              title='Nova Inscrição'
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
              Inscrição
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[400px]">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#1351b4]">
                <th className="px-4 py-4 text-xs font-bold text-white border-b border-[#1351b4] whitespace-nowrap">Código</th>
                <th className="px-2 py-2 text-xs font-bold text-white border-b border-[#1351b4]">Nome Completo</th>
                {/* <th className="px-2 py-2 text-xs font-bold text-white border-b border-[#1351b4] hidden md:table-cell text-center">Grupo</th> */}
                <th className="px-2 py-2 text-xs font-bold text-white border-b border-[#1351b4] text-right hidden sm:table-cell">Saldo</th>
                <th className="px-2 py-2 text-xs font-bold text-white border-b border-[#1351b4] text-right">Pago</th>
                <th className="px-2 py-2 text-xs font-bold text-white border-b border-[#1351b4] text-center hidden sm:table-cell">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-white border-b border-[#1351b4] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {carregandoInscricoes ? (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 animate-spin text-[#1351b4] opacity-20" />
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Carregando dados...</span>
                    </div>
                  </td>
                </tr>
              ) : inscricoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <AlertCircle className="w-16 h-16" />
                      <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhuma inscrição neste evento</span>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const inscricoesFiltradas = inscricoes
                    .filter((insc) => insc.pessoa.nome.toLowerCase().includes(termoBusca.toLowerCase()))
                    .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome));

                  if (inscricoesFiltradas.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="px-8 py-32 text-center text-slate-300">
                          <div className="flex flex-col items-center gap-4 opacity-20">
                            <AlertCircle className="w-16 h-16" />
                            <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhuma inscrição encontrada na busca</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return inscricoesFiltradas.map((inscricao) => {
                    const saldo = inscricao.pessoa.saldo || 0;
                    const totalPagoCru = inscricao.pagamentos?.reduce((acc: number, p: any) => acc + p.valor, 0) || 0;
                    const totalPago = Number(Number(totalPagoCru).toFixed(2)) || 0;

                    return (
                      <tr key={inscricao.id} className="hover:bg-slate-50 transition-all duration-200 bg-white group">
                        <td className="px-2 py-1 border-b border-slate-100">
                          <div className="w-10 h-8 rounded-sm flex items-center justify-center text-sm font-bold text-slate-600 group-hover:bg-[#1351b4] group-hover:text-white group-hover:scale-110 transition-all">
                            {inscricao.pessoa.id.toString().padStart(3, '0')}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-b border-slate-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#1b2b41] text-sm leading-tight">{inscricao.pessoa.nome}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{inscricao.pessoa.email || 'sem-email@informado.com'}</span>
                          </div>
                        </td>
                        {/* <td className="px-4 py-2 border-b border-slate-100 hidden md:table-cell text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500 text-white shadow-sm">
                            {inscricao.pessoa.comunidade || 'Grupo 20 - N.Sra. Rosário'}
                          </span>
                        </td> */}

                        <td className="px-4 py-2 border-b border-slate-100 text-right hidden sm:table-cell">
                          <span className={`text-sm font-bold ${saldo > 0 ? 'text-emerald-600' : saldo < 0 ? 'text-rose-600' : 'text-slate-200'}`}>
                            {formatarMoeda(saldo)}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-b border-slate-100 text-right">
                          <span className={`text-sm font-bold ${totalPago > 0 ? 'text-emerald-600' : totalPago < 0 ? 'text-rose-600' : 'text-slate-200'}`}>
                            {formatarMoeda(totalPago)}
                          </span>
                        </td>

                        <td className="px-4 py-2 border-b border-slate-100 text-center hidden sm:table-cell">
                          <select
                            value={inscricao.status}
                            onChange={(e) => {
                              const novoStatus = e.target.value;
                              if (novoStatus === 'CANCELADO') {
                                const totalPago = inscricao.pagamentos?.reduce((acc: number, p: any) => acc + p.valor, 0) || 0;
                                if (totalPago > 0) {
                                  if (!confirm(`Esta inscrição possui R$ ${totalPago.toFixed(2)} pagos. Ao cancelá-la, todo esse valor será automaticamente estornado para o saldo de ${inscricao.pessoa.nome}. Deseja prosseguir?`)) {
                                    e.target.value = inscricao.status;
                                    return;
                                  }
                                } else {
                                  if (!confirm(`Tem certeza que deseja cancelar a inscrição de ${inscricao.pessoa.nome}?`)) {
                                    e.target.value = inscricao.status;
                                    return;
                                  }
                                }
                              }
                              atualizarStatus(inscricao.id, novoStatus);
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold border shadow-sm outline-none cursor-pointer appearance-none ${inscricao.status === 'CONFIRMADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              inscricao.status === 'EM_ANALISE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                inscricao.status === 'CANCELADO' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                  'bg-white text-slate-600 border-slate-200'
                              }`}
                          >
                            <option value="PENDENTE" className="text-slate-600 bg-white">Pendente</option>
                            <option value="CONFIRMADO" className="text-emerald-600 bg-white">Confirmado</option>
                            <option value="EM_ANALISE" className="text-indigo-600 bg-white">Em Análise</option>
                            <option value="CANCELADO" className="text-rose-600 bg-white">Cancelado</option>
                          </select>
                        </td>

                        <td className="px-4 py-4 border-b border-slate-100">
                          <div className="relative flex items-center justify-end">
                            {/* Mobile 3-dots */}
                            <div className="sm:hidden">
                              <button onClick={() => setMenuAcaoAbertoId(menuAcaoAbertoId === inscricao.id ? null : inscricao.id)} className="p-2 text-slate-400 hover:text-[#1351b4]">
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              {menuAcaoAbertoId === inscricao.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setMenuAcaoAbertoId(null)} />
                                  <div className="absolute right-8 top-1/2 -translate-y-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-md flex flex-col p-1 w-44">
                                    <button
                                      onClick={() => { setMenuAcaoAbertoId(null); abrirModalPagamento(inscricao); }}
                                      className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1351b4] rounded-sm text-left"
                                    >
                                      <DollarSign className="w-4 h-4" /> Pagamentos
                                    </button>

                                    {inscricao.status === 'CONFIRMADO' && totalPago > 0 && (
                                      <button
                                        onClick={() => {
                                          setMenuAcaoAbertoId(null);
                                          setInscricaoParaDesistencia(inscricao);
                                          setModalDesistenciaAberto(true);
                                        }}
                                        className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-sm text-left"
                                      >
                                        <UserMinus className="w-4 h-4" /> Desistência
                                      </button>
                                    )}

                                    <button
                                      onClick={() => { setMenuAcaoAbertoId(null); confirmarExclusao(inscricao.id); }}
                                      className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-sm text-left"
                                    >
                                      <Trash2 className="w-4 h-4" /> Remover
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Desktop buttons */}
                            <div className="hidden sm:flex items-center justify-center gap-0.5">

                              {/* Botão Desistência */}
                              {inscricao.status === 'CONFIRMADO' && totalPago > 0 && (
                                <button
                                  onClick={() => {
                                    setInscricaoParaDesistencia(inscricao);
                                    setModalDesistenciaAberto(true);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-white text-amber-500 hover:bg-amber-50 transition-all"
                                  title="Registrar Desistência"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}

                              {/* Botão Visualizar */}
                              <button
                                onClick={() => abrirModalVisualizacao(inscricao)}
                                className="w-7 h-7 flex items-center justify-center bg-white text-slate-400 hover:text-[#1b2b41] transition-all"
                                title="Visualizar Detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Botão Pagamentos */}
                              <button
                                onClick={() => abrirModalPagamento(inscricao)}
                                className="w-7 h-7 flex items-center justify-center bg-white text-emerald-600 hover:bg-emerald-50 transition-all"
                                title="Gestão de Pagamentos"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>

                              {/* Botão Remover */}
                              <button
                                onClick={() => confirmarExclusao(inscricao.id)}
                                className="w-7 h-7 flex items-center justify-center bg-white text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                title="Remover Registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Inscrição */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">Nova Inscrição</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{eventoSelecionado?.nome}</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowRight className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={confirmarEnvio} className="p-10 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Buscar Pessoa para Vínculo</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-300 group-focus-within:text-[#1351b4] transition-colors border border-slate-100 shadow-sm">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <select
                    required
                    value={dadosForm.pessoaId}
                    onChange={(e) => setDadosForm({ pessoaId: e.target.value })}
                    className="w-full pl-16 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer uppercase tracking-tight"
                  >
                    <option value="">Clique para selecionar...</option>
                    {pessoasDisponiveis.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.documento || 'S/ Doc'})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {pessoasDisponiveis.length === 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 font-bold leading-tight uppercase tracking-widest">Nenhuma pessoa disponível para este evento.</p>
                  </div>
                )}
              </div>

              <div className="pt-8 flex items-center justify-end gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-6 py-3 text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !dadosForm.pessoaId}
                  className="px-10 py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Participação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Pagamentos da Inscrição */}
      {modalPagamentoAberto && inscricaoParaPagar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-[#1351b4] text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{inscricaoParaPagar.pessoa.nome}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{eventoSelecionado?.nome}</p>
                </div>
              </div>
              <button onClick={() => setModalPagamentoAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-[#1351b4]" /> Histórico de Pagamentos
                  </h3>
                  <div className="border border-slate-100 rounded-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Evento</th>
                          <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {!inscricaoParaPagar.pagamentos || inscricaoParaPagar.pagamentos.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Nenhum pagamento registrado</td>
                          </tr>
                        ) : (
                          inscricaoParaPagar.pagamentos.map((p: any) => (
                            <tr key={p.id}>
                              <td className="px-3 py-2 text-slate-600 font-bold">{formatarData(p.data)}</td>
                              <td className="px-3 py-2 text-slate-600 font-bold uppercase text-[10px]">{inscricaoParaPagar.evento?.nome}</td>
                              <td className="px-3 py-2 text-right text-red-500 font-bold">{formatarMoeda(p.valor)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td colSpan={2} className="px-6 py-3 text-right font-black text-slate-500 uppercase tracking-widest text-[10px] border-t border-slate-100">Valor do Evento</td>
                          <td className="px-6 py-3 text-right font-black text-slate-700 border-t border-slate-100">{formatarMoeda(eventoSelecionado?.valor || 0)}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="px-6 py-3 text-right font-black text-emerald-600 uppercase tracking-widest text-[10px] border-t border-slate-100">Valor Pago</td>
                          <td className="px-6 py-3 text-right font-black text-emerald-600 border-t border-slate-100">
                            {formatarMoeda(inscricaoParaPagar.pagamentos?.reduce((acc: number, p: any) => acc + p.valor, 0) || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {inscricaoParaPagar.status !== 'CONFIRMADO' ? (
                  <div className="pt-6 border-t border-slate-100">
                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-sm flex items-start gap-4 shadow-sm">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black text-rose-700 uppercase tracking-tight">Registro de Pagamento Bloqueado</h4>
                        <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                          Esta inscrição está com status "{
                            inscricaoParaPagar.status === 'PENDENTE' ? 'Pendente' :
                              inscricaoParaPagar.status === 'EM_ANALISE' ? 'Em Análise' :
                                inscricaoParaPagar.status === 'CANCELADO' ? 'Cancelado' :
                                  inscricaoParaPagar.status
                          }". Para registrar pagamentos, a inscrição deve ser primeiro aprovada e CONFIRMADA pelo administrador do sistema.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={confirmarPagamento} className="pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Registrar Novo Pagamento</h3>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wallet className="w-5 h-5 text-[#1351b4]" />
                              <div>
                                <span className="text-[9px] text-[#1351b4] font-black uppercase tracking-widest block">Saldo em Conta</span>
                                <span className="text-sm font-black text-[#1351b4]">{formatarMoeda(inscricaoParaPagar.pessoa.saldo)}</span>
                              </div>
                            </div>
                            {Math.round(Number(valorPagamento.replace(',', '.')) * 100) > Math.round(inscricaoParaPagar.pessoa.saldo * 100) && (
                              <div className="flex items-center gap-2 text-rose-500">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase">Saldo Insuficiente</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative group">
                          <div className="p-2 bg-blue-50 border border-blue-100 rounded-sm flex items-center justify-between">
                            <DollarSign className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                            <input
                              type="text"
                              placeholder="0,00"
                              value={valorPagamento}
                              onChange={(e) => setValorPagamento(e.target.value)}
                              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={salvandoPagamento || (metodoPagamento === 'SALDO' && Math.round(Number(valorPagamento.replace(',', '.')) * 100) > Math.round(inscricaoParaPagar.pessoa.saldo * 100))}
                        className="w-full py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {salvandoPagamento && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirmar Pagamento
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Desistência */}
      {modalDesistenciaAberto && inscricaoParaDesistencia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-rose-600 uppercase tracking-tight">Registrar Desistência</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {inscricaoParaDesistencia.pessoa.nome} - {inscricaoParaDesistencia.evento.nome}
                </p>
              </div>
              <button onClick={() => setModalDesistenciaAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={confirmarDesistencia} className="p-10 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Como tratar o valor pago?</label>
                <div className="flex flex-col gap-3">
                  <label className={`flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-all ${opcaoDesistencia === 'SALDO' ? 'border-[#1351b4] bg-[#1351b4]/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="opcaoDesistencia" value="SALDO" checked={opcaoDesistencia === 'SALDO'} onChange={() => setOpcaoDesistencia('SALDO')} className="text-[#1351b4] focus:ring-[#1351b4] w-4 h-4" />
                    <div>
                      <div className="text-sm font-black text-slate-700 uppercase tracking-tight">Converter em Saldo (Crédito)</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">O valor ficará disponível no sistema para ser usado no futuro.</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-all ${opcaoDesistencia === 'CAIXA' ? 'border-rose-600 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="opcaoDesistencia" value="CAIXA" checked={opcaoDesistencia === 'CAIXA'} onChange={() => setOpcaoDesistencia('CAIXA')} className="text-rose-600 focus:ring-rose-600 w-4 h-4" />
                    <div>
                      <div className="text-sm font-black text-slate-700 uppercase tracking-tight">Devolução Física em Dinheiro</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">O valor será retirado do caixa físico e devolvido em mãos.</div>
                    </div>
                  </label>
                </div>
              </div>

              {opcaoDesistencia === 'SALDO' && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Para quem vai o crédito?</label>
                  <select
                    value={targetPessoaId}
                    onChange={(e) => setTargetPessoaId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm font-black text-slate-700 focus:outline-none focus:border-[#1351b4]"
                  >
                    <option value="">Apenas para a própria pessoa ({inscricaoParaDesistencia.pessoa.nome})</option>
                    {pessoas.filter(p => p.id !== inscricaoParaDesistencia.pessoaId).map(p => (
                      <option key={p.id} value={p.id}>Transferir para: {p.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setModalDesistenciaAberto(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors rounded-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoDesistencia} className="flex items-center justify-center gap-2 px-8 py-3 bg-rose-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md disabled:opacity-50">
                  {salvandoDesistencia ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar Desistência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {modalVisualizacaoAberto && inscricaoParaVisualizar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-[#1b2b41] uppercase tracking-tight">Visualizar Dados Cadastrais</h2>
                {/* <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Código: {inscricaoParaVisualizar.pessoa.id.toString().padStart(3, '0')}
                </p> */}
              </div>
              <button onClick={() => setModalVisualizacaoAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Header Profile */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 rounded bg-slate-100 flex items-center justify-center text-[#1351b4] text-xl font-black shrink-0">
                  {inscricaoParaVisualizar.pessoa.id.toString().padStart(3, '0')}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{inscricaoParaVisualizar.pessoa.nome}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">{inscricaoParaVisualizar.pessoa.email || 'Sem e-mail'}</p>
                </div>
              </div>

              {/* Seção: Dados Pessoais */}
              <div>
                <h4 className="text-[11px] font-black text-[#1351b4] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Dados Pessoais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-100">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Documento (CPF)</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.documento || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">RG / Órgão Emissor</span>
                    <span className="text-sm font-bold text-slate-700">
                      {inscricaoParaVisualizar.pessoa.rg || 'Não informado'} {inscricaoParaVisualizar.pessoa.orgaoEmissor ? `/ ${inscricaoParaVisualizar.pessoa.orgaoEmissor}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data de Nascimento</span>
                    <span className="text-sm font-bold text-slate-700">
                      {inscricaoParaVisualizar.pessoa.dataNascimento ? formatarData(inscricaoParaVisualizar.pessoa.dataNascimento) : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sexo</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.sexo || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Telefone</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.telefone || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Grupo / Comunidade</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.comunidade || 'Sem Grupo Vinculado'}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Perfis de Atuação</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {inscricaoParaVisualizar.pessoa.perfis && inscricaoParaVisualizar.pessoa.perfis.length > 0 ? (
                        inscricaoParaVisualizar.pessoa.perfis.map((perfil: string) => (
                          <span key={perfil} className="px-2.5 py-1 bg-[#1351b4]/5 text-[#1351b4] rounded-sm text-[9px] font-black uppercase tracking-widest border border-[#1351b4]/10">
                            {perfil}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm font-bold text-slate-500 italic">Nenhum perfil vinculado</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Logística e Viagem */}
              <div>
                <h4 className="text-[11px] font-black text-[#1351b4] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Informações de Viagem e Logística
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-100">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Passaporte</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.passaporte || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Emissão / Validade Passaporte</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.passaporteEmissaoValidade || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vai com Cônjuge?</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.vaiComConjuge ? 'Sim' : 'Não'}</span>
                  </div>
                  {inscricaoParaVisualizar.pessoa.vaiComConjuge && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Cônjuge</span>
                      <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.nomeConjuge || 'Não informado'}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tamanho da Camiseta</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.camiseta || 'Não informado'}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Necessidades Médicas / Alergias</span>
                    <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.necessidadesMedicas || 'Nenhuma informada'}</span>
                  </div>
                </div>
              </div>

              {/* Seção: Responsáveis (Apenas se preenchido) */}
              {(inscricaoParaVisualizar.pessoa.responsavelLegal || inscricaoParaVisualizar.pessoa.emailResponsavel || inscricaoParaVisualizar.pessoa.emailResponsavel2) && (
                <div>
                  <h4 className="text-[11px] font-black text-[#1351b4] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Dados de Responsáveis
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-100">
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Responsável Legal</span>
                      <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.responsavelLegal || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">E-mail do Responsável</span>
                      <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.emailResponsavel || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">E-mail do Responsável (Opcional)</span>
                      <span className="text-sm font-bold text-slate-700">{inscricaoParaVisualizar.pessoa.emailResponsavel2 || 'Não informado'}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setModalVisualizacaoAberto(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-sm text-xs font-bold hover:bg-slate-50 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
