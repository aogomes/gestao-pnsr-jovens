'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
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
  Package
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    // 1. Verificação de Autenticação e Segurança
    const dadosUsuario = Cookies.get('gf_user');
    if (!dadosUsuario) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(dadosUsuario);
    setUsuario(user);

    // Regra de Segurança: Validar acesso à rota atual
    const itemAtual = itensNav.find(item => item.href === pathname);
    if (itemAtual && !itemAtual.papeis.includes(user.papel)) {
      router.push('/meu-painel');
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
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, papeis: ['ADMIN'] },
    { name: 'Meu Painel', href: '/meu-painel', icon: UserIcon, papeis: ['ADMIN', 'USUARIO'] },
    { name: 'Minhas Rifas', href: '/minhas-rifas', icon: Ticket, papeis: ['ADMIN', 'USUARIO'] },
    { name: 'Contas', href: '/contas', icon: Wallet, papeis: ['ADMIN'] },
    { name: 'Transações', href: '/transacoes', icon: ArrowRightLeft, papeis: ['ADMIN'] },
    { name: 'Vendas', href: '/vendas', icon: ShoppingBag, papeis: ['ADMIN', 'USUARIO'] },
    { name: 'Trabalhos', href: '/trabalhos', icon: Briefcase, papeis: ['ADMIN'] },
    { name: 'Eventos', href: '/eventos', icon: CalendarDays, papeis: ['ADMIN'] },
    { name: 'Inscrições', href: '/inscricoes', icon: UserCheck, papeis: ['ADMIN'] },
    { name: 'Rifas (Gestão)', href: '/rifas', icon: Ticket, papeis: ['ADMIN'] },
    { name: 'Pessoas', href: '/pessoas', icon: Users, papeis: ['ADMIN'] },
    { name: 'Usuários', href: '/usuarios', icon: Shield, papeis: ['ADMIN'] },
  ];


  if (!usuario) return null;

  return (
    <div className="h-screen bg-[#f2f3f7] flex flex-col overflow-hidden">
      {/* Cabeçalho Principal */}
      <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-[60] sticky top-0 shrink-0">
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Menu Mobile Button - Exibido no topo apenas quando a barra inferior estiver oculta (ex: Vendas) */}
          {pathname === '/vendas' && (
            <button onClick={() => setSidebarAberta(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-[#1351b4]">
              <Menu className="w-6 h-6" />
            </button>
          )}

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1351b4] rounded flex items-center justify-center text-white shadow-sm">
              <Wallet className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-base lg:text-xl font-black text-[#1351b4] leading-none tracking-tighter uppercase">PNSR JMJ</span>
              <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 lg:mt-1 hidden xs:block">GESTÃO</span>
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

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-none">{usuario.nome}</p>
              <p className="text-[9px] lg:text-[10px] font-medium text-slate-400 mt-1 uppercase">{usuario.papel}</p>
            </div>
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-100 flex items-center justify-center text-[#1351b4] font-bold text-[10px] lg:text-xs border border-slate-200 shadow-sm shrink-0">
              {usuario.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
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
          fixed lg:relative h-full pb-20 lg:pb-0
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
            {itensNav.filter(item => item.papeis.includes(usuario?.papel)).map((item) => {
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
                      : 'text-slate-500 hover:text-[#1351b4] hover:bg-slate-50'}
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1351b4]" />}
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1351b4]' : 'text-slate-400 group-hover:text-[#1351b4]'}`} />
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
          <Link href="/meu-painel" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/meu-painel' || pathname === '/' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
            <UserIcon className="w-5 h-5" />
            <span className="text-[9px] font-bold">Painel</span>
          </Link>
          <Link href="/trabalhos" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/trabalhos' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
            <Briefcase className="w-5 h-5" />
            <span className="text-[9px] font-bold truncate">Trabalhos</span>
          </Link>
          <Link href="/inscricoes" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/inscricoes' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
            <UserCheck className="w-5 h-5" />
            <span className="text-[9px] font-bold truncate">Inscrições</span>
          </Link>
          <Link href="/minhas-rifas" className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${pathname === '/minhas-rifas' ? 'text-[#1351b4]' : 'text-slate-400'}`}>
            <Ticket className="w-5 h-5" />
            <span className="text-[9px] font-bold truncate">Rifas</span>
          </Link>
          <button onClick={() => setSidebarAberta(true)} className={`flex flex-col items-center justify-center w-14 h-full space-y-1 ${sidebarAberta ? 'text-[#1351b4]' : 'text-slate-400'}`}>
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold">Menu</span>
          </button>
        </nav>
      )}
    </div>
  );
}

