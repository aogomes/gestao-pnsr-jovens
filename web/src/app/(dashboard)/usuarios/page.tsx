'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Plus,
  Shield,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Mail,
  User as UserIcon,
  Lock,
  Key,
  LayoutDashboard,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Estado do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEdicao, setUsuarioEdicao] = useState<any>(null);
  const [dadosForm, setDadosForm] = useState({ nome: '', login: '', senha: '', papel: 'USUARIO' });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    buscarUsuarios();
  }, []);

  const buscarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModal = (usuario: any = null) => {
    if (usuario) {
      setUsuarioEdicao(usuario);
      setDadosForm({ nome: usuario.nome, login: usuario.login, senha: '', papel: usuario.papel });
    } else {
      setUsuarioEdicao(null);
      setDadosForm({ nome: '', login: '', senha: '', papel: 'USUARIO' });
    }
    setModalAberto(true);
  };

  const confirmarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const cargaUtil = { ...dadosForm };
      if (usuarioEdicao && !cargaUtil.senha) {
        delete (cargaUtil as any).senha;
      }

      if (usuarioEdicao) {
        await api.patch(`/usuarios/${usuarioEdicao.id}`, cargaUtil);
      } else {
        await api.post('/usuarios', cargaUtil);
      }
      setModalAberto(false);
      buscarUsuarios();
    } catch (err) {
      alert('Erro ao salvar usuário.');
    } finally {
      setEnviando(false);
    }
  };

  const confirmarExclusao = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      buscarUsuarios();
    } catch (err) {
      alert('Erro ao excluir usuário.');
    }
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    u.login.toLowerCase().includes(termoBusca.toLowerCase())
  );

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
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Gestão de Usuários</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Controle de acessos e permissões do sistema</p>
        </div>
      </div>

      {/* SEÇÃO DE BUSCA */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative w-full max-w-2xl group">
          <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nome ou login..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-bold text-slate-700 placeholder:text-slate-300"
          />
        </div>
        <div className="px-6 py-3 bg-[#1351b4]/10 text-[#1351b4] rounded-sm text-[10px] font-black border border-[#1351b4]/10 uppercase">
          {usuariosFiltrados.length} CONTAS ATIVAS
        </div>
      </div>

      {/* CONTAINER PRINCIPAL DA TABELA */}
      <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{usuariosFiltrados.length} usuário{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            Novo Usuário
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Identificação</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Nível de Acesso</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Cadastro em</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Shield className="w-16 h-16" />
                      <span className="font-black uppercase tracking-[0.2em] text-xs">Nenhum usuário encontrado</span>
                    </div>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-sm bg-slate-50 flex items-center justify-center text-[#1351b4] text-sm font-black border border-slate-200 group-hover:scale-110 transition-transform">
                          {usuario.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-700 text-xs uppercase tracking-tight">{usuario.nome}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">{usuario.login}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit border shadow-sm ${usuario.papel === 'ADMIN'
                        ? 'bg-blue-50 text-[#1351b4] border-[#1351b4]/20'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                        {usuario.papel === 'ADMIN' ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{usuario.papel}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-slate-500 font-black text-[11px] uppercase">{new Date(usuario.criadoEm).toLocaleDateString('pt-BR')}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirModal(usuario)}
                          className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-[#1351b4] hover:bg-blue-50 rounded-sm border border-slate-200 transition-all shadow-sm"
                          title="Editar Usuário"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmarExclusao(usuario.id)}
                          className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-sm border border-slate-200 transition-all shadow-sm"
                          title="Excluir Usuário"
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

      {/* MODAL DO USUÁRIO */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">
                  {usuarioEdicao ? 'Atualizar Usuário' : 'Novo Usuário'}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Credenciamento e Permissões</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowRight className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={confirmarEnvio} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative group">
                  <UserIcon className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <input
                    type="text"
                    required
                    value={dadosForm.nome}
                    onChange={(e) => setDadosForm({ ...dadosForm, nome: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 uppercase"
                    placeholder="NOME DO USUÁRIO"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Login de Acesso</label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <input
                      type="text"
                      required
                      value={dadosForm.login}
                      onChange={(e) => setDadosForm({ ...dadosForm, login: e.target.value })}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                      placeholder="login.acesso"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Papel / Nível</label>
                  <div className="relative group">
                    <Shield className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <select
                      value={dadosForm.papel}
                      onChange={(e) => setDadosForm({ ...dadosForm, papel: e.target.value })}
                      className="w-full pl-14 pr-10 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="USUARIO">USUÁRIO PADRÃO</option>
                      <option value="ADMIN">ADMINISTRADOR</option>
                    </select>
                    <ChevronDownIcon className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {usuarioEdicao ? 'Alterar Chave de Acesso (opcional)' : 'Definir Chave de Acesso'}
                </label>
                <div className="relative group">
                  <Key className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <input
                    type="password"
                    required={!usuarioEdicao}
                    value={dadosForm.senha}
                    onChange={(e) => setDadosForm({ ...dadosForm, senha: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700"
                    placeholder="••••••••"
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
                  Confirmar Usuário
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
