'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import { Wallet, Mail, Lock, Loader2, ArrowRight, ShieldCheck, UserPlus, User, Church } from 'lucide-react';

export default function LoginPage() {
  const [isRegistro, setIsRegistro] = useState(false);
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [paroquiaId, setParoquiaId] = useState('');
  const [comunidade, setComunidade] = useState('');
  const [paroquias, setParoquias] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (isRegistro) {
      api.get('/paroquias')
        .then(res => setParoquias(res.data))
        .catch(err => console.error('Erro ao buscar paroquias:', err));
    }
  }, [isRegistro]);

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

        const payload: any = { nome, login, senha, confirmarSenha };
        if (comunidade) payload.comunidade = comunidade;
        if (paroquiaId) {
          payload.paroquiaId = Number(paroquiaId);
        }

        const resposta = await api.post('/autenticacao/registrar', payload);
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
            <div className="w-40 h-40 mb-4 relative">
              <Image
                src="/logo-jmj.png"
                alt="Logo JMJ Seul 2027"
                fill
                sizes="160px"
                className="object-contain"
                priority
              />
            </div>
            <h4 className="text-2xl font-black text-[#1351b4] tracking-tighter text-center uppercase">
              Peregrinação
            </h4>
            <p className="text-slate-400 mt-2 font-bold uppercase tracking-[0.2em] text-[9px]"> Paróquia Nossa Senhora do Rosário</p>
          </div>

          {/* Login/Register Card */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-2xl p-6 space-y-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1351b4]" />

            {isRegistro && (<div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mt-1">
                  Preencha os dados abaixo para se cadastrar.
                </p>
              </div>
            </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  {erro}
                </div>
              )}

              {isRegistro && (
                <>
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

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="paroquia">
                      Paróquia
                    </label>
                    <div className="relative group">
                      <Church className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        id="paroquia"
                        value={paroquiaId}
                        onChange={(e) => setParoquiaId(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:bg-white focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/10 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Selecione sua paróquia</option>
                        {paroquias.map((p) => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="comunidade">
                      Comunidade
                    </label>
                    <div className="relative group">
                      <Church className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                      <select
                        id="comunidade"
                        value={comunidade}
                        onChange={(e) => setComunidade(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:bg-white focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/10 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Selecione sua comunidade...</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <option key={num} value={`Comunidade ${num}`}>Comunidade {num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="login">
                  Usuário (E-mail)
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
                  Senha
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
                    Confirmar Senha
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
        </div>
      </div>
    </div>
  );
}

