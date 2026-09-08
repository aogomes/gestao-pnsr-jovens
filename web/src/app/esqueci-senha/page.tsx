'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Mail, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

export default function EsqueciSenhaPage() {
  const [login, setLogin] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      await api.post('/autenticacao/esqueci-senha', { login });
      setSucesso(true);
      setTimeout(() => {
        router.push(`/redefinir-senha?email=${encodeURIComponent(login)}`);
      }, 2000);
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao processar solicitação.');
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

          <div className="bg-white border border-slate-200 rounded-sm shadow-2xl p-6 space-y-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1351b4]" />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Esqueci minha senha</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Digite seu e-mail para receber um código de redefinição.
                </p>
              </div>
            </div>

            {sucesso ? (
              <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-sm font-bold text-center">
                Se o e-mail estiver cadastrado, você receberá um código em breve. Redirecionando...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {erro && (
                  <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                    {erro}
                  </div>
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

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-4 bg-[#1351b4] hover:bg-[#0047b7] text-white rounded text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                >
                  {carregando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Solicitar Código
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-[10px] font-bold text-[#1351b4] hover:underline uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para o Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
