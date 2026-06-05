'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Play,
  Plus,
  Trash2,
  X,
  Loader2,
  Package,
  Pencil,
  DollarSign,
  User as UserIcon,
  Users,
  Calendar,
  CreditCard,
  PlusCircle,
  MinusCircle,
  ShoppingCart,
  CheckCircle,
  FileText,
  AlertTriangle,
  Store,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';

export default function VendasPage() {
  const [trabalhoAtivo, setTrabalhoAtivo] = useState<any>(null);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState<string>('');
  const [produtosAtivos, setProdutosAtivos] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Mostrar Cards de Valores
  const [mostrarCardsValores, setMostrarCardsValores] = useState(false);

  // Modal de Abertura de Turno
  const [modalAberturaAberto, setModalAberturaAberto] = useState(false);
  const [membrosSelecionados, setMembrosSelecionados] = useState<string[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<number[]>([]);
  const [enviandoTurno, setEnviandoTurno] = useState(false);

  // Form de Lançamento de Venda
  const [descricaoComprador, setDescricaoComprador] = useState('');
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidadeItem, setQuantidadeItem] = useState(1);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [statusPagamento, setStatusPagamento] = useState('PAGO');
  const [enviandoVenda, setEnviandoVenda] = useState(false);

  // Modal de Edição de Venda
  const [vendaEditando, setVendaEditando] = useState<any>(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');
  const [editMetodo, setEditMetodo] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCarrinho, setEditCarrinho] = useState<any[]>([]);

  useEffect(() => {
    inicializarDados();
  }, []);

  const inicializarDados = async () => {
    try {
      setCarregando(true);
      // 1. Buscar todos os trabalhos para ver se há algum ativo
      const [trabRes, pessoasRes, prodRes, eventosRes] = await Promise.all([
        api.get('/trabalhos'),
        api.get('/pessoas'),
        api.get('/produtos-venda'),
        api.get('/eventos')
      ]);

      setPessoas(pessoasRes.data);
      setProdutosCatalogo(prodRes.data.filter((p: any) => p.ativo));
      setEventos(eventosRes.data);

      // Filtra trabalhos do tipo GRUPO que estão ABERTO
      const ativo = trabRes.data.find(
        (t: any) => t.tipo === 'GRUPO' && t.status === 'ABERTO'
      );

      if (ativo) {
        setTrabalhoAtivo(ativo);
        await carregarDadosTurno(ativo.id);
      } else {
        setTrabalhoAtivo(null);
      }
    } catch (err) {
      console.error('Erro ao inicializar dados', err);
    } finally {
      setCarregando(false);
    }
  };

  const carregarDadosTurno = async (trabalhoId: number) => {
    try {
      const [vendasRes, produtosRes] = await Promise.all([
        api.get(`/vendas/trabalho/${trabalhoId}`),
        api.get(`/vendas/trabalho/${trabalhoId}/produtos`)
      ]);
      setVendas(vendasRes.data);
      setProdutosAtivos(produtosRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados do turno', err);
    }
  };

  // Iniciar Turno de Vendas
  const iniciarTurnoVendas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (membrosSelecionados.length === 0) {
      alert('Selecione pelo menos um membro para trabalhar no turno.');
      return;
    }
    if (produtosSelecionados.length === 0) {
      alert('Selecione pelo menos um produto para vender no turno.');
      return;
    }
    if (!eventoSelecionadoId) {
      alert('Selecione a qual evento este turno de vendas pertence.');
      return;
    }

    setEnviandoTurno(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const formatData = new Date().toLocaleDateString('pt-BR');

      // 1. Criar o Trabalho
      const trabalhoPayload = {
        descricao: `VENDAS - ${formatData}`,
        dataTrabalho: hoje,
        tipo: 'GRUPO',
        proporcao: 100,
        eventoId: Number(eventoSelecionadoId),
        membrosIds: membrosSelecionados.map(Number)
      };

      const trabalhoRes = await api.post('/trabalhos', trabalhoPayload);
      const novoTrabalho = trabalhoRes.data;

      // 2. Associar Produtos de Venda ao Trabalho
      await api.post(`/vendas/trabalho/${novoTrabalho.id}/produtos`, {
        produtosIds: produtosSelecionados
      });

      // Buscar o trabalho completo preenchido (com os membros e relações)
      const completoRes = await api.get(`/trabalhos/${novoTrabalho.id}`);

      setModalAberturaAberto(false);
      setMembrosSelecionados([]);
      setProdutosSelecionados([]);

      // Reinicializar
      setTrabalhoAtivo(completoRes.data);
      await carregarDadosTurno(novoTrabalho.id);
    } catch (err: any) {
      alert('Erro ao iniciar turno de vendas: ' + (err.response?.data?.message || err.message));
    } finally {
      setEnviandoTurno(false);
    }
  };

  // Carrinho de Compras (Nova Venda)
  const adicionarAoCarrinho = () => {
    if (!produtoSelecionadoId) return;
    const produto = produtosAtivos.find(p => p.id.toString() === produtoSelecionadoId);
    if (!produto) return;

    const existente = carrinho.find(item => item.produtoId === produto.id);
    if (existente) {
      setCarrinho(prev =>
        prev.map(item =>
          item.produtoId === produto.id
            ? { ...item, quantidade: item.quantidade + quantidadeItem, valorTotal: (item.quantidade + quantidadeItem) * item.valorUnitario }
            : item
        )
      );
    } else {
      setCarrinho(prev => [
        ...prev,
        {
          produtoId: produto.id,
          nome: produto.nome,
          quantidade: quantidadeItem,
          valorUnitario: produto.valor,
          valorTotal: quantidadeItem * produto.valor
        }
      ]);
    }

    setProdutoSelecionadoId('');
    setQuantidadeItem(1);
  };

  const removerDoCarrinho = (produtoId: number) => {
    setCarrinho(prev => prev.filter(item => item.produtoId !== produtoId));
  };

  const calcularTotalCarrinho = () => {
    return carrinho.reduce((acc, item) => acc + item.valorTotal, 0);
  };

  const confirmarVenda = async () => {
    if (carrinho.length === 0) {
      alert('O carrinho está vazio.');
      return;
    }

    setEnviandoVenda(true);
    try {
      const payload = {
        descricao: descricaoComprador,
        metodoPagamento,
        statusPagamento,
        trabalhoId: trabalhoAtivo.id,
        itens: carrinho.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade
        }))
      };

      await api.post('/vendas', payload);
      setCarrinho([]);
      setDescricaoComprador('');
      setMetodoPagamento('PIX');
      setStatusPagamento('PAGO');

      // Recarregar vendas
      await carregarDadosTurno(trabalhoAtivo.id);
    } catch (err: any) {
      alert('Erro ao registrar venda: ' + (err.response?.data?.message || err.message));
    } finally {
      setEnviandoVenda(false);
    }
  };

  // Excluir Venda
  const deletarVenda = async (id: number) => {
    if (!confirm('Deseja realmente estornar/excluir esta venda?')) return;
    try {
      await api.delete(`/vendas/${id}`);
      await carregarDadosTurno(trabalhoAtivo.id);
    } catch (err: any) {
      alert('Erro ao excluir venda: ' + (err.response?.data?.message || err.message));
    }
  };

  // Edição de Venda
  const abrirEdicaoVenda = (venda: any) => {
    setVendaEditando(venda);
    setEditDescricao(venda.descricao);
    setEditMetodo(venda.metodoPagamento);
    setEditStatus(venda.statusPagamento);
    setEditCarrinho(
      venda.itens.map((item: any) => ({
        produtoId: item.produto.id,
        nome: item.produto.nome,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal
      }))
    );
    setModalEdicaoAberto(true);
  };

  const salvarEdicaoVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editCarrinho.length === 0) {
      alert('O carrinho não pode ficar vazio.');
      return;
    }

    try {
      const payload = {
        descricao: editDescricao,
        metodoPagamento: editMetodo,
        statusPagamento: editStatus,
        trabalhoId: trabalhoAtivo.id,
        itens: editCarrinho.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade
        }))
      };

      await api.patch(`/vendas/${vendaEditando.id}`, payload);
      setModalEdicaoAberto(false);
      await carregarDadosTurno(trabalhoAtivo.id);
    } catch (err: any) {
      alert('Erro ao editar venda: ' + (err.response?.data?.message || err.message));
    }
  };

  // Fechamento de Turno / Encerrar Caixa
  const finalizarTurno = async () => {
    const pendentes = vendas.filter(v => v.statusPagamento === 'PENDENTE');
    let msg = 'Deseja realmente encerrar este turno de vendas?';
    if (pendentes.length > 0) {
      msg += ` Atenção: Existem ${pendentes.length} vendas com pagamento PENDENTE (Fiado). Ao fechar, o sistema gerará cobranças individuais para fiados e consolidará as demais vendas por método de pagamento.`;
    } else {
      msg += ' O sistema consolidará todas as vendas pagas por método de pagamento no financeiro do trabalho.';
    }

    if (!confirm(msg)) return;

    try {
      // Chama o endpoint de encerramento de turno que consolida as vendas
      await api.post(`/vendas/trabalho/${trabalhoAtivo.id}/fechar`);
      alert('Turno de vendas encerrado e consolidado com sucesso! O trabalho foi enviado para rateio e conciliação do administrador.');
      setTrabalhoAtivo(null);
      setVendas([]);
      setProdutosAtivos([]);
    } catch (err: any) {
      alert('Erro ao encerrar turno: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const toggleMembro = (id: string) => {
    setMembrosSelecionados(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleProduto = (id: number) => {
    setProdutosSelecionados(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  if (carregando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#1351b4] animate-spin" />
      </div>
    );
  }

  // Se NÃO houver turno ativo, mostra tela de Abertura
  if (!trabalhoAtivo) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-sm shadow-xl p-6 md:p-12 max-w-2xl text-center space-y-6 md:space-y-8 flex flex-col items-center mx-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#1351b4]/10 text-[#1351b4] rounded-full flex items-center justify-center animate-pulse">
            <Store className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <div className="space-y-2.5 md:space-y-3">
            <h1 className="text-2xl md:text-3xl font-black text-[#1351b4] uppercase tracking-tight">Vendas Não Iniciadas</h1>
            <p className="text-slate-500 font-bold text-xs md:text-sm max-w-md mx-auto uppercase tracking-tighter">
              Não há nenhuma sessão de vendas aberta no momento. Abra uma nova sessão para começar a vender.
            </p>
          </div>
          <button
            onClick={() => setModalAberturaAberto(true)}
            className="px-6 py-4 md:px-10 md:py-5 bg-[#1351b4] text-white rounded-sm font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-md flex items-center gap-3 group"
          >
            <Play className="w-3.5 h-3.5 fill-white group-hover:scale-110 transition-transform" />
            Iniciar Vendas
          </button>
        </div>

        {/* Modal de Abertura de Turno */}
        {modalAberturaAberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-4 md:px-8 md:py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-sm md:text-lg font-black text-[#1351b4] uppercase tracking-tight flex items-center gap-2">
                  <Play className="w-4 h-4 md:w-5 md:h-5 fill-[#1351b4] text-[#1351b4]" /> Configurar Vendas
                </h2>
                <button onClick={() => setModalAberturaAberto(false)} className="p-1 md:p-2 text-slate-400 hover:text-slate-900">
                  <X className="w-5 h-5 md:w-6 h-6" />
                </button>
              </div>

              <form onSubmit={iniciarTurnoVendas} className="p-4 md:p-8 space-y-4 md:space-y-6">
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    1. A qual evento este turno pertence?
                  </label>
                  <select
                    value={eventoSelecionadoId}
                    onChange={(e) => setEventoSelecionadoId(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 uppercase outline-none focus:border-[#1351b4] appearance-none"
                    required
                  >
                    <option value="">Selecione o evento...</option>
                    {eventos.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:space-y-3">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    2. Quem vai trabalhar hoje? (Equipe)
                  </label>
                  <div className="border border-slate-200 bg-slate-50 rounded-sm p-3 md:p-4 max-h-48 overflow-y-auto space-y-1.5 md:space-y-2">
                    {pessoas.map((p) => {
                      const isChecked = membrosSelecionados.includes(p.id.toString());
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center justify-between p-2.5 md:p-3 rounded-sm border cursor-pointer transition-all ${isChecked ? 'bg-white border-[#1351b4]/40 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100'
                            }`}
                        >
                          <span className="text-[11px] md:text-xs font-black uppercase text-slate-600 tracking-tight">{p.nome}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMembro(p.id.toString())}
                            className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#1351b4] border-slate-300 rounded focus:ring-[#1351b4]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 md:space-y-3">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    3. O que será vendido hoje? (Produtos)
                  </label>
                  <div className="border border-slate-200 bg-slate-50 rounded-sm p-3 md:p-4 max-h-48 overflow-y-auto space-y-1.5 md:space-y-2">
                    {produtosCatalogo.map((prod) => {
                      const isChecked = produtosSelecionados.includes(prod.id);
                      return (
                        <label
                          key={prod.id}
                          className={`flex items-center justify-between p-2.5 md:p-3 rounded-sm border cursor-pointer transition-all ${isChecked ? 'bg-white border-[#1351b4]/40 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100'
                            }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] md:text-xs font-black uppercase text-slate-600 tracking-tight">{prod.nome}</span>
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-0.5">{formatarMoeda(prod.valor)}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProduto(prod.id)}
                            className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#1351b4] border-slate-300 rounded focus:ring-[#1351b4]"
                          />
                        </label>
                      );
                    })}
                    {produtosCatalogo.length === 0 && (
                      <p className="text-[11px] md:text-xs font-bold text-rose-500 uppercase text-center py-4">Nenhum produto cadastrado e ativo. Vá no menu "Produtos de Venda" para cadastrar.</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 md:pt-4 flex gap-2 md:gap-4">
                  <button
                    type="button"
                    onClick={() => setModalAberturaAberto(false)}
                    className="flex-1 py-3 md:py-4 border border-slate-200 text-slate-500 rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoTurno}
                    className="flex-1 py-3 md:py-4 bg-[#1351b4] text-white rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] flex items-center justify-center gap-2"
                  >
                    {enviandoTurno && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirmar e Abrir Caixa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // CÁLCULOS DOS CARDS DE AUDITORIA
  const totalPagoTurno = vendas.filter(v => v.statusPagamento === 'PAGO').reduce((acc, v) => acc + v.valorTotal, 0);
  const totalPendenteTurno = vendas.filter(v => v.statusPagamento === 'PENDENTE').reduce((acc, v) => acc + v.valorTotal, 0);
  const faturamentoTurno = totalPagoTurno + totalPendenteTurno;

  // Se HOUVER turno ativo, exibe o painel de operação
  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-6">
      {/* Cabeçalho do Caixa */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-white border border-slate-200 p-4 md:p-6 rounded-sm shadow-sm">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
            Sessão de Vendas Ativa
          </span>
          <h1 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">
            {trabalhoAtivo.descricao}
          </h1>
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-slate-400 text-[10px] md:text-xs font-bold uppercase">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#1351b4]" /> {new Date(trabalhoAtivo.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
            
            {/* Tooltip para visualizar Trabalhadores */}
            <div className="relative group/tooltip flex items-center">
              <span className="flex items-center gap-1.5 cursor-help hover:text-[#1351b4] transition-colors">
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#1351b4]" />
                {trabalhoAtivo.membros?.length || 0} Trabalhadores
              </span>
              
              {trabalhoAtivo.membros && trabalhoAtivo.membros.length > 0 && (
                <div className="absolute left-0 top-full mt-2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider rounded-sm p-3 shadow-xl border border-slate-800 z-[150] w-48 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="absolute left-6 bottom-full -mb-1 w-2.5 h-2.5 bg-slate-900 border-l border-t border-slate-800 rotate-45" />
                  <span className="text-slate-400 block mb-2 pb-1 border-b border-slate-800 text-[8px] tracking-widest font-black">Equipe de Vendas</span>
                  <ul className="space-y-1">
                    {trabalhoAtivo.membros.map((m: any) => (
                      <li key={m.id} className="truncate text-white font-bold">{m.pessoa?.nome || 'Membro'}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setMostrarCardsValores(!mostrarCardsValores)}
            className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {mostrarCardsValores ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {mostrarCardsValores ? 'Ocultar Resumo' : 'Mostrar Resumo'}
          </button>
          <button
            onClick={finalizarTurno}
            className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3.5 bg-rose-600 text-white rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Finalizar Vendas
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      {mostrarCardsValores && (
        <div className="grid grid-cols-3 gap-2 md:gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-2.5 md:p-6 flex items-center justify-between">
            <div className="space-y-0.5 md:space-y-1 min-w-0">
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block truncate">Total Caixa</span>
              <p className="text-xs sm:text-sm md:text-2xl font-black text-slate-800 truncate">{formatarMoeda(totalPagoTurno)}</p>
            </div>
            <div className="w-7 h-7 md:w-12 md:h-12 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-3.5 h-3.5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-2.5 md:p-6 flex items-center justify-between">
            <div className="space-y-0.5 md:space-y-1 min-w-0">
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block truncate">Pendente (Fiado)</span>
              <p className="text-xs sm:text-sm md:text-2xl font-black text-amber-500 truncate">{formatarMoeda(totalPendenteTurno)}</p>
            </div>
            <div className="w-7 h-7 md:w-12 md:h-12 rounded bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 md:w-6 md:h-6" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-2.5 md:p-6 flex items-center justify-between">
            <div className="space-y-0.5 md:space-y-1 min-w-0">
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block truncate">Faturamento</span>
              <p className="text-xs sm:text-sm md:text-2xl font-black text-[#1351b4] truncate">{formatarMoeda(faturamentoTurno)}</p>
            </div>
            <div className="w-7 h-7 md:w-12 md:h-12 rounded bg-[#1351b4]/10 text-[#1351b4] flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Coluna Esquerda: Lançamento de Vendas */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-sm shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
          <h2 className="text-xs font-black text-[#1351b4] uppercase tracking-widest border-b border-slate-100 pb-2 md:pb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Registrar Nova Venda
          </h2>

          {/* Form */}
          <div className="space-y-3 md:space-y-4">
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição/Comprador (Nome ou Mesa)</label>
              <input
                type="text"
                placeholder="Ex: João da Silva ou Mesa 12"
                value={descricaoComprador}
                onChange={(e) => setDescricaoComprador(e.target.value)}
                className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 uppercase focus:border-[#1351b4] outline-none transition-colors"
              />
            </div>

            {/* Adicionar Item */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end bg-slate-50/50 p-3 md:p-4 border border-slate-200/50 rounded-sm">
              <div className="md:col-span-6 space-y-1.5 md:space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto</label>
                <select
                  value={produtoSelecionadoId}
                  onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-white border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 uppercase outline-none focus:border-[#1351b4] appearance-none"
                >
                  <option value="">Selecione o produto...</option>
                  {produtosAtivos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} - {formatarMoeda(p.valor)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 md:col-span-6 md:contents">
                <div className="flex-1 md:col-span-4 space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd</label>
                  <div className="flex items-center border border-slate-200 rounded-sm bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantidadeItem(prev => Math.max(1, prev - 1))}
                      className="p-2.5 md:p-4 text-slate-400 hover:text-[#1351b4] transition-colors"
                    >
                      <MinusCircle className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <span className="flex-1 text-center font-black text-xs md:text-sm text-slate-700">{quantidadeItem}</span>
                    <button
                      type="button"
                      onClick={() => setQuantidadeItem(prev => prev + 1)}
                      className="p-2.5 md:p-4 text-slate-400 hover:text-[#1351b4] transition-colors"
                    >
                      <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>

                <div className="w-14 md:w-auto md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 md:hidden">Add</label>
                  <button
                    type="button"
                    onClick={adicionarAoCarrinho}
                    disabled={!produtoSelecionadoId}
                    className="w-full py-2.5 md:py-4.5 bg-[#1351b4] text-white rounded-sm font-black text-[10px] uppercase tracking-widest hover:bg-[#0047b7] transition-all flex items-center justify-center disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Carrinho de Compras */}
          {carrinho.length > 0 && (
            <div className="space-y-3 md:space-y-4 border-t border-slate-100 pt-4 md:pt-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produtos no Carrinho</label>
              <div className="border border-slate-200 rounded-sm divide-y divide-slate-100 bg-white">
                {carrinho.map(item => (
                  <div key={item.produtoId} className="flex items-center justify-between p-3 md:p-4">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[11px] md:text-xs tracking-tight">{item.nome}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        {item.quantidade}x {formatarMoeda(item.valorUnitario)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                      <span className="font-black text-slate-700 text-xs md:text-sm">{formatarMoeda(item.valorTotal)}</span>
                      <button
                        type="button"
                        onClick={() => removerDoCarrinho(item.produtoId)}
                        className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totalizador */}
              <div className="flex items-center justify-between p-3 md:p-6 bg-slate-50 border border-slate-100 rounded-sm">
                <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Total da Venda</span>
                <span className="text-sm sm:text-base md:text-xl font-black text-emerald-600">{formatarMoeda(calcularTotalCarrinho())}</span>
              </div>

              {/* Configurações do Pagamento */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagamento</label>
                  <select
                    value={metodoPagamento}
                    onChange={(e) => setMetodoPagamento(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 outline-none focus:border-[#1351b4]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">DINHEIRO</option>
                    <option value="DEBITO">DÉBITO</option>
                    <option value="CREDITO">CRÉDITO</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <select
                    value={statusPagamento}
                    onChange={(e) => setStatusPagamento(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 outline-none focus:border-[#1351b4]"
                  >
                    <option value="PAGO">PAGO</option>
                    <option value="PENDENTE">PENDENTE</option>
                  </select>
                </div>
              </div>

              {/* Concluir */}
              <button
                type="button"
                onClick={confirmarVenda}
                disabled={enviandoVenda}
                className="w-full py-3.5 md:py-5 bg-emerald-600 text-white rounded-sm font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {enviandoVenda ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />}
                Concluir Venda
              </button>
            </div>
          )}
        </div>

        {/* Coluna Direita: Auditoria & Vendas Realizadas */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-sm shadow-sm p-4 md:p-6 space-y-4 md:space-y-6">
          <h2 className="text-xs font-black text-[#1351b4] uppercase tracking-widest border-b border-slate-100 pb-2 md:pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Vendas Recentes
          </h2>

          <div className="space-y-3 md:space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {vendas.map(venda => (
              <div key={venda.id} className="border border-slate-200 p-3 md:p-4 rounded-sm shadow-sm space-y-2 md:space-y-3 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 text-[11px] md:text-xs uppercase tracking-tight leading-tight truncate">
                      {venda.descricao}
                    </h3>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                      {venda.metodoPagamento} -
                      <span className={venda.statusPagamento === 'PAGO' ? 'text-emerald-500 ml-1' : 'text-amber-500 ml-1'}>
                        {venda.statusPagamento}
                      </span>
                    </p>
                  </div>
                  <span className="font-black text-slate-700 text-xs md:text-sm shrink-0">{formatarMoeda(venda.valorTotal)}</span>
                </div>

                {/* Sub Itens */}
                <div className="bg-slate-50 border border-slate-100 rounded p-1.5 md:p-2 text-[10px] md:text-[11px] text-slate-500 space-y-0.5 md:space-y-1">
                  {venda.itens.map((item: any) => (
                    <div key={item.id} className="flex justify-between font-bold uppercase tracking-tight">
                      <span className="truncate mr-2">{item.quantidade}x {item.produto.nome}</span>
                      <span className="shrink-0">{formatarMoeda(item.valorTotal)}</span>
                    </div>
                  ))}
                </div>

                {/* Ações */}
                <div className="flex justify-end gap-2 pt-1.5 md:pt-2 border-t border-slate-100">
                  <button
                    onClick={() => abrirEdicaoVenda(venda)}
                    className="p-1.5 md:p-2 text-slate-400 hover:text-[#1351b4] transition-colors border border-slate-100 rounded bg-white hover:bg-slate-50 shadow-sm"
                    title="Editar venda"
                  >
                    <Pencil className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </button>
                  <button
                    onClick={() => deletarVenda(venda.id)}
                    className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 transition-colors border border-slate-100 rounded bg-white hover:bg-rose-50 shadow-sm"
                    title="Estornar venda"
                  >
                    <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {vendas.length === 0 && (
              <div className="text-center py-20">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma venda registrada no turno</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edição de Venda */}
      {modalEdicaoAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-4 md:px-8 md:py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-sm md:text-lg font-black text-[#1351b4] uppercase tracking-tight flex items-center gap-2">
                <Pencil className="w-4 h-4 md:w-5 md:h-5" /> Editar Lançamento de Venda
              </h2>
              <button onClick={() => setModalEdicaoAberto(false)} className="p-1 md:p-2 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoVenda} className="p-4 md:p-8 space-y-4 md:space-y-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição/Comprador (Nome ou Mesa)</label>
                <input
                  type="text"
                  required
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 uppercase focus:border-[#1351b4] outline-none"
                />
              </div>

              {/* Grid Carrinho de Edição */}
              <div className="space-y-3 md:space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Itens da Venda</label>
                <div className="border border-slate-200 rounded-sm divide-y divide-slate-100 bg-white p-1 md:p-2">
                  {editCarrinho.map(item => (
                    <div key={item.produtoId} className="flex items-center justify-between p-2.5 md:p-3">
                      <div>
                        <span className="text-xs font-black uppercase text-slate-600">{item.nome}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditCarrinho(prev =>
                                prev.map(i =>
                                  i.produtoId === item.produtoId
                                    ? { ...i, quantidade: Math.max(1, i.quantidade - 1), valorTotal: Math.max(1, i.quantidade - 1) * i.valorUnitario }
                                    : i
                                )
                              );
                            }}
                            className="text-slate-400 hover:text-[#1351b4]"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-black text-slate-700">{item.quantidade}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditCarrinho(prev =>
                                prev.map(i =>
                                  i.produtoId === item.produtoId
                                    ? { ...i, quantidade: i.quantidade + 1, valorTotal: (i.quantidade + 1) * i.valorUnitario }
                                    : i
                                )
                              );
                            }}
                            className="text-slate-400 hover:text-[#1351b4]"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <span className="font-black text-slate-700 text-sm">{formatarMoeda(item.valorTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagamento</label>
                  <select
                    value={editMetodo}
                    onChange={(e) => setEditMetodo(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 outline-none focus:border-[#1351b4]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">DINHEIRO</option>
                    <option value="DEBITO">DÉBITO</option>
                    <option value="CREDITO">CRÉDITO</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs md:text-sm font-black text-slate-700 outline-none focus:border-[#1351b4]"
                  >
                    <option value="PAGO">PAGO</option>
                    <option value="PENDENTE">PENDENTE</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 md:pt-4 flex gap-2 md:gap-4">
                <button
                  type="button"
                  onClick={() => setModalEdicaoAberto(false)}
                  className="flex-1 py-3 md:py-4 border border-slate-200 text-slate-500 rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 md:py-4 bg-[#1351b4] text-white rounded-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] flex items-center justify-center"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
