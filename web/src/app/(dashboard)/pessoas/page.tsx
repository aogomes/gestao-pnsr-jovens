'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import Cookies from 'js-cookie';
import {
  Plus,
  Users,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  UserPlus,
  Fingerprint,
  Phone,
  Download,
  Filter,
  Mail,
  Church,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  User,
  CalendarDays,
  UserCheck,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Clock,
  History,
  Info,
  MoreVertical
} from 'lucide-react';

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  const [paroquias, setParoquias] = useState<any[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [pessoaEdicao, setPessoaEdicao] = useState<any>(null);
  const [dadosForm, setDadosForm] = useState({
    nome: '', email: '', documento: '', telefone: '', paroquiaId: '',
    dataNascimento: '', sexo: '', rg: '', orgaoEmissor: '', emailResponsavel: '',
    emailResponsavel2: '', comunidade: '', passaporte: '', passaporteEmissaoValidade: '',
    fotoPassaporte: '', camiseta: '', vaiComConjuge: false, nomeConjuge: '', necessidadesMedicas: '',
    responsavelLegal: '', perfis: [] as string[]
  });
  const [arquivoPassaporte, setArquivoPassaporte] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Estados do Extrato
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<any>(null);

  // Estados do Extrato Geral
  const [modalExtratoGeralAberto, setModalExtratoGeralAberto] = useState(false);

  // Estados para lançamento de saque rápido
  const [menuAbertoId, setMenuAbertoId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if ((e.target as Element).closest('[data-dropdown]')) return;
      setMenuAbertoId(null);
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  useEffect(() => {
    buscarPessoas();
  }, []);

  const buscarPessoas = async () => {
    try {
      const [resPessoas, resParoquias] = await Promise.all([
        api.get('/pessoas'),
        api.get('/paroquias')
      ]);
      setPessoas(resPessoas.data);
      setParoquias(resParoquias.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModal = (pessoa: any = null) => {
    if (pessoa) {
      setPessoaEdicao(pessoa);
      setDadosForm({
        nome: pessoa.nome,
        email: pessoa.email || '',
        documento: pessoa.documento || '',
        telefone: pessoa.telefone || '',
        paroquiaId: pessoa.paroquiaId || '',
        dataNascimento: pessoa.dataNascimento ? pessoa.dataNascimento.split('T')[0] : '',
        sexo: pessoa.sexo || '',
        rg: pessoa.rg || '',
        orgaoEmissor: pessoa.orgaoEmissor || '',
        emailResponsavel: pessoa.emailResponsavel || '',
        emailResponsavel2: pessoa.emailResponsavel2 || '',
        comunidade: pessoa.comunidade || '',
        passaporte: pessoa.passaporte || '',
        passaporteEmissaoValidade: pessoa.passaporteEmissaoValidade || '',
        fotoPassaporte: pessoa.fotoPassaporte || '',
        camiseta: pessoa.camiseta || '',
        vaiComConjuge: !!pessoa.vaiComConjuge,
        nomeConjuge: pessoa.nomeConjuge || '',
        necessidadesMedicas: pessoa.necessidadesMedicas || '',
        responsavelLegal: pessoa.responsavelLegal || '',
        perfis: pessoa.perfis ? (typeof pessoa.perfis === 'string' ? JSON.parse(pessoa.perfis) : pessoa.perfis) : []
      });
      setArquivoPassaporte(null);
    } else {
      setPessoaEdicao(null);
      setDadosForm({
        nome: '', email: '', documento: '', telefone: '', paroquiaId: paroquias[0]?.id || '',
        dataNascimento: '', sexo: '', rg: '', orgaoEmissor: '', emailResponsavel: '',
        emailResponsavel2: '', comunidade: '', passaporte: '', passaporteEmissaoValidade: '',
        fotoPassaporte: '', camiseta: '', vaiComConjuge: false, nomeConjuge: '', necessidadesMedicas: '',
        responsavelLegal: '', perfis: []
      });
      setArquivoPassaporte(null);
    }
    setModalAberto(true);
  };

  const confirmarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      let urlFoto = dadosForm.fotoPassaporte;

      // Fazer upload se houver arquivo selecionado
      if (arquivoPassaporte) {
        urlFoto = await uploadFile(arquivoPassaporte, 'passaportes', 'pessoas');
      }

      const payload = {
        ...dadosForm,
        fotoPassaporte: urlFoto,
        paroquiaId: Number(dadosForm.paroquiaId)
      };

      if (pessoaEdicao) {
        await api.patch(`/pessoas/${pessoaEdicao.id}`, payload);
      } else {
        await api.post('/pessoas', payload);
      }
      setModalAberto(false);
      buscarPessoas();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro ao salvar pessoa: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarExclusao = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa?')) return;
    try {
      await api.delete(`/pessoas/${id}`);
      buscarPessoas();
    } catch (err) {
      alert('Erro ao excluir pessoa.');
    }
  };

  const pessoasFiltradas = pessoas.filter(p =>
    (p.nome?.toLowerCase().includes(termoBusca.toLowerCase())) ||
    (p.documento && p.documento.includes(termoBusca))
  );

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatarData = (isoString: string) => {
    if (!isoString) return '';
    const [year, month, day] = isoString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const abrirModalExtrato = async (pessoa: any) => {
    setPessoaSelecionada(pessoa);
    setModalExtratoAberto(true);
    try {
      const { data } = await api.get(`/pessoas/${pessoa.id}`);
      setPessoaSelecionada(data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar o extrato do membro.');
    }
  };

  const abrirModalExtratoGeral = () => {
    setModalExtratoGeralAberto(true);
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
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Cadastro de Pessoas</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gerenciamento de base e saldos individuais</p>
        </div>
      </div>

      {/* CONTAINER PRINCIPAL DA TABELA */}
      <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pessoasFiltradas.length} pessoa{pessoasFiltradas.length !== 1 ? 's' : ''} encontrada{pessoasFiltradas.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-sm text-[10px] font-bold text-slate-700 uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4] w-64 shadow-sm"
              />
            </div>
            <button
              onClick={abrirModalExtratoGeral}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4]/10 text-[#1351b4] border border-[#1351b4]/10 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#1351b4]/20 transition-all shadow-sm group"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Extrato Geral
            </button>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Nova Pessoa
            </button>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#1351b4]">
                <th className="pl-6 pr-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] w-[1%] whitespace-nowrap">Código</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Nome</th>
                {/* <th className="hidden md:table-cell px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Paróquia</th> */}
                <th className="hidden md:table-cell px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Documento</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] text-right">Saldo</th>
                <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pessoasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Users className="w-16 h-16" />
                      <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhum registro encontrado</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pessoasFiltradas.map((pessoa) => (
                  <tr key={pessoa.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="pl-6 pr-2 py-1 border-b border-slate-100 w-[1%] whitespace-nowrap">
                      <div className="w-10 h-8 rounded-sm flex items-center justify-center text-sm font-bold text-slate-600 group-hover:bg-[#1351b4] group-hover:text-white group-hover:scale-110 transition-all">
                        {pessoa.id.toString().padStart(3, '0')}
                      </div>
                    </td>
                    <td className="px-2 py-1 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        {/* <div className="w-10 h-10 shrink-0 rounded-sm bg-slate-50 flex items-center justify-center text-[#1351b4] text-xs font-black border border-slate-200 group-hover:scale-110 group-hover:bg-[#1351b4] group-hover:text-white transition-all">
                          {pessoa.id.toString().padStart(3, '0')}
                        </div> */}
                        <div className="flex flex-col">
                          <span className="font-bold text-[12px] uppercase text-slate-700 leading-tight">{pessoa.nome}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{pessoa.email || 'E-mail não cadastrado'}</span>
                        </div>
                      </div>
                    </td>
                    {/* <td className="border-b border-slate-100 hidden md:table-cell px-2 py-1">
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                        <Church className="w-3.5 h-3.5 text-[#1351b4]" />
                        <span className="text-slate-500 font-black text-[9px] tracking-tighter">
                          {pessoa.paroquia?.nome || '-'}
                        </span>
                      </div>
                    </td> */}
                    <td className="border-b border-slate-100 hidden md:table-cell px-2 py-1">
                      <div className="flex flex-col">
                        <span className="font-bold text-[12px] text-slate-500 tracking-widest leading-tight">{pessoa.documento || '---.---.--- --'}</span>
                        <span className="text-xs text-slate-400 mt-0.5">{pessoa.telefone || 'Telefone não cadastrado'}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 border-b border-slate-100">
                      <div className={`flex flex-col ${pessoa.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {/* <TrendingUp className={`w-3.5 h-3.5 ${pessoa.saldo < 0 ? 'rotate-180' : ''}`} /> */}
                          <span className={`text-[12px] font-bold ${pessoa.saldo > 0 ? 'text-emerald-600' : pessoa.saldo < 0 ? 'text-rose-600' : 'text-slate-200'}`}>
                            {formatarMoeda(pessoa.saldo)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1 relative">
                      <div className="relative flex items-center justify-center" data-dropdown="true">
                        {/* 3-dots Menu */}
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuAbertoId(menuAbertoId === pessoa.id ? null : pessoa.id);
                            }}
                            className="p-2 text-slate-400 hover:text-[#1351b4] rounded-sm transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {menuAbertoId === pessoa.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setMenuAbertoId(null)} />
                              <div className="absolute right-8 top-1/2 -translate-y-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-md flex flex-col p-1 w-44" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => { setMenuAbertoId(null); abrirModalExtrato(pessoa); }}
                                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1351b4] rounded-sm text-left"
                                >
                                  <ArrowRightLeft className="w-4 h-4" /> Extrato
                                </button>
                                <button
                                  onClick={() => { setMenuAbertoId(null); abrirModal(pessoa); }}
                                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-sm text-left"
                                >
                                  <Pencil className="w-4 h-4" /> Editar
                                </button>
                                <button
                                  onClick={() => { setMenuAbertoId(null); confirmarExclusao(pessoa.id); }}
                                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-sm text-left"
                                >
                                  <Trash2 className="w-4 h-4" /> Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

            <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">
                  {pessoaEdicao ? 'Atualizar Dados' : 'Novo Cadastro'}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Identidade e Saldos</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowRight className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
              <form onSubmit={confirmarEnvio} className="space-y-6">

                {/* Grid para os campos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                  {/* Nome Completo */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative group">
                      <User className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        required
                        value={dadosForm.nome}
                        onChange={(e) => setDadosForm({ ...dadosForm, nome: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                      />
                    </div>
                  </div>

                  {/* Comunidade Vinculada */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Comunidade Vinculada</label>
                    <div className="relative group">
                      <Church className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        required
                        value={dadosForm.paroquiaId || ''}
                        onChange={(e) => setDadosForm({ ...dadosForm, paroquiaId: e.target.value })}
                        className="w-full pl-14 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                      >
                        <option value="">Selecione uma comunidade...</option>
                        {paroquias.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                      <ChevronDownIcon className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Nascimento */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nascimento</label>
                    <div className="relative group">
                      <CalendarDays className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="date"
                        value={dadosForm.dataNascimento}
                        onChange={(e) => setDadosForm({ ...dadosForm, dataNascimento: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Sexo */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sexo</label>
                    <div className="relative group">
                      <UserCheck className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        value={dadosForm.sexo}
                        onChange={(e) => setDadosForm({ ...dadosForm, sexo: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
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
                      <Fingerprint className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.documento}
                        onChange={(e) => setDadosForm({ ...dadosForm, documento: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <div className="relative group">
                      <Phone className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.telefone}
                        onChange={(e) => setDadosForm({ ...dadosForm, telefone: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* RG */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">RG</label>
                    <div className="relative group">
                      <Fingerprint className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.rg}
                        onChange={(e) => setDadosForm({ ...dadosForm, rg: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Orgão Emissor */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Orgão Emissor</label>
                    <div className="relative group">
                      <Fingerprint className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.orgaoEmissor}
                        onChange={(e) => setDadosForm({ ...dadosForm, orgaoEmissor: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="email"
                        value={dadosForm.email}
                        onChange={(e) => setDadosForm({ ...dadosForm, email: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Email do Responsável */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail do Responsável</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="email"
                        value={dadosForm.emailResponsavel}
                        onChange={(e) => setDadosForm({ ...dadosForm, emailResponsavel: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                        placeholder="E-mail do pai/responsável"
                      />
                    </div>
                  </div>

                  {/* Email do Responsável 2 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail do Responsável 2</label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="email"
                        value={dadosForm.emailResponsavel2}
                        onChange={(e) => setDadosForm({ ...dadosForm, emailResponsavel2: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  {/* Comunidade */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Comunidade</label>
                    <div className="relative group">
                      <Church className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.comunidade}
                        onChange={(e) => setDadosForm({ ...dadosForm, comunidade: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Passaporte */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Passaporte</label>
                    <div className="relative group">
                      <Fingerprint className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.passaporte}
                        onChange={(e) => setDadosForm({ ...dadosForm, passaporte: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                        placeholder="EX.: AB123456"
                      />
                    </div>
                  </div>

                  {/* Emissão/Validade */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emissão/Validade</label>
                    <div className="relative group">
                      <CalendarDays className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.passaporteEmissaoValidade}
                        onChange={(e) => setDadosForm({ ...dadosForm, passaporteEmissaoValidade: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Foto do Passaporte */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Anexo / Foto do Passaporte</label>
                    <div className="flex flex-col gap-3">
                      {dadosForm.fotoPassaporte && (
                        <a href={dadosForm.fotoPassaporte.startsWith('http') ? dadosForm.fotoPassaporte : `${process.env.NEXT_PUBLIC_API_URL}/arquivos/download?bucket=passaportes&path=${encodeURIComponent(dadosForm.fotoPassaporte)}&token=${Cookies.get('gf_token')}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#1351b4] underline hover:text-[#0047b7]">
                          Ver foto atual
                        </a>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setArquivoPassaporte(e.target.files[0]);
                          }
                        }}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-[#1351b4]/10 file:text-[#1351b4] hover:file:bg-[#1351b4]/20 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Camiseta */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Camiseta</label>
                    <div className="relative group">
                      <User className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        value={dadosForm.camiseta}
                        onChange={(e) => setDadosForm({ ...dadosForm, camiseta: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
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
                        <User className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                        <input
                          type="text"
                          value={dadosForm.nomeConjuge}
                          onChange={(e) => setDadosForm({ ...dadosForm, nomeConjuge: e.target.value })}
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
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
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 h-24"
                      />
                    </div>
                  </div>

                  {/* Responsável Legal */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Responsável Legal (para menores)</label>
                    <div className="relative group">
                      <User className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <input
                        type="text"
                        value={dadosForm.responsavelLegal}
                        onChange={(e) => setDadosForm({ ...dadosForm, responsavelLegal: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                      />
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
                            checked={dadosForm.perfis.includes(perf)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setDadosForm((prev) => ({
                                ...prev,
                                perfis: checked
                                  ? [...prev.perfis, perf]
                                  : prev.perfis.filter((p) => p !== perf)
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
                    className="px-10 py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar Cadastro
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXTRATO (POPOUP) */}
      {modalExtratoAberto && pessoaSelecionada && (() => {
        const totalEntradas = (pessoaSelecionada.transacoes || [])
          .filter((t: any) => t.tipo === 'RECEITA')
          .reduce((acc: number, t: any) => acc + t.valor, 0) || 0;

        const totalSaidas = (pessoaSelecionada.transacoes || [])
          .filter((t: any) => t.tipo === 'DESPESA')
          .reduce((acc: number, t: any) => acc + t.valor, 0) || 0;

        const transacoesFormatadas = (pessoaSelecionada.transacoes || [])
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

              <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-sm bg-[#1351b4] text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico Financeiro: {pessoaSelecionada.nome}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Extrato detalhado de todas as movimentações</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setModalExtratoAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <X className="w-7 h-7" />
                  </button>
                </div>
              </div>

              {!pessoaSelecionada.transacoes ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-[#1351b4] animate-spin mb-4" />
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Carregando movimentações...</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 pb-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                        {/* Detalhamento de saldos por evento */}
                        {pessoaSelecionada.saldos && pessoaSelecionada.saldos.length > 0 ? (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Saldos por Evento</h4>
                            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                              {pessoaSelecionada.saldos.map((s: any) => (
                                <div key={s.eventoId} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-sm shadow-sm shrink-0">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate max-w-[180px]">{s.nomeEvento}</span>
                                  <span className={`text-[11px] font-black ${s.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatarMoeda(s.saldo)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-sm flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum evento vinculado</span>
                          </div>
                        )}

                        {/* Resumo Financeiro */}
                        <div className="p-3 bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col">
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
                              <span className="text-xl font-black text-[#1351b4] leading-none">{formatarMoeda(pessoaSelecionada.saldo)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

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
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform ${bgIconColor}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-slate-700 text-xs uppercase tracking-tight">{item.descricao}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className={`px-3 py-2 font-black text-sm text-right whitespace-nowrap ${valorColor}`}>
                                  <div className="flex items-center justify-end gap-3">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs opacity-50">{sinal}</span>
                                      {formatarMoeda(item.valor)}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">

                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL DE EXTRATO GERAL (POPOUP) */}
      {modalExtratoGeralAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-sm bg-[#1351b4] text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Relatório Consolidado por Pessoa</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Saldos individuais e vínculos com eventos</p>
                </div>
              </div>
              <button onClick={() => setModalExtratoGeralAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 pb-0">
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 p-5 bg-blue-50 border border-blue-100 rounded-sm">
                    <span className="text-[8px] text-[#1351b4] font-black uppercase tracking-widest block mb-1">Saldo Total Acumulado</span>
                    <span className="text-xl font-black text-[#1351b4]">
                      {formatarMoeda(
                        pessoas.reduce((acc, p) => acc + (p.saldo || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-1/3">Nome da Pessoa</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Eventos e Saldos</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right w-32">Saldo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const pessoasComSaldo = pessoas.filter(p => p.saldo !== 0 || (p.saldos && p.saldos.some((s: any) => s.saldo !== 0)));
                    if (pessoasComSaldo.length === 0) {
                      return (
                        <tr>
                          <td colSpan={3} className="px-10 py-32 text-center text-slate-300">
                            <div className="flex flex-col items-center gap-4 opacity-20">
                              <Info className="w-16 h-16" />
                              <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhum saldo localizado</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return pessoasComSaldo.map((pessoa: any) => {
                      const saldosAtivos = (pessoa.saldos || []).filter((s: any) => s.saldo !== 0);

                      return (
                        <tr key={pessoa.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-10 py-4 align-top">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-sm bg-slate-50 flex items-center justify-center text-[#1351b4] text-[10px] font-black border border-slate-200">
                                #{pessoa.id.toString().padStart(3, '0')}
                              </div>
                              <span className="font-black text-slate-700 text-xs uppercase tracking-tight">{pessoa.nome}</span>
                            </div>
                          </td>
                          <td className="px-10 py-4 align-top">
                            {saldosAtivos.length === 0 ? (
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem saldos vinculados</span>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {saldosAtivos.map((s: any) => (
                                  <div key={s.eventoId} className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-sm shadow-sm">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{s.nomeEvento}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${s.saldo > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {formatarMoeda(s.saldo)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-10 py-4 align-top text-right">
                            <span className={`font-black text-sm whitespace-nowrap ${pessoa.saldo > 0 ? 'text-emerald-600' : pessoa.saldo < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {formatarMoeda(pessoa.saldo)}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
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
