'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  X,
  Loader2,
  Calendar,
  DollarSign,
  User as UserIcon,
  Tag,
  Clock,
  Filter,
  Download,
  Activity,
  ArrowRight,
  TrendingUp,
  Info,
  CheckCircle2,
  Banknote
} from 'lucide-react';

export default function TransacoesPage() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroVinculo, setFiltroVinculo] = useState('TODOS');
  const [filtroPessoaId, setFiltroPessoaId] = useState('');
  const [filtroContaId, setFiltroContaId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Estados de Paginação
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalTransacoes, setTotalTransacoes] = useState(0);

  // Estado do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [dadosForm, setDadosForm] = useState({
    tipo: 'RECEITA',
    origem: 'DEPOSITO',
    descricao: '',
    valor: '',
    vinculoTipo: 'PESSOA' as 'PESSOA' | 'CONTA',
    pessoaId: '',
    contaId: '',
    metodo: '',
    data: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    buscarFiltros();
  }, []);

  useEffect(() => {
    buscarTransacoes();
  }, [pagina, filtroTipo, filtroVinculo, filtroPessoaId, filtroContaId, dataInicio, dataFim]);

  const buscarFiltros = async () => {
    try {
      const [pessoasRes, contasRes] = await Promise.all([
        api.get('/pessoas'),
        api.get('/contas')
      ]);
      setPessoas(pessoasRes.data);
      setContas(contasRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const buscarTransacoes = async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        page: pagina.toString(),
        limit: '50'
      });
      if (filtroTipo !== 'Todos') params.append('tipo', filtroTipo);
      if (filtroVinculo !== 'TODOS') params.append('vinculo', filtroVinculo);
      if (filtroPessoaId) params.append('pessoaId', filtroPessoaId);
      if (filtroContaId) params.append('contaId', filtroContaId);
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);

      const res = await api.get(`/transacoes/paginada?${params.toString()}`);
      setTransacoes(res.data.data);
      setTotalPaginas(res.data.totalPages || 1);
      setTotalTransacoes(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const buscarDados = () => {
    buscarFiltros();
    buscarTransacoes();
  };

  const confirmarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const cargaUtil = {
        tipo: dadosForm.tipo,
        origem: dadosForm.origem || null,
        descricao: dadosForm.descricao,
        valor: parseFloat(dadosForm.valor),
        pessoaId: dadosForm.vinculoTipo === 'PESSOA' && dadosForm.pessoaId ? Number(dadosForm.pessoaId) : null,
        contaId: dadosForm.vinculoTipo === 'CONTA' && dadosForm.contaId ? Number(dadosForm.contaId) : null,
        data: dadosForm.data,
        metodo: dadosForm.metodo || null
      };

      if (dadosForm.vinculoTipo === 'PESSOA' && !cargaUtil.pessoaId) {
        alert('Por favor, selecione uma pessoa.');
        setEnviando(false);
        return;
      }
      if (dadosForm.vinculoTipo === 'CONTA' && !cargaUtil.contaId) {
        alert('Por favor, selecione uma conta.');
        setEnviando(false);
        return;
      }

      await api.post('/transacoes', cargaUtil);
      setModalAberto(false);
      setDadosForm({
        tipo: 'RECEITA',
        origem: 'DEPOSITO',
        descricao: '',
        valor: '',
        vinculoTipo: 'PESSOA',
        pessoaId: '',
        contaId: '',
        metodo: '',
        data: new Date().toISOString().split('T')[0]
      });
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao registrar transação.';
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarExclusao = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await api.delete(`/transacoes/${id}`);
      buscarTransacoes();
    } catch (err) {
      alert('Erro ao excluir transação.');
    }
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const transacoesFiltradas = transacoes;

  const obterIconeTransacao = (tipo: string) => {
    if (tipo === 'RECEITA') return <ArrowUpRight className="w-4 h-4" />;
    if (tipo === 'DESPESA') return <ArrowDownRight className="w-4 h-4" />;
    return <ArrowRightLeft className="w-4 h-4" />;
  };

  const obterCorTransacao = (tipo: string) => {
    if (tipo === 'RECEITA') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (tipo === 'DESPESA') return 'text-rose-600 bg-rose-50 border-rose-100';
    return 'text-sky-600 bg-sky-50 border-sky-100';
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

      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Fluxo de Movimentações</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Lançamentos analíticos e auditoria financeira</p>
        </div>
      </div>

      {/* SEÇÃO DE FILTROS */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto custom-scrollbar no-scrollbar">
            {['Todos', 'Receitas', 'Despesas'].map(f => (
              <button
                key={f}
                onClick={() => { setFiltroTipo(f); setPagina(1); }}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm border whitespace-nowrap ${filtroTipo === f
                  ? 'bg-[#1351b4] text-white border-[#1351b4] shadow-md'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-[#1351b4] hover:text-[#1351b4]'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 w-full lg:w-auto shrink-0">
            <div className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-2.5 bg-slate-50 border border-slate-100 rounded-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditoria Ativa</span>
            </div>
            <div className="flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-sm text-[10px] font-black border border-emerald-100">
              {totalTransacoes} MOVIMENTAÇÕES
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          {/* Filtro Vínculo */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vínculo</label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <select
                  value={filtroVinculo}
                  onChange={(e) => {
                    setFiltroVinculo(e.target.value);
                    setFiltroPessoaId('');
                    setFiltroContaId('');
                    setPagina(1);
                  }}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#1351b4] text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="TODOS">Todos os Vínculos</option>
                  <option value="PESSOA">Pessoas</option>
                  <option value="CONTA">Contas</option>
                  <option value="GERAL">Sem Vínculo (Geral)</option>
                </select>
                <ChevronDownIcon className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Seletor de Pessoa Específica */}
              {filtroVinculo === 'PESSOA' && (
                <div className="relative animate-in slide-in-from-top-2 duration-200">
                  <select
                    value={filtroPessoaId}
                    onChange={(e) => { setFiltroPessoaId(e.target.value); setPagina(1); }}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-[#1351b4]/30 rounded-sm text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#1351b4] text-[#1351b4] appearance-none cursor-pointer shadow-sm font-semibold"
                  >
                    <option value="">Todas as Pessoas</option>
                    {pessoas.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#1351b4] pointer-events-none" />
                </div>
              )}

              {/* Seletor de Conta Específica */}
              {filtroVinculo === 'CONTA' && (
                <div className="relative animate-in slide-in-from-top-2 duration-200">
                  <select
                    value={filtroContaId}
                    onChange={(e) => { setFiltroContaId(e.target.value); setPagina(1); }}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-[#1351b4]/30 rounded-sm text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#1351b4] text-[#1351b4] appearance-none cursor-pointer shadow-sm font-semibold"
                  >
                    <option value="">Todas as Contas</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#1351b4] pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Data Início */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">De (Data Inicial)</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setPagina(1); }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-black focus:outline-none focus:border-[#1351b4] text-slate-700"
            />
          </div>

          {/* Data Fim */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Até (Data Final)</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setPagina(1); }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-black focus:outline-none focus:border-[#1351b4] text-slate-700"
              />
              {(filtroVinculo !== 'TODOS' || filtroPessoaId || filtroContaId || dataInicio || dataFim) && (
                <button
                  onClick={() => {
                    setFiltroVinculo('TODOS');
                    setFiltroPessoaId('');
                    setFiltroContaId('');
                    setDataInicio('');
                    setDataFim('');
                    setPagina(1);
                  }}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-sm transition-colors text-[9px] font-black uppercase tracking-widest flex items-center justify-center shrink-0 border border-slate-200 animate-in fade-in"
                  title="Limpar Filtros"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTAINER PRINCIPAL DA TABELA */}
      <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{totalTransacoes} movimentação{totalTransacoes !== 1 ? 'ões' : ''}</span>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            Novo Lançamento
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#1351b4]">
                <th className="pl-6 pr-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] text-center w-24">Tipo</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Descrição Analítica</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Vínculo</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Data</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] text-right">Valor Líquido</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <ArrowRightLeft className="w-16 h-16" />
                      <span className="font-black uppercase tracking-[0.2em] text-xs">Sem movimentações registradas</span>
                    </div>
                  </td>
                </tr>
              ) : (
                transacoesFiltradas.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="pl-6 pr-2 py-1 border-b border-slate-100">
                      <div className="flex justify-center">
                        <div className={`w-8 h-8 rounded-sm flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform ${obterCorTransacao(tx.tipo)}`}>
                          {obterIconeTransacao(tx.tipo)}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1 border-b border-slate-100">
                      <span className="font-bold text-[12px] text-slate-700 uppercase leading-tight">{tx.descricao}</span>
                    </td>
                    <td className="px-2 py-1 border-b border-slate-100">
                      {tx.pessoa?.nome ? (
                        <div className="flex items-center gap-3 px-3 py-1 bg-slate-50 border border-slate-200 rounded-sm w-fit group-hover:bg-white transition-colors">
                          <UserIcon className="w-4 h-4 text-[#1351b4]" />
                          <span className="font-black text-slate-600 text-[10px] uppercase tracking-tighter">{tx.pessoa.nome}</span>
                        </div>
                      ) : tx.conta?.nome ? (
                        <div className="flex items-center gap-3 px-3 py-1 bg-slate-50 border border-slate-200 rounded-sm w-fit group-hover:bg-white transition-colors">
                          <Banknote className="w-4 h-4 text-[#1351b4]" />
                          <span className="font-black text-slate-600 text-[10px] uppercase tracking-tighter">{tx.conta.nome}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300 font-black text-[9px] uppercase tracking-widest">
                          <Info className="w-3.5 h-3.5" /> Lançamento Geral
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-bold text-xs uppercase">{new Date(tx.data).toLocaleDateString('pt-BR')}</span>
                    </td>
                    <td className={`px-2 py-1 border-b border-slate-100 text-right font-bold text-[12px] ${tx.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className={`w-4 h-4 ${tx.tipo === 'DESPESA' ? 'rotate-180' : ''}`} />
                        {formatarMoeda(tx.valor)}
                      </div>
                    </td>
                    <td className="px-2 py-1 border-b border-slate-100">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => confirmarExclusao(tx.id)}
                          className="w-7 h-7 flex items-center justify-center bg-white text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {totalPaginas > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina(prev => Math.max(1, prev - 1))}
                disabled={pagina === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-sm text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina(prev => Math.min(totalPaginas, prev + 1))}
                disabled={pagina === totalPaginas}
                className="px-4 py-2 bg-white border border-slate-200 rounded-sm text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE LANÇAMENTO */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">Novo Lançamento</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Auditoria Financeira</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowRight className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={confirmarEnvio} className="p-10 space-y-6">
              <div className="flex gap-2 bg-slate-100 p-2 rounded-sm">
                {[
                  { id: 'RECEITA', label: 'Receita', icon: ArrowUpRight, active: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20', inactive: 'text-slate-400 hover:text-emerald-600' },
                  { id: 'DESPESA', label: 'Despesa', icon: ArrowDownRight, active: 'bg-rose-600 text-white shadow-lg shadow-rose-900/20', inactive: 'text-slate-400 hover:text-rose-600' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDadosForm({
                      ...dadosForm,
                      tipo: t.id,
                      origem: t.id === 'RECEITA' ? 'DEPOSITO' : 'PAGAMENTO'
                    })}
                    className={`flex-1 py-4 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${dadosForm.tipo === t.id ? t.active : t.inactive
                      }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origem / Categoria</label>
                <div className="relative group">
                  <Tag className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <select
                    value={dadosForm.origem}
                    onChange={(e) => setDadosForm({ ...dadosForm, origem: e.target.value })}
                    className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                  >
                    {dadosForm.tipo === 'RECEITA' ? (
                      <>
                        <option value="DEPOSITO">Depósito</option>
                        <option value="RIFA">Rifa</option>
                        <option value="TRABALHO">Trabalho</option>
                      </>
                    ) : (
                      <>
                        <option value="PAGAMENTO">Pagamento</option>
                      </>
                    )}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição do Lançamento</label>
                <div className="relative group">
                  <Activity className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <input
                    type="text"
                    required
                    value={dadosForm.descricao}
                    onChange={(e) => setDadosForm({ ...dadosForm, descricao: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                    placeholder="Ex: Oferta de Comunidade"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor do Título (R$)</label>
                  <div className="relative group">
                    <DollarSign className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={dadosForm.valor}
                      onChange={(e) => setDadosForm({ ...dadosForm, valor: e.target.value })}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-black text-slate-700"
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Efetiva</label>
                  <div className="relative group">
                    <Calendar className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <input
                      type="date"
                      required
                      value={dadosForm.data}
                      onChange={(e) => setDadosForm({ ...dadosForm, data: e.target.value })}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Método de Pagamento (Opcional)</label>
                <div className="relative group">
                  <Tag className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <select
                    value={dadosForm.metodo}
                    onChange={(e) => setDadosForm({ ...dadosForm, metodo: e.target.value })}
                    className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="">Selecione o método...</option>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                  <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Escolha do Tipo de Vínculo: Pessoa ou Conta */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Vínculo</label>
                <div className="flex gap-4 p-1 bg-slate-100 rounded-sm">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-sm cursor-pointer transition-all font-black text-[10px] uppercase border ${dadosForm.vinculoTipo === 'PESSOA'
                    ? 'bg-white text-[#1351b4] border-slate-200 shadow-sm'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'
                    }`}>
                    <input
                      type="radio"
                      name="vinculoTipo"
                      value="PESSOA"
                      checked={dadosForm.vinculoTipo === 'PESSOA'}
                      onChange={() => setDadosForm({ ...dadosForm, vinculoTipo: 'PESSOA' })}
                      className="text-[#1351b4] focus:ring-[#1351b4] h-3.5 w-3.5"
                    />
                    Pessoa
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-sm cursor-pointer transition-all font-black text-[10px] uppercase border ${dadosForm.vinculoTipo === 'CONTA'
                    ? 'bg-white text-[#1351b4] border-slate-200 shadow-sm'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'
                    }`}>
                    <input
                      type="radio"
                      name="vinculoTipo"
                      value="CONTA"
                      checked={dadosForm.vinculoTipo === 'CONTA'}
                      onChange={() => setDadosForm({ ...dadosForm, vinculoTipo: 'CONTA' })}
                      className="text-[#1351b4] focus:ring-[#1351b4] h-3.5 w-3.5"
                    />
                    Conta
                  </label>
                </div>
              </div>

              {/* Combobox Condicional de Pessoa ou Conta */}
              {dadosForm.vinculoTipo === 'PESSOA' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pessoa Vinculada</label>
                  <div className="relative group">
                    <UserIcon className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <select
                      value={dadosForm.pessoaId}
                      onChange={(e) => setDadosForm({ ...dadosForm, pessoaId: e.target.value })}
                      required
                      className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="">Selecione uma pessoa...</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Conta Vinculada</label>
                  <div className="relative group">
                    <Banknote className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <select
                      value={dadosForm.contaId}
                      onChange={(e) => setDadosForm({ ...dadosForm, contaId: e.target.value })}
                      required
                      className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="">Selecione uma conta...</option>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                    <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="pt-8 flex items-center justify-end gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-6 py-3 text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-10 py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
