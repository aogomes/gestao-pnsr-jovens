'use client';

import React, { useEffect, useState, Fragment } from 'react';
import { api } from '@/lib/api';
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Calendar,
  DollarSign,
  User as UserIcon,
  Users,
  Activity,
  Briefcase,
  CheckCircle2,
  List,
  ChevronDown,
  Trophy,
  CalendarDays,
  Banknote,
  Percent,
  Search,
  FileText,
  Pencil, Save,
  Package,
  ArrowDownCircle,
  MoreVertical,
  Eye,
  EyeOff,
  History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TrabalhosPage() {
  const [abaAtiva, setAbaAtiva] = useState<'TRABALHOS' | 'PRODUTOS' | 'RELATORIOS'>('TRABALHOS');
  const [subTabRelatorios, setSubTabRelatorios] = useState<'GERAL' | 'PESSOAS' | 'PENDENCIAS'>('GERAL');
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState<string>('');
  const [menuAcaoAbertoId, setMenuAcaoAbertoId] = useState<number | null>(null);
  const [menuCabecalhoAberto, setMenuCabecalhoAberto] = useState(false);
  const [historicoPessoaAbertoId, setHistoricoPessoaAbertoId] = useState<number | null>(null);
  const [valoresCardsVisiveisMobile, setValoresCardsVisiveisMobile] = useState(false);

  // Estados de Trabalhos
  const [trabalhos, setTrabalhos] = useState<any[]>([]);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados de Produtos de Venda
  const [produtos, setProdutos] = useState<any[]>([]);
  const [termoBuscaProdutos, setTermoBuscaProdutos] = useState('');
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [modalGerenciarProdutosAberto, setModalGerenciarProdutosAberto] = useState(false);
  const [enviandoProduto, setEnviandoProduto] = useState(false);
  const [novoProdutoInline, setNovoProdutoInline] = useState(false);
  const [editandoProdutoId, setEditandoProdutoId] = useState<number | null>(null);
  const [dadosEdicaoProduto, setDadosEdicaoProduto] = useState({ nome: '', valor: '', ativo: true });

  const iniciarEdicaoProduto = (produto?: any) => {
    if (produto) {
      setEditandoProdutoId(produto.id);
      setDadosEdicaoProduto({
        nome: produto.nome,
        valor: produto.valor.toString(),
        ativo: produto.ativo
      });
      setNovoProdutoInline(false);
    } else {
      setNovoProdutoInline(true);
      setEditandoProdutoId(null);
      setDadosEdicaoProduto({ nome: '', valor: '', ativo: true });
    }
  };

  const cancelarEdicaoProduto = () => {
    setNovoProdutoInline(false);
    setEditandoProdutoId(null);
  };

  const salvarProdutoInline = async () => {
    const valor = parseFloat(dadosEdicaoProduto.valor);
    if (isNaN(valor) || valor <= 0) {
      alert('Insira um valor numérico válido.');
      return;
    }

    setEnviandoProduto(true);
    try {
      const payload = {
        nome: dadosEdicaoProduto.nome,
        valor,
        ativo: dadosEdicaoProduto.ativo
      };

      if (editandoProdutoId) {
        await api.patch(`/produtos-venda/${editandoProdutoId}`, payload);
      } else {
        await api.post('/produtos-venda', payload);
      }
      cancelarEdicaoProduto();
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setEnviandoProduto(false);
    }
  };

  const [dadosFormProduto, setDadosFormProduto] = useState({
    id: null as number | null,
    nome: '',
    valor: '',
    ativo: true
  });

  // Modal de Cadastro de Trabalho
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [dadosForm, setDadosForm] = useState({
    id: null as number | null,
    descricao: '',
    dataTrabalho: new Date().toLocaleDateString('sv'),
    tipo: 'GRUPO',
    proporcao: '100',
    eventoId: '',
    pessoaId: '',
    membrosIds: [] as string[],
    status: 'ABERTO'
  });

  // Modal de Recebimentos
  const [modalRecebimentosAberto, setModalRecebimentosAberto] = useState(false);
  const [trabalhoSelecionado, setTrabalhoSelecionado] = useState<any>(null);
  const [editandoRecebimentoId, setEditandoRecebimentoId] = useState<number | null>(null);
  const [dadosRecebimento, setDadosRecebimento] = useState({
    valor: '',
    descricao: '',
    telefone: '',
    metodo: 'PIX',
    status: 'PAGO',
    pessoaId: ''
  });
  const [enviandoRecebimento, setEnviandoRecebimento] = useState(false);
  const [enviandoRateio, setEnviandoRateio] = useState(false);
  const [tabModal, setTabModal] = useState<'RECEBIMENTOS' | 'DESPESAS' | 'LOTES'>('RECEBIMENTOS');
  const [dadosDespesa, setDadosDespesa] = useState({ valor: '', descricao: '' });
  const [enviandoDespesa, setEnviandoDespesa] = useState(false);
  const [importandoExtrato, setImportandoExtrato] = useState(false);
  const [mostrarCardsMobile, setMostrarCardsMobile] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [termoBuscaPessoas, setTermoBuscaPessoas] = useState('');
  const [filtroStatusRecebimento, setFiltroStatusRecebimento] = useState<'TODOS' | 'PAGO' | 'PENDENTE'>('TODOS');

  const trabalhosFiltrados = trabalhos.filter(t => {
    const matchesEvento = eventoSelecionadoId ? String(t.eventoId) === String(eventoSelecionadoId) : false;
    const matchesBusca =
      t.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
      t.status.toLowerCase().includes(termoBusca.toLowerCase());
    return matchesEvento && (termoBusca === '' || matchesBusca);
  });

  useEffect(() => {
    buscarDados();
  }, []);

  const [inscritosEvento, setInscritosEvento] = useState<any[]>([]);

  const [membrosDespesas, setMembrosDespesas] = useState<any[]>([]);

  useEffect(() => {
    if (eventoSelecionadoId) {
      api.get(`/eventos/${eventoSelecionadoId}/membros-despesas`)
        .then(res => setMembrosDespesas(res.data))
        .catch(err => console.error('Erro ao buscar despesas do evento:', err));
    } else {
      setMembrosDespesas([]);
    }
  }, [eventoSelecionadoId]);

  useEffect(() => {
    if (dadosForm.eventoId) {
      api.get(`/eventos/${dadosForm.eventoId}`)
        .then(res => {
          setInscritosEvento(res.data.inscricoes?.map((i: any) => i.pessoa) || []);
        })
        .catch(err => {
          console.error('Erro ao carregar participantes do evento:', err);
          setInscritosEvento([]);
        });
    } else {
      setInscritosEvento([]);
    }
  }, [dadosForm.eventoId]);

  const buscarDados = async () => {
    try {
      const [trabRes, eventosRes, prodRes] = await Promise.all([
        api.get('/trabalhos'),
        api.get('/eventos'),
        api.get('/produtos-venda')
      ]);
      setTrabalhos(trabRes.data);
      setPessoas([]);
      const eventosAtivos = eventosRes.data.filter((e: any) => e.status === 'ATIVO');
      setEventos(eventosAtivos);
      setEventoSelecionadoId(prev => {
        if (!prev && eventosAtivos.length > 0) {
          return String(eventosAtivos[0].id);
        }
        return prev;
      });
      setProdutos(prodRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  // Funções de Produtos de Venda

  const confirmarExclusaoProduto = async (id: number) => {
    if (!confirm('Deseja excluir este produto definitivamente?')) return;
    try {
      await api.delete(`/produtos-venda/${id}`);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    }
  };

  const alternarStatusAtivoProduto = async (produto: any) => {
    try {
      await api.patch(`/produtos-venda/${produto.id}`, { ativo: !produto.ativo });
      buscarDados();
    } catch (err: any) {
      alert('Erro ao alterar status do produto.');
    }
  };

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(termoBuscaProdutos.toLowerCase())
  );

  const abrirModalCadastro = (trabalho?: any) => {
    if (trabalho) {
      setDadosForm({
        id: trabalho.id,
        descricao: trabalho.descricao,
        dataTrabalho: trabalho.dataTrabalho.split('T')[0],
        tipo: trabalho.tipo,
        proporcao: trabalho.proporcao.toString(),
        eventoId: trabalho.eventoId?.toString() || '',
        pessoaId: trabalho.pessoaId?.toString() || '',
        membrosIds: trabalho.membros?.map((m: any) => m.pessoaId.toString()) || [],
        status: trabalho.status
      });
    } else {
      setDadosForm({
        id: null,
        descricao: '',
        dataTrabalho: new Date().toLocaleDateString('sv'),
        tipo: 'GRUPO',
        proporcao: '100',
        eventoId: eventoSelecionadoId, // Pré-preenche com o evento ativo do dashboard
        pessoaId: '',
        membrosIds: [],
        status: 'ABERTO'
      });
    }
    setModalAberto(true);
  };

  const confirmarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const payload = {
        descricao: dadosForm.descricao,
        dataTrabalho: dadosForm.dataTrabalho,
        tipo: dadosForm.tipo,
        proporcao: dadosForm.tipo === 'GRUPO' ? 100 : parseFloat(dadosForm.proporcao),
        eventoId: Number(dadosForm.eventoId),
        membrosIds: dadosForm.tipo === 'GRUPO' ? dadosForm.membrosIds.map(Number) : []
      };

      if (dadosForm.id) {
        await api.patch(`/trabalhos/${dadosForm.id}`, payload);
      } else {
        await api.post('/trabalhos', payload);
      }
      setModalAberto(false);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarExclusao = async (id: number) => {
    if (!confirm('Deseja excluir este trabalho?')) return;
    try {
      await api.delete(`/trabalhos/${id}`);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    }
  };

  const alterarStatusTrabalho = async (id: number, status: string) => {
    if (!confirm(`Deseja alterar o status para ${status}?`)) return;
    try {
      await api.patch(`/trabalhos/${id}`, { status });
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    }
  };

  const toggleMembro = (pessoaId: string) => {
    setDadosForm(prev => {
      const isSelected = prev.membrosIds.includes(pessoaId);
      if (isSelected) {
        return { ...prev, membrosIds: prev.membrosIds.filter(id => id !== pessoaId) };
      } else {
        return { ...prev, membrosIds: [...prev.membrosIds, pessoaId] };
      }
    });
  };

  const abrirModalRecebimentos = (trabalho: any) => {
    setTrabalhoSelecionado(trabalho);
    setEditandoRecebimentoId(null);
    setFiltroStatusRecebimento('TODOS');
    setDadosRecebimento({
      valor: '',
      descricao: '',
      telefone: '',
      metodo: 'PIX',
      status: 'PAGO',
      pessoaId: ''
    });

    if (trabalho.eventoId) {
      api.get(`/eventos/${trabalho.eventoId}`)
        .then(res => {
          setInscritosEvento(res.data.inscricoes?.map((i: any) => i.pessoa) || []);
        })
        .catch(err => {
          console.error('Erro ao carregar participantes do evento:', err);
          setInscritosEvento([]);
        });
    } else {
      setInscritosEvento([]);
    }

    setModalRecebimentosAberto(true);
    setTabModal('RECEBIMENTOS');
  };

  const confirmarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = parseFloat(dadosDespesa.valor);
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, insira um valor válido para a despesa.');
      return;
    }
    setEnviandoDespesa(true);
    try {
      await api.post(`/trabalhos/${trabalhoSelecionado.id}/despesas`, {
        valor: valor,
        descricao: dadosDespesa.descricao
      });
      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      setDadosDespesa({ valor: '', descricao: '' });
      buscarDados();
    } catch (err: any) {
      alert('Erro ao adicionar despesa.');
    } finally {
      setEnviandoDespesa(false);
    }
  };

  const removerDespesa = async (despesaId: number) => {
    if (!confirm('Deseja excluir esta despesa?')) return;
    try {
      await api.delete(`/trabalhos/despesas/${despesaId}`);
      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      buscarDados();
    } catch (err) {
      alert('Erro ao excluir despesa.');
    }
  };

  const cancelarRateioLote = async (loteId: number) => {
    if (!confirm('Deseja realmente cancelar este lote de rateio? Todas as transações financeiras geradas por ele serão excluídas permanentemente e os recebimentos voltarão a ficar pendentes de rateio.')) return;
    try {
      await api.delete(`/trabalhos/${trabalhoSelecionado.id}/lotes/${loteId}`);
      alert('Lote de rateio cancelado com sucesso!');

      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro ao cancelar lote: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    }
  };

  const importarDoExtratoBancario = async () => {
    if (!confirm('Deseja buscar lançamentos não conciliados no extrato bancário para a data deste trabalho e importá-los automaticamente como pagos via PIX?')) {
      return;
    }

    setImportandoExtrato(true);
    try {
      const res = await api.post(`/trabalhos/${trabalhoSelecionado.id}/importar-extrato`);
      alert(res.data.message || 'Recebimentos importados com sucesso!');

      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erro ao importar recebimentos do extrato bancário.';
      alert(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setImportandoExtrato(false);
    }
  };

  const confirmarRecebimento = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviandoRecebimento(true);
    try {
      if (editandoRecebimentoId !== null) {
        await api.patch(`/trabalhos/${trabalhoSelecionado.id}/recebimentos/${editandoRecebimentoId}`, {
          valor: parseFloat(dadosRecebimento.valor),
          descricao: dadosRecebimento.descricao,
          telefone: dadosRecebimento.telefone || null,
          metodo: dadosRecebimento.metodo,
          status: dadosRecebimento.status,
          pessoaId: trabalhoSelecionado.tipo === 'INDIVIDUAL' ? Number(dadosRecebimento.pessoaId) : undefined
        });
      } else {
        await api.post(`/trabalhos/${trabalhoSelecionado.id}/recebimentos`, {
          valor: parseFloat(dadosRecebimento.valor),
          descricao: dadosRecebimento.descricao,
          telefone: dadosRecebimento.telefone || null,
          metodo: dadosRecebimento.metodo,
          status: dadosRecebimento.status,
          pessoaId: trabalhoSelecionado.tipo === 'INDIVIDUAL' ? Number(dadosRecebimento.pessoaId) : undefined
        });
      }
      // Recarregar os dados
      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      buscarDados();
      setDadosRecebimento({
        valor: '',
        descricao: '',
        telefone: '',
        metodo: 'PIX',
        status: 'PAGO',
        pessoaId: trabalhoSelecionado.tipo === 'INDIVIDUAL' ? dadosRecebimento.pessoaId : ''
      });
      setEditandoRecebimentoId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar recebimento.');
    } finally {
      setEnviandoRecebimento(false);
    }
  };

  const processarRateio = async () => {
    if (!confirm('Deseja processar o rateio dos recebimentos PAGO pendentes?')) return;
    setEnviandoRateio(true);
    try {
      const res = await api.post(`/trabalhos/${trabalhoSelecionado.id}/ratear`);
      alert(`${res.data.message}. Recebimentos processados: ${res.data.recebimentosProcessados}`);

      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      buscarDados();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setEnviandoRateio(false);
    }
  };

  const gerarPDFExtrato = () => {
    if (!trabalhoSelecionado) return;

    const doc = new jsPDF();
    const totalRecebimentos = trabalhoSelecionado.recebimentos.reduce((acc: number, r: any) => acc + r.valor, 0);
    const totalDespesas = trabalhoSelecionado.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0;
    const valorPendente = trabalhoSelecionado.recebimentos.filter((r: any) => r.status === 'PENDENTE').reduce((acc: number, r: any) => acc + r.valor, 0);
    const valorPago = trabalhoSelecionado.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((acc: number, r: any) => acc + r.valor, 0) - (trabalhoSelecionado.tipo === 'GRUPO' ? totalDespesas : 0);

    const numMembros = trabalhoSelecionado.tipo === 'GRUPO'
      ? (trabalhoSelecionado.membros?.length || 1)
      : 1;

    // Banner superior decorativo
    doc.setFillColor(19, 81, 180); // Azul primário #1351b4
    doc.rect(0, 0, 210, 8, 'F');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(19, 81, 180); // #1351b4
    doc.text('Relatório de Gestão de Trabalhos', 14, 24);

    // Subtítulo / Informações do Trabalho
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Trabalho: ${trabalhoSelecionado.descricao}`, 14, 32);
    doc.text(`Data do Trabalho: ${new Date(trabalhoSelecionado.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`, 14, 37);
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Emitido em: ${dataAtual}`, 14, 42);

    // Seção de Detalhamento da Equipe/Membros
    doc.setFontSize(10);
    doc.setTextColor(19, 81, 180);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Detalhamento da Equipe e Distribuição', 14, 52);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 55, 196, 55); // Linha divisória

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    let startY = 65;
    if (trabalhoSelecionado.tipo === 'GRUPO') {
      const membrosList = trabalhoSelecionado.membros || [];
      const nomesMembros = membrosList.map((m: any) => m.pessoa?.nome || 'Sem nome').join(', ');
      doc.text(`Tipo de Trabalho: Grupo / Equipe (${membrosList.length} integrantes)`, 14, 60);
      doc.text(`Proporção de Rateio: ${trabalhoSelecionado.proporcao}%`, 14, 64);
      doc.text(`Membros da Equipe: ${nomesMembros}`, 14, 68, { maxWidth: 182 });

      const lines = doc.splitTextToSize(`Membros da Equipe: ${nomesMembros}`, 182).length;
      startY = 72 + (lines * 4.5);
    } else {
      const nomePessoa = trabalhoSelecionado.pessoa?.nome || 'Não Vinculado';
      doc.text(`Tipo de Trabalho: Individual (1 integrante)`, 14, 60);
      doc.text(`Proporção de Rateio: ${trabalhoSelecionado.proporcao}%`, 14, 64);
      doc.text(`Trabalhador Responsável: ${nomePessoa}`, 14, 68);
      startY = 76;
    }

    doc.setFontSize(10);
    doc.setTextColor(19, 81, 180);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Extrato Financeiro e Cotas Individuais', 14, startY);
    doc.line(14, startY + 3, 196, startY + 3);

    startY = startY + 8;

    // Tabela
    const head = [
      ['Descrição', 'Beneficiário / Tipo', 'Data', 'Valor Total', 'Status']
    ];

    const body = [...trabalhoSelecionado.recebimentos]
      .sort((a: any, b: any) => a.id - b.id)
      .map((r: any) => [
        r.descricao || 'Recebimento Geral',
        trabalhoSelecionado.tipo === 'INDIVIDUAL'
          ? (r.pessoa?.nome || trabalhoSelecionado.pessoa?.nome || '-')
          : `GRUPO`,
        new Date(r.dataRecebimento).toLocaleDateString('pt-BR'),
        formatarMoeda(r.valor),
        r.status
      ]);

    // Adiciona despesas no corpo
    if (trabalhoSelecionado.despesas?.length > 0) {
      trabalhoSelecionado.despesas.forEach((d: any) => {
        body.push([
          d.descricao,
          'DESPESA',
          new Date(d.criadoEm).toLocaleDateString('pt-BR'),
          `-${formatarMoeda(d.valor)}`,
          `-`,
          '-'
        ]);
      });
    }

    // Totalizadores (Mesmas informações dos Cards)
    body.push([
      { content: 'TOTAL RECEBIMENTOS', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 247, 250] } },
      { content: formatarMoeda(totalRecebimentos), styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 247, 250] } },
      '',
      ''
    ]);

    if (totalDespesas > 0) {
      body.push([
        { content: 'DESPESAS', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38], fillColor: [245, 247, 250] } },
        { content: `-${formatarMoeda(totalDespesas)}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38], fillColor: [245, 247, 250] } },
        '',
        ''
      ]);
    }

    body.push([
      { content: 'VALOR PENDENTE', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [217, 119, 6], fillColor: [245, 247, 250] } },
      { content: formatarMoeda(valorPendente), styles: { fontStyle: 'bold', halign: 'right', textColor: [217, 119, 6], fillColor: [245, 247, 250] } },
      '',
      ''
    ]);

    body.push([
      { content: 'VALOR LÍQUIDO', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 240, 240] } },
      { content: formatarMoeda(valorPago - totalDespesas), styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 240, 240] } },
      '',
      ''
    ]);

    if (trabalhoSelecionado.tipo === 'GRUPO') {
      body.push([
        { content: 'VALOR COTA', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 240, 240] } },
        { content: formatarMoeda(valorPago / numMembros), styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 240, 240] } },
        '',
        ''
      ]);
    } else {
      const recebimentosPagosList = trabalhoSelecionado.recebimentos.filter((r: any) => r.status === 'PAGO');
      const totalRepasseTrabalhadores = recebimentosPagosList.reduce((acc: number, r: any) => acc + (r.valor * (trabalhoSelecionado.proporcao / 100)), 0);
      const totalRetidoComunidade = recebimentosPagosList.reduce((acc: number, r: any) => acc + (r.valor * (1 - trabalhoSelecionado.proporcao / 100)), 0);

      body.push([
        { content: `REPASSE PARA JOVENS (${trabalhoSelecionado.proporcao}%)`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 240, 240] } },
        { content: formatarMoeda(totalRepasseTrabalhadores), styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 240, 240] } },
        '',
        ''
      ]);

      body.push([
        { content: `RETIDO PARA DESPESAS (${100 - trabalhoSelecionado.proporcao}%)`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [19, 81, 180], fillColor: [240, 240, 240] } },
        { content: formatarMoeda(totalRetidoComunidade), styles: { fontStyle: 'bold', halign: 'right', textColor: [19, 81, 180], fillColor: [240, 240, 240] } },
        '',
        ''
      ]);
    }

    autoTable(doc, {
      startY: startY,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [19, 81, 180], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.cell.section === 'body') {
          const statusText = data.cell.text[0];
          if (statusText === 'PENDENTE') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber #d97706
            data.cell.styles.fontStyle = 'bold';
          } else if (statusText === 'PAGO') {
            data.cell.styles.textColor = [22, 163, 74]; // Green #16a34a
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`extrato-trabalho-${trabalhoSelecionado.id}.pdf`);
  };

  const gerarPDFGeral = () => {
    if (trabalhosFiltrados.length === 0) {
      alert('Nenhum trabalho encontrado para gerar o relatório.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    // Banner superior decorativo
    doc.setFillColor(19, 81, 180); // #1351b4
    doc.rect(0, 0, 297, 8, 'F');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(19, 81, 180);
    doc.text('Relatório Consolidado de Trabalhos', 14, 22);

    // Subtítulo
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Total de Trabalhos no Período: ${trabalhosFiltrados.length}`, 14, 30);
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Emitido em: ${dataAtual}`, 14, 35);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 39, 283, 39); // Linha horizontal decorativa

    // Tabela
    const head = [
      ['Trabalho', 'Data', 'Equipe / Proporção', 'Membros Detalhados', 'Financeiro Geral', 'Cota p/ Membro', 'Status']
    ];

    const body = trabalhosFiltrados.map((t: any) => {
      const numMembros = t.tipo === 'GRUPO' ? (t.membros?.length || 1) : 1;

      // Recebimentos pagos
      const totalRecebimentos = t.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((acc: number, r: any) => acc + r.valor, 0);
      // Recebimentos pendentes
      const totalPendente = t.recebimentos.filter((r: any) => r.status === 'PENDENTE').reduce((acc: number, r: any) => acc + r.valor, 0);
      // Despesas
      const totalDespesas = t.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0;

      const valorLiquido = t.tipo === 'INDIVIDUAL'
        ? totalRecebimentos * (t.proporcao / 100)
        : totalRecebimentos - totalDespesas;
      const cotaLiquida = t.tipo === 'INDIVIDUAL'
        ? totalRecebimentos * (t.proporcao / 100)
        : Math.max(0, totalRecebimentos - totalDespesas) / numMembros;


      const nomesMembros = t.tipo === 'GRUPO'
        ? (t.membros?.map((m: any) => m.pessoa?.nome || 'Sem nome').join(', ') || 'Nenhum membro')
        : (t.pessoa?.nome || 'Não Vinculado');

      // Monta texto detalhado do financeiro
      let financeiroTexto = `Pago: ${formatarMoeda(totalRecebimentos)}`;

      if (totalDespesas > 0) {
        financeiroTexto += `\nDesp: ${formatarMoeda(totalDespesas)}`;
      }

      if (totalPendente > 0) {
        financeiroTexto += `\nPend: ${formatarMoeda(totalPendente)}`;
      }

      financeiroTexto += `\nLíquido: ${formatarMoeda(valorLiquido)}`;

      // Monta texto detalhado da cota por membro
      let cotaTexto = `${formatarMoeda(cotaLiquida)}`;

      return [
        t.descricao,
        new Date(t.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        t.tipo === 'GRUPO' ? `${numMembros} Membros\nRateio: ${t.proporcao}%` : `Individual\nRateio: ${t.proporcao}%`,
        nomesMembros,
        financeiroTexto,
        cotaTexto,
        t.status
      ];
    });

    const grandTotalLiquido = trabalhosFiltrados.reduce((acc: number, t: any) => {
      const totalRecebimentos = t.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((sum: number, r: any) => sum + r.valor, 0);
      const totalDespesas = t.despesas?.reduce((sum: number, d: any) => sum + d.valor, 0) || 0;
      const valorLiquido = t.tipo === 'INDIVIDUAL'
        ? totalRecebimentos * (t.proporcao / 100)
        : totalRecebimentos - totalDespesas;
      return acc + valorLiquido;
    }, 0);

    body.push([
      { content: 'TOTAL LÍQUIDO', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: formatarMoeda(grandTotalLiquido), styles: { fontStyle: 'bold', halign: 'left', fillColor: [240, 240, 240] } },
      { content: '', styles: { fillColor: [240, 240, 240] } },
      { content: '', styles: { fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      startY: 44,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [19, 81, 180], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 40 }, // Trabalho
        1: { cellWidth: 22, halign: 'center' }, // Data
        2: { cellWidth: 35 }, // Equipe / Proporção
        3: { cellWidth: 75 }, // Membros Detalhados
        4: { cellWidth: 45 }, // Financeiro Geral
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }, // Cota p/ Membro
        6: { cellWidth: 22, halign: 'center' }  // Status
      }
    });

    doc.save('relatorio-consolidado-trabalhos.pdf');
  };

  const gerarPDFPorPessoa = () => {
    if (trabalhosFiltrados.length === 0) {
      alert('Nenhum trabalho encontrado para gerar o relatório.');
      return;
    }

    // 1. Identificar todas as pessoas e agrupar por pessoa
    const mapaPessoas: {
      [pessoaId: number]: {
        id: number;
        nome: string;
        saques: any[];
        trabalhos: Array<{
          descricao: string;
          data: string;
          cota: number;
        }>;
      }
    } = {};

    for (const t of trabalhosFiltrados) {
      const numMembros = t.tipo === 'GRUPO' ? (t.membros?.length || 1) : 1;
      const totalRecebimentos = t.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((acc: number, r: any) => acc + r.valor, 0);
      const totalDespesas = t.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0;
      const valorLiquido = totalRecebimentos - totalDespesas;
      const cota = valorLiquido / numMembros;

      const dataStr = new Date(t.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

      if (t.tipo === 'GRUPO') {
        const membrosList = t.membros || [];
        for (const membro of membrosList) {
          if (membro.pessoa) {
            const pid = membro.pessoa.id;
            if (!mapaPessoas[pid]) {
              const despesasPessoa = membrosDespesas.filter((d: any) => d.pessoaId === pid);
              mapaPessoas[pid] = {
                id: pid,
                nome: membro.pessoa.nome,
                saques: despesasPessoa,
                trabalhos: []
              };
            }
            mapaPessoas[pid].trabalhos.push({
              descricao: t.descricao,
              data: dataStr,
              cota
            });
          }
        }
      } else {
        // Individual
        const recebimentosPagos = t.recebimentos?.filter((r: any) => r.status === 'PAGO') || [];
        const cotasPorPessoaNoTrabalho: { [pessoaId: number]: { pessoa: any, totalCota: number } } = {};
        for (const r of recebimentosPagos) {
          const pessoaDaCota = r.pessoa || t.pessoa;
          if (pessoaDaCota) {
            const pid = pessoaDaCota.id;
            if (!cotasPorPessoaNoTrabalho[pid]) {
              cotasPorPessoaNoTrabalho[pid] = {
                pessoa: pessoaDaCota,
                totalCota: 0
              };
            }
            cotasPorPessoaNoTrabalho[pid].totalCota += r.valor * (t.proporcao / 100);
          }
        }

        for (const [pidStr, info] of Object.entries(cotasPorPessoaNoTrabalho)) {
          const pid = Number(pidStr);
          if (!mapaPessoas[pid]) {
            const despesasPessoa = membrosDespesas.filter((d: any) => d.pessoaId === pid);
            mapaPessoas[pid] = {
              id: pid,
              nome: info.pessoa.nome,
              saques: despesasPessoa,
              trabalhos: []
            };
          }
          mapaPessoas[pid].trabalhos.push({
            descricao: t.descricao,
            data: dataStr,
            cota: info.totalCota
          });
        }
      }
    }

    const listaAgrupada = Object.values(mapaPessoas).sort((a, b) => a.nome.localeCompare(b.nome));

    if (listaAgrupada.length === 0) {
      alert('Nenhum trabalhador vinculado encontrado nos trabalhos do período.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait' });

    // Banner superior decorativo
    doc.setFillColor(19, 81, 180); // #1351b4
    doc.rect(0, 0, 210, 8, 'F');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(19, 81, 180);
    doc.text('Relatório Geral de Trabalhos por Pessoas', 14, 22);

    // Subtítulo
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Total de Pessoas Mapeadas: ${listaAgrupada.length}`, 14, 29);
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Emitido em: ${dataAtual}`, 14, 34);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 38, 196, 38); // Linha horizontal decorativa

    // Tabela
    const head = [
      ['Pessoa e Histórico de Atividades', 'Qtd. Trabalhos', 'Valor Total']
    ];

    const body: any[] = listaAgrupada.map((p) => {
      const totalCotas = p.trabalhos.reduce((sum, trab) => sum + trab.cota, 0);
      const totalSaques = p.saques.reduce((sum, s) => sum + s.valor, 0);
      const saldoLiquido = totalCotas - totalSaques;

      // Monta a primeira coluna com quebra de linhas detalhando cada trabalho
      let historicoTexto = `${p.nome.toUpperCase()}\n`;
      p.trabalhos.forEach((trab) => {
        historicoTexto += `  • ${trab.data} - ${trab.descricao} (Cota: ${formatarMoeda(trab.cota)})\n`;
      });
      p.saques.forEach((saque) => {
        historicoTexto += `  • [RETIRADA] ${new Date(saque.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${saque.descricao} (-${formatarMoeda(saque.valor)})\n`;
      });
      historicoTexto = historicoTexto.trimEnd();

      let valorTexto = `Cotas: ${formatarMoeda(totalCotas)}`;
      if (totalSaques > 0) {
        valorTexto += `\nRetiradas: -${formatarMoeda(totalSaques)}`;
        valorTexto += `\nLíquido: ${formatarMoeda(saldoLiquido)}`;
      }

      return [
        historicoTexto,
        p.trabalhos.length.toString(),
        valorTexto
      ];
    });

    const grandTotalRateio = listaAgrupada.reduce((acc, p) => acc + p.trabalhos.reduce((sum, trab) => sum + trab.cota, 0), 0);
    const grandTotalSaques = listaAgrupada.reduce((acc, p) => acc + p.saques.reduce((sum, s) => sum + s.valor, 0), 0);
    const grandTotalLiquido = grandTotalRateio - grandTotalSaques;

    body.push([
      { content: 'TOTAL DE COTAS CONQUISTADAS', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: formatarMoeda(grandTotalRateio), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }
    ]);
    if (grandTotalSaques > 0) {
      body.push([
        { content: '(-) TOTAL DE RETIRADAS (SAQUES)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38], fillColor: [250, 240, 240] } },
        { content: `-${formatarMoeda(grandTotalSaques)}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38], fillColor: [250, 240, 240] } }
      ]);
      body.push([
        { content: 'SALDO LÍQUIDO A RECEBER', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 250, 240] } },
        { content: formatarMoeda(grandTotalLiquido), styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74], fillColor: [240, 250, 240] } }
      ]);
    }

    autoTable(doc, {
      startY: 44,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [19, 81, 180], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 120 }, // Pessoa e Histórico
        1: { cellWidth: 30, halign: 'center' }, // Qtd. Trabalhos
        2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' } // Cota Total
      }
    });

    doc.save('relatorio-trabalhos-por-pessoas.pdf');
  };

  const alterarStatusRecebimento = async (recId: number, novoStatus: string) => {
    try {
      await api.patch(`/trabalhos/${trabalhoSelecionado.id}/recebimentos/${recId}`, {
        status: novoStatus
      });
      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      buscarDados();
    } catch (err) {
      alert('Erro ao alterar status.');
    }
  };

  const excluirRecebimento = async (recId: number) => {
    if (!confirm('Deseja realmente excluir este recebimento? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/trabalhos/${trabalhoSelecionado.id}/recebimentos/${recId}`);
      const { data } = await api.get(`/trabalhos/${trabalhoSelecionado.id}`);
      setTrabalhoSelecionado(data);
      buscarDados();
      if (editandoRecebimentoId === recId) {
        setEditandoRecebimentoId(null);
        setDadosRecebimento({
          valor: '',
          descricao: '',
          telefone: '',
          metodo: 'PIX',
          status: 'PAGO',
          pessoaId: ''
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir recebimento.');
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

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">
            {abaAtiva === 'TRABALHOS' ? 'Gestão de Trabalhos' : 'Relatórios de Gestão'}
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            {abaAtiva === 'TRABALHOS' ? 'Serviços, Equipes e Rateios Financeiros' : 'Gestão Financeira dos Trabalhos'}
          </p>
        </div>
        <div className="lg:w-1/3 space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Evento
          </h4>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-sm bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:text-[#1351b4] transition-colors">
              <Trophy className="w-4 h-4" />
            </div>
            <select
              value={eventoSelecionadoId}
              onChange={(e) => setEventoSelecionadoId(e.target.value)}
              className="w-full pl-12 pr-10 py-2 bg-slate-50/50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all font-black text-slate-700 appearance-none cursor-pointer uppercase tracking-tight"
            >
              {eventos.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* SISTEMA DE ABAS PARA TRABALHOS E PRODUTOS */}
      <div className="border-b border-slate-200 overflow-x-auto custom-scrollbar no-scrollbar">
        <div className="flex gap-8">
          <button
            key="trabalhos"
            onClick={() => setAbaAtiva('TRABALHOS')}
            className={`px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${abaAtiva === 'TRABALHOS'
              ? 'bg-[#1351b4] text-white shadow-sm shadow-blue-900/20'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Trabalhos
          </button>
          <button
            key="relatorios"
            onClick={() => setAbaAtiva('RELATORIOS')}
            className={`px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${abaAtiva === 'RELATORIOS'
              ? 'bg-[#1351b4] text-white shadow-sm shadow-blue-900/20'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Relatórios
          </button>
        </div>
      </div>

      {abaAtiva === 'TRABALHOS' && (
        <>
          {!eventoSelecionadoId ? (
            /* ====== PLACEHOLDER PREMIUM — Nenhum evento selecionado ====== */
            <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
              {/* Gradiente de fundo decorativo */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-100/20 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-100/20 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center gap-6 max-w-md text-center px-6">
                <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-lg shadow-slate-200/50">
                  <Briefcase className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Selecione um Evento</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2 leading-relaxed">
                    Para visualizar os dados de Gestão de Trabalho, selecione um evento ativo no seletor acima.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <div className="w-6 h-px bg-slate-200" />
                  <span>Dados filtrados por evento</span>
                  <div className="w-6 h-px bg-slate-200" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{trabalhosFiltrados.length} trabalho{trabalhosFiltrados.length !== 1 ? 's' : ''}</span>
                  <div className="relative">
                    {/* Mobile 3-dots header */}
                    <div className="sm:hidden">
                      <button onClick={() => setMenuCabecalhoAberto(!menuCabecalhoAberto)} className="p-2 text-slate-400 hover:text-[#1351b4]">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {menuCabecalhoAberto && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuCabecalhoAberto(false)} />
                          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 shadow-xl rounded-md flex flex-col p-1 w-44">
                            <button
                              onClick={() => { setMenuCabecalhoAberto(false); abrirModalCadastro(); }}
                              className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-[#1351b4] rounded-sm text-left"
                            >
                              <Plus className="w-4 h-4" /> Novo Trabalho
                            </button>
                            <button
                              onClick={() => { setMenuCabecalhoAberto(false); setModalGerenciarProdutosAberto(true); }}
                              className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-sm text-left"
                            >
                              <Package className="w-4 h-4" /> Novo Produto
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Desktop buttons */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        onClick={() => abrirModalCadastro()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
                      >
                        <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                        Novo Trabalho
                      </button>
                      <button
                        onClick={() => setModalGerenciarProdutosAberto(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm group"
                      >
                        <Package className="w-3.5 h-3.5" />
                        Novo Produto
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#1351b4]">
                        <th className="pl-6 pr-3 py-2 text-sm font-bold text-white border-b border-[#1351b4] hidden lg:table-cell">Trabalho</th>
                        <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Data</th>
                        <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Participantes</th>
                        <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4]">Valor</th>
                        <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] w-24 text-center hidden sm:table-cell">Status</th>
                        <th className="px-2 py-2 text-sm font-bold text-white border-b border-[#1351b4] text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="">

                      {trabalhosFiltrados.map((trabalho) => {
                        const recebimentosPendentes = trabalho.recebimentos.filter((r: any) => r.status === 'PAGO' && r.loteRateioId === null).length;
                        const totalPagoBruto = trabalho.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((acc: number, r: any) => acc + r.valor, 0);
                        const totalDespesas = trabalho.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0;
                        const totalPago = totalPagoBruto - totalDespesas;
                        const totalPendente = trabalho.recebimentos.filter((r: any) => r.status === 'PENDENTE').reduce((acc: number, r: any) => acc + r.valor, 0);

                        return (
                          <tr key={trabalho.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="pl-6 pr-2 py-1 hidden lg:table-cell border-b border-slate-100">
                              <p className="font-bold text-[12px] text-slate-700 leading-tight uppercase">{trabalho.descricao}</p>
                            </td>
                            <td className="px-2 py-1 border-b border-slate-100">
                              <div className="flex items-center gap-1.5 text-slate-500" title={trabalho.descricao}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[12px] font-bold uppercase tracking-widest text-slate-700">
                                  {new Date(trabalho.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-1 border-b border-slate-100">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  {/* Trigger wrapper strictly around the icon using a named group */}
                                  <div className="relative group/icon cursor-help inline-flex items-center justify-center p-0.5 hover:bg-slate-100 rounded-sm transition-colors">
                                    {trabalho.tipo === 'INDIVIDUAL' ? (
                                      <UserIcon className="w-3.5 h-3.5 text-[#1351b4]" />
                                    ) : (
                                      <Users className="w-3.5 h-3.5 text-[#1351b4]" />
                                    )}

                                    {/* Custom Premium Hover Tooltip inside the icon container */}
                                    <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/icon:opacity-100 transition-all duration-200 transform translate-x-2 group-hover/icon:translate-x-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold p-3.5 rounded-sm shadow-xl min-w-[180px] max-w-[280px] gap-1.5 border border-slate-700/50">
                                      <div className="font-extrabold uppercase tracking-widest text-[#a5c6ff] border-b border-slate-700/60 pb-1.5 mb-1 flex items-center gap-1.5">
                                        {trabalho.tipo === 'INDIVIDUAL' ? <UserIcon className="w-3.5 h-3.5 text-[#a5c6ff]" /> : <Users className="w-3.5 h-3.5 text-[#a5c6ff]" />}
                                        {trabalho.tipo === 'INDIVIDUAL' ? 'Trabalhador' : 'Equipe'}
                                      </div>
                                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                        {trabalho.tipo === 'GRUPO' ? (
                                          trabalho.membros && trabalho.membros.length > 0 ? (
                                            trabalho.membros.map((m: any, idx: number) => (
                                              <div key={m.id || idx} className="uppercase tracking-tight text-slate-200 truncate flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-[#a5c6ff] shrink-0" />
                                                {m.pessoa?.nome || 'Sem nome'}
                                              </div>
                                            ))
                                          ) : (
                                            <span className="text-slate-400 italic">Nenhuma pessoa cadastrada</span>
                                          )
                                        ) : (
                                          <div className="uppercase tracking-tight text-slate-200 truncate flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-[#a5c6ff] shrink-0" />
                                            {trabalho.pessoa?.nome || 'Não Vinculada'}
                                          </div>
                                        )}
                                      </div>
                                      {/* Tooltip Arrow Indicator */}
                                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900/95"></div>
                                    </div>
                                  </div>

                                  <span className="text-[11px] font-black uppercase tracking-tighter">
                                    {trabalho.tipo === 'INDIVIDUAL' ? '' : `(${trabalho.membros.length})`}
                                  </span>
                                  <span className="text-[10px] font-bold tracking-widest">
                                    {trabalho.proporcao}%
                                  </span>
                                </div>
                                {/* <div className="flex items-center gap-1.5 text-slate-500">
                                  <span className="text-[10px] font-bold tracking-widest">
                                    {trabalho.proporcao}%
                                  </span>
                                </div> */}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-right border-b border-slate-100">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5 justify-end" title="Recebido">
                                  <span className="text-[12px] font-black text-emerald-600">
                                    {formatarMoeda(totalPago)}
                                  </span>
                                </div>
                              </div>
                              {totalPendente > 0 && (
                                <div className="flex items-center gap-1.5 justify-end" title="Pendente">
                                  <span className="text-[10px] font-bold text-amber-500 tracking-widest">
                                    {formatarMoeda(totalPendente)}
                                  </span>
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1 text-center hidden sm:table-cell border-b border-slate-100">
                              <div className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest border ${trabalho.status === 'CONCLUIDO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                trabalho.status === 'CANCELADO' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                {trabalho.status}
                              </div>
                            </td>
                            <td className="px-2 py-1 border-b border-slate-100">
                              <div className="relative flex items-center justify-center">
                                {/* 3-dots Menu */}
                                <div>
                                  <button onClick={() => setMenuAcaoAbertoId(menuAcaoAbertoId === trabalho.id ? null : trabalho.id)} className="p-2 text-slate-400 hover:text-[#1351b4] rounded-sm transition-colors">
                                    <MoreVertical className="w-5 h-5" />
                                    {recebimentosPendentes > 0 && (
                                      <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                                    )}
                                  </button>
                                  {menuAcaoAbertoId === trabalho.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setMenuAcaoAbertoId(null)} />
                                      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-md flex flex-col p-1 w-40">
                                        <button onClick={() => { setMenuAcaoAbertoId(null); abrirModalRecebimentos(trabalho); }} className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1351b4] rounded-sm text-left">
                                          <DollarSign className="w-4 h-4" />
                                          Financeiro
                                          {recebimentosPendentes > 0 && <span className="ml-auto w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center">{recebimentosPendentes}</span>}
                                        </button>
                                        <button onClick={() => { setMenuAcaoAbertoId(null); abrirModalCadastro(trabalho); }} className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1351b4] rounded-sm text-left">
                                          <Activity className="w-4 h-4" /> Editar
                                        </button>
                                        <button onClick={() => { setMenuAcaoAbertoId(null); confirmarExclusao(trabalho.id); }} disabled={(trabalho.status !== 'ABERTO' && trabalho.status !== 'EM_ANDAMENTO') || (trabalho.lotesRateio && trabalho.lotesRateio.length > 0)} className="flex items-center gap-2 p-2.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-sm text-left disabled:opacity-50">
                                          <Trash2 className="w-4 h-4" /> Excluir
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {trabalhosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum trabalho registrado</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {abaAtiva === 'RELATORIOS' && (() => {
        // Calcular lista de pessoas e suas cotas acumuladas do período filtrado de forma centralizada
        const mapaPessoasLocal: {
          [pessoaId: number]: {
            id: number;
            nome: string;
            saques: any[];
            trabalhos: Array<{
              descricao: string;
              data: string;
              cota: number;
            }>;
          }
        } = {};

        for (const t of trabalhosFiltrados) {
          const numMembros = t.tipo === 'GRUPO' ? (t.membros?.length || 1) : 1;
          const totalRecebimentos = t.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((acc: number, r: any) => acc + r.valor, 0);
          const totalDespesas = t.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0;
          const valorLiquido = Math.max(0, totalRecebimentos - totalDespesas);
          const cota = valorLiquido / numMembros;

          const dataStr = new Date(t.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

          if (t.tipo === 'GRUPO') {
            const membrosList = t.membros || [];
            for (const membro of membrosList) {
              if (membro.pessoa) {
                const pid = membro.pessoa.id;
                if (!mapaPessoasLocal[pid]) {
                  const despesasPessoa = membrosDespesas.filter((d: any) => d.pessoaId === pid);
                  mapaPessoasLocal[pid] = {
                    id: pid,
                    nome: membro.pessoa.nome,
                    saques: despesasPessoa,
                    trabalhos: []
                  };
                }
                mapaPessoasLocal[pid].trabalhos.push({
                  descricao: t.descricao,
                  data: dataStr,
                  cota
                });
              }
            }
          } else {
            const recebimentosPagos = t.recebimentos?.filter((r: any) => r.status === 'PAGO') || [];
            const cotasPorPessoaNoTrabalho: { [pessoaId: number]: { pessoa: any, totalCota: number } } = {};
            for (const r of recebimentosPagos) {
              const pessoaDaCota = r.pessoa || t.pessoa;
              if (pessoaDaCota) {
                const pid = pessoaDaCota.id;
                if (!cotasPorPessoaNoTrabalho[pid]) {
                  cotasPorPessoaNoTrabalho[pid] = {
                    pessoa: pessoaDaCota,
                    totalCota: 0
                  };
                }
                cotasPorPessoaNoTrabalho[pid].totalCota += r.valor * (t.proporcao / 100);
              }
            }

            for (const [pidStr, info] of Object.entries(cotasPorPessoaNoTrabalho)) {
              const pid = Number(pidStr);
              if (!mapaPessoasLocal[pid]) {
                const despesasPessoa = membrosDespesas.filter((d: any) => d.pessoaId === pid);
                mapaPessoasLocal[pid] = {
                  id: pid,
                  nome: info.pessoa.nome,
                  saques: despesasPessoa,
                  trabalhos: []
                };
              }
              mapaPessoasLocal[pid].trabalhos.push({
                descricao: t.descricao,
                data: dataStr,
                cota: info.totalCota
              });
            }
          }
        }

        const listaAgrupadaLocal = Object.values(mapaPessoasLocal).sort((a, b) => a.nome.localeCompare(b.nome));

        // O repasse total para trabalhadores é exatamente a soma de todas as cotas distribuídas no relatório
        const totalRepasseTrabalhadores = trabalhosFiltrados.reduce((acc: number, t: any) => {
          const totalPago = t.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((sum: number, r: any) => sum + r.valor, 0);
          if (t.tipo === 'INDIVIDUAL') {
            return acc + (totalPago * (t.proporcao / 100));
          } else {
            const totalDesp = t.despesas?.reduce((sum: number, d: any) => sum + d.valor, 0) || 0;
            return acc + Math.max(0, totalPago - totalDesp);
          }
        }, 0);

        const totalSaquesGeral = listaAgrupadaLocal.reduce((sum, p) => sum + (p.saques || []).reduce((sSum: number, s: any) => sSum + s.valor, 0), 0);
        const totalLiquidoParaDistribuicao = totalRepasseTrabalhadores - totalSaquesGeral;

        if (!eventoSelecionadoId) {
          return (
            <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-100/20 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center gap-6 max-w-md text-center px-6">
                <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-lg shadow-slate-200/50">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Selecione um Evento</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2 leading-relaxed">
                    Para visualizar Relatórios de Gestão, selecione um evento ativo no seletor acima.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <div className="w-6 h-px bg-slate-200" />
                  <span>Dados filtrados por evento</span>
                  <div className="w-6 h-px bg-slate-200" />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-in fade-in duration-200">


            {/* Header com Toggle para Mobile */}
            <div className="flex items-center justify-between sm:hidden">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Resumo Financeiro</span>
              <button onClick={() => setValoresCardsVisiveisMobile(!valoresCardsVisiveisMobile)} className="p-2 text-slate-400 hover:text-[#1351b4] bg-white border border-slate-200 rounded-sm shadow-sm transition-colors">
                {valoresCardsVisiveisMobile ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Cards de Métricas Gerais do Período Filtrado */}
            <div className={`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${!valoresCardsVisiveisMobile ? 'hidden sm:grid' : 'grid'}`}>

              {/* Card 1: Repasse Trabalhadores */}
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200 p-2 rounded-sm flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-blue-500/20 group-hover:scale-110 transition-transform">
                  <Users className="w-12 h-12" />
                </div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Valor Total Recebido</span>
                <span className="text-2xl font-black text-blue-700 mt-2">
                  {formatarMoeda(totalRepasseTrabalhadores)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Soma dos valores recebidos</span>
              </div>

              {/* Card 2: Retiradas/Saques */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 p-2 rounded-sm flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-amber-500/20 group-hover:scale-110 transition-transform">
                  <ArrowDownCircle className="w-12 h-12 text-amber-600/30" />
                </div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Retirado (Saques)</span>
                <span className="text-2xl font-black text-amber-700 mt-2">
                  {formatarMoeda(totalSaquesGeral)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Soma de retiradas efetuadas</span>
              </div>

              {/* Card 3: Valor Disponível para Distribuição */}
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-200 p-2 rounded-sm flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-violet-500/20 group-hover:scale-110 transition-transform">
                  <Activity className="w-12 h-12" />
                </div>
                <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Valor para distribuição</span>
                <span className="text-2xl font-black text-violet-700 mt-2">
                  {formatarMoeda(totalLiquidoParaDistribuicao)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Valor disponível para distribuição</span>
              </div>
            </div>

            {/* Sub-abas de Relatórios */}
            <div className="border-b border-slate-200 overflow-x-auto custom-scrollbar no-scrollbar w-full mb-6">
              <div className="flex justify-center gap-2 sm:gap-8 px-2 sm:px-0 w-full min-w-full sm:min-w-0">
                <button
                  onClick={() => setSubTabRelatorios('GERAL')}
                  className={`px-4 sm:px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex flex-1 sm:flex-none items-center justify-center gap-2 ${subTabRelatorios === 'GERAL'
                    ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  title="Consolidado Geral"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Consolidado Geral</span>
                </button>
                <button
                  onClick={() => setSubTabRelatorios('PESSOAS')}
                  className={`px-4 sm:px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex flex-1 sm:flex-none items-center justify-center gap-2 ${subTabRelatorios === 'PESSOAS'
                    ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  title="Consolidado por Pessoa"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Consolidado por Pessoa</span>
                </button>
                <button
                  onClick={() => setSubTabRelatorios('PENDENCIAS')}
                  className={`px-4 sm:px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex flex-1 sm:flex-none items-center justify-center gap-2 ${subTabRelatorios === 'PENDENCIAS'
                    ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  title="Pendências por Trabalho"
                >
                  <List className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Pendências por Trabalho</span>
                </button>
              </div>
            </div>

            {/* Visualização de Relatório Geral */}
            {subTabRelatorios === 'GERAL' && (
              <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/30">
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Pré-visualização: Relatório Geral Consolidado</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Exibição dos dados antes da geração do documento PDF</p>
                  </div>
                  <button
                    onClick={gerarPDFGeral}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group hover:-translate-y-0.5 w-full sm:w-auto shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    Gerar PDF
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#1351b4]">
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Trabalho</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Data</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Equipe</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Participantes</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-right">Financeiro</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-right">Cotas</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {novoProdutoInline && (
                        <tr className="bg-blue-50/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-[#1351b4] border border-[#1351b4]/20">
                                <Package className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                value={dadosEdicaoProduto.nome}
                                onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, nome: e.target.value })}
                                placeholder="Nome do produto"
                                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:lowercase"
                                autoFocus
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                step="0.01"
                                value={dadosEdicaoProduto.valor}
                                onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, valor: e.target.value })}
                                placeholder="0.00"
                                className="w-28 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 text-right"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setDadosEdicaoProduto({ ...dadosEdicaoProduto, ativo: !dadosEdicaoProduto.ativo })}
                              className="focus:outline-none"
                            >
                              {dadosEdicaoProduto.ativo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                  Inativo
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={salvarProdutoInline}
                                disabled={enviandoProduto}
                                className="p-2 text-white transition-colors rounded-sm bg-emerald-500 hover:bg-emerald-600 shadow-sm disabled:opacity-50"
                                title="Salvar"
                              >
                                {enviandoProduto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={cancelarEdicaoProduto}
                                className="p-2 text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200 rounded-sm bg-white hover:bg-slate-50 shadow-sm"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {trabalhosFiltrados.map((t: any) => {
                        const numMembros = t.tipo === 'GRUPO' ? (t.membros?.length || 1) : 1;
                        const totalPago = t.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((acc: number, r: any) => acc + r.valor, 0);
                        const totalPend = t.recebimentos.filter((r: any) => r.status === 'PENDENTE').reduce((acc: number, r: any) => acc + r.valor, 0);
                        const totalDesp = t.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0;
                        const valorLiquido = t.tipo === 'INDIVIDUAL'
                          ? totalPago * (t.proporcao / 100)
                          : totalPago - totalDesp;
                        const cotaLiquida = t.tipo === 'INDIVIDUAL'
                          ? totalPago * (t.proporcao / 100)
                          : Math.max(0, totalPago - totalDesp) / numMembros;
                        const nomesMembros = t.tipo === 'GRUPO'
                          ? (t.membros?.map((m: any) => m.pessoa?.nome || 'Sem nome').join(', ') || 'Nenhum membro')
                          : (t.pessoa?.nome || 'Não Vinculado');

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 font-black text-slate-700 uppercase tracking-tight">{t.descricao}</td>
                            <td className="px-6 py-4 text-slate-500 font-bold">{new Date(t.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] font-black uppercase tracking-widest text-slate-500">
                                {t.tipo === 'GRUPO' ? `Grupo / ${t.proporcao}%` : `Individual / ${t.proporcao}%`}
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-[200px] truncate text-slate-500 font-bold" title={nomesMembros}>{nomesMembros}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col font-bold">
                                <span className="text-emerald-600">Pago: {formatarMoeda(totalPago)}</span>
                                {totalDesp > 0 && <span className="text-rose-500">Desp: -{formatarMoeda(totalDesp)}</span>}
                                {totalPend > 0 && <span className="text-amber-500 font-black">Pend: {formatarMoeda(totalPend)}</span>}
                                <span className="text-[#1351b4] pt-0.5 border-t border-slate-100 mt-0.5">Líquido: {formatarMoeda(valorLiquido)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-700">
                              {formatarMoeda(cotaLiquida)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest border ${t.status === 'CONCLUIDO'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : t.status === 'EM_ANDAMENTO'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                                }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {trabalhosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-20 text-center text-slate-300 font-black uppercase tracking-widest">
                            Nenhum trabalho localizado para pré-visualização.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visualização de Relatório por Pessoas */}
            {subTabRelatorios === 'PESSOAS' && (
              <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-50/30">
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Pré-visualização: Relatório por Pessoas</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Detalhamento dos valores por pessoa</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-auto flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por nome..."
                        value={termoBuscaPessoas}
                        onChange={(e) => setTermoBuscaPessoas(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-sm text-[10px] font-bold text-slate-700 uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4] shadow-sm sm:w-64"
                      />
                    </div>
                    <button
                      onClick={gerarPDFPorPessoa}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group hover:-translate-y-0.5 w-full sm:w-auto shrink-0"
                    >
                      <Users className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      Gerar PDF
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#1351b4]">
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Nome</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] hidden sm:block text-center w-36">Trabalhos</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-center">Histórico</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-right w-44">Créditos</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {novoProdutoInline && (
                        <tr className="bg-blue-50/30">
                          <td className="px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-[#1351b4] border border-[#1351b4]/20">
                                <Package className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                value={dadosEdicaoProduto.nome}
                                onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, nome: e.target.value })}
                                placeholder="Nome do produto"
                                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:lowercase"
                                autoFocus
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 border-b border-slate-100">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                step="0.01"
                                value={dadosEdicaoProduto.valor}
                                onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, valor: e.target.value })}
                                placeholder="0.00"
                                className="w-28 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 text-right"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 border-b border-slate-100 text-center">
                            <button
                              onClick={() => setDadosEdicaoProduto({ ...dadosEdicaoProduto, ativo: !dadosEdicaoProduto.ativo })}
                              className="focus:outline-none"
                            >
                              {dadosEdicaoProduto.ativo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                  Inativo
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={salvarProdutoInline}
                                disabled={enviandoProduto}
                                className="p-2 text-white transition-colors rounded-sm bg-emerald-500 hover:bg-emerald-600 shadow-sm disabled:opacity-50"
                                title="Salvar"
                              >
                                {enviandoProduto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={cancelarEdicaoProduto}
                                className="p-2 text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200 rounded-sm bg-white hover:bg-slate-50 shadow-sm"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {(() => {
                        const listaPessoasFiltrada = listaAgrupadaLocal.filter(p => p.nome.toLowerCase().includes(termoBuscaPessoas.toLowerCase()));

                        if (listaPessoasFiltrada.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="px-6 py-20 text-center text-slate-300 font-black uppercase tracking-widest">
                                Nenhuma cota de colaborador encontrada para a busca atual.
                              </td>
                            </tr>
                          );
                        }

                        return listaPessoasFiltrada.map((p: any, idx: number) => {
                          const totalCotaPessoa = p.trabalhos.reduce((sum: number, t: any) => sum + t.cota, 0);
                          const totalSaquesPessoa = (p.saques || []).reduce((sum: number, s: any) => sum + s.valor, 0);
                          const saldoLiquidoPessoa = totalCotaPessoa - totalSaquesPessoa;

                          const ListaHistorico = (
                            <ul className="space-y-1.5">
                              {p.trabalhos.map((trab: any, tIdx: number) => (
                                <li key={tIdx} className="flex items-start gap-2 text-slate-500 font-bold">
                                  <span className="text-[#1351b4] text-[9px] font-black mt-0.5">•</span>
                                  <span>
                                    {trab.data} - <strong className="text-slate-600 uppercase tracking-tight font-black">{trab.descricao}</strong> (Cota: <span className="text-emerald-600 font-black">{formatarMoeda(trab.cota)}</span>)
                                  </span>
                                </li>
                              ))}
                              {p.saques && p.saques.map((saque: any, sIdx: number) => (
                                <li key={`saque-${sIdx}`} className="flex items-start gap-2 text-slate-500 font-bold bg-amber-50/40 py-1 px-3 rounded border border-amber-100/50 mt-1">
                                  <span className="text-amber-500 text-[9px] font-black mt-0.5">•</span>
                                  <span>
                                    {new Date(saque.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - <strong className="text-amber-700 uppercase tracking-tight font-black">RETIRADA: {saque.descricao}</strong> (Valor: <span className="text-rose-600 font-black">-{formatarMoeda(saque.valor)}</span>)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          );

                          return (
                            <React.Fragment key={idx}>
                              <tr className="hover:bg-slate-50/30 transition-colors align-top">
                                <td className={`px-2 py-1 font-bold text-[12px] text-slate-700 uppercase leading-tight ${historicoPessoaAbertoId === idx ? '' : 'border-b border-slate-100'}`}>{p.nome}</td>
                                <td className={`px-2 py-1 text-center text-[12px] text-slate-500 font-bold hidden sm:table-cell ${historicoPessoaAbertoId === idx ? '' : 'border-b border-slate-100'}`}>{p.trabalhos.length}</td>
                                <td className={`px-2 py-1 ${historicoPessoaAbertoId === idx ? '' : 'border-b border-slate-100'}`}>
                                  {/* Desktop: Exibe direto */}
                                  <div className="hidden sm:block text-[10px]">
                                    {ListaHistorico}
                                  </div>
                                  {/* Mobile: Botão de Histórico */}
                                  <div className="sm:hidden flex justify-center">
                                    <button
                                      onClick={() => setHistoricoPessoaAbertoId(historicoPessoaAbertoId === idx ? null : idx)}
                                      className="flex items-center justify-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-sm text-slate-500 hover:bg-slate-100 transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                                <td className={`px-2 py-1 text-right ${historicoPessoaAbertoId === idx ? '' : 'border-b border-slate-100'}`}>
                                  <div className="flex flex-col font-bold space-y-0.5">
                                    <span className="text-slate-400 text-[9px]">Créditos: {formatarMoeda(totalCotaPessoa)}</span>
                                    {totalSaquesPessoa > 0 && (
                                      <span className="text-rose-500 text-[9px]">Retiradas: -{formatarMoeda(totalSaquesPessoa)}</span>
                                    )}
                                    <span className="text-emerald-600 font-black text-[9px] pt-1 border-t border-slate-100 mt-1 block">
                                      Saldo: {formatarMoeda(saldoLiquidoPessoa)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {/* Linha expansível para mobile */}
                              {historicoPessoaAbertoId === idx && (
                                <tr className="sm:hidden bg-slate-50/50">
                                  <td colSpan={4} className="px-2 py-2 border-b border-slate-100">
                                    <div className="w-full border border-slate-200 rounded-sm shadow-sm overflow-hidden p-4">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 text-[#1351b4]">
                                        <History className="w-3.5 h-3.5" /> Histórico Detalhado
                                      </h4>
                                      {ListaHistorico}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {subTabRelatorios === 'PENDENCIAS' && (
              <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Relatório de Pendências</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Visão detalhada de recebimentos pendentes por trabalho</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#1351b4]">
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Trabalho</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Data</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4]">Lançamentos Pendentes</th>
                        <th className="px-4 py-3 text-xs font-bold text-white border-b border-[#1351b4] text-right">Valor Total Pendente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trabalhosFiltrados.filter((t: any) => t.recebimentos.some((r: any) => r.status === 'PENDENTE')).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center text-slate-300 font-black uppercase tracking-widest">
                            Nenhuma pendência encontrada.
                          </td>
                        </tr>
                      ) : (
                        trabalhosFiltrados.filter((t: any) => t.recebimentos.some((r: any) => r.status === 'PENDENTE')).map((t: any) => {
                          const recebimentosPendentes = t.recebimentos.filter((r: any) => r.status === 'PENDENTE');
                          const totalPendente = recebimentosPendentes.reduce((acc: number, r: any) => acc + r.valor, 0);

                          return (
                            <tr key={t.id} className="hover:bg-slate-50/30 transition-colors align-top">
                              <td className="px-6 py-4 font-black text-slate-700 uppercase tracking-tight">{t.descricao}</td>
                              <td className="px-6 py-4 text-slate-500 font-bold">{new Date(t.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                              <td className="px-6 py-4">
                                <ul className="space-y-1.5 py-1">
                                  {recebimentosPendentes.map((r: any, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-slate-500 font-bold">
                                      <span className="text-amber-500 text-[9px] font-black mt-0.5">•</span>
                                      <span>
                                        <strong className="text-slate-600 uppercase tracking-tight font-black">{r.descricao}</strong> (Valor: <span className="text-amber-600 font-black">{formatarMoeda(r.valor)}</span>)
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-amber-600 text-sm">
                                {formatarMoeda(totalPendente)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal Cadastro/Edição de Trabalho */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">
                  {dadosForm.id ? 'Editar Trabalho' : 'Novo Trabalho'}
                </h2>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={confirmarEnvio} className="p-6">
              {dadosForm.status === 'CONCLUIDO' && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-sm flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Trabalho Fechado. Reabra para editar.</span>
                </div>
              )}

              <fieldset disabled={dadosForm.status === 'CONCLUIDO'} className="space-y-4">
                <div className="flex gap-2 bg-slate-100 p-2 rounded-sm">
                  {[
                    { id: 'INDIVIDUAL', label: 'Individual', icon: UserIcon },
                    { id: 'GRUPO', label: 'Em Grupo', icon: Users }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDadosForm({ ...dadosForm, tipo: t.id })}
                      className={`flex-1 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${dadosForm.tipo === t.id ? 'bg-[#1351b4] text-white shadow-md' : 'text-slate-400 hover:text-[#1351b4]'
                        }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      required
                      value={dadosForm.descricao}
                      onChange={(e) => setDadosForm({ ...dadosForm, descricao: e.target.value })}
                      className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 uppercase focus:border-[#1351b4] outline-none"
                      placeholder="Ex: Mutirão de Limpeza"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="date"
                        required
                        value={dadosForm.dataTrabalho}
                        onChange={(e) => setDadosForm({ ...dadosForm, dataTrabalho: e.target.value })}
                        className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none focus:border-[#1351b4]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {dadosForm.tipo === 'INDIVIDUAL' ? 'Proporção p/ Pessoas (%)' : 'Proporção p/ Grupo (%)'}
                    </label>
                    <div className="relative">
                      <Percent className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        disabled={dadosForm.tipo === 'GRUPO' || dadosForm.status === 'CONCLUIDO'}
                        value={dadosForm.tipo === 'GRUPO' ? 100 : dadosForm.proporcao}
                        onChange={(e) => setDadosForm({ ...dadosForm, proporcao: e.target.value })}
                        className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none focus:border-[#1351b4] disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Evento Associado (Herda a Conta do Evento)</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <select
                      value={dadosForm.eventoId}
                      onChange={(e) => setDadosForm({ ...dadosForm, eventoId: e.target.value })}
                      required
                      className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none focus:border-[#1351b4] appearance-none font-bold"
                    >
                      <option value="">Selecione o evento...</option>
                      {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome} (Conta: {ev.conta?.nome})</option>)}
                    </select>
                  </div>
                </div>



                {dadosForm.tipo === 'GRUPO' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Adicionar Trabalhador à Equipe</label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <select
                          className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none focus:border-[#1351b4] appearance-none"
                          onChange={(e) => {
                            const id = e.target.value;
                            if (id && !dadosForm.membrosIds.includes(id)) {
                              setDadosForm({ ...dadosForm, membrosIds: [...dadosForm.membrosIds, id] });
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="">Selecione um trabalhador para adicionar...</option>
                          {inscritosEvento.filter(p => !dadosForm.membrosIds.includes(p.id.toString())).map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {dadosForm.membrosIds.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Trabalhadores Selecionados ({dadosForm.membrosIds.length})</label>
                        <div className="border border-slate-200 rounded-sm max-h-48 overflow-y-auto bg-slate-50 p-2 space-y-1">
                          {dadosForm.membrosIds.map(membroId => {
                            const pessoa = inscritosEvento.find(p => p.id.toString() === membroId);
                            if (!pessoa) return null;
                            return (
                              <div key={pessoa.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-sm shadow-sm">
                                <span className="text-xs font-black uppercase tracking-tighter text-slate-600">{pessoa.nome}</span>
                                {dadosForm.status !== 'CONCLUIDO' && (
                                  <button
                                    type="button"
                                    onClick={() => toggleMembro(membroId)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1 bg-slate-50 rounded-sm hover:bg-rose-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </fieldset>

              <div className="pt-6 flex gap-4 mt-6">
                {dadosForm.status === 'CONCLUIDO' ? (
                  <button
                    type="button"
                    onClick={() => {
                      alterarStatusTrabalho(dadosForm.id!, 'ABERTO');
                      setModalAberto(false);
                    }}
                    className="w-full py-4 bg-amber-500 text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-amber-600 flex items-center justify-center gap-2"
                  >
                    Reabrir Trabalho
                  </button>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={enviando}
                      className="flex-1 py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] flex items-center justify-center gap-2"
                    >
                      {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                      Salvar Trabalho
                    </button>
                    {dadosForm.id && (
                      <button
                        type="button"
                        onClick={() => {
                          alterarStatusTrabalho(dadosForm.id!, 'CONCLUIDO');
                          setModalAberto(false);
                        }}
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Fechar Trabalho
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recebimentos e Rateio */}
      {modalRecebimentosAberto && trabalhoSelecionado && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-6xl h-auto md:h-[85vh] rounded-md shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto">

            {/* Lado Esquerdo: Form de Lançamento/Despesa */}
            <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col overflow-y-auto custom-scrollbar relative shrink-0">
              {trabalhoSelecionado.status === 'CONCLUIDO' && (
                <div className="absolute inset-0 z-10 bg-slate-50/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Trabalho Fechado</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Para editar lançamentos, reabra o trabalho primeiro.</p>
                </div>
              )}

              {/* Tabs para Trabalho */}
              <div className="flex bg-slate-100 p-1 border-b border-slate-200">
                <button
                  onClick={() => setTabModal('RECEBIMENTOS')}
                  className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 ${tabModal === 'RECEBIMENTOS' ? 'bg-white text-[#1351b4] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <DollarSign className="w-3 h-3" />
                  Recebimentos
                </button>
                <button
                  onClick={() => setTabModal('DESPESAS')}
                  className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 ${tabModal === 'DESPESAS' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Trash2 className="w-3 h-3" />
                  Despesas
                </button>
                <button
                  onClick={() => setTabModal('LOTES')}
                  className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 ${tabModal === 'LOTES' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Activity className="w-3 h-3" />
                  Lotes Rateio
                </button>
              </div>

              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-black text-[#1351b4] uppercase tracking-widest">
                  {tabModal === 'RECEBIMENTOS'
                    ? (editandoRecebimentoId !== null ? 'Editar Lançamento' : 'Novo Lançamento')
                    : tabModal === 'DESPESAS' ? 'Nova Despesa' : 'Consolidado do Lote'}
                </h3>
              </div>

              {tabModal === 'RECEBIMENTOS' ? (
                <form onSubmit={confirmarRecebimento} className="p-6 space-y-4 flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                    <input
                      type="text"
                      value={dadosRecebimento.descricao} onChange={e => setDadosRecebimento({ ...dadosRecebimento, descricao: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-sm font-black text-slate-700 outline-none focus:border-[#1351b4] uppercase"
                      placeholder="Ex: Compra de Lanche"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefone (Opcional)</label>
                    <input
                      type="text"
                      value={dadosRecebimento.telefone || ''} onChange={e => setDadosRecebimento({ ...dadosRecebimento, telefone: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-sm font-black text-slate-700 outline-none focus:border-[#1351b4] uppercase"
                      placeholder="Ex: 11999999999"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input
                      type="number" step="0.01" required
                      value={dadosRecebimento.valor} onChange={e => setDadosRecebimento({ ...dadosRecebimento, valor: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-sm font-black text-slate-700 outline-none focus:border-[#1351b4]"
                      placeholder="0,00"
                    />
                  </div>

                  {trabalhoSelecionado.tipo === 'INDIVIDUAL' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Trabalhador Vinculado</label>
                      <select
                        value={dadosRecebimento.pessoaId} onChange={e => setDadosRecebimento({ ...dadosRecebimento, pessoaId: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-[11px] font-black text-slate-700 outline-none focus:border-[#1351b4] uppercase"
                      >
                        <option value="">Selecione a pessoa...</option>
                        {inscritosEvento.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Método</label>
                      <select
                        value={dadosRecebimento.metodo} onChange={e => setDadosRecebimento({ ...dadosRecebimento, metodo: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-[11px] font-black text-slate-700 outline-none focus:border-[#1351b4] uppercase"
                      >
                        <option value="PIX">PIX</option>
                        <option value="DINHEIRO">Dinheiro</option>
                        <option value="CARTAO">Cartão</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <select
                        value={dadosRecebimento.status} onChange={e => setDadosRecebimento({ ...dadosRecebimento, status: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-[11px] font-black text-slate-700 outline-none focus:border-[#1351b4] uppercase"
                      >
                        <option value="PAGO">Pago</option>
                        <option value="PENDENTE">Pendente</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {editandoRecebimentoId !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoRecebimentoId(null);
                          setDadosRecebimento({
                            valor: '',
                            descricao: '',
                            telefone: '',
                            metodo: 'PIX',
                            status: 'PAGO',
                            pessoaId: ''
                          });
                        }}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit" disabled={enviandoRecebimento}
                      className={`py-3 text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${editandoRecebimentoId !== null ? 'flex-1 bg-[#1351b4] hover:bg-[#0047b7]' : 'w-full bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {enviandoRecebimento ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editandoRecebimentoId !== null ? (
                        <Pencil className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {editandoRecebimentoId !== null ? 'Salvar' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              ) : tabModal === 'DESPESAS' ? (
                <form onSubmit={confirmarDespesa} className="p-6 space-y-4 flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor da Despesa (R$)</label>
                    <input
                      type="number" step="0.01" required
                      value={dadosDespesa.valor} onChange={e => setDadosDespesa({ ...dadosDespesa, valor: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-sm font-black text-slate-700 outline-none focus:border-rose-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição / Finalidade</label>
                    <input
                      type="text" required
                      value={dadosDespesa.descricao} onChange={e => setDadosDespesa({ ...dadosDespesa, descricao: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-sm text-sm font-black text-slate-700 outline-none focus:border-rose-500 uppercase"
                      placeholder="Ex: Compra de Ingredientes"
                    />
                  </div>
                  <button
                    type="submit" disabled={enviandoDespesa}
                    className="w-full mt-4 py-3 bg-rose-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-700 flex items-center justify-center gap-2"
                  >
                    {enviandoDespesa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Registrar Despesa
                  </button>
                  <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed text-center mt-4">
                    Despesas serão abatidas do valor total antes do rateio entre os membros.
                  </p>
                </form>
              ) : (
                <div className="p-6 flex-1 flex flex-col justify-between bg-slate-50/50">
                  <div className="space-y-4 flex-1">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-sm">
                      <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Lotes de Rateio
                      </h4>
                      <p className="text-[9px] text-emerald-700 font-bold uppercase leading-relaxed">
                        Os rateios agora são processados em lotes/lances. Cada execução agrupa todos os recebimentos pagos pendentes, desconta as despesas acumuladas e gera as transações financeiras consolidadas.
                      </p>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total de Lotes</span>
                        <span className="text-xs font-black text-slate-700">{trabalhoSelecionado.lotesRateio?.length || 0}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Rateado</span>
                        <span className="text-xs font-black text-emerald-600">
                          {formatarMoeda(trabalhoSelecionado.lotesRateio?.reduce((acc: number, l: any) => acc + l.valorLiquido, 0) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed text-center mt-4">
                    Ao cancelar um lote, os recebimentos voltam a ficar pendentes de rateio e todas as transações vinculadas a ele são excluídas automaticamente pelo sistema.
                  </p>
                </div>
              )}
            </div>

            {/* Lado Direito: Lista de Recebimentos/Despesas */}
            <div className="w-full md:w-2/3 flex flex-col bg-white overflow-hidden h-auto md:h-full">
              <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    {tabModal === 'RECEBIMENTOS' ? 'Extrato do Trabalho' : tabModal === 'DESPESAS' ? 'Despesas do Trabalho' : 'Histórico de Lotes'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase flex items-center gap-2 hidden lg:block">
                    <span className="text-[9px] font-bold text-[#1351b4] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{trabalhoSelecionado.recebimentos.length} Lançamentos</span>
                    {(trabalhoSelecionado.despesas?.length || 0) > 0 && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">{trabalhoSelecionado.despesas.length} Despesas</span>
                    )}
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{trabalhoSelecionado.lotesRateio?.length || 0} Lotes</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {tabModal === 'RECEBIMENTOS' && (
                    <button
                      onClick={importarDoExtratoBancario}
                      disabled={trabalhoSelecionado.status === 'CONCLUIDO' || importandoExtrato}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-700"
                      title="Buscar e importar recebimentos do extrato bancário para a data deste trabalho"
                    >
                      {importandoExtrato ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Banknote className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:block">Importar</span>
                    </button>
                  )}
                  <button onClick={gerarPDFExtrato} className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 text-slate-600 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 flex items-center justify-center gap-2 border border-slate-200" title='Relatório'>
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">Relatório</span>
                  </button>
                  <button onClick={() => processarRateio()} disabled={trabalhoSelecionado.status === 'CONCLUIDO' || enviandoRateio} className="flex-1 sm:flex-initial px-6 py-2 bg-[#1351b4] text-white rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-[#0047b7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" title='Rateio'>
                    {enviandoRateio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                    <span className="hidden sm:block">Rateio</span>
                  </button>
                  <button onClick={() => setModalRecebimentosAberto(false)} className="flex-1 sm:flex-initial p-2 text-slate-400 hover:text-slate-900 border border-slate-200 rounded-sm flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Resumo Financeiro de Recebimentos - Panorama Completo */}
              {tabModal === 'RECEBIMENTOS' && (
                <div className="flex flex-col">
                  <div className="sm:hidden px-6 pt-4 pb-2 flex justify-end">
                    <button
                      onClick={() => setMostrarCardsMobile(!mostrarCardsMobile)}
                      className="text-[10px] font-black uppercase tracking-widest text-[#1351b4] flex items-center gap-1.5 bg-[#1351b4]/5 hover:bg-[#1351b4]/10 px-4 py-2 rounded-sm border border-[#1351b4]/10 transition-colors"
                    >
                      {mostrarCardsMobile ? 'Resumo Financeiro' : 'Resumo Financeiro'}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mostrarCardsMobile ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <div className={`px-6 pb-4 pt-2 sm:py-4 ${mostrarCardsMobile ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`}>
                    {/* Total Recebimentos */}
                    <div className="p-3 bg-white border border-slate-200 rounded-sm shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Recebimentos</p>
                        <p className="text-sm font-black text-[#1351b4] mt-1">
                          {formatarMoeda(trabalhoSelecionado.recebimentos.reduce((acc: number, r: any) => acc + r.valor, 0))}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-full border border-blue-100 text-[#1351b4]">
                        <List className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Despesas */}
                    <div className="p-3 bg-white border border-slate-200 rounded-sm shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Despesas</p>
                        <p className="text-sm font-black text-rose-600 mt-1">
                          {formatarMoeda(trabalhoSelecionado.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-rose-50 rounded-full border border-rose-100 text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Valor Pendente */}
                    <div className="p-3 bg-white border border-slate-200 rounded-sm shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor Pendente</p>
                        <p className="text-sm font-black text-amber-600 mt-1">
                          {formatarMoeda(trabalhoSelecionado.recebimentos.filter((r: any) => r.status === 'PENDENTE').reduce((acc: number, r: any) => acc + r.valor, 0))}
                        </p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-full border border-amber-100 text-amber-600">
                        <DollarSign className="w-4 h-4 text-amber-500 animate-pulse" />
                      </div>
                    </div>

                    {/* Valor Líquido */}
                    <div className="p-3 bg-white border border-slate-200 rounded-sm shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor Líquido</p>
                        <p className="text-sm font-black text-emerald-600 mt-1">
                          {formatarMoeda(
                            trabalhoSelecionado.recebimentos.filter((r: any) => r.status === 'PAGO').reduce((acc: number, r: any) => acc + r.valor, 0) -
                            (trabalhoSelecionado.despesas?.reduce((acc: number, d: any) => acc + d.valor, 0) || 0)
                          )}
                        </p>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 p-6 overflow-y-visible md:overflow-y-auto custom-scrollbar">
                <div className="space-y-3 pr-2">
                  {tabModal === 'RECEBIMENTOS' ? (
                    (() => {
                      const recebimentosFiltrados = [...trabalhoSelecionado.recebimentos]
                        .sort((a: any, b: any) => a.id - b.id)
                        .filter((r: any) => {
                          if (filtroStatusRecebimento === 'TODOS') return true;
                          return r.status === filtroStatusRecebimento;
                        });

                      if (trabalhoSelecionado.recebimentos.length === 0) {
                        return <div className="text-center py-10 text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum recebimento registrado</div>;
                      }

                      return (
                        <>
                          {/* Segmented Filter Bar */}
                          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Situação:</span>
                            <div className="flex bg-slate-100 p-0.5 rounded-sm border border-slate-200">
                              {[
                                { value: 'TODOS', label: 'Todos' },
                                { value: 'PAGO', label: 'Pagos' },
                                { value: 'PENDENTE', label: 'Pendentes' }
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setFiltroStatusRecebimento(opt.value as any)}
                                  className={`px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${filtroStatusRecebimento === opt.value
                                    ? 'bg-[#1351b4] text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Receipts List */}
                          {recebimentosFiltrados.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-xs font-black uppercase tracking-widest">
                              Nenhum recebimento {filtroStatusRecebimento === 'PAGO' ? 'pago' : 'pendente'} encontrado
                            </div>
                          ) : (
                            recebimentosFiltrados.map((r: any) => {
                              const rateado = r.loteRateioId !== null;
                              return (
                                <div key={r.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-sm">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${r.status === 'PAGO' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <div>
                                      <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">{r.descricao || 'Recebimento Geral'}</p>
                                      {r.telefone && (
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{r.telefone}</p>
                                      )}
                                      {trabalhoSelecionado.tipo === 'INDIVIDUAL' && r.pessoa && (
                                        <p className="text-[9px] font-bold text-[#1351b4] uppercase tracking-widest mt-0.5">{r.pessoa.nome}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.metodo}</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(r.dataRecebimento).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-black text-sm text-slate-700 min-w-[70px] text-right">{formatarMoeda(r.valor)}</span>
                                    {rateado ? (
                                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-sm border border-emerald-100">Rateado</span>
                                    ) : (
                                      <div className="flex flex-col sm:flex-row items-end gap-2">
                                        <select
                                          disabled={trabalhoSelecionado.status === 'CONCLUIDO'}
                                          value={r.status}
                                          onChange={(e) => alterarStatusRecebimento(r.id, e.target.value)}
                                          className={`text-[9px] font-black uppercase tracking-widest p-1.5 rounded-sm border outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${r.status === 'PAGO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                                        >
                                          <option value="PAGO">PAGO</option>
                                          <option value="PENDENTE">PENDENTE</option>
                                        </select>

                                        {trabalhoSelecionado.status !== 'CONCLUIDO' && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setEditandoRecebimentoId(r.id);
                                                setDadosRecebimento({
                                                  valor: String(r.valor),
                                                  descricao: r.descricao || '',
                                                  telefone: r.telefone || '',
                                                  metodo: r.metodo || 'PIX',
                                                  status: r.status,
                                                  pessoaId: String(r.pessoaId || '')
                                                });
                                              }}
                                              className={`p-1.5 rounded-sm border transition-all ${editandoRecebimentoId === r.id ? 'bg-[#1351b4] text-white border-[#1351b4]' : 'bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-slate-200'}`}
                                              title="Editar recebimento"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => excluirRecebimento(r.id)}
                                              className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-sm border border-slate-200 hover:border-rose-100 transition-all"
                                              title="Excluir recebimento"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </>
                      );
                    })()
                  ) : tabModal === 'DESPESAS' ? (
                    (!trabalhoSelecionado.despesas || trabalhoSelecionado.despesas.length === 0) ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-black uppercase tracking-widest">Nenhuma despesa registrada</div>
                    ) : (
                      trabalhoSelecionado.despesas.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between p-2 bg-rose-50/30 border border-slate-100 rounded-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <div>
                              <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">{d.descricao}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {new Date(d.criadoEm).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-sm text-rose-600">-{formatarMoeda(d.valor)}</span>
                            <button
                              onClick={() => removerDespesa(d.id)}
                              disabled={trabalhoSelecionado.status === 'CONCLUIDO'}
                              className="p-1.5 text-rose-300 hover:text-rose-600 transition-colors disabled:opacity-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    (!trabalhoSelecionado.lotesRateio || trabalhoSelecionado.lotesRateio.length === 0) ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum lote de rateio processado</div>
                    ) : (
                      trabalhoSelecionado.lotesRateio.map((l: any) => (
                        <div key={l.id} className="flex items-center justify-between p-2.5 bg-emerald-50/20 border border-slate-100 rounded-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <div>
                              <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">Lote de Rateio #{l.id}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {new Date(l.data).toLocaleDateString('pt-BR')} às {new Date(l.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <div className="flex gap-2 mt-1.5">
                                <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 border border-blue-100 rounded-sm uppercase tracking-widest">Arrecadado: {formatarMoeda(l.valorArrecadado)}</span>
                                {l.valorDespesas > 0 && (
                                  <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 border border-rose-100 rounded-sm uppercase tracking-widest">Despesas: -{formatarMoeda(l.valorDespesas)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Líquido</span>
                              <span className="font-black text-sm text-emerald-600">{formatarMoeda(l.valorLiquido)}</span>
                            </div>
                            <button
                              onClick={() => cancelarRateioLote(l.id)}
                              disabled={trabalhoSelecionado.status === 'CONCLUIDO'}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-sm disabled:opacity-0"
                              title="Cancelar lote e reverter transações"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {modalGerenciarProdutosAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-[#1351b4]/10 flex items-center justify-center text-[#1351b4]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gerenciar Produtos</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Catálogo de Itens Disponíveis para Venda</p>
                </div>
              </div>
              <button onClick={() => setModalGerenciarProdutosAberto(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-sm hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
              <div className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{produtosFiltrados.length} cadastrado{produtosFiltrados.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => iniciarEdicaoProduto()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
                  >
                    <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                  </button>
                </div>

                <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Nome do Produto</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Valor Unitário</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center w-36">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {novoProdutoInline && (
                        <tr className="bg-blue-50/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-[#1351b4] border border-[#1351b4]/20">
                                <Package className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                value={dadosEdicaoProduto.nome}
                                onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, nome: e.target.value })}
                                placeholder="Nome do produto"
                                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:lowercase"
                                autoFocus
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                step="0.01"
                                value={dadosEdicaoProduto.valor}
                                onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, valor: e.target.value })}
                                placeholder="0.00"
                                className="w-28 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 text-right"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setDadosEdicaoProduto({ ...dadosEdicaoProduto, ativo: !dadosEdicaoProduto.ativo })}
                              className="focus:outline-none"
                            >
                              {dadosEdicaoProduto.ativo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                  Inativo
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={salvarProdutoInline}
                                disabled={enviandoProduto}
                                className="p-2 text-white transition-colors rounded-sm bg-emerald-500 hover:bg-emerald-600 shadow-sm disabled:opacity-50"
                                title="Salvar"
                              >
                                {enviandoProduto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={cancelarEdicaoProduto}
                                className="p-2 text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200 rounded-sm bg-white hover:bg-slate-50 shadow-sm"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {produtosFiltrados.map((produto) => editandoProdutoId === produto.id ? (
                        <Fragment key={produto.id}>{
                          <tr className="bg-blue-50/30">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-[#1351b4] border border-[#1351b4]/20">
                                  <Package className="w-4 h-4" />
                                </div>
                                <input
                                  type="text"
                                  value={dadosEdicaoProduto.nome}
                                  onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, nome: e.target.value })}
                                  placeholder="Nome do produto"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:lowercase"
                                  autoFocus
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={dadosEdicaoProduto.valor}
                                  onChange={(e) => setDadosEdicaoProduto({ ...dadosEdicaoProduto, valor: e.target.value })}
                                  placeholder="0.00"
                                  className="w-28 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-bold text-slate-700 text-right"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setDadosEdicaoProduto({ ...dadosEdicaoProduto, ativo: !dadosEdicaoProduto.ativo })}
                                className="focus:outline-none"
                              >
                                {dadosEdicaoProduto.ativo ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                    Inativo
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={salvarProdutoInline}
                                  disabled={enviandoProduto}
                                  className="p-2 text-white transition-colors rounded-sm bg-emerald-500 hover:bg-emerald-600 shadow-sm disabled:opacity-50"
                                  title="Salvar"
                                >
                                  {enviandoProduto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={cancelarEdicaoProduto}
                                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200 rounded-sm bg-white hover:bg-slate-50 shadow-sm"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        }</Fragment>
                      ) : (
                        <tr key={produto.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                <Package className="w-4 h-4" />
                              </div>
                              <p className="font-black text-slate-800 uppercase tracking-tight">{produto.nome}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-slate-700">{formatarMoeda(produto.valor)}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => alternarStatusAtivoProduto(produto)}
                              className="focus:outline-none"
                            >
                              {produto.ativo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                  Inativo
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => iniciarEdicaoProduto(produto)}
                                className="p-2 text-slate-400 hover:text-[#1351b4] transition-colors border border-transparent hover:border-slate-200 rounded-sm bg-white hover:bg-slate-50 shadow-sm"
                                title="Editar produto"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => confirmarExclusaoProduto(produto.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-100 rounded-sm bg-white hover:bg-rose-50 shadow-sm"
                                title="Excluir produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {produtosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Package className="w-12 h-12 text-slate-300 mb-4" />
                              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum produto cadastrado</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
