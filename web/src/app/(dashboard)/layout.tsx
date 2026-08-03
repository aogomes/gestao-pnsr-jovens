'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { hasPermission, Modulo } from '@/lib/permissions.config';
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  LogOut,
  Menu,
  X,
  Wallet,
  Shield,
  ChevronRight,
  Bell,
  User as UserIcon,
  Church,
  CalendarDays,
  UserCheck,
  Ticket,
  Briefcase,
  ShoppingBag,
  Package,
  User,
  Lock,
  BarChart
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [temRifas, setTemRifas] = useState(true);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalSenhaAberta, setModalSenhaAberta] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarNovaSenha) {
      alert('As senhas não conferem');
      return;
    }
    if (novaSenha.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    try {
      setLoadingSenha(true);
      await api.patch(`/usuarios/${usuario.id}`, { senha: novaSenha });
      alert('Senha alterada com sucesso!');
      setModalSenhaAberta(false);
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (error) {
      console.error(error);
      alert('Erro ao alterar senha. Você pode não ter permissão.');
    } finally {
      setLoadingSenha(false);
    }
  };

  useEffect(() => {
    // 1. Verificação de Autenticação e Segurança
    const dadosUsuario = Cookies.get('gf_user');
    if (!dadosUsuario) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(dadosUsuario);
    setUsuario(user);

    // 1.5. Verificar se existem rifas ativas para exibir o menu
    api.get('/rifas/ativas').then(res => {
      const rifasData = Array.isArray(res.data) ? res.data : [];
      let disponiveis = rifasData;
      disponiveis = disponiveis.filter((r: any) =>
        r.alocacoes?.some((a: any) => a.pessoaId === user.pessoaId)
      );
      setTemRifas(disponiveis.length > 0);
    }).catch(err => {
      console.error('Erro ao verificar rifas:', err);
      setTemRifas(false);
    });

    // Regra de Segurança: Validar acesso à rota atual
    const itemAtual = itensNav.find(item => item.href === pathname);
    if (itemAtual) {
      const temAcesso = itemAtual.href === '/' ? user.papel === 'ADMIN' : hasPermission(user.papel, itemAtual.modulo as Modulo, 'ler');
      if (!temAcesso) {
        router.push('/meu-painel');
      }
    }

    // 2. Lógica de Responsividade (Sidebar)
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarAberta(false);
      } else {
        setSidebarAberta(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [router, pathname]);

  const realizarLogout = () => {
    Cookies.remove('gf_token');
    Cookies.remove('gf_user');
    router.push('/login');
  };

  const itensNav = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, modulo: 'painel' },
    { name: 'Meu Painel', href: '/meu-painel', icon: UserIcon, modulo: 'painel' },
    { name: 'Minhas Rifas', href: '/minhas-rifas', icon: Ticket, modulo: 'minhas-rifas' },
    { name: 'Contas', href: '/contas', icon: Wallet, modulo: 'contas' },
    { name: 'Transações', href: '/transacoes', icon: ArrowRightLeft, modulo: 'transacoes' },
    { name: 'Vendas', href: '/vendas', icon: ShoppingBag, modulo: 'vendas' },
    { name: 'Trabalhos', href: '/trabalhos', icon: Briefcase, modulo: 'trabalhos' },
    { name: 'Eventos', href: '/eventos', icon: CalendarDays, modulo: 'eventos' },
    { name: 'Inscrições', href: '/inscricoes', icon: UserCheck, modulo: 'inscricoes' },
    { name: 'Rifas (Gestão)', href: '/rifas', icon: Ticket, modulo: 'rifas' },
    { name: 'Pessoas', href: '/pessoas', icon: Users, modulo: 'pessoas' },
    { name: 'Usuários', href: '/usuarios', icon: Shield, modulo: 'usuarios' },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart, modulo: 'relatorios' },
  ];

  let itensMenu = [...itensNav];
  if (!temRifas) {
    itensMenu = itensMenu.filter(item => item.name !== 'Minhas Rifas');
  }

  if (!usuario) return null;

  return (
    <div className="h-screen bg-[#f2f3f7] flex flex-col overflow-hidden">
      {/* Cabeçalho Principal */}
      <header className="bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-[60] sticky top-0 shrink-0">
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Menu Mobile Button - Exibido no topo apenas quando a barra inferior estiver oculta (ex: Vendas) */}
          {pathname === '/vendas' && (
            <button onClick={() => setSidebarAberta(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-[#1351b4]">
              <Menu className="w-6 h-6" />
            </button>
          )}

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-18 h-14 relative">
              <Image
                src="/logo-jmj.png"
                alt="Logo JMJ Seul 2027"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base lg:text-xl font-black text-[#1351b4] leading-none tracking-tighter uppercase">Peregrinação</span>
              <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 lg:mt-1 xs:block">Paróquia Nossa Senhora do Rosário</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-6">
          <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200">
            <button className="p-2 text-slate-400 hover:text-[#1351b4] transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 relative">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-none">{usuario.nome}</p>
              <p className="text-[9px] lg:text-[10px] font-medium text-slate-400 mt-1 uppercase">{usuario.papel}</p>
            </div>
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-100 flex items-center justify-center text-[#1351b4] font-bold text-[10px] lg:text-xs border border-slate-200 shadow-sm shrink-0 hover:bg-slate-200 transition-colors focus:outline-none"
              title='Alterar senha'
            >
              {usuario.nome?.charAt(0).toUpperCase() || 'U'}
            </button>

            {/* Dropdown Menu */}
            {dropdownAberto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownAberto(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
                  <button
                    onClick={() => {
                      setDropdownAberto(false);
                      setModalSenhaAberta(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Lock className="w-4 h-4" />
                    Alterar Senha
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Overlay para Mobile */}
        {sidebarAberta && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] lg:hidden"
            onClick={() => setSidebarAberta(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          ${sidebarAberta ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'} 
          fixed lg:relative top-16 lg:top-0 bottom-16 lg:bottom-0 lg:h-full
          bg-white border-r border-slate-200 flex flex-col z-50 
          transition-all duration-300 ease-in-out overflow-visible
        `}>
          {/* Desktop Toggle Button */}
          <button
            onClick={() => setSidebarAberta(!sidebarAberta)}
            className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-white border border-slate-200 text-slate-400 rounded-full items-center justify-center shadow-sm z-50 hover:text-[#1351b4] hover:border-[#1351b4] transition-all"
          >
            {sidebarAberta ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <nav className="flex-1 py-4 lg:py-6 overflow-y-auto custom-scrollbar">
            {itensMenu.filter(item => item.href === '/' ? usuario?.papel === 'ADMIN' : hasPermission(usuario?.papel, item.modulo as Modulo, 'ler')).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => { if (window.innerWidth < 1024) setSidebarAberta(false); }}
                  className={`
                    flex items-center gap-3 px-6 lg:px-8 py-3.5 transition-all relative group
                    ${isActive
                      ? 'text-[#1351b4] bg-[#1351b4]/5 font-bold'
                      : 'text-slate-700 hover:text-[#1351b4] hover:bg-slate-50 font-medium'}
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1351b4]" />}
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1351b4]' : 'text-slate-500 group-hover:text-[#1351b4]'}`} />
                  {(sidebarAberta || window.innerWidth < 1024) && (
                    <span className="text-[13px] tracking-tight truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 lg:p-6 border-t border-slate-100">
            <button
              onClick={realizarLogout}
              className="flex items-center gap-3 text-slate-400 hover:text-rose-600 transition-colors text-[11px] font-bold uppercase tracking-widest w-full overflow-hidden px-2"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {sidebarAberta && <span className="truncate">Sair</span>}
            </button>
          </div>
        </aside>

        {/* Conteúdo da Página */}
        <main className={`flex-1 flex flex-col bg-[#f2f3f7] overflow-y-auto custom-scrollbar ${pathname !== '/vendas' ? 'pb-16' : ''} lg:pb-0`}>
          <div className="flex-1 p-4 lg:p-5">
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      {pathname !== '/vendas' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around h-16 z-[60] px-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
          {hasPermission(usuario?.papel, 'painel', 'ler') && (
            <Link href="/meu-painel" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/meu-painel' || pathname === '/' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
              <UserIcon className="w-5 h-5" />
              <span className="text-[9px] font-bold">Painel</span>
            </Link>
          )}
          {hasPermission(usuario?.papel, 'relatorios', 'ler') && (
            <Link href="/relatorios" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/relatorios' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
              <BarChart className="w-5 h-5" />
              <span className="text-[9px] font-bold truncate">Relatórios</span>
            </Link>
          )}
          {hasPermission(usuario?.papel, 'inscricoes', 'ler') && (
            <Link href="/inscricoes" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/inscricoes' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
              <UserCheck className="w-5 h-5" />
              <span className="text-[9px] font-bold truncate">Inscrições</span>
            </Link>
          )}
          {hasPermission(usuario?.papel, 'pessoas', 'ler') && (
            <Link href="/pessoas" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/pessoas' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
              <User className="w-5 h-5" />
              <span className="text-[9px] font-bold truncate">Pessoas</span>
            </Link>
          )}
          <button onClick={() => setSidebarAberta(true)} className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${sidebarAberta ? 'text-[#1351b4]' : 'text-slate-400'}`}>
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold">Menu</span>
          </button>
        </nav>
      )}

      {/* Modal Alterar Senha */}
      {modalSenhaAberta && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Alterar Senha</h2>
              <button
                onClick={() => setModalSenhaAberta(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAlterarSenha} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1351b4] focus:border-transparent transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1351b4] focus:border-transparent transition-all"
                  placeholder="Confirme a nova senha"
                  required
                  minLength={6}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalSenhaAberta(false)}
                  className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingSenha}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#1351b4] hover:bg-[#1351b4]/90 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingSenha ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

