'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Play, Plus, Trash2, X, Loader2, DollarSign,
  Users, Calendar, CheckCircle, Check, Store, Eye, EyeOff, Minus, QrCode, ShoppingBag, FileText
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
  const [mostrarVendasRecentes, setMostrarVendasRecentes] = useState(false);

  // Modal de Abertura de Turno
  const [modalAberturaAberto, setModalAberturaAberto] = useState(false);
  const [membrosSelecionados, setMembrosSelecionados] = useState<string[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<number[]>([]);
  const [enviandoTurno, setEnviandoTurno] = useState(false);

  // Carrinho e Checkout
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);
  const [descricaoComprador, setDescricaoComprador] = useState('');
  const [telefoneComprador, setTelefoneComprador] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [statusPagamento, setStatusPagamento] = useState('PAGO');
  const [enviandoVenda, setEnviandoVenda] = useState(false);

  // Fluxo de Sucesso
  const [modalPixAberto, setModalPixAberto] = useState(false);
  const [ultimaVendaValor, setUltimaVendaValor] = useState(0);

  useEffect(() => {
    inicializarDados();
  }, []);

  const inicializarDados = async () => {
    try {
      setCarregando(true);
      const [trabRes, pessoasRes, prodRes, eventosRes] = await Promise.all([
        api.get('/trabalhos'),
        api.get('/pessoas'),
        api.get('/produtos-venda'),
        api.get('/eventos')
      ]);

      setPessoas(pessoasRes.data);
      setProdutosCatalogo(prodRes.data.filter((p: any) => p.ativo));
      setEventos(eventosRes.data);

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
    if (membrosSelecionados.length === 0 || produtosSelecionados.length === 0 || !eventoSelecionadoId) {
      alert('Preencha todos os campos do turno.');
      return;
    }

    setEnviandoTurno(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const formatData = new Date().toLocaleDateString('pt-BR');

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

      await api.post(`/vendas/trabalho/${novoTrabalho.id}/produtos`, {
        produtosIds: produtosSelecionados
      });

      const completoRes = await api.get(`/trabalhos/${novoTrabalho.id}`);

      setModalAberturaAberto(false);
      setMembrosSelecionados([]);
      setProdutosSelecionados([]);
      setTrabalhoAtivo(completoRes.data);
      await carregarDadosTurno(novoTrabalho.id);
    } catch (err: any) {
      alert('Erro ao iniciar turno: ' + (err.response?.data?.message || err.message));
    } finally {
      setEnviandoTurno(false);
    }
  };

  const finalizarTurno = async () => {
    if (!confirm('Deseja realmente encerrar este turno de vendas? As vendas serão consolidadas.')) return;
    try {
      await api.post(`/vendas/trabalho/${trabalhoAtivo.id}/fechar`);
      alert('Turno encerrado com sucesso!');
      setTrabalhoAtivo(null);
      setVendas([]);
      setProdutosAtivos([]);
    } catch (err: any) {
      alert('Erro ao encerrar: ' + (err.response?.data?.message || err.message));
    }
  };

  // Ações do Carrinho
  const handleAddProduct = (produto: any) => {
    setCarrinho(prev => {
      const existente = prev.find(item => item.produtoId === produto.id);
      if (existente) {
        return prev.map(item =>
          item.produtoId === produto.id
            ? { ...item, quantidade: item.quantidade + 1, valorTotal: (item.quantidade + 1) * item.valorUnitario }
            : item
        );
      } else {
        return [...prev, {
          produtoId: produto.id,
          nome: produto.nome,
          quantidade: 1,
          valorUnitario: produto.valor,
          valorTotal: produto.valor
        }];
      }
    });
  };

  const handleRemoveProduct = (produtoId: number) => {
    setCarrinho(prev => {
      const existente = prev.find(item => item.produtoId === produtoId);
      if (existente && existente.quantidade > 1) {
        return prev.map(item =>
          item.produtoId === produtoId
            ? { ...item, quantidade: item.quantidade - 1, valorTotal: (item.quantidade - 1) * item.valorUnitario }
            : item
        );
      } else {
        return prev.filter(item => item.produtoId !== produtoId);
      }
    });
  };

  const getProductQuantity = (produtoId: number) => {
    const item = carrinho.find(i => i.produtoId === produtoId);
    return item ? item.quantidade : 0;
  };

  const calcularTotalCarrinho = () => carrinho.reduce((acc, item) => acc + item.valorTotal, 0);

  const abrirCheckout = () => {
    if (carrinho.length === 0) return;
    setModalCheckoutAberto(true);
  };

  const confirmarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrinho.length === 0) return;

    setEnviandoVenda(true);
    try {
      const payload = {
        descricao: descricaoComprador || 'Consumidor Final',
        telefone: telefoneComprador || null,
        metodoPagamento,
        statusPagamento,
        trabalhoId: trabalhoAtivo.id,
        itens: carrinho.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade
        }))
      };

      await api.post('/vendas', payload);

      const totalDaVenda = calcularTotalCarrinho();

      setCarrinho([]);
      setDescricaoComprador('');
      setTelefoneComprador('');
      setModalCheckoutAberto(false);

      await carregarDadosTurno(trabalhoAtivo.id);

      // Se for PIX e estiver pago, mostrar a tela da Chave Pix
      if (metodoPagamento === 'PIX' && statusPagamento === 'PAGO') {
        setUltimaVendaValor(totalDaVenda);
        setModalPixAberto(true);
      } else {
        alert('Venda registrada com sucesso!');
      }

    } catch (err: any) {
      alert('Erro ao registrar venda: ' + (err.response?.data?.message || err.message));
    } finally {
      setEnviandoVenda(false);
    }
  };

  const deletarVenda = async (id: number) => {
    if (!confirm('Deseja estornar esta venda?')) return;
    try {
      await api.delete(`/vendas/${id}`);
      await carregarDadosTurno(trabalhoAtivo.id);
    } catch (err: any) {
      alert('Erro ao estornar: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (carregando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#1351b4] animate-spin" />
      </div>
    );
  }

  // TELA DE INICIAR TURNO
  if (!trabalhoAtivo) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-8 flex flex-col items-center mx-4 animate-in fade-in duration-300">
          <div className="w-20 h-20 bg-[#1351b4]/10 text-[#1351b4] rounded-full flex items-center justify-center">
            <Store className="w-10 h-10" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Vendas Fechada</h1>
            <p className="text-slate-500 font-bold text-sm max-w-md mx-auto uppercase tracking-tighter">
              Abra uma nova sessão de vendas para começar a vender.
            </p>
          </div>
          <button
            onClick={() => setModalAberturaAberto(true)}
            className="w-full py-5 bg-[#1351b4] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-lg shadow-[#1351b4]/30 flex items-center justify-center gap-3 active:scale-95"
          >
            <Play className="w-5 h-5 fill-white" />
            Iniciar Vendas
          </button>
        </div>

        {/* Modal Abertura Simples */}
        {modalAberturaAberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">Configurar Caixa</h2>
                <button onClick={() => setModalAberturaAberto(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={iniciarTurnoVendas} className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento</label>
                  <select
                    value={eventoSelecionadoId}
                    onChange={(e) => setEventoSelecionadoId(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 uppercase outline-none focus:border-[#1351b4]"
                    required
                  >
                    <option value="">Selecione o evento...</option>
                    {eventos.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendentes (Equipe)</label>
                  <div className="border border-slate-200 bg-slate-50 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                    {pessoas.map((p) => (
                      <label key={p.id} className="flex items-center justify-between p-3 rounded-lg border-b border-transparent hover:bg-slate-100 cursor-pointer">
                        <span className="text-xs font-black uppercase text-slate-600 tracking-tight">{p.nome}</span>
                        <input
                          type="checkbox"
                          checked={membrosSelecionados.includes(p.id.toString())}
                          onChange={() => {
                            setMembrosSelecionados(prev => prev.includes(p.id.toString()) ? prev.filter(m => m !== p.id.toString()) : [...prev, p.id.toString()]);
                          }}
                          className="w-4 h-4 text-[#1351b4] border-slate-300 rounded focus:ring-[#1351b4]"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lanches Disponíveis</label>
                  <div className="border border-slate-200 bg-slate-50 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                    {produtosCatalogo.map((prod) => (
                      <label key={prod.id} className="flex items-center justify-between p-3 rounded-lg border-b border-transparent hover:bg-slate-100 cursor-pointer">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase text-slate-600 tracking-tight">{prod.nome}</span>
                          <span className="text-[10px] font-bold text-slate-400 mt-0.5">{formatarMoeda(prod.valor)}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={produtosSelecionados.includes(prod.id)}
                          onChange={() => {
                            setProdutosSelecionados(prev => prev.includes(prod.id) ? prev.filter(p => p !== prod.id) : [...prev, prod.id]);
                          }}
                          className="w-4 h-4 text-[#1351b4] border-slate-300 rounded focus:ring-[#1351b4]"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={enviandoTurno}
                  className="w-full py-4 bg-[#1351b4] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#0047b7] flex items-center justify-center gap-2"
                >
                  {enviandoTurno && <Loader2 className="w-4 h-4 animate-spin" />}
                  Abrir Caixa
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TELA DE VENDAS (PDV MOBILE)
  const faturamentoTurno = vendas.reduce((acc, v) => acc + v.valorTotal, 0);

  return (
    <div className="h-full flex flex-col pb-32">
      {/* Cabeçalho do Caixa */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2">
              Caixa Aberto
            </span>
            <h1 className="text-base font-black text-slate-800 uppercase tracking-tight">
              {trabalhoAtivo.descricao}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {new Date(trabalhoAtivo.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </p>
          </div>
          <button onClick={finalizarTurno} className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            Encerrar
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMostrarCardsValores(!mostrarCardsValores)}
            className="flex-1 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {mostrarCardsValores ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Caixa: {formatarMoeda(faturamentoTurno)}
          </button>
          <button
            onClick={() => setMostrarVendasRecentes(true)}
            className="flex-1 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            Extrato
          </button>
        </div>

        {mostrarCardsValores && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95">
            <div className="bg-[#1351b4]/5 border border-[#1351b4]/10 rounded-xl p-3">
              <span className="text-[9px] font-black text-[#1351b4] uppercase tracking-widest">Vendas Concluídas</span>
              <p className="text-lg font-black text-[#1351b4] mt-1">{vendas.filter(v => v.statusPagamento === 'PAGO').length}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Receita Total</span>
              <p className="text-lg font-black text-emerald-600 mt-1">{formatarMoeda(faturamentoTurno)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Lanches */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
          Toque para adicionar
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {produtosAtivos.map(prod => {
            const qtd = getProductQuantity(prod.id);
            return (
              <div
                key={prod.id}
                className={`bg-white border rounded-2xl p-4 flex flex-col items-center text-center relative transition-all duration-200 shadow-sm
                    ${qtd > 0 ? 'border-[#1351b4] ring-1 ring-[#1351b4]/30 scale-[1.02]' : 'border-slate-200'}`}
              >
                {qtd > 0 && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#1351b4] text-white rounded-full flex items-center justify-center text-xs font-black shadow-md z-10 animate-in zoom-in">
                    {qtd}
                  </div>
                )}

                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-400">
                  <ShoppingBag className="w-7 h-7" />
                </div>

                <h3 className="text-[11px] md:text-xs font-black text-slate-800 uppercase leading-tight line-clamp-2 min-h-[2rem] mb-1">{prod.nome}</h3>
                <p className="text-sm font-black text-slate-500 mb-4">{formatarMoeda(prod.valor)}</p>

                {qtd === 0 ? (
                  <button onClick={() => handleAddProduct(prod)} className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-[#1351b4] rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between bg-slate-100 rounded-xl p-1">
                    <button onClick={() => handleRemoveProduct(prod.id)} className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm active:scale-95 transition-transform">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-black text-slate-800 text-sm">{qtd}</span>
                    <button onClick={() => handleAddProduct(prod)} className="w-9 h-9 flex items-center justify-center bg-[#1351b4] text-white rounded-lg shadow-sm active:scale-95 transition-transform">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Bar do Carrinho */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-6 bg-white border-t border-slate-200/80 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] lg:pl-64 animate-in slide-in-from-bottom-full duration-300">
          <div className="w-full mx-auto flex items-center justify-between gap-4 max-w-7xl">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total ({carrinho.reduce((a, b) => a + b.quantidade, 0)} itens)</span>
              <span className="text-xl md:text-2xl font-black text-[#1351b4]">{formatarMoeda(calcularTotalCarrinho())}</span>
            </div>
            <button
              onClick={abrirCheckout}
              className="flex-1 max-w-[200px] py-4 md:py-5 bg-[#1351b4] text-white rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-lg shadow-[#1351b4]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Avançar <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {modalCheckoutAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Finalizar Pedido</h2>
              <button onClick={() => setModalCheckoutAberto(false)} className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmarVenda} className="p-6 space-y-6">

              {/* Resumo Enxuto */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                {carrinho.map(item => (
                  <div key={item.produtoId} className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                    <span>{item.quantidade}x {item.nome}</span>
                    <span>{formatarMoeda(item.valorTotal)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center mt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</span>
                  <span className="text-lg font-black text-emerald-600">{formatarMoeda(calcularTotalCarrinho())}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Comprador</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={descricaoComprador}
                  onChange={(e) => setDescricaoComprador(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase outline-none focus:border-[#1351b4] focus:ring-2 focus:ring-[#1351b4]/20 transition-all"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 11999999999"
                  value={telefoneComprador}
                  onChange={(e) => setTelefoneComprador(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase outline-none focus:border-[#1351b4] focus:ring-2 focus:ring-[#1351b4]/20 transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMetodoPagamento('PIX')} className={`py-3 rounded-xl border font-black text-xs uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${metodoPagamento === 'PIX' ? 'bg-[#1351b4]/10 border-[#1351b4] text-[#1351b4]' : 'bg-white border-slate-200 text-slate-400'}`}>
                    <QrCode className="w-5 h-5" /> PIX
                  </button>
                  <button type="button" onClick={() => setMetodoPagamento('DINHEIRO')} className={`py-3 rounded-xl border font-black text-xs uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${metodoPagamento === 'DINHEIRO' ? 'bg-[#1351b4]/10 border-[#1351b4] text-[#1351b4]' : 'bg-white border-slate-200 text-slate-400'}`}>
                    <DollarSign className="w-5 h-5" /> Dinheiro
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={enviandoVenda}
                className="w-full py-5 bg-[#1351b4] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#0047b7] flex items-center justify-center gap-2 shadow-lg shadow-[#1351b4]/30"
              >
                {enviandoVenda ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Confirmar Venda
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de PIX (Sucesso) */}
      {modalPixAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1351b4] sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full h-full sm:h-auto sm:max-w-sm sm:rounded-3xl shadow-2xl flex flex-col p-8 items-center text-center justify-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 delay-150">
              <Check className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Pedido Registrado</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Pague com PIX para a Igreja</p>

            <div className="bg-slate-50 border-2 border-dashed border-slate-200 w-full rounded-2xl p-6 mb-8 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor a Transferir</span>
              <p className="text-4xl font-black text-[#1351b4] mt-2">{formatarMoeda(ultimaVendaValor)}</p>
            </div>

            <div className="w-full space-y-2 mb-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave PIX (E-mail ou CNPJ)</p>
              <div className="bg-slate-100 p-4 rounded-xl flex items-center justify-center">
                <span className="text-sm font-black text-slate-700 select-all">chavepix@igreja.com</span>
              </div>
            </div>

            <button
              onClick={() => setModalPixAberto(false)}
              className="w-full py-5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nova Venda
            </button>
          </div>
        </div>
      )}

      {/* Modal de Vendas Recentes (Auditoria) */}
      {mostrarVendasRecentes && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white w-full sm:max-w-lg h-[80vh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1351b4]" /> Vendas do Turno
              </h2>
              <button onClick={() => setMostrarVendasRecentes(false)} className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {vendas.length === 0 && (
                <p className="text-center text-xs font-bold text-slate-400 uppercase mt-10">Nenhuma venda registrada ainda.</p>
              )}
              {vendas.map(venda => (
                <div key={venda.id} className="border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight">{venda.descricao}</span>
                      {venda.telefone && (
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">{venda.telefone}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">{venda.metodoPagamento}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${venda.statusPagamento === 'PAGO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {venda.statusPagamento}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-[#1351b4] text-sm">{formatarMoeda(venda.valorTotal)}</span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-500 font-bold uppercase space-y-1">
                    {venda.itens.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantidade}x {item.produto.nome}</span>
                        <span>{formatarMoeda(item.valorTotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button onClick={() => deletarVenda(venda.id)} className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg">
                      <Trash2 className="w-3 h-3" /> Estornar Venda
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

