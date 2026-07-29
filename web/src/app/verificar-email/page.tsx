'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import { Loader2, ArrowRight, Mail, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function VerificarEmailForm() {
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !codigo) return;

    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await api.post('/autenticacao/verificar-email', { login: email, codigo });
      const { access_token, usuario } = resposta.data;

      Cookies.set('gf_token', access_token, { expires: 7 });
      Cookies.set('gf_user', JSON.stringify(usuario), { expires: 7 });

      if (usuario.papel === 'ADMIN') {
        router.push('/');
      } else {
        router.push('/meu-painel');
      }
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Código inválido ou expirado.');
    } finally {
      setCarregando(false);
    }
  };

  const handleReenviar = async () => {
    if (!email) return;
    setReenviando(true);
    setErro('');
    setSucesso('');

    try {
      await api.post('/autenticacao/reenviar-codigo', { login: email });
      setSucesso('Um novo código foi enviado para o seu e-mail!');
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao reenviar o código.');
    } finally {
      setReenviando(false);
    }
  };

  if (!email) return null;

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
            <h4 className="text-lg font-black text-[#1351b4] tracking-tighter text-center uppercase">
              Aguardando validação do E-mail
            </h4>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm shadow-2xl p-6 space-y-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1351b4]" />

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1351b4]">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Confirme seu e-mail para acessar</h2>
              <p className="text-sm text-slate-600">
                Enviamos um código de 6 dígitos para <br />
                <span className="font-bold text-slate-800">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-600 text-xs font-bold">
                  {erro}
                </div>
              )}
              {sucesso && (
                <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-600 text-xs font-bold">
                  {sucesso}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="codigo">
                  Código de Verificação
                </label>
                <div className="relative group">
                  <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
                  <input
                    id="codigo"
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-center text-xl tracking-[0.5em] focus:outline-none focus:bg-white focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/10 transition-all font-bold text-slate-700"
                    placeholder="000000"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando || codigo.length < 6}
                className="w-full py-4 bg-[#1351b4] hover:bg-[#0047b7] text-white rounded text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
              >
                {carregando ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirmar e Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-6 space-y-4 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReenviar}
                  disabled={reenviando}
                  className="text-[10px] font-bold text-slate-500 hover:text-[#1351b4] uppercase tracking-widest flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                >
                  {reenviando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Reenviar Código
                </button>

                <Link
                  href="/login"
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para o Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f2f3f7]"><Loader2 className="w-8 h-8 animate-spin text-[#1351b4]" /></div>}>
      <VerificarEmailForm />
    </Suspense>
  );
}
