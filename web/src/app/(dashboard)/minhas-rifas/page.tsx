'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import Cookies from 'js-cookie';
import {
  Ticket,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  DollarSign,
  User,
  Phone,
  FileImage,
  X,
  Trash2,
  FileDown,
  Printer,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  History,
  CheckCircle,
  Plus,
  ArrowRightLeft,
  ArrowRight,
  Trophy,
  Activity,
  ChevronDown,
  Loader2,
  Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';

export default function MinhasRifasPage() {
  const [rifasAtivas, setRifasAtivas] = useState<any[]>([]);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [bilhetes, setBilhetes] = useState<any[]>([]);
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [rifaSelecionada, setRifaSelecionada] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [forcarEdicaoDados, setForcarEdicaoDados] = useState(false);
  const [modalBilhete, setModalBilhete] = useState<any>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [modalAlocarAberta, setModalAlocarAberta] = useState(false);
  const [modalVisualizarCartelaAberta, setModalVisualizarCartelaAberta] = useState(false);
  const [alocacaoParaVisualizar, setAlocacaoParaVisualizar] = useState<any>(null);
  const [modalLote, setModalLote] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [usuario, setUsuario] = useState<any>(null);
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);

  // Helpers robustos de parsing de datas para evitar quebras por split/format
  const splitDataSeguro = (dataStr: any) => {
    if (!dataStr) return '';
    try {
      const stringData = typeof dataStr === 'string' ? dataStr : dataStr.toISOString ? dataStr.toISOString() : String(dataStr);
      return stringData.split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const formatarDataSegura = (dataStr: any) => {
    const dataLimpa = splitDataSeguro(dataStr);
    if (!dataLimpa) return '-';
    try {
      const partes = dataLimpa.split('-');
      if (partes.length === 3) {
        const [ano, mes, dia] = partes;
        return `${dia}/${mes}/${ano}`;
      }
      return dataLimpa;
    } catch (e) {
      return '-';
    }
  };

  const formatarDataPorExtensoSegura = (dataStr: any) => {
    const dataLimpa = splitDataSeguro(dataStr);
    if (!dataLimpa) return '-';
    try {
      return format(new Date(dataLimpa + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return '-';
    }
  };

  const [dadosBilhete, setDadosBilhete] = useState({
    status: 'LIVRE',
    nomeCliente: '',
    foneCliente: '',
    comprovante: ''
  });

  const [dadosLote, setDadosLote] = useState({
    status: 'VENDIDO',
    nomeCliente: '',
    foneCliente: '',
    comprovante: ''
  });

  useEffect(() => {
    const dados = Cookies.get('gf_user');
    if (dados) setUsuario(JSON.parse(dados));
    carregarRifas();
  }, []);

  const [modoLote, setModoLote] = useState<'RESERVA' | 'VENDA' | null>(null);

  const carregarRifas = async () => {
    try {
      const dadosUser = Cookies.get('gf_user');
      const user = dadosUser ? JSON.parse(dadosUser) : null;

      const [resRifas, resPessoas] = await Promise.all([
        api.get('/rifas').catch(err => {
          console.error('Falha ao carregar /rifas:', err);
          return { data: [] };
        }),
        api.get('/pessoas').catch(err => {
          console.error('Falha ao carregar /pessoas:', err);
          return { data: [] };
        })
      ]);

      const rifasData = Array.isArray(resRifas.data) ? resRifas.data : [];
      const pessoasData = Array.isArray(resPessoas.data) ? resPessoas.data : [];

      let disponiveis = rifasData.filter((r: any) => ['ATIVA', 'PAUSADA'].includes(r.status));

      // Filtro: Mostrar apenas rifas onde o usuário tem alocação
      if (user) {
        disponiveis = disponiveis.filter((r: any) =>
          r.alocacoes?.some((a: any) => a.pessoaId === user.pessoaId)
        );
      }

      setRifasAtivas(disponiveis);
      setPessoas(pessoasData);

      if (disponiveis.length > 0) {
        selecionarRifa(disponiveis[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar rifas:', error);
      setRifasAtivas([]);
      setPessoas([]);
    } finally {
      setCarregando(false);
    }
  };

  const selecionarRifa = async (rifa: any, preserveTab = false) => {
    setRifaSelecionada(rifa);
    setSelecionados([]);
    try {
      const res = await api.get(`/rifas/${rifa.id}/meus-bilhetes`).catch(err => {
        console.error('Falha ao carregar meus-bilhetes:', err);
        return { data: { bilhetes: [], alocacoes: [] } };
      });

      const bilhetesData = Array.isArray(res.data?.bilhetes) ? res.data.bilhetes : [];
      const alocacoesData = Array.isArray(res.data?.alocacoes) ? res.data.alocacoes : [];

      setBilhetes(bilhetesData);
      setAlocacoes(alocacoesData);

      if (!preserveTab || !alocacoesData.find((a: any) => a.id === abaAtiva)) {
        if (alocacoesData.length > 0) {
          setAbaAtiva(alocacoesData[0].id);
        } else {
          setAbaAtiva(null);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar bilhetes:', error);
      setBilhetes([]);
      setAlocacoes([]);
      setAbaAtiva(null);
    }
    setForcarEdicaoDados(false);
  };

  const toggleSelecao = (bilhete: any) => {
    if (rifaSelecionada?.status === 'PAUSADA') {
      alert('Esta campanha está pausada e não permite novas reservas ou vendas no momento.');
      return;
    }
    if (rifaSelecionada?.status === 'FINALIZADA' || rifaSelecionada?.status === 'SORTEADA') {
      alert('Esta campanha já foi finalizada e está em modo de apenas visualização.');
      return;
    }
    if (bilhete.status === 'VENDIDO') return;

    setSelecionados(prev => {
      if (prev.length === 0) return [bilhete.id];
      const primeiroId = prev[0];
      const primeiroBilhete = bilhetes.find(b => b.id === primeiroId);
      if (bilhete.status !== primeiroBilhete?.status) {
        alert('Não é possível selecionar números com status diferentes.');
        return prev;
      }
      if (prev.includes(bilhete.id)) return prev.filter(id => id !== bilhete.id);
      return [...prev, bilhete.id];
    });
  };

  const selecionarTudo = () => {
    if (rifaSelecionada?.status === 'FINALIZADA' || rifaSelecionada?.status === 'SORTEADA') {
      alert('Esta campanha já foi finalizada e está em modo de apenas visualização.');
      return;
    }
    const aloc = alocacoes.find(a => a.id === abaAtiva);
    if (!aloc) return;

    const bilhetesDaCartela = bilhetes.filter(b => b.numero >= aloc.inicioRange && b.numero <= aloc.fimRange);
    let alvos = bilhetesDaCartela.filter(b => b.status !== 'VENDIDO');

    if (filtroStatus !== 'TODOS') {
      alvos = alvos.filter(b => b.status === filtroStatus);
    } else if (alvos.length > 0) {
      // Se estiver em "TODOS", seleciona apenas os do mesmo status do primeiro disponível
      const statusRef = alvos[0].status;
      alvos = alvos.filter(b => b.status === statusRef);
    }

    if (alvos.length === 0) {
      alert('Nenhum bilhete disponível para seleção com o filtro atual.');
      return;
    }

    setSelecionados(alvos.map(b => b.id));
  };

  const abrirModalBilhete = (bilhete: any) => {
    if (rifaSelecionada?.status === 'FINALIZADA' || rifaSelecionada?.status === 'SORTEADA') {
      alert('Esta campanha já foi finalizada e está em modo de apenas visualização.');
      return;
    }
    if (bilhete.status === 'VENDIDO') {
      alert('Este bilhete já foi vendido e não pode ser editado.');
      return;
    }
    setModalBilhete(bilhete);
    setDadosBilhete({
      status: bilhete.status,
      nomeCliente: bilhete.nomeCliente || '',
      foneCliente: bilhete.foneCliente || '',
      comprovante: bilhete.comprovante || ''
    });
  };

  const handleSalvarBilhete = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/rifas/bilhetes/${modalBilhete.id}`, dadosBilhete);
      setModalBilhete(null);
      selecionarRifa(rifaSelecionada, true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao atualizar bilhete');
    }
  };

  const handleSalvarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let urlComprovante = dadosLote.comprovante;

      // Se houver arquivo selecionado, faz o upload para o Storage
      if (arquivoComprovante) {
        urlComprovante = await uploadFile(arquivoComprovante, 'comprovantes', `rifa_${rifaSelecionada?.id}`);
      }

      await api.patch('/rifas/bilhetes/bulk', {
        ids: selecionados,
        ...dadosLote,
        comprovante: urlComprovante
      });
      setModalLote(false);
      setForcarEdicaoDados(false);
      setSelecionados([]);
      setArquivoComprovante(null);
      selecionarRifa(rifaSelecionada, true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao atualizar lote');
    }
  };

  const estatisticas = {
    total: bilhetes.length,
    vendidos: bilhetes.filter(b => b.status === 'VENDIDO').length,
    reservados: bilhetes.filter(b => b.status === 'RESERVADO').length,
    livres: bilhetes.filter(b => b.status === 'LIVRE').length,
  };

  const getNomeResponsavel = (aloc: any) => {
    if (aloc.pessoa?.nome) return aloc.pessoa.nome;
    const pessoa = pessoas.find(p => p.id === aloc.pessoaId);
    return pessoa?.nome || 'N/A';
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatarData = (isoString: string) => {
    return formatarDataSegura(isoString);
  };

  const calcularCRC16 = (payload: string) => {
    let result = 0xFFFF;
    if (payload.length > 0) {
      for (let offset = 0; offset < payload.length; offset++) {
        result ^= (payload.charCodeAt(offset) << 8);
        for (let bitwise = 0; bitwise < 8; bitwise++) {
          if ((result <<= 1) & 0x10000) result ^= 0x1021;
          result &= 0xFFFF;
        }
      }
    }
    return result.toString(16).toUpperCase().padStart(4, '0');
  };

  const removerAcentos = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  };

  const formatarChavePix = (chave: string, tipo?: string) => {
    const apenasNumeros = chave.replace(/\D/g, '');
    const limpa = chave.replace(/\s/g, '');

    // 1. Se o tipo for explícito, segue a regra do tipo
    if (tipo === 'TELEFONE') {
      return '+55' + apenasNumeros;
    }

    if (tipo === 'CPF' || tipo === 'CNPJ') {
      return apenasNumeros;
    }

    if (tipo === 'EMAIL') {
      return limpa;
    }

    // 2. Se não houver tipo (rifas antigas), tenta adivinhar com segurança
    if (!tipo) {
      if (limpa.includes('@')) return limpa;
      if (apenasNumeros.length === 11 || apenasNumeros.length === 10) {
        // Se parece telefone, mas pode ser CPF. 
        // Na dúvida, se não tiver @ e for 11 dígitos, o padrão PIX para CPF é apenas números.
        // Mas para celular precisa do +55. Como o usuário agora tem o seletor, 
        // rifas novas não cairão aqui.
        return apenasNumeros;
      }
    }

    return limpa;
  };

  const gerarPayloadPix = (chave: string, tipo?: string, nome: string = 'BENEFICIARIO', cidade: string = 'BRASILIA') => {
    const f = (id: string, val: string) => id + val.length.toString().padStart(2, '0') + val;
    const nomeLimpo = removerAcentos(nome).substring(0, 25);
    const chaveFormatada = formatarChavePix(chave, tipo);
    const infoConta = f('00', 'br.gov.bcb.pix') + f('01', chaveFormatada);

    let p = f('00', '01') + f('26', infoConta) + f('52', '0000') + f('53', '986') + f('58', 'BR') +
      f('59', nomeLimpo) + f('60', cidade.substring(0, 15)) + f('62', f('05', '***')) + '6304';

    return p + calcularCRC16(p);
  };

  const gerarPDFCartela = async (aloc: any, bilhetesDaCartela: any[]) => {
    const doc = new jsPDF();
    const dataSorteio = formatarDataPorExtensoSegura(rifaSelecionada.dataSorteio);

    // Header Azul
    doc.setFillColor(19, 81, 180);
    doc.rect(0, 0, 210, 56, 'F');

    // --- ESQUERDA: IDENTIFICAÇÃO DA CARTELA ---
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CARTELA #', 15, 18);
    doc.setFontSize(26);
    doc.text(`${alocacoes.indexOf(aloc) + 1}`, 15, 30);

    // --- CENTRO: CAMPANHA ---
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text((rifaSelecionada.titulo || rifaSelecionada.nome).toUpperCase(), 105, 22, { align: 'center' });

    // Descrição (itálico e menor)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(200, 220, 255);
    const desc = rifaSelecionada.descricao || '';

    // --- DIREITA: MÓDULO PIX INTEGRADO ---
    const chavePix = rifaSelecionada.chavePix;

    // Ajusta a largura da descrição reactivamente se o PIX estiver ativo ou não
    const splitDesc = doc.splitTextToSize(desc, chavePix ? 90 : 150);
    doc.text(splitDesc, 105, 29, { align: 'center' });

    if (chavePix) {
      const tipoLabel = rifaSelecionada.tipoChavePix ? rifaSelecionada.tipoChavePix.toUpperCase() : 'E-MAIL';

      // Badge "PAGAMENTO PIX" - Fundo azul, Letras brancas
      doc.setFillColor(14, 61, 136);
      doc.setDrawColor(80, 140, 230); // Borda azul clara
      doc.roundedRect(172, 6, 23, 5, 0.8, 0.8, 'F');

      // Pequeno Losango PIX branco no badge
      doc.setFillColor(255, 255, 255);
      doc.triangle(173.5, 8.25, 174.75, 7, 176, 8.25, 'F');
      doc.triangle(173.5, 8.25, 174.75, 9.5, 176, 8.25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'bold');
      doc.text('PAGAMENTO PIX', 177.5, 9.4);

      // QR Code - Menor e mais à direita
      try {
        const nomeBeneficiario = rifaSelecionada.paroquia?.nome || rifaSelecionada.titulo || 'BENEFICIARIO';
        const pixPayload = gerarPayloadPix(chavePix, rifaSelecionada.tipoChavePix, nomeBeneficiario);
        const qrCodeDataUrl = await QRCode.toDataURL(pixPayload, { margin: 1, width: 200 });
        doc.addImage(qrCodeDataUrl, 'PNG', 172, 12, 23, 23);
      } catch (err) {
        console.error('Erro ao gerar QR Code PIX:', err);
      }

      // Chave PIX
      doc.setTextColor(220, 235, 255);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.text(`CHAVE (${tipoLabel}): ${chavePix}`, 183.5, 38.5, { align: 'center' });
    }

    // Pílula de Sorteio
    doc.setFillColor(14, 61, 136); // Azul mais escuro
    doc.setDrawColor(80, 140, 230); // Borda azul clara
    doc.setLineWidth(0.3);
    doc.roundedRect(70, 36, 70, 8, 4, 4, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Sorteio dia ${dataSorteio}`, 105, 41.5, { align: 'center' });

    // ==========================================
    // --- SEÇÃO CENTRAL: RESPONSÁVEL & PREMIOS ---
    // ==========================================

    // Responsável (Com Ícone Vetorial customizado)
    doc.setFillColor(180, 190, 205);
    doc.circle(20, 68, 2, 'F'); // Cabeça
    doc.ellipse(20, 73, 3.5, 1.5, 'F'); // Ombros

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('RESPONSÁVEL', 28, 66);

    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(getNomeResponsavel(aloc).toUpperCase(), 28, 72);

    // Divisor sutil esquerdo
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(15, 76, 115, 76);

    // Legenda Horizontal (Abaixo do Responsável)
    const yLegenda = 82;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    // Vendido (Verde)
    doc.setFillColor(16, 185, 129);
    doc.circle(18, yLegenda, 1.8, 'F');
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('VENDIDO', 22, yLegenda + 1);

    // Reservado (Laranja)
    doc.setFillColor(245, 158, 11);
    doc.circle(48, yLegenda, 1.8, 'F');
    doc.text('RESERVADO', 52, yLegenda + 1);

    // Livre (Cinza)
    doc.setFillColor(220, 225, 235);
    doc.circle(78, yLegenda, 1.8, 'F');
    doc.text('LIVRE', 82, yLegenda + 1);

    // --- LADO DIREITO: CARD DE PREMIAÇÃO ---
    const cardX = 140;
    const cardY = 62;
    const cardW = 55;
    const cardH = 30;

    // Fundo do Card
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(230, 235, 245);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'FD');

    // Título "PREMIAÇÃO" com ícone de Taça vetorial sutil
    doc.setFillColor(245, 158, 11); // Cor Ouro
    doc.rect(cardX + 5, cardY + 5, 2, 2, 'F');
    doc.triangle(cardX + 4, cardY + 5, cardX + 6, cardY + 3, cardX + 8, cardY + 5, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.line(cardX + 6, cardY + 7, cardX + 6, cardY + 8);
    doc.line(cardX + 4, cardY + 8, cardX + 8, cardY + 8);

    doc.setTextColor(120, 130, 150);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('PREMIAÇÃO', cardX + 10, cardY + 7);

    // Lista de Prêmios (Badges coloridos individuais)
    let itemY = cardY + 13;
    const premiosSorted = rifaSelecionada.premios ? [...rifaSelecionada.premios].sort((a: any, b: any) => a.posicao - b.posicao) : [];

    premiosSorted.slice(0, 3).forEach((p: any) => {
      // Badge circular para a posição (1º, 2º, 3º)
      doc.setFillColor(254, 243, 199); // Laranja claro
      doc.roundedRect(cardX + 5, itemY - 3, 6, 4.5, 1, 1, 'F');

      doc.setTextColor(217, 119, 6); // Laranja escuro
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.posicao}º`, cardX + 8, itemY, { align: 'center' });

      // Descrição do prêmio
      doc.setTextColor(50, 65, 85); // Slate-700
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(p.descricao.toUpperCase(), cardX + 13, itemY);

      itemY += 5.2;
    });


    // ==========================================
    // --- GRADE DE NÚMEROS (RODAPÉ) ---
    // ==========================================
    const yGridTitle = 105;

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('GRADE DE NÚMEROS', 15, yGridTitle);

    doc.setTextColor(19, 81, 180);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`INTERVALO #${aloc.inicioRange} AO #${aloc.fimRange}`, 195, yGridTitle, { align: 'right' });

    // Divisor da grade
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(15, yGridTitle + 3, 195, yGridTitle + 3);

    // Desenho dos cartões de números
    let gridYStart = yGridTitle + 8;
    let x = 15;
    let y = gridYStart;
    const colWidth = 18;
    const rowHeight = 12;
    const cols = 10;

    bilhetesDaCartela.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const curX = x + (col * colWidth);
      const curY = y + (row * rowHeight);

      if (b.status === 'VENDIDO') {
        doc.setFillColor(16, 185, 129); // Emerald-500
        doc.setDrawColor(16, 185, 129);
      } else if (b.status === 'RESERVADO') {
        doc.setFillColor(245, 158, 11); // Amber-500
        doc.setDrawColor(245, 158, 11);
      } else {
        doc.setFillColor(248, 250, 252); // Slate-50 (Livre)
        doc.setDrawColor(226, 232, 240); // Slate-200 border
      }

      // Cartão arredondado com borda e preenchimento
      doc.setLineWidth(0.3);
      doc.roundedRect(curX, curY, 15, 9, 1.2, 1.2, 'FD');

      if (b.status === 'LIVRE') {
        doc.setTextColor(100, 116, 139); // Slate-500
      } else {
        doc.setTextColor(255, 255, 255); // Branco
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const numStr = b.numero.toString().padStart(3, '0');
      const textWidth = doc.getTextWidth(numStr);
      doc.text(numStr, curX + (15 - textWidth) / 2, curY + 6.2);
    });

    doc.save(`Cartela_${alocacoes.indexOf(aloc) + 1}_${getNomeResponsavel(aloc)}.pdf`);
  };

  if (carregando) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#1351b4] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 pb-10">

      {/* HEADER DA PÁGINA */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Meus Bilhetes de Rifas</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestão de cartelas e números da sorte</p>
        </div>
      </div>

      {/* SISTEMA DE ABAS PARA RIFAS ATIVAS */}
      <div className="border-b border-slate-200 overflow-x-auto custom-scrollbar no-scrollbar">
        <div className="flex gap-8">
          {rifasAtivas.map((rifa) => {
            const isActive = rifaSelecionada?.id === rifa.id;
            return (
              <button
                key={rifa.id}
                onClick={() => selecionarRifa(rifa)}
                className={`px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isActive
                  ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {rifa.nome}
              </button>
            );
          })}
        </div>
      </div>

      {!rifaSelecionada ? (
        <div className="flex-1 bg-white border border-slate-200 rounded-sm flex flex-col items-center justify-center text-center p-20">
          <AlertCircle className="w-16 h-16 text-slate-100 mb-6" />
          <h2 className="text-xl font-black text-slate-300 uppercase tracking-widest">Nenhuma campanha selecionada</h2>
        </div>
      ) : (
        <>
          {/* SEÇÃO 1: RESUMO DA RIFA (HORIZONTAL) */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 relative">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-10">

              {/* Info da Campanha com Tooltip de Prêmios */}
              <div className="flex items-center gap-6 lg:w-1/2">
                <div className="w-20 h-20 rounded-full bg-slate-50 border-4 border-white shadow-xl flex items-center justify-center text-[#1351b4] text-2xl font-black ring-1 ring-slate-100 shrink-0">
                  <Trophy className="w-10 h-10" />
                </div>
                <div className="flex flex-col group/prizes relative cursor-help">
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight hover:text-[#1351b4] transition-colors">{rifaSelecionada.nome}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-wider border flex items-center gap-1 ${rifaSelecionada.status === 'ATIVA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                      <Activity className="w-3 h-3" /> {rifaSelecionada.status}
                    </span>
                    <span className="text-[12px] bg-slate-50 text-slate-400 px-3 py-1 rounded-full font-black tracking-wider border border-slate-100 flex items-center gap-1">
                      Sorteio dia {formatarDataPorExtensoSegura(rifaSelecionada.dataSorteio)}
                    </span>
                  </div>

                  {/* Tooltip de Prêmios - Aparece no Hover do Nome */}
                  <div className="absolute top-full left-0 mt-4 hidden group-hover/prizes:block z-[110] w-72 bg-slate-900 text-white p-6 rounded-sm shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-blue-400">Premiação</span>
                    </div>
                    <div className="space-y-3">
                      {rifaSelecionada.premios?.length > 0 ? (
                        (rifaSelecionada.premios ? [...rifaSelecionada.premios].sort((a: any, b: any) => a.posicao - b.posicao) : []).map((p: any) => (
                          <div key={p.id} className="flex items-start gap-3">
                            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 w-6 h-6 rounded-sm flex items-center justify-center shrink-0 border border-amber-500/20">{p.posicao}º</span>
                            <span className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed">{p.descricao}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-500 italic uppercase">Nenhum prêmio cadastrado</p>
                      )}
                    </div>
                    {/* Seta do Tooltip */}
                    <div className="absolute bottom-full left-10 border-[8px] border-transparent border-b-slate-900" />
                  </div>
                </div>
              </div>

              {/* Divisor Vertical */}
              <div className="hidden lg:block w-px h-16 bg-slate-100" />

              {/* Estatísticas - Cards Individuais */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 p-3 rounded-sm shadow-sm flex flex-col justify-between hover:border-[#1351b4]/20 transition-all group/card">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-lg font-black text-slate-800 tracking-tighter">{estatisticas.total}</span>
                    <Ticket className="w-4 h-4 text-slate-200 group-hover/card:text-[#1351b4] transition-colors" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-3 rounded-sm shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all group/card">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Pagos</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-lg font-black text-emerald-600 tracking-tighter">{estatisticas.vendidos}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-100 group-hover/card:text-emerald-500 transition-colors" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-3 rounded-sm shadow-sm flex flex-col justify-between hover:border-amber-200 transition-all group/card">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Reservados</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-lg font-black text-amber-600 tracking-tighter">{estatisticas.reservados}</span>
                    <Clock className="w-4 h-4 text-amber-100 group-hover/card:text-amber-500 transition-colors" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-3 rounded-sm shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all group/card">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Livres</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-lg font-black text-slate-400 tracking-tighter">{estatisticas.livres}</span>
                    <LayoutGrid className="w-4 h-4 text-slate-100 group-hover/card:text-slate-400 transition-colors" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* SEÇÃO 2: TABS DE CARTELAS (HORIZONTAL) */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 flex flex-col space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-sm bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1351b4] shadow-sm">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Minhas Cartelas</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione a cartela para gerenciar</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-sm w-full lg:w-auto overflow-x-auto custom-scrollbar">
                  {[...alocacoes].reverse().map((aloc) => {
                    const originalIdx = alocacoes.indexOf(aloc);
                    return (
                      <button
                        key={aloc.id}
                        onClick={() => setAbaAtiva(aloc.id)}
                        className={`flex-1 lg:flex-none px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${abaAtiva === aloc.id
                          ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/10'
                          : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        Cartela {originalIdx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-sm border border-slate-200">
                  {['TODOS', 'LIVRE', 'RESERVADO', 'VENDIDO'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFiltroStatus(status)}
                      className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-tight transition-all ${filtroStatus === status ? 'bg-white text-[#1351b4] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

              </div>
            </div>

            {/* GRID DE NÚMEROS (CARTELA) */}
            <div className="pt-4">
              {alocacoes.map((aloc) => {
                if (abaAtiva !== aloc.id) return null;
                const bilhetesDaCartela = bilhetes.filter(b => b.numero >= aloc.inicioRange && b.numero <= aloc.fimRange);
                const filtrados = bilhetesDaCartela.filter(b => filtroStatus === 'TODOS' || b.status === filtroStatus);
                const vendidosNaCartela = bilhetesDaCartela.filter(b => b.status === 'VENDIDO').length;
                const progresso = Math.round((vendidosNaCartela / bilhetesDaCartela.length) * 100);

                return (
                  <div key={aloc.id} className="animate-in fade-in duration-300">
                    <div className="mb-6 p-4 bg-slate-50 rounded-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex flex-col items-center sm:items-start">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faixa de Números</span>
                        <span className="text-xs font-black text-slate-700">{aloc.inicioRange} ao {aloc.fimRange}</span>
                      </div>
                      <div className="flex-1 w-full max-w-md">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Progresso da Cartela</span>
                          <span className="text-[10px] font-black text-[#1351b4]">{progresso}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1351b4] transition-all duration-1000" style={{ width: `${progresso}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 2xl:grid-cols-20 gap-3">
                      {filtrados.map((bilhete) => {
                        const isSelecionado = selecionados.includes(bilhete.id);
                        return (
                          <div key={bilhete.id} className="relative group/num">
                            <button
                              onClick={() => toggleSelecao(bilhete)}
                              onDoubleClick={() => abrirModalBilhete(bilhete)}
                              className={`
                                  w-full aspect-[4/5] rounded-md flex flex-col items-center justify-between p-1.5 border-2 transition-all active:scale-90
                                  ${isSelecionado ? 'border-[#1351b4] bg-[#1351b4] text-white shadow-lg -translate-y-1 z-10' : ''}
                                  ${bilhete.status === 'LIVRE' && !isSelecionado ? 'bg-white border-slate-100 text-slate-500 hover:border-slate-300' : ''}
                                  ${bilhete.status === 'RESERVADO' && !isSelecionado ? 'bg-amber-50 border-amber-200 text-amber-700' : ''}
                                  ${bilhete.status === 'VENDIDO' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed' : ''}
                                `}
                            >
                              <span className="text-[8px] font-black uppercase opacity-30">Nº</span>
                              <span className="text-xs font-black tracking-tighter">{bilhete.numero}</span>
                              <div className="w-full h-1 bg-current opacity-10 rounded-full" />
                            </button>

                            {bilhete.status !== 'LIVRE' && (
                              <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-2 hidden group-hover/num:block z-[100] w-max min-w-[150px] bg-slate-900 text-white p-4 rounded-sm shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-[#1351b4] uppercase mb-1">Detalhes do Ticket</span>
                                  <span className="text-sm font-black uppercase tracking-tight">{bilhete.nomeCliente || 'S/ IDENTIFICAÇÃO'}</span>
                                  <span className="text-[10px] text-slate-400 font-medium mt-1">{bilhete.foneCliente || 'TELEFONE NÃO INF.'}</span>
                                  <div className={`mt-3 px-3 py-1 rounded-full text-[8px] font-black uppercase w-fit ${bilhete.status === 'VENDIDO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                    {bilhete.status}
                                  </div>
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RODAPÉ DA SEÇÃO COM AÇÕES */}
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={selecionarTudo}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-500 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Selecionar Tudo
              </button>

              {abaAtiva && (
                <button
                  onClick={() => {
                    const aloc = alocacoes.find(a => a.id === abaAtiva);
                    setAlocacaoParaVisualizar(aloc);
                    setModalVisualizarCartelaAberta(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-[#1351b4] hover:bg-[#00388c] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Cartela
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Ações em Lote - Floating Pill */}
      {selecionados.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-sm shadow-2xl z-[100] flex items-center gap-8 animate-in slide-in-from-bottom-20 duration-500 border border-white/10 w-[95%] md:w-max">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 bg-[#1351b4] rounded-sm flex items-center justify-center text-white font-black shadow-lg">
              {selecionados.length}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seleção Ativa</span>
              <span className="text-sm font-black uppercase text-white">Números Selecionados</span>
            </div>
          </div>

          <div className="h-10 w-px bg-white/10 shrink-0" />

          <div className="flex gap-3 flex-1 overflow-x-auto custom-scrollbar no-scrollbar">
            <button
              onClick={() => {
                setDadosLote({ status: 'RESERVADO', nomeCliente: '', foneCliente: '', comprovante: '' });
                setArquivoComprovante(null);
                setModoLote('RESERVA');
                setModalLote(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-sm font-black text-xs uppercase tracking-widest transition-all shadow-lg whitespace-nowrap"
            >
              Reservar
            </button>
            <button
              onClick={() => {
                const firstId = selecionados[0];
                const b = bilhetes.find(item => item.id === firstId);
                setDadosLote({ status: 'VENDIDO', nomeCliente: b?.nomeCliente || '', foneCliente: b?.foneCliente || '', comprovante: '' });
                setArquivoComprovante(null);
                setModoLote('VENDA');
                setModalLote(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-sm font-black text-xs uppercase tracking-widest transition-all shadow-lg whitespace-nowrap"
            >
              Confirmar Venda
            </button>
            <button
              onClick={async () => {
                if (confirm(`Deseja liberar ${selecionados.length} números?`)) {
                  try {
                    await api.patch('/rifas/bilhetes/bulk', { ids: selecionados, status: 'LIVRE' });
                    setSelecionados([]);
                    selecionarRifa(rifaSelecionada, true);
                  } catch (error) { alert('Erro ao liberar números'); }
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-sm font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap"
            >
              Liberar
            </button>
            <button onClick={() => setSelecionados([])} className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-sm transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAIS (Bilhete Individual e Lote) - Reutilizando lógica do original mas com CSS atualizado */}
      {modalBilhete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-[#1351b4] text-white flex items-center justify-center font-black shadow-lg">
                  {modalBilhete.numero}
                </div>
                <div>
                  <h2 className="font-black text-slate-800 uppercase tracking-tight">Ticket #{modalBilhete.numero}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão de bilhete individual</p>
                </div>
              </div>
              <button onClick={() => setModalBilhete(null)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleSalvarBilhete} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status do Bilhete</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-sm border border-slate-200">
                  {['LIVRE', 'RESERVADO', 'VENDIDO'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDadosBilhete({ ...dadosBilhete, status: st })}
                      className={`py-3 rounded-sm text-[9px] font-black uppercase transition-all ${dadosBilhete.status === st ? 'bg-white text-[#1351b4] shadow-md' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome do Cliente</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#1351b4]" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm pl-14 pr-6 py-4 outline-none focus:border-[#1351b4] transition-all font-black text-slate-700 uppercase"
                    placeholder="Identifique o comprador"
                    value={dadosBilhete.nomeCliente}
                    onChange={(e) => setDadosBilhete({ ...dadosBilhete, nomeCliente: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#1351b4]" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm pl-14 pr-6 py-4 outline-none focus:border-[#1351b4] transition-all font-black text-slate-700"
                    placeholder="(00) 00000-0000"
                    value={dadosBilhete.foneCliente}
                    onChange={(e) => setDadosBilhete({ ...dadosBilhete, foneCliente: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-[#1351b4] text-white rounded-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 hover:bg-[#0047b7] mt-4">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ação em Lote */}
      {modalLote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`px-10 py-8 border-b flex items-center justify-between ${modoLote === 'VENDA' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
              }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-sm flex items-center justify-center text-white shadow-lg ${modoLote === 'VENDA' ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-[#1351b4] shadow-blue-900/20'
                  }`}>
                  {modoLote === 'VENDA' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="font-black text-slate-800 uppercase tracking-tight">
                    {modoLote === 'VENDA' ? 'Confirmar Venda' : 'Efetuar Reserva'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selecionados.length} Números selecionados</p>
                </div>
              </div>
              <button onClick={() => { setModalLote(false); setForcarEdicaoDados(false); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleSalvarLote} className="p-10 space-y-6">
              {(modoLote === 'RESERVA' || forcarEdicaoDados) && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome do Cliente</label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#1351b4]" />
                      <input
                        type="text" required
                        className="w-full bg-slate-50 border border-slate-200 rounded-sm pl-14 pr-6 py-4 outline-none focus:border-[#1351b4] transition-all font-black text-slate-700 uppercase"
                        placeholder="Nome do comprador em lote"
                        value={dadosLote.nomeCliente}
                        onChange={(e) => setDadosLote({ ...dadosLote, nomeCliente: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                    <div className="relative group">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#1351b4]" />
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-sm pl-14 pr-6 py-4 outline-none focus:border-[#1351b4] transition-all font-black text-slate-700"
                        placeholder="(00) 00000-0000"
                        value={dadosLote.foneCliente}
                        onChange={(e) => setDadosLote({ ...dadosLote, foneCliente: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {modoLote === 'VENDA' && !forcarEdicaoDados && (
                <div className="p-6 bg-slate-50 rounded-sm border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cliente Vinculado</span>
                    <span className="text-sm font-black text-slate-700 uppercase">{dadosLote.nomeCliente || 'SEM IDENTIFICAÇÃO'}</span>
                  </div>
                  <button type="button" onClick={() => setForcarEdicaoDados(true)} className="text-[9px] font-black text-[#1351b4] uppercase hover:underline">Alterar</button>
                </div>
              )}

              {modoLote === 'VENDA' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ID Comprovante PIX</label>
                  <div className="flex flex-col gap-3">
                    <div className="relative group">
                      <FileImage className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500" />
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-sm pl-14 pr-6 py-4 outline-none focus:border-emerald-500 transition-all font-black text-slate-700"
                        placeholder="ID da transação em lote"
                        value={dadosLote.comprovante}
                        onChange={(e) => setDadosLote({ ...dadosLote, comprovante: e.target.value })}
                      />
                    </div>
                    {dadosLote.comprovante && (
                      <a href={dadosLote.comprovante.startsWith('http') ? dadosLote.comprovante : `${process.env.NEXT_PUBLIC_API_URL}/arquivos/download?bucket=comprovantes&path=${encodeURIComponent(dadosLote.comprovante)}&token=${Cookies.get('gf_token')}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 underline hover:text-emerald-700">
                        Ver comprovante atual
                      </a>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setArquivoComprovante(e.target.files[0]);
                        }
                      }}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-emerald-500/10 file:text-emerald-600 hover:file:bg-emerald-500/20 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <button type="submit" className={`w-full py-5 rounded-sm font-black uppercase tracking-widest transition-all shadow-xl mt-4 text-white ${modoLote === 'VENDA' ? 'bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-500' : 'bg-[#1351b4] shadow-blue-900/20 hover:bg-[#0047b7]'
                }`}>
                Confirmar Operação em Lote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAR CARTELA (SIMULAÇÃO DO PDF) */}
      {modalVisualizarCartelaAberta && alocacaoParaVisualizar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Cabeçalho Idêntico ao PDF */}
            <div className="bg-[#1351b4] p-10 text-white text-center relative shrink-0">
              <div className="absolute top-8 left-10 flex flex-col items-start gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Cartela #</span>
                <span className="text-2xl font-black">{alocacoes.indexOf(alocacaoParaVisualizar) + 1}</span>
              </div>

              <h3 className="text-2xl font-black uppercase tracking-tight mb-1">
                {rifaSelecionada.titulo || rifaSelecionada.nome}
              </h3>
              {rifaSelecionada.paroquia?.nome && (
                <p className="text-sm font-bold text-blue-100 uppercase mb-2">{rifaSelecionada.paroquia.nome}</p>
              )}
              <p className="text-[10px] italic text-blue-200/80 max-w-2xl mx-auto line-clamp-1">{rifaSelecionada.descricao}</p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  <span className="text-[12px] font-black tracking-widest text-blue-200">Sorteio dia</span>
                  <span className="text-[12px] font-bold">{formatarDataPorExtensoSegura(rifaSelecionada.dataSorteio)} </span>
                </div>
              </div>

              <button
                onClick={() => setModalVisualizarCartelaAberta(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">

              {/* Seção de Info e Legenda */}
              <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsável</span>
                      <span className="text-sm font-black text-slate-700">{getNomeResponsavel(alocacaoParaVisualizar)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Vendido</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Reservado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Livre</span>
                    </div>
                  </div>
                </div>

                {/* Premiação Compacta (Menor) */}
                <div className="lg:max-w-xs bg-slate-50/50 border border-slate-100 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Premiação</span>
                  </div>
                  <div className="space-y-2">
                    {(rifaSelecionada.premios ? [...rifaSelecionada.premios].sort((a: any, b: any) => a.posicao - b.posicao) : []).map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 w-4 h-4 rounded flex items-center justify-center shrink-0 border border-amber-100">{p.posicao}º</span>
                        <span className="text-[10px] font-bold text-slate-500 truncate uppercase">{p.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid de Bilhetes (Simulação da Tabela do PDF) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade de Números</span>
                  <span className="text-[10px] font-black text-[#1351b4] uppercase tracking-widest">
                    Intervalo #{alocacaoParaVisualizar.inicioRange} ao #{alocacaoParaVisualizar.fimRange}
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                  {bilhetes
                    .filter(b => b.numero >= alocacaoParaVisualizar.inicioRange && b.numero <= alocacaoParaVisualizar.fimRange)
                    .map((b) => (
                      <div
                        key={b.id}
                        className={`aspect-square rounded-sm border flex flex-col items-center justify-center transition-all ${b.status === 'VENDIDO' ? 'bg-emerald-500 border-emerald-600 text-white' :
                          b.status === 'RESERVADO' ? 'bg-amber-500 border-amber-600 text-white' :
                            'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                      >
                        <span className="text-xs font-black tracking-tighter">{b.numero.toString().padStart(3, '0')}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setModalVisualizarCartelaAberta(false)}
                className="min-w-[140px] px-8 py-4 bg-white hover:bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-sm transition-all border border-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => await gerarPDFCartela(alocacaoParaVisualizar, bilhetes.filter(b => b.numero >= alocacaoParaVisualizar.inicioRange && b.numero <= alocacaoParaVisualizar.fimRange))}
                className="flex-1 lg:flex-none min-w-[140px] px-8 py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
