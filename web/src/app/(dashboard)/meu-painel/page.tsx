'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import Cookies from 'js-cookie';
import {
  Loader2,
  User,
  Mail,
  Phone,
  Fingerprint,
  Edit,
  MapPin,
  Church,
  CalendarDays,
  DollarSign,
  Wallet,
  ArrowRightLeft,
  UserCheck,
  Ticket,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  Plus,
  ArrowRight,
  CheckCircle2,
  Trophy,
  ChevronDown,
  History,
  X,
  Bell
} from 'lucide-react';

export default function MeuPainelPage() {
  const [perfil, setPerfil] = useState<any>(null);
  const [eventosDisponiveis, setEventosDisponiveis] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Form de edição de perfil
  const [modalAberto, setModalAberto] = useState(false);
  const [dadosForm, setDadosForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    dataNascimento: '',
    sexo: '',
    rg: '',
    orgaoEmissor: '',
    emailResponsavel: '',
    emailResponsavel2: '',
    comunidade: '',
    passaporte: '',
    passaporteEmissaoValidade: '',
    camiseta: '',
    vaiComConjuge: false,
    nomeConjuge: '',
    necessidadesMedicas: '',
    responsavelLegal: '',
    fotoPassaporte: '',
    perfis: [] as string[]
  });
  const [arquivoPassaporte, setArquivoPassaporte] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Modal de Extrato e Pagamentos
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false);
  const [modalPagamentosInscAberto, setModalPagamentosInscAberto] = useState(false);
  const [inscricaoSelecionada, setInscricaoSelecionada] = useState<any>(null);
  const [inscrevendo, setInscrevendo] = useState(false);
  const [eventoParaInscrever, setEventoParaInscrever] = useState<any>(null);
  const [modalInscricaoAberto, setModalInscricaoAberto] = useState(false);
  const [modalInfoEventoAberto, setModalInfoEventoAberto] = useState(false);
  const [eventoInfoSelecionado, setEventoInfoSelecionado] = useState<any>(null);
  const [intencaoPagamento, setIntencaoPagamento] = useState('');
  const [comunidadeInscricao, setComunidadeInscricao] = useState('');

  useEffect(() => {
    buscarDados();
  }, []);

  const buscarDados = async () => {
    try {
      const [perfilRes, eventosRes] = await Promise.all([
        api.get('/pessoas/perfil/me'),
        api.get('/eventos/ativos')
      ]);
      setPerfil(perfilRes.data);

      // Filtrar eventos ativos e que o usuário ainda não está inscrito
      const inscritosIds = perfilRes.data.inscricoes.map((i: any) => i.eventoId);
      const disponiveis = eventosRes.data.filter((e: any) =>
        e.status === 'ATIVO' &&
        new Date() <= new Date(e.limiteInscricao) &&
        !inscritosIds.includes(e.id)
      );
      setEventosDisponiveis(disponiveis);

    } catch (err: any) {
      if (err.response?.status === 404) {
        setErro('Perfil pessoal não localizado. Caso você seja um administrador sem cadastro de membro, este painel não exibirá dados.');
      } else {
        setErro('Erro ao carregar os dados do perfil.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalPerfil = () => {
    if (perfil) {
      setDadosForm({
        nome: perfil.nome,
        email: perfil.email || '',
        telefone: perfil.telefone || '',
        documento: perfil.documento || '',
        dataNascimento: perfil.dataNascimento ? new Date(perfil.dataNascimento).toISOString().split('T')[0] : '',
        sexo: perfil.sexo || '',
        rg: perfil.rg || '',
        orgaoEmissor: perfil.orgaoEmissor || '',
        emailResponsavel: perfil.emailResponsavel || '',
        emailResponsavel2: perfil.emailResponsavel2 || '',
        comunidade: perfil.comunidade || '',
        passaporte: perfil.passaporte || '',
        passaporteEmissaoValidade: perfil.passaporteEmissaoValidade || '',
        camiseta: perfil.camiseta || '',
        vaiComConjuge: perfil.vaiComConjuge || false,
        nomeConjuge: perfil.nomeConjuge || '',
        necessidadesMedicas: perfil.necessidadesMedicas || '',
        responsavelLegal: perfil.responsavelLegal || '',
        fotoPassaporte: perfil.fotoPassaporte || '',
        perfis: Array.from(new Set(
          (Array.isArray(perfil.perfis) ? perfil.perfis : (typeof perfil.perfis === 'string' ? JSON.parse(perfil.perfis) : []))
            .flatMap((p: any) => {
              try {
                return typeof p === 'string' && p.startsWith('[') ? JSON.parse(p) : p;
              } catch {
                return p;
              }
            })
            .filter(Boolean)
        )) as string[]
      });
      setArquivoPassaporte(null);
      setModalAberto(true);
    }
  };

  const confirmarEnvioPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      let urlFoto = dadosForm.fotoPassaporte;
      if (arquivoPassaporte) {
        urlFoto = await uploadFile(arquivoPassaporte, 'passaportes', 'pessoas');
      }

      await api.patch(`/pessoas/${perfil.id}`, { ...dadosForm, fotoPassaporte: urlFoto });
      setModalAberto(false);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert('Erro ao atualizar perfil: ' + (Array.isArray(msg) ? msg.join(', ') : msg || err.message));
    } finally {
      setEnviando(false);
      setArquivoPassaporte(null);
    }
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('A foto deve ter no máximo 10MB.');
      return;
    }

    setArquivoPassaporte(file);
    setDadosForm({ ...dadosForm, fotoPassaporte: URL.createObjectURL(file) });
  };

  const abrirModalInscricao = (evento: any) => {
    if (!evento || inscrevendo) return;
    setEventoParaInscrever(evento);
    setIntencaoPagamento('');
    setComunidadeInscricao(perfil.comunidade || '');
    setModalInscricaoAberto(true);
  };

  const confirmarInscricao = async () => {
    if (!eventoParaInscrever || inscrevendo) return;

    if (!comunidadeInscricao) {
      alert('Por favor, selecione uma comunidade antes de prosseguir.');
      return;
    }

    setInscrevendo(true);
    try {
      if (comunidadeInscricao !== perfil.comunidade) {
        await api.patch(`/pessoas/${perfil.id}`, { comunidade: comunidadeInscricao });
      }

      await api.post('/inscricoes', {
        pessoaId: perfil.id,
        eventoId: eventoParaInscrever.id,
        intencaoPagamento
      });
      buscarDados();
      setModalInscricaoAberto(false);
      alert('Solicitação de inscrição enviada! Aguarde a confirmação do administrador.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao realizar inscrição.');
    } finally {
      setInscrevendo(false);
      setEventoParaInscrever(null);
    }
  };
  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatarData = (isoString: string) => {
    if (!isoString) return '';
    const [year, month, day] = isoString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  if (carregando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#1351b4] animate-spin" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-8">
        <div className="bg-white border border-rose-200 rounded-sm p-6 shadow-sm flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <div>
            <h2 className="text-rose-700 font-black text-lg">Atenção</h2>
            <p className="text-slate-600 text-sm mt-1">{erro}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!perfil) return null;

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">

      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2 sm:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1351b4] uppercase tracking-tight">Meu Painel Pessoal</h1>
          <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">Visão geral da sua conta e atividades</p>
        </div>
      </div>

      {/* SEÇÃO 1: PERFIL E SALDO (HORIZONTAL) */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-3 sm:p-5 relative overflow-hidden">

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-8">

          {/* Avatar e Nome */}
          <div className="flex flex-col lg:w-1/3 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 rounded-sm bg-slate-50 flex items-center justify-center text-[#90a1b9] text-xs font-black border border-slate-200 group-hover:scale-110 group-hover:bg-[#1351b4] group-hover:text-white transition-all">
                {perfil?.id?.toString().padStart(3, '0')}
              </div>
              <div className="flex flex-col">
                <h2 className="w-full font-black uppercase tracking-tight leading-tight">{perfil.nome}</h2>
                {perfil?.perfis && perfil.perfis.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {Array.from(new Set(
                      (Array.isArray(perfil.perfis) ? perfil.perfis : [perfil.perfis])
                        .flatMap((p: any) => {
                          try {
                            return typeof p === 'string' && p.startsWith('[') ? JSON.parse(p) : p;
                          } catch {
                            return p;
                          }
                        })
                        .filter(Boolean)
                    )).join(' • ')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={abrirModalPerfil}
              className="py-2 px-3 w-full flex items-center justify-center gap-2 bg-[#1351b4]/10 text-[#1351b4] hover:bg-[#1351b4] hover:text-white border border-[#1351b4]/10 rounded-sm transition-all shadow-sm group/hist"
            >
              <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Editar minhas informações
            </button>
          </div>

          {/* Divisor Vertical */}
          <div className="hidden lg:block w-px h-16 bg-slate-100" />

          {/* Dados de Contato */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 shrink-0 rounded-sm bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-[#1351b4] transition-colors border border-slate-100">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">E-mail de Contato</span>
                <span className="text-xs font-bold text-slate-600 truncate">{perfil.email || 'Não informado'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 shrink-0 rounded-sm bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-[#1351b4] transition-colors border border-slate-100">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">WhatsApp / Celular</span>
                <span className="text-xs font-bold text-slate-600 truncate">{perfil.telefone || 'Não informado'}</span>
              </div>
            </div>
          </div>

          {/* Divisor Vertical */}
          <div className="hidden lg:block w-px h-16 bg-slate-100" />

          {/* Card de Saldo Integrado com Botão de Extrato */}
          <div className="lg:w-1/3 bg-blue-50/50 border border-blue-100 p-4 rounded-sm relative overflow-hidden flex flex-col justify-center min-h-[90px] shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#1351b4]/5 rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-[#1351b4]" />
                <span className="text-[10px] font-black text-[#1351b4]/60 uppercase tracking-widest">Créditos Disponíveis</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black tracking-tighter text-[#1351b4]">
                    {formatarMoeda(perfil.saldo || 0)}
                  </span>
                  <button
                    onClick={() => setModalExtratoAberto(true)}
                    title="Ver Extrato Detalhado"
                    className="p-1 border border-blue-100 bg-[#1351b4]/10 text-[#1351b4] rounded-sm flex items-center justify-center transition-all hover:bg-[#1351b4] hover:text-white shadow-sm group/extrato"
                  >
                    <Wallet className="w-4 h-4 group-hover/extrato:rotate-[-45deg] transition-transform" />
                  </button>
                </div>
                <TrendingUp className="w-6 h-6 text-emerald-500 opacity-20" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SEÇÃO 2: INSCRIÇÕES E EVENTOS (HORIZONTAL) */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-3 sm:p-5 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1351b4] shadow-sm">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Minhas Atividades</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eventos e inscrições vinculadas</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Eventos Inscritos */}
          {perfil.inscricoes && perfil.inscricoes
            .filter((insc: any) => {
              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              const dataFim = new Date(insc.evento.dataFim);
              return dataFim >= hoje && insc.evento.status === 'ATIVO';
            })
            .map((insc: any) => {
              const totalPago = insc.pagamentos?.reduce((acc: number, p: any) => acc + p.valor, 0) || 0;

              return (
                <div key={insc.id} className="bg-slate-50 border border-slate-200 rounded-sm p-4 hover:border-[#1351b4] transition-all group relative">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      {/* <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[#1351b4] shadow-sm">
                        <Trophy className="w-5 h-5" />
                      </div> */}
                      <button
                        onClick={() => { setEventoInfoSelecionado(insc.evento); setModalInfoEventoAberto(true); }}
                        className="w-10 h-10 rounded-lg bg-white border border-blue-100 hover:bg-amber-50 transition-colors flex items-center justify-center text-amber-500 shadow-sm relative overflow-hidden group/bell"
                        title="Informações do Pacote"
                      >
                        <Bell className="w-5 h-5 group-hover/bell:animate-bounce" />
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${insc.status === 'CONFIRMADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          insc.status === 'EM_ANALISE' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                            insc.status === 'CANCELADO' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                          {insc.status === 'CONFIRMADO' ? 'Confirmado' :
                            insc.status === 'EM_ANALISE' ? 'Em Análise' :
                              insc.status === 'CANCELADO' ? 'Cancelado' :
                                'Aguardando Confirmação'}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-black text-slate-700 text-xs uppercase tracking-tight truncate">{insc.evento.nome}</h4>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[11px] text-slate-500 font-bold">
                        Data: {formatarData(insc.evento.dataInicio)} até {formatarData(insc.evento.dataFim)}
                      </span>
                      {insc.status === 'CONFIRMADO' && (
                        <div className="flex items-center justify-end mt-2 pt-2 border-t border-slate-200/50">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Valor Pago</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black text-emerald-600">{formatarMoeda(totalPago)}</span>
                              <button
                                onClick={() => {
                                  setInscricaoSelecionada(insc);
                                  setModalPagamentosInscAberto(true);
                                }}
                                className="p-1.5 bg-[#1351b4]/10 text-[#1351b4] hover:bg-[#1351b4] hover:text-white border border-[#1351b4]/10 rounded-sm transition-all shadow-sm group/hist"
                                title="Ver histórico de pagamentos"
                              >
                                <Wallet className="w-3 h-3 group-hover/hist:rotate-[-45deg] transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Eventos Disponíveis (Para Inscrição) */}
          {eventosDisponiveis.map((evento: any) => (
            <div key={evento.id} className="bg-blue-50/30 border border-blue-100 rounded-sm p-4 hover:border-[#1351b4] transition-all group relative flex flex-col justify-between">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {/* <div className="w-10 h-10 rounded-lg bg-white border border-blue-100 flex items-center justify-center text-[#1351b4] shadow-sm">
                      <Plus className="w-5 h-5" />
                    </div> */}
                    <button
                      onClick={() => { setEventoInfoSelecionado(evento); setModalInfoEventoAberto(true); }}
                      className="w-10 h-10 rounded-lg bg-white border border-blue-100 hover:bg-amber-50 transition-colors flex items-center justify-center text-amber-500 shadow-sm relative overflow-hidden group/bell"
                      title="Informações do Pacote"
                    >
                      <Bell className="w-5 h-5 group-hover/bell:animate-bounce" />
                    </button>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100 shadow-sm">
                    Disponível
                  </span>
                </div>
                <h4 className="font-black text-slate-700 text-xs uppercase tracking-tight truncate">{evento.nome}</h4>
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] text-slate-500 font-bold">
                    Data: {formatarData(evento.dataInicio)} até {formatarData(evento.dataFim)}
                  </span>
                  {/* <span className="text-[11px] text-amber-600 font-bold">
                    Inscrições até: {formatarData(evento.limiteInscricao)}
                  </span> */}
                  {/* <span className="text-base font-black text-emerald-600 mt-1">
                    {formatarMoeda(evento.valor)}
                  </span> */}
                </div>
              </div>
              <button
                disabled={inscrevendo}
                onClick={() => abrirModalInscricao(evento)}
                className="mt-4 w-full py-2 bg-[#1351b4] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-md disabled:opacity-50"
              >
                {inscrevendo && eventoParaInscrever?.id === evento.id ? 'Processando...' : 'Inscreva-se Agora'}
              </button>
            </div>
          ))}

          {(!perfil.inscricoes || perfil.inscricoes.length === 0) && eventosDisponiveis.length === 0 && (
            <div className="col-span-full py-10 border-2 border-dashed border-slate-100 rounded-sm flex flex-col items-center justify-center opacity-40">
              <Ticket className="w-10 h-10 text-slate-300 mb-2" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma atividade localizada</span>
            </div>
          )}
        </div>
      </div>

      {modalExtratoAberto && (() => {
        const totalEntradas = (perfil.transacoes || [])
          .filter((t: any) => t.tipo === 'RECEITA')
          .reduce((acc: number, t: any) => acc + t.valor, 0) || 0;
        const totalSaidas = (perfil.transacoes || [])
          .filter((t: any) => t.tipo === 'DESPESA')
          .reduce((acc: number, t: any) => acc + t.valor, 0) || 0;

        const transacoesFormatadas = (perfil.transacoes || [])
          .map((t: any) => ({
            id: t.id,
            data: t.data,
            descricao: t.descricao,
            valor: t.valor,
            tipo: t.tipo,
            nomeEvento: t.evento?.nome || ''
          }));

        const itensCombinados = [...transacoesFormatadas].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        );

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

              <div className="px-5 sm:px-10 py-6 sm:py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm bg-[#1351b4] text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">Histórico Financeiro</h2>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Extrato detalhado</p>
                  </div>
                </div>
                <button onClick={() => setModalExtratoAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 sm:p-8 pb-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                    {/* Resumo Financeiro */}
                    <div className="p-5 bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Resumo Financeiro</h4>
                      <div className="flex flex-col gap-3 flex-1 justify-center">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entradas</span>
                          <span className="text-xs font-black text-emerald-600">{formatarMoeda(totalEntradas)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Saídas</span>
                          <span className="text-xs font-black text-rose-500">{formatarMoeda(totalSaidas)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-1 mt-auto">
                          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Saldo Atual</span>
                          <span className="text-xl font-black text-[#1351b4] leading-none">{formatarMoeda(perfil.saldo || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento de saldos por evento */}
                    {perfil.saldos && perfil.saldos.length > 0 && (
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-sm flex flex-col">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Saldos por Evento</h4>
                        <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[140px]">
                          {perfil.saldos.map((s: any) => (
                            <div key={s.eventoId} className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-sm shadow-sm">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate max-w-[180px]">{s.nomeEvento}</span>
                              <span className={`text-[11px] font-black ${s.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatarMoeda(s.saldo)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden lg:block w-full">
                  <table className="w-full text-sm text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Data</th>
                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Descrição</th>
                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensCombinados.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-10 py-32 text-center text-slate-300">
                            <div className="flex flex-col items-center gap-4 opacity-20">
                              <Info className="w-16 h-16" />
                              <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhum registro localizado</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        itensCombinados.map((item: any, itemIdx: number) => {
                          const isReceita = item.tipo === 'RECEITA';
                          const isDespesa = item.tipo === 'DESPESA';
                          const valorColor = isReceita ? 'text-emerald-600' : isDespesa ? 'text-rose-600' : 'text-slate-600';
                          const bgIconColor = isReceita
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : isDespesa
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : 'bg-slate-50 text-slate-600 border-slate-100';
                          const sinal = isReceita ? '+' : isDespesa ? '-' : '';
                          const Icon = isReceita ? ArrowUpCircle : isDespesa ? ArrowDownCircle : RefreshCw;

                          return (
                            <tr key={`${item.id}-${itemIdx}`} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{formatarData(item.data)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 w-full">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform ${bgIconColor}`}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-black text-slate-700 text-xs uppercase tracking-tight">{item.descricao}</span>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 font-black">
                                      {item.tipo} {item.nomeEvento && ` • ${item.nomeEvento}`}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-3 py-2 font-black text-sm text-right whitespace-nowrap ${valorColor}`}>
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-xs opacity-50">{sinal}</span>
                                  {formatarMoeda(item.valor)}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                  {itensCombinados.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 flex flex-col items-center gap-4 opacity-40">
                      <Info className="w-12 h-12" />
                      <span className="font-black uppercase tracking-widest text-[10px]">Nenhum registro</span>
                    </div>
                  ) : (
                    itensCombinados.map((item: any, itemIdx: number) => {
                      const isReceita = item.tipo === 'RECEITA';
                      const isDespesa = item.tipo === 'DESPESA';
                      const valorColor = isReceita ? 'text-emerald-600' : isDespesa ? 'text-rose-600' : 'text-slate-600';
                      const bgIconColor = isReceita
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : isDespesa
                          ? 'bg-rose-50 text-rose-600 border-rose-100'
                          : 'bg-slate-50 text-slate-600 border-slate-100';
                      const sinal = isReceita ? '+' : isDespesa ? '-' : '';
                      const Icon = isReceita ? ArrowUpCircle : isDespesa ? ArrowDownCircle : RefreshCw;

                      return (
                        <div key={`mob-trans-${item.id}-${itemIdx}`} className="p-4 flex flex-col gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border shadow-sm ${bgIconColor}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-slate-700 text-xs uppercase tracking-tight line-clamp-2">{item.descricao}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">
                                  {item.tipo} {item.nomeEvento && `• ${item.nomeEvento}`}
                                </span>
                              </div>
                            </div>
                            <div className={`flex flex-col items-end shrink-0 ${valorColor}`}>
                              <div className="flex items-center gap-1 font-black text-sm">
                                <span className="text-[10px] opacity-60">{sinal}</span>
                                {formatarMoeda(item.valor)}
                              </div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight mt-1">{formatarData(item.data)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE HISTÓRICO DE PAGAMENTOS DA INSCRIÇÃO */}
      {modalPagamentosInscAberto && inscricaoSelecionada && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-sm bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Histórico de Pagamento</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{inscricaoSelecionada.evento.nome}</p>
                </div>
              </div>
              <button onClick={() => setModalPagamentosInscAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              <div className="space-y-4">
                {!inscricaoSelecionada.pagamentos || inscricaoSelecionada.pagamentos.length === 0 ? (
                  <div className="py-12 text-center text-slate-300">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhum pagamento registrado</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Data</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Transferência para</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Forma</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inscricaoSelecionada.pagamentos.map((pag: any) => (
                          <tr key={pag.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold text-slate-600">{formatarData(pag.data)}</td>
                            <td className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase">{inscricaoSelecionada.evento.nome}</td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                {pag.metodo || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-emerald-600 text-right">{formatarMoeda(pag.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/50">
                          <td colSpan={2} className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Total Pago</td>
                          <td className="px-6 py-4 text-sm font-black text-[#1351b4] text-right">
                            {formatarMoeda(inscricaoSelecionada.pagamentos.reduce((acc: number, p: any) => acc + p.valor, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setModalPagamentosInscAberto(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Dados */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">Atualizar Perfil</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mantenha seus dados atualizados</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <form onSubmit={confirmarEnvioPerfil} className="space-y-6">

                {/* Grid para os campos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                  {/* Nome Completo */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative group">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        required
                        value={dadosForm.nome}
                        onChange={(e) => setDadosForm({ ...dadosForm, nome: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                      />
                    </div>
                  </div>

                  {/* Nascimento */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nascimento</label>
                    <div className="relative group">
                      <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="date"
                        value={dadosForm.dataNascimento}
                        onChange={(e) => setDadosForm({ ...dadosForm, dataNascimento: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Sexo */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sexo</label>
                    <div className="relative group">
                      <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        value={dadosForm.sexo}
                        onChange={(e) => setDadosForm({ ...dadosForm, sexo: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      >
                        <option value="">Selecione</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* CPF */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <div className="relative group">
                      <Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.documento}
                        onChange={(e) => setDadosForm({ ...dadosForm, documento: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <div className="relative group">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.telefone}
                        onChange={(e) => setDadosForm({ ...dadosForm, telefone: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* RG */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">RG</label>
                    <div className="relative group">
                      <Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.rg}
                        onChange={(e) => setDadosForm({ ...dadosForm, rg: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Orgão Emissor */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Orgão Emissor</label>
                    <div className="relative group">
                      <Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.orgaoEmissor}
                        onChange={(e) => setDadosForm({ ...dadosForm, orgaoEmissor: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="email"
                        value={dadosForm.email}
                        onChange={(e) => setDadosForm({ ...dadosForm, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Email do Responsável */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail do Responsável</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="email"
                        value={dadosForm.emailResponsavel}
                        onChange={(e) => setDadosForm({ ...dadosForm, emailResponsavel: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                        placeholder="E-mail do pai/responsável (preencher se for dependente)"
                      />
                    </div>
                  </div>

                  {/* Email do Responsável 2 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail do Responsável 2</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="email"
                        value={dadosForm.emailResponsavel2}
                        onChange={(e) => setDadosForm({ ...dadosForm, emailResponsavel2: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                        placeholder="E-mail do 2º responsável (opcional)"
                      />
                    </div>
                  </div>

                  {/* Comunidade */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Comunidade</label>
                    <div className="relative group">
                      <Church className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        value={dadosForm.comunidade}
                        onChange={(e) => setDadosForm({ ...dadosForm, comunidade: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                      >
                        <option value="">Selecione uma comunidade...</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={`Comunidade ${num}`}>Comunidade {num}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Passaporte */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Passaporte</label>
                    <div className="relative group">
                      <Fingerprint className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.passaporte}
                        onChange={(e) => setDadosForm({ ...dadosForm, passaporte: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                        placeholder="EX.: AB123456"
                      />
                    </div>
                  </div>

                  {/* Emissão/Validade */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emissão/Validade</label>
                    <div className="relative group">
                      <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.passaporteEmissaoValidade}
                        onChange={(e) => setDadosForm({ ...dadosForm, passaporteEmissaoValidade: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                        placeholder="Ex.: Emitido: 10/01/2020 · Válido até: 10/01/2030"
                      />
                    </div>
                  </div>

                  {/* Camiseta */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Camiseta</label>
                    <div className="relative group">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        value={dadosForm.camiseta}
                        onChange={(e) => setDadosForm({ ...dadosForm, camiseta: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      >
                        <option value="">Selecione</option>
                        <option value="PP">PP</option>
                        <option value="P">P</option>
                        <option value="M">M</option>
                        <option value="G">G</option>
                        <option value="GG">GG</option>
                        <option value="XG">XG</option>
                      </select>
                    </div>
                  </div>

                  {/* Vai com o cônjuge? */}
                  <div className="space-y-2 flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="vaiComConjuge"
                      checked={dadosForm.vaiComConjuge}
                      onChange={(e) => setDadosForm({ ...dadosForm, vaiComConjuge: e.target.checked })}
                      className="w-4 h-4 text-[#1351b4] focus:ring-[#1351b4]/5 border-slate-200 rounded"
                    />
                    <label htmlFor="vaiComConjuge" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vai com o cônjuge?</label>
                  </div>

                  {/* Nome cônjuge */}
                  {dadosForm.vaiComConjuge && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome cônjuge</label>
                      <div className="relative group">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                        <input
                          type="text"
                          value={dadosForm.nomeConjuge}
                          onChange={(e) => setDadosForm({ ...dadosForm, nomeConjuge: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                        />
                      </div>
                    </div>
                  )}

                  {/* Necessidades Médicas */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Necessidades Médicas</label>
                    <div className="relative group">
                      <AlertCircle className="w-4 h-4 absolute left-5 top-5 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <textarea
                        value={dadosForm.necessidadesMedicas}
                        onChange={(e) => setDadosForm({ ...dadosForm, necessidadesMedicas: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 h-24"
                      />
                    </div>
                  </div>

                  {/* Responsável Legal */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Responsável Legal (para menores)</label>
                    <div className="relative group">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.responsavelLegal}
                        onChange={(e) => setDadosForm({ ...dadosForm, responsavelLegal: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                      />
                    </div>
                  </div>

                  {/* Foto do Passaporte */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Foto do Passaporte</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-sm p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors">
                      {dadosForm.fotoPassaporte ? (
                        <div className="flex flex-col items-center">
                          {(() => {
                            const isBase64 = dadosForm.fotoPassaporte.startsWith('data:image');
                            const isPdfBase64 = dadosForm.fotoPassaporte.startsWith('data:application/pdf');
                            const extMatch = dadosForm.fotoPassaporte.match(/\.(jpeg|jpg|gif|png|webp|pdf)($|\?)/i);
                            const isImg = isBase64 || (extMatch && extMatch[1].toLowerCase() !== 'pdf');
                            const isPdfUrl = isPdfBase64 || (extMatch && extMatch[1].toLowerCase() === 'pdf');

                            const fileUrl = dadosForm.fotoPassaporte.startsWith('http') || dadosForm.fotoPassaporte.startsWith('data:')
                              ? dadosForm.fotoPassaporte
                              : `${process.env.NEXT_PUBLIC_API_URL}/arquivos/download?bucket=passaportes&path=${encodeURIComponent(dadosForm.fotoPassaporte)}&token=${Cookies.get('gf_token')}`;

                            return (
                              <>
                                {isImg ? (
                                  <a href={fileUrl} target="_blank" rel="noreferrer" className="block mb-2">
                                    <img src={fileUrl} alt="Passaporte" className="max-h-32 rounded-md object-contain shadow-sm hover:opacity-90 transition-opacity" />
                                  </a>
                                ) : isPdfUrl ? (
                                  <div className="flex items-center gap-2 mb-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-md border border-rose-100">
                                    <span className="text-sm font-bold">PDF Anexado</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold mb-2 break-all text-center text-[#1351b4]">Arquivo Anexado</span>
                                )}
                                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-[#1351b4] hover:underline mb-2">
                                  Ver em nova aba
                                </a>
                              </>
                            );
                          })()}
                          <button type="button" onClick={() => { setDadosForm({ ...dadosForm, fotoPassaporte: '' }); setArquivoPassaporte(null); }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors">
                            Remover arquivo
                          </button>
                        </div>
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-slate-400 mb-2" />
                          <span className="text-xs font-bold text-slate-600 text-center">Nenhuma foto de passaporte cadastrada ainda.</span>

                          <label className="mt-4 px-4 py-2 bg-[#1351b4] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-md cursor-pointer inline-flex items-center justify-center">
                            Enviar foto
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,.pdf"
                              className="hidden"
                              onChange={handleUploadFoto}
                            />
                          </label>
                          <span className="text-[9px] text-slate-400 mt-2">Aceito: JPG, PNG, WEBP ou PDF · Máx. 10 MB.</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Perfil */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Perfil (selecione um ou mais)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-sm border border-slate-200">
                      {[
                        'Casal de apoio', 'Catequista', 'Jovem peregrino(a)', 'Ostiário(a)',
                        'Padre', 'Profissional de saúde', 'Salmista', 'Seminarista', 'Vocacionado(a)'
                      ].map((perf) => (
                        <div key={perf} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`perf-${perf}`}
                            checked={dadosForm.perfis?.some(p => p && p.toLowerCase() === perf.toLowerCase()) || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setDadosForm((prev) => ({
                                ...prev,
                                perfis: checked
                                  ? [...(prev.perfis || []), perf]
                                  : (prev.perfis || []).filter((p) => p && p.toLowerCase() !== perf.toLowerCase())
                              }));
                            }}
                            className="w-4 h-4 text-[#1351b4] focus:ring-[#1351b4]/5 border-slate-200 rounded"
                          />
                          <label htmlFor={`perf-${perf}`} className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{perf}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Botões de Ação */}
                <div className="pt-6 flex items-center justify-end gap-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="px-6 py-3 text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Inscrição e Intenção de Pagamento */}
      {modalInscricaoAberto && eventoParaInscrever && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">Confirma Inscrição?</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{eventoParaInscrever.nome}</p>
              </div>
              <button onClick={() => setModalInscricaoAberto(false)} className="p-1 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Resumo dos Dados */}
              <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-sm">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Seus Dados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">Nome</span>
                    <span className="truncate">{perfil.nome}</span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">E-mail</span>
                    <span className="truncate">{perfil.email || 'Não informado'}</span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">Telefone</span>
                    <span className="truncate">{perfil.telefone || 'Não informado'}</span>
                  </div>
                  <div className="flex flex-col overflow-hidden col-span-1 sm:col-span-2">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Comunidade</span>
                    <select
                      value={comunidadeInscricao}
                      onChange={(e) => setComunidadeInscricao(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-sm text-xs focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4] transition-all text-slate-700 font-bold uppercase appearance-none cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <option key={num} value={`Comunidade ${num}`}>Comunidade {num}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {eventoParaInscrever?.itensInclusos && eventoParaInscrever.itensInclusos.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    O que está incluso:
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600 pl-6 list-disc marker:text-[#1351b4]">
                    {eventoParaInscrever.itensInclusos.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questionário */}
              {/* <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-tight block">
                  Qual será a principal forma de custeio da sua viagem?
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    'Recursos próprios',
                    'Suporte familiar ou de terceiros',
                    'Outra forma / Ainda em planejamento'
                  ].map((opcao) => (
                    <label key={opcao} className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-all ${intencaoPagamento === opcao ? 'border-[#1351b4] bg-[#1351b4]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="intencaoPagamento"
                        value={opcao}
                        checked={intencaoPagamento === opcao}
                        onChange={(e) => setIntencaoPagamento(e.target.value)}
                        className="w-4 h-4 text-[#1351b4] focus:ring-[#1351b4] border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase">{opcao}</span>
                    </label>
                  ))}
                </div>
              </div> */}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalInscricaoAberto(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={inscrevendo || !comunidadeInscricao}
                onClick={confirmarInscricao}
                className="px-5 py-2 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
              >
                {inscrevendo && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirmar Inscrição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informações do Evento */}
      {modalInfoEventoAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#1351b4] flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Informações do Pacote</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{eventoInfoSelecionado?.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setModalInfoEventoAberto(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {eventoInfoSelecionado?.itensInclusos && eventoInfoSelecionado.itensInclusos.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    O que está incluso:
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600 pl-6 list-disc marker:text-[#1351b4]">
                    {eventoInfoSelecionado.itensInclusos.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {eventoInfoSelecionado?.dataIdaEstimada && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ida Estimada</span>
                    <span className="font-bold text-slate-700">{formatarData(eventoInfoSelecionado.dataIdaEstimada)}</span>
                  </div>
                )}
                {eventoInfoSelecionado?.dataRetornoEstimada && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Retorno Estimado</span>
                    <span className="font-bold text-slate-700">{formatarData(eventoInfoSelecionado.dataRetornoEstimada)}</span>
                  </div>
                )}
              </div>

              {/* {eventoInfoSelecionado?.dataLimiteSinal && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <span className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Prazo estabelecido para o sinal</span>
                  <span className="font-bold text-amber-800">{formatarData(eventoInfoSelecionado.dataLimiteSinal)}</span>
                </div>
              )} */}

              <div className="space-y-3 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center pb-3 border-b border-blue-100/50">
                  <span className="text-xs font-bold text-slate-600">Valor estimado por peregrino</span>
                  <span className="font-black text-[#1351b4]">{formatarMoeda(eventoInfoSelecionado?.valor || 0)}</span>
                </div>
                {/* {eventoInfoSelecionado?.valorSinal && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Valor do Sinal:</span>
                    <span className="font-black text-emerald-600">{formatarMoeda(eventoInfoSelecionado.valorSinal)}</span>
                  </div>
                )} */}
                {/* {eventoInfoSelecionado?.dataLimiteSinal && (
                  <div className="mt-2 text-center bg-white py-2 rounded border border-blue-100 text-xs font-bold text-amber-600">
                    Prazo estabelecido para o sinal: <span className="font-black">{formatarData(eventoInfoSelecionado.dataLimiteSinal)}</span>
                  </div>
                )} */}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setModalInfoEventoAberto(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-700 shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
