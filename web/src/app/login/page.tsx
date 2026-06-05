'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import { Wallet, Mail, Lock, Loader2, ArrowRight, ShieldCheck, UserPlus, User } from 'lucide-react';

export default function LoginPage() {
  const [isRegistro, setIsRegistro] = useState(false);
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      if (isRegistro) {
        if (senha !== confirmarSenha) {
          setErro('As senhas não conferem.');
          setCarregando(false);
          return;
        }
        const resposta = await api.post('/autenticacao/registrar', { nome, login, senha, confirmarSenha });
        const { access_token, usuario } = resposta.data;
        Cookies.set('gf_token', access_token, { expires: 7 });
        Cookies.set('gf_user', JSON.stringify(usuario), { expires: 7 });

        if (usuario.papel === 'ADMIN') {
          router.push('/');
        } else {
          router.push('/meu-painel');
        }
      } else {
        const resposta = await api.post('/autenticacao/login', { login, senha });
        const { access_token, usuario } = resposta.data;
        Cookies.set('gf_token', access_token, { expires: 7 });
        Cookies.set('gf_user', JSON.stringify(usuario), { expires: 7 });

        if (usuario.papel === 'ADMIN') {
          router.push('/');
        } else {
          router.push('/meu-painel');
        }
      }
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Credenciais inválidas ou erro no cadastro.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f3f7]">

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo Area */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-[#1351b4] rounded flex items-center justify-center mb-6 shadow-xl shadow-blue-900/10">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-[#1351b4] tracking-tighter text-center uppercase">
              PNSR JMJ
            </h1>
            <p className="text-slate-400 mt-2 font-bold uppercase tracking-[0.2em] text-[9px]">Acesso ao Sistema de Gestão</p>
          </div>

          {/* Login/Register Card */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-2xl p-10 space-y-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1351b4]" />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {isRegistro ? 'Criar Nova Conta' : 'Identificação'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isRegistro ? 'Preencha os dados para se cadastrar.' : 'Utilize suas credenciais para acessar.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  {erro}
                </div>
              )}

              {isRegistro && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="nome">
                    Nome Completo
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <input
                      id="nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:bg-white focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/10 transition-all font-bold text-slate-700"
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="login">
                  E-mail institucional
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <input
                    id="login"
                    type="email"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:bg-white focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/10 transition-all font-bold text-slate-700"
                    placeholder="exemplo@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="password">
                  Chave de Acesso
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <input
                    id="password"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:bg-white focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/10 transition-all font-bold text-slate-700"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {isRegistro && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="confirmPassword">
                    Confirmar Chave
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:bg-white focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/10 transition-all font-bold text-slate-700"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-4 bg-[#1351b4] hover:bg-[#0047b7] text-white rounded text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
              >
                {carregando ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isRegistro ? 'Finalizar Cadastro' : 'Autenticar no Sistema'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistro(!isRegistro);
                    setErro('');
                  }}
                  className="text-[10px] font-bold text-[#1351b4] hover:underline uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                >
                  {isRegistro ? (
                    'Já tenho uma conta? Entrar'
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Não tem conta? Cadastre-se
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-bold text-[#168821] uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" />
              Conexão Segura e Criptografada
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

