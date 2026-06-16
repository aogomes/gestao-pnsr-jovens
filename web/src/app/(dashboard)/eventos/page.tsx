'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Plus,
  CalendarDays,
  Banknote,
  Pencil,
  Trash2,
  Loader2,
  Church,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function EventosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [paroquias, setParoquias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Estado do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEdicao, setEventoEdicao] = useState<any>(null);
  const [dadosForm, setDadosForm] = useState({
    nome: '',
    paroquiaId: '',
    contaId: '',
    dataInicio: '',
    dataFim: '',
    valor: 0,
    limiteInscricao: '',
    status: 'ATIVO'
  });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    buscarDados();
  }, []);

  const buscarDados = async () => {
    try {
      const [eventsRes, parishesRes, accountsRes] = await Promise.all([
        api.get('/eventos'),
        api.get('/paroquias'),
        api.get('/contas')
      ]);
      setEventos(eventsRes.data);
      setParoquias(parishesRes.data);
      setContas(accountsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModal = (evento: any = null) => {
    if (evento) {
      setEventoEdicao(evento);
      setDadosForm({
        nome: evento.nome,
        paroquiaId: evento.paroquiaId,
        contaId: evento.contaId?.toString() || '',
        dataInicio: new Date(evento.dataInicio).toISOString().split('T')[0],
        dataFim: new Date(evento.dataFim).toISOString().split('T')[0],
        valor: evento.valor,
        limiteInscricao: new Date(evento.limiteInscricao).toISOString().split('T')[0],
        status: evento.status
      });
    } else {
      setEventoEdicao(null);
      setDadosForm({
        nome: '',
        paroquiaId: paroquias[0]?.id || '',
        contaId: contas[0]?.id || '',
        dataInicio: '',
        dataFim: '',
        valor: 0,
        limiteInscricao: '',
        status: 'ATIVO'
      });
    }
    setModalAberto(true);
  };

  const confirmarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const cargaUtil = {
        ...dadosForm,
        paroquiaId: Number(dadosForm.paroquiaId),
        contaId: Number(dadosForm.contaId),
        valor: Number(dadosForm.valor),
        dataInicio: new Date(dadosForm.dataInicio).toISOString(),
        dataFim: new Date(dadosForm.dataFim).toISOString(),
        limiteInscricao: new Date(dadosForm.limiteInscricao).toISOString(),
      };

      if (eventoEdicao) {
        await api.patch(`/eventos/${eventoEdicao.id}`, cargaUtil);
      } else {
        await api.post('/eventos', cargaUtil);
      }
      setModalAberto(false);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro ao salvar evento: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarExclusao = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    try {
      await api.delete(`/eventos/${id}`);
      buscarDados();
    } catch (err) {
      alert('Erro ao excluir evento.');
    }
  };

  const eventosFiltrados = eventos.filter(e =>
    e.nome.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatarData = (isoString: string) => {
    if (!isoString) return '';
    const [year, month, day] = isoString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const obterCorStatus = (status: string) => {
    switch (status) {
      case 'ATIVO': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'CONCLUIDO': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'CANCELADO': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const traduzirStatus = (status: string) => {
    switch (status) {
      case 'ATIVO': return 'Ativo';
      case 'CONCLUIDO': return 'Concluído';
      case 'CANCELADO': return 'Cancelado';
      default: return status;
    }
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
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Gestão de Eventos</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Controle de encontros, retiros e atividades</p>
        </div>
      </div>

      {/* CONTAINER PRINCIPAL DA TABELA */}
      <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? 's' : ''} encontrado{eventosFiltrados.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            Novo Evento
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#1351b4]">
                <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Evento / Atividade</th>
                <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Comunidade</th>
                <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Conta Vinculada</th>
                <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Período</th>
                <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Investimento</th>
                <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-center">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1351b4]">
              {eventosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <CalendarDays className="w-16 h-16" />
                      <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhum evento encontrado</span>
                    </div>
                  </td>
                </tr>
              ) : (
                eventosFiltrados.map((evento) => (
                  <tr key={evento.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-2 border-b border-slate-100 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-sm bg-slate-50 flex items-center justify-center text-[#1351b4] border border-slate-200 group-hover:scale-110 group-hover:bg-[#1351b4] group-hover:text-white transition-all shadow-sm">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-700 text-xs uppercase tracking-tight">{evento.nome}</span>
                          <span className="text-[10px] text-rose-500 font-bold uppercase mt-1">Limite: {formatarData(evento.limiteInscricao)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                        <Church className="w-3.5 h-3.5 text-[#1351b4]" />
                        <span className="text-slate-500 font-black text-[9px] uppercase tracking-tighter">
                          {evento.paroquia?.nome || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                        <Banknote className="w-3.5 h-3.5 text-[#1351b4]" />
                        <span className="text-slate-500 font-black text-[9px] uppercase tracking-tighter">
                          {evento.conta?.nome || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100 text-sm font-bold text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-slate-600 font-black text-[11px] uppercase">{formatarData(evento.dataInicio)}</span>
                        <span className="text-[9px] text-slate-300 font-bold uppercase">até {formatarData(evento.dataFim)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100 text-sm font-bold text-slate-600">
                      <div className="flex flex-col text-slate-700">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-black text-xs">{formatarMoeda(evento.valor)}</span>
                        </div>
                        <span className="text-[9px] text-slate-300 font-bold uppercase mt-1">Valor Unitário</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100 text-sm font-bold text-slate-600">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${obterCorStatus(evento.status)}`}>
                          {traduzirStatus(evento.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-100 text-sm font-bold text-slate-600">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirModal(evento)}
                          className="w-7 h-7 flex items-center justify-center bg-white text-slate-400 hover:text-[#1351b4] hover:bg-blue-50 transition-all"
                          title="Editar Evento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmarExclusao(evento.id)}
                          className="w-7 h-7 flex items-center justify-center bg-white text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Excluir Evento"
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
      </div>

      {/* MODAL DO EVENTO */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">
                  {eventoEdicao ? 'Atualizar Evento' : 'Novo Evento'}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Atividades e Prazos</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowRight className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={confirmarEnvio} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome do Evento</label>
                <div className="relative group">
                  <CalendarDays className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <input
                    type="text"
                    required
                    value={dadosForm.nome}
                    onChange={(e) => setDadosForm({ ...dadosForm, nome: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                    placeholder="Ex: Encontro de Jovens"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Comunidade Organizadora</label>
                <div className="relative group">
                  <Church className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <select
                    required
                    value={dadosForm.paroquiaId}
                    onChange={(e) => setDadosForm({ ...dadosForm, paroquiaId: e.target.value })}
                    className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="">Selecione uma paróquia</option>
                    {paroquias.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Conta Bancária de Depósitos</label>
                <div className="relative group">
                  <Banknote className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <select
                    required
                    value={dadosForm.contaId}
                    onChange={(e) => setDadosForm({ ...dadosForm, contaId: e.target.value })}
                    className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="">Selecione uma conta bancária</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Unitário (R$)</label>
                  <div className="relative group">
                    <DollarSign className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={dadosForm.valor}
                      onChange={(e) => setDadosForm({ ...dadosForm, valor: Number(e.target.value) })}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-black text-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status do Evento</label>
                  <div className="relative group">
                    <AlertCircle className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <select
                      value={dadosForm.status}
                      onChange={(e) => setDadosForm({ ...dadosForm, status: e.target.value })}
                      className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="CONCLUIDO">Concluído</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                    <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                  <div className="relative group">
                    <Calendar className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <input
                      type="date"
                      required
                      value={dadosForm.dataInicio}
                      onChange={(e) => setDadosForm({ ...dadosForm, dataInicio: e.target.value })}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Fim</label>
                  <div className="relative group">
                    <Calendar className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <input
                      type="date"
                      required
                      value={dadosForm.dataFim}
                      onChange={(e) => setDadosForm({ ...dadosForm, dataFim: e.target.value })}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Limite de Inscrição</label>
                <div className="relative group">
                  <Clock className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="date"
                    required
                    value={dadosForm.limiteInscricao}
                    onChange={(e) => setDadosForm({ ...dadosForm, limiteInscricao: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 transition-all font-black text-slate-700"
                  />
                </div>
              </div>

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
                  Confirmar Evento
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
