'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  Wallet, 
  ArrowRightLeft, 
  TrendingUp, 
  Calendar, 
  Activity,
  ArrowUp,
  ArrowDown,
  TrendingDown
} from 'lucide-react';

export default function DashboardPage() {
  const [estatisticas, setEstatisticas] = useState({
    saldoTotal: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    totalPessoas: 0,
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarDadosDashboard = async () => {
      try {
        const userCookie = Cookies.get('gf_user');
        if (!userCookie) return;
        const user = JSON.parse(userCookie);
        
        if (user.papel !== 'ADMIN') {
          setCarregando(false);
          return;
        }

        const [pessoasRes, transacoesRes] = await Promise.all([
          api.get('/pessoas'),
          api.get('/transacoes')
        ]);

        const pessoas = pessoasRes.data;
        const transacoes = transacoesRes.data;

        let saldoTotal = 0;
        let totalEntradas = 0;
        let totalSaidas = 0;

        pessoas.forEach((p: any) => {
          saldoTotal += p.saldo || 0;
        });

        transacoes.forEach((t: any) => {
          if (t.tipo === 'ENTRADA') totalEntradas += t.valor;
          if (t.tipo === 'SAIDA' || t.tipo === 'TRANSFERENCIA') totalSaidas += t.valor;
        });

        setEstatisticas({
          saldoTotal,
          totalEntradas,
          totalSaidas,
          totalPessoas: pessoas.length,
        });
      } catch (err) {
        console.error('Erro ao buscar dados do dashboard', err);
      } finally {
        setCarregando(false);
      }
    };

    buscarDadosDashboard();
  }, []);

  const formatarMoeda = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-[#1351b4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const cardsDashboard = [
    {
      title: 'Saldo Acumulado',
      value: formatarMoeda(estatisticas.saldoTotal),
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      progress: 75,
      description: 'Saldos consolidados'
    },
    {
      title: 'Entradas do Mês',
      value: formatarMoeda(estatisticas.totalEntradas),
      icon: ArrowUpRight,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      progress: 60,
      description: 'Receitas totais'
    },
    {
      title: 'Despesas Totais',
      value: formatarMoeda(estatisticas.totalSaidas),
      icon: ArrowDownRight,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      progress: 30,
      description: 'Gastos operacionais'
    },
    {
      title: 'Pessoas Ativas',
      value: estatisticas.totalPessoas.toString(),
      icon: Users,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      progress: 90,
      description: 'Membros cadastrados'
    }
  ];

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      {/* Linha de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {cardsDashboard.map((card) => (
          <div key={card.title} className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between h-36 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className={`w-7 h-7 ${card.bgColor} ${card.color} rounded flex items-center justify-center border border-current opacity-70`}>
                 <card.icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-none tracking-tight">{card.value}</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-1">{card.title}</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
               <div className={`h-full ${card.color.replace('text', 'bg')} opacity-60`} style={{ width: `${card.progress}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Seção Central */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-6 flex flex-col shadow-sm min-h-0">
           <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 shrink-0">
              <h2 className="text-[11px] font-bold text-[#1351b4] uppercase tracking-wider">Monitoramento de Fluxo Financeiro</h2>
              <div className="flex gap-2">
                 <button className="px-3 py-1 bg-slate-100 rounded text-[9px] font-bold uppercase tracking-widest text-slate-500">24h</button>
                 <button className="px-3 py-1 bg-[#1351b4] rounded text-[9px] font-bold uppercase tracking-widest text-white">Mensal</button>
              </div>
           </div>
           
           <div className="flex-1 bg-slate-50 border border-slate-100 rounded-sm relative overflow-hidden group flex flex-col items-center justify-center">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                 <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              </div>
              <Activity className="w-12 h-12 text-slate-200 group-hover:scale-110 transition-transform duration-500" />
              <p className="text-slate-400 font-bold mt-3 uppercase tracking-[0.3em] text-[9px]">Rede de Informações Ativa</p>
              
              <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-40" />
              <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-40" />
           </div>
        </div>

        {/* Painel Lateral Recente */}
        <div className="bg-[#1351b4] rounded-md overflow-hidden shadow-sm flex flex-col text-white min-h-0">
           <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <h2 className="text-[11px] font-bold uppercase tracking-wider">Movimentações Recentes</h2>
              <div className="flex gap-1.5">
                 <div className="w-3 h-1 bg-white/30 rounded-full" />
                 <div className="w-1 h-1 bg-white/30 rounded-full" />
              </div>
           </div>
           <div className="flex-1 p-6 flex flex-col items-center justify-center opacity-60 text-center space-y-3 min-h-0">
              <TrendingUp className="w-10 h-10 mb-1" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma transação crítica recente</p>
              <div className="w-8 h-[1px] bg-white/20" />
              <p className="text-[9px] italic">Monitoramento em tempo real ativo</p>
           </div>
           <div className="p-4 bg-white/5 border-t border-white/10 text-center shrink-0">
              <button className="text-[9px] font-bold uppercase tracking-[0.2em] hover:underline">Ver Relatório Completo</button>
           </div>
        </div>
      </div>
      
      {/* Seção Inferior - Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 pb-2">
         {[
           { nome: 'Fundo de Reserva', status: 'Estável', valor: '75%', cor: 'bg-blue-500' },
           { nome: 'Obras & Manutenção', status: 'Atenção', valor: '40%', cor: 'bg-amber-500' },
           { nome: 'Eventos Sociais', status: 'Crítico', valor: '15%', cor: 'bg-rose-500' }
         ].map(item => (
           <div key={item.nome} className="bg-white border border-slate-200 rounded-md p-3 flex items-center gap-3 shadow-sm">
              <div className="w-1 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                 <div className={`w-full h-full ${item.cor} opacity-40`} />
              </div>
              <div className="min-w-0">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{item.nome}</p>
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.valor}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">— {item.status}</span>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}

