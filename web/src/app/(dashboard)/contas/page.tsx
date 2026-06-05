'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Plus,
  Church,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  MapPin,
  User as UserIcon,
  Wallet,
  LayoutGrid,
  Building2,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw
} from 'lucide-react';

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Erro ao carregar PDF.js do CDN.'));
    document.head.appendChild(script);
  });
};

export default function ContasPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const [abaAtiva, setAbaAtiva] = useState<'contas' | 'paroquias' | 'importar'>((tab as any) || 'contas');
  const [carregando, setCarregando] = useState(true);

  // Estados de Importação de Extrato
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [arquivoImportado, setArquivoImportado] = useState<File | null>(null);
  const [carregandoParser, setCarregandoParser] = useState(false);
  const [statusParserMsg, setStatusParserMsg] = useState('');
  const [transacoesImportadas, setTransacoesImportadas] = useState<any[]>([]);
  const [metodoImportar, setMetodoImportar] = useState('TRANSFERENCIA');
  const [importandoLote, setImportandoLote] = useState(false);

  // Estados para mapeamento de colunas de CSV
  const [visualizarMapeamentoCsv, setVisualizarMapeamentoCsv] = useState(false);
  const [linhasOriginaisCsv, setLinhasOriginaisCsv] = useState<string[][]>([]);
  const [delimitadorCsv, setDelimitadorCsv] = useState(';');
  const [mapeamentoColunas, setMapeamentoColunas] = useState({
    data: -1,
    descricao: -1,
    valor: -1,
    historico: -1,
  });
  const [termoBusca, setTermoBusca] = useState('');

  // Estados Paróquias
  const [paroquias, setParoquias] = useState<any[]>([]);
  const [modalParoquiaAberto, setModalParoquiaAberto] = useState(false);
  const [paroquiaEdicao, setParoquiaEdicao] = useState<any>(null);
  const [formParoquia, setFormParoquia] = useState({ nome: '', paroco: '', cidade: '' });

  // Estados Contas
  const [contas, setContas] = useState<any[]>([]);
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [contaEdicao, setContaEdicao] = useState<any>(null);
  const [formConta, setFormConta] = useState({ nome: '', paroquiaId: '', saldo: 0 });
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<any>(null);

  // Estados Lançamentos
  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false);
  const [formLancamento, setFormLancamento] = useState({ tipo: 'RECEITA', descricao: '', valor: '' as any, contaId: '' });

  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'paroquias' || tabParam === 'contas' || tabParam === 'importar') {
      setAbaAtiva(tabParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    carregarDados();
  }, [abaAtiva]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      if (abaAtiva === 'paroquias') {
        const res = await api.get('/paroquias');
        setParoquias(res.data);
      } else {
        const [resContas, resParoquias] = await Promise.all([
          api.get('/contas'),
          api.get('/paroquias')
        ]);
        setContas(resContas.data);
        setParoquias(resParoquias.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  // --- Lógica Paróquias ---
  const abrirModalParoquia = (p: any = null) => {
    if (p) {
      setParoquiaEdicao(p);
      setFormParoquia({ nome: p.nome, paroco: p.paroco, cidade: p.cidade });
    } else {
      setParoquiaEdicao(null);
      setFormParoquia({ nome: '', paroco: '', cidade: '' });
    }
    setModalParoquiaAberto(true);
  };

  const salvarParoquia = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      if (paroquiaEdicao) {
        await api.patch(`/paroquias/${paroquiaEdicao.id}`, formParoquia);
      } else {
        await api.post('/paroquias', formParoquia);
      }
      setModalParoquiaAberto(false);
      carregarDados();
    } catch (err) {
      alert('Erro ao salvar paróquia.');
    } finally {
      setEnviando(false);
    }
  };

  const excluirParoquia = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta paróquia?')) return;
    try {
      await api.delete(`/paroquias/${id}`);
      carregarDados();
    } catch (err) {
      alert('Erro ao excluir paróquia.');
    }
  };

  // --- Lógica Contas ---
  const abrirModalConta = (c: any = null) => {
    if (c) {
      setContaEdicao(c);
      setFormConta({ nome: c.nome, paroquiaId: c.paroquiaId, saldo: c.saldo });
    } else {
      setContaEdicao(null);
      setFormConta({ nome: '', paroquiaId: paroquias[0]?.id || '', saldo: 0 });
    }
    setModalContaAberto(true);
  };

  const salvarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const payload = {
        ...formConta,
        paroquiaId: Number(formConta.paroquiaId)
      };

      if (contaEdicao) {
        await api.patch(`/contas/${contaEdicao.id}`, payload);
      } else {
        await api.post('/contas', payload);
      }
      setModalContaAberto(false);
      carregarDados();
    } catch (err) {
      alert('Erro ao salvar conta.');
    } finally {
      setEnviando(false);
    }
  };

  const excluirConta = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    try {
      await api.delete(`/contas/${id}`);
      carregarDados();
    } catch (err) {
      alert('Erro ao excluir conta.');
    }
  };

  const abrirModalExtrato = (c: any) => {
    setContaSelecionada(c);
    setModalExtratoAberto(true);
  };

  const abrirModalLancamento = (c: any) => {
    setFormLancamento({ tipo: 'RECEITA', descricao: '', valor: '', contaId: c.id });
    setModalLancamentoAberto(true);
  };

  const salvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post('/transacoes', {
        ...formLancamento,
        contaId: Number(formLancamento.contaId),
        valor: Number(formLancamento.valor),
        origem: 'CONTAS'
      });
      setModalLancamentoAberto(false);

      const resContas = await api.get('/contas');
      setContas(resContas.data);

      // Atualizar a conta selecionada para refletir o novo saldo e transação
      const resContaUnica = await api.get(`/contas/${formLancamento.contaId}`);
      setContaSelecionada(resContaUnica.data);

    } catch (err) {
      alert('Erro ao lançar movimentação.');
    } finally {
      setEnviando(false);
    }
  };

  const aplicarMapeamentoCsv = (linhas: string[][], del: string, mapCols: typeof mapeamentoColunas) => {
    if (mapCols.data === -1 || mapCols.descricao === -1 || mapCols.valor === -1) {
      alert('Por favor, selecione todas as colunas obrigatórias.');
      return;
    }

    const formatarDataInput = (dStr: string) => {
      const parts = dStr.split(/[/\-]/);
      if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
      }
      return new Date().toISOString().split('T')[0];
    };

    const parsed: any[] = [];
    const startIdx = 1;

    for (let i = startIdx; i < linhas.length; i++) {
      const colunas = linhas[i];
      if (colunas.length < Math.max(mapCols.data, mapCols.descricao, mapCols.valor) + 1) continue;

      const rawData = colunas[mapCols.data].trim();
      const rawDesc = colunas[mapCols.descricao].trim();
      const rawVal = colunas[mapCols.valor].trim();
      const rawHist = mapCols.historico !== -1 && colunas[mapCols.historico] ? colunas[mapCols.historico].trim() : '';

      if (!rawData || !rawVal) continue;

      let cleanValStr = rawVal
        .replace(/R\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');

      if (cleanValStr.endsWith('-')) {
        cleanValStr = '-' + cleanValStr.replace('-', '');
      }

      const valor = parseFloat(cleanValStr);
      if (isNaN(valor)) continue;

      const type = valor >= 0 ? 'RECEITA' : 'DESPESA';

      parsed.push({
        idTemp: i,
        data: formatarDataInput(rawData),
        descricao: rawDesc || 'Lançamento Extrato CSV',
        valor: Math.abs(valor),
        tipo: type,
        selecionado: true,
        metodo: rawHist || metodoImportar,
      });
    }

    setTransacoesImportadas(parsed);
    setVisualizarMapeamentoCsv(false);
  };

  const handleUploadArquivo = async (file: File) => {
    setArquivoImportado(file);
    setTransacoesImportadas([]);
    setVisualizarMapeamentoCsv(false);
    setCarregandoParser(true);

    const formatarDataInput = (dStr: string) => {
      const parts = dStr.split(/[/\-]/);
      if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
      }
      return new Date().toISOString().split('T')[0];
    };

    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        setStatusParserMsg('Analisando arquivo CSV...');
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) {
          alert('Arquivo CSV vazio.');
          setCarregandoParser(false);
          return;
        }

        // 1. Identificar o delimitador observando as primeiras linhas com conteúdo
        let sep = ';';
        const searchDelimLine = lines.find(l => l.includes(';') || l.includes(','));
        if (searchDelimLine) {
          sep = searchDelimLine.includes(';') ? ';' : ',';
        }
        setDelimitadorCsv(sep);

        // 2. Identificar a linha do cabeçalho real (ignorando metadados do topo como título, saldo, conta, etc.)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
          const cols = lines[i].split(sep).map(c => c.trim().toLowerCase());
          const hasData = cols.some(c => c.includes('data') || c.includes('date'));
          const hasValorOrSaldo = cols.some(c => c.includes('valor') || c.includes('val') || c.includes('saldo') || c.includes('amount'));
          const hasDescOrHist = cols.some(c => c.includes('desc') || c.includes('hist'));

          if (hasData && (hasValorOrSaldo || hasDescOrHist)) {
            headerRowIndex = i;
            break;
          }
        }

        // Mapeia todas as linhas em colunas a partir do delimitador
        const allRows = lines.map(line => line.split(sep).map(col => col.trim().replace(/^["']|["']$/g, '')));

        // Mantém apenas as linhas a partir do cabeçalho real detectado
        const rows = allRows.slice(headerRowIndex);
        setLinhasOriginaisCsv(rows);

        const header = rows[0] || [];
        let dateIdx = -1;
        let descIdx = -1;
        let valIdx = -1;
        let histIdx = -1;

        // 3. Autodetectar colunas com heurística de prioridade inteligente
        header.forEach((h, idx) => {
          const lower = h.toLowerCase();

          if (lower.includes('data') || lower.includes('date')) {
            dateIdx = idx;
          }

          if (lower.includes('desc') || lower.includes('detalhe')) {
            descIdx = idx;
          } else if (descIdx === -1 && lower.includes('memo')) {
            descIdx = idx;
          }

          if (lower.includes('hist') || lower.includes('historico') || lower.includes('histórico') || lower.includes('mecanismo') || lower.includes('metodo') || lower.includes('método')) {
            histIdx = idx;
          }

          if (lower.includes('valor') || lower.includes('val') || lower.includes('amount')) {
            valIdx = idx;
          } else if (valIdx === -1 && lower.includes('saldo')) {
            valIdx = idx;
          }
        });

        // Se encontrou histIdx mas descIdx é -1, podemos usar histIdx como descIdx provisório
        if (descIdx === -1 && histIdx !== -1) {
          descIdx = histIdx;
        }

        // Fallback caso a detecção por cabeçalho falhe em achar colunas obrigatórias
        if (dateIdx === -1 || valIdx === -1) {
          const sample = rows.slice(1, 4);
          sample.forEach(row => {
            row.forEach((col, idx) => {
              if (/\d{2}[/\-]\d{2}[/\-]\d{2,4}/.test(col)) dateIdx = idx;
              if (/^-?\d*([.,]\d{2})?$/.test(col) && !/\d{2}[/\-]\d{2}/.test(col)) valIdx = idx;
            });
          });
        }

        const mapCols = {
          data: dateIdx !== -1 ? dateIdx : 0,
          descricao: descIdx !== -1 ? descIdx : (dateIdx !== 0 && valIdx !== 0 ? 1 : 2),
          valor: valIdx !== -1 ? valIdx : 1,
          historico: histIdx,
        };

        setMapeamentoColunas(mapCols);
        setVisualizarMapeamentoCsv(true);
        setStatusParserMsg('');

      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        setStatusParserMsg('Carregando biblioteca PDF.js do CDN...');
        const pdfjsLib = await loadPdfJs();

        setStatusParserMsg('Lendo arquivo PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        let allLines: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          setStatusParserMsg(`Extraindo texto: página ${i} de ${numPages}...`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();

          const items = textContent.items as any[];
          const linesMap: { [y: number]: any[] } = {};
          items.forEach(item => {
            const y = Math.round(item.transform[5]);
            if (!linesMap[y]) {
              linesMap[y] = [];
            }
            linesMap[y].push(item);
          });

          const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
          sortedY.forEach(y => {
            const lineText = linesMap[y]
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map(item => item.str)
              .join(' ');
            if (lineText.trim()) {
              allLines.push(lineText);
            }
          });
        }

        setStatusParserMsg('Identificando lançamentos no extrato...');
        const parsed: any[] = [];
        let dataAtual = '';

        const skipWords = [
          'saldo total',
          'saldo disponível',
          'saldo disponivel',
          'saldo bloqueado',
          'período:',
          'periodo:',
          'cpf/cnpj:',
          'cnpj:',
          'banco inter',
          'solicitado em:',
          'saldo do dia:',
          'extrato',
          'instituição:',
          'agência:',
          'conta:'
        ];

        allLines.forEach((line, idx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          // 1. Verificar se a linha é um cabeçalho de data em português (ex: "26 de Abril de 2026" ou "26 de abril de 2026")
          const dateMatchPt = trimmedLine.match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+de\s+(\d{4})/i);
          if (dateMatchPt) {
            const day = dateMatchPt[1].padStart(2, '0');
            const monthName = dateMatchPt[2].toLowerCase();
            const year = dateMatchPt[3];
            const meses: { [key: string]: string } = {
              janeiro: '01', jan: '01',
              fevereiro: '02', fev: '02',
              março: '03', mar: '03',
              abril: '04', abr: '04',
              maio: '05', mai: '05',
              junho: '06', jun: '06',
              julho: '07', jul: '07',
              agosto: '08', ago: '08',
              setembro: '09', set: '09',
              outubro: '10', out: '10',
              novembro: '11', nov: '11',
              dezembro: '12', dez: '12'
            };
            const month = meses[monthName] || '01';
            dataAtual = `${year}-${month}-${day}`;
            return; // Cabeçalho de data processado, pula para a próxima linha
          }

          // 2. Verificar se a linha contém palavras-chave a serem ignoradas
          if (skipWords.some(word => trimmedLine.toLowerCase().includes(word))) {
            return;
          }

          // 3. Verificar se há uma data padrão em formato dd/mm/aaaa na linha
          const dateMatchStd = trimmedLine.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4}|\d{2})/);
          let dateStr = dataAtual;
          let lineContent = trimmedLine;

          if (dateMatchStd) {
            const day = dateMatchStd[1];
            const month = dateMatchStd[2];
            let year = dateMatchStd[3];
            if (year.length === 2) year = '20' + year;
            dateStr = `${year}-${month}-${day}`;
            lineContent = trimmedLine.replace(dateMatchStd[0], '').trim();
          }

          if (!dateStr) return;

          // 4. Buscar valores monetários na linha
          const valueRegex = /(?:-\s*)?R\$\s*-?\s*\d+(?:\.\d{3})*,\d{2}|-?\s*\d+(?:\.\d{3})*,\d{2}/g;
          const matches = [...lineContent.matchAll(valueRegex)];

          if (matches.length > 0) {
            // Se houver 2 ou mais valores, o penúltimo é o valor da transação e o último é o saldo acumulado
            // Se houver apenas 1 valor, ele é o valor da transação
            const valMatch = matches.length >= 2 ? matches[matches.length - 2] : matches[0];
            const valStr = valMatch[0];
            const valIndex = valMatch.index || 0;

            // A descrição é tudo antes do valor da transação
            let description = lineContent.substring(0, valIndex).trim();

            // Limpa caracteres indesejados da descrição
            description = description
              .replace(/^[:"\s]+|[:"\s]+$/g, '')
              .replace(/^[-\s]+|[-\s]+$/g, '')
              .trim();

            if (!description || description.toLowerCase() === 'valor') return;

            let cleanValStr = valStr
              .replace(/R\$/g, '')
              .replace(/\s/g, '')
              .replace(/\./g, '')
              .replace(/,/g, '.');

            if (cleanValStr.endsWith('-')) {
              cleanValStr = '-' + cleanValStr.replace('-', '');
            }

            const valor = parseFloat(cleanValStr);
            if (!isNaN(valor)) {
              let type = valor >= 0 ? 'RECEITA' : 'DESPESA';

              // Auto-detecção inteligente baseada em palavras-chave da descrição caso o valor seja positivo mas pareça uma despesa
              if (valor > 0 && type === 'RECEITA') {
                const descLower = description.toLowerCase();
                const palavrasDespesa = [
                  'enviado', 'pagamento', 'saída', 'saida', 'débito', 'debito',
                  'compra', 'tarifa', 'despesa', 'retirada', 'transferência enviada',
                  'ted enviada', 'pgto', 'doc enviado', 'ted enviando'
                ];
                if (palavrasDespesa.some(palavra => descLower.includes(palavra))) {
                  type = 'DESPESA';
                }
              }

              parsed.push({
                idTemp: idx,
                data: dateStr,
                descricao: description || 'Movimentação Extrato PDF',
                valor: Math.abs(valor),
                tipo: type,
                selecionado: true,
                metodo: metodoImportar,
              });
            }
          }
        });

        setTransacoesImportadas(parsed);
        if (parsed.length === 0) {
          alert('Não foi possível identificar nenhuma transação no formato esperado do PDF. Tente usar CSV ou copiar e cole os dados em um arquivo CSV.');
        }
      } else {
        alert('Formato de arquivo não suportado. Envie um arquivo .csv ou .pdf.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao ler arquivo: ' + err.message);
    } finally {
      setCarregandoParser(false);
      setStatusParserMsg('');
    }
  };

  const confirmarImportacaoExtrato = async () => {
    if (!contaDestinoId) {
      alert('Selecione uma conta de destino.');
      return;
    }

    const selecionadas = transacoesImportadas.filter(t => t.selecionado);
    if (selecionadas.length === 0) {
      alert('Nenhuma transação selecionada para importação.');
      return;
    }

    setImportandoLote(true);
    try {
      const payload = selecionadas.map(t => ({
        valor: t.valor,
        tipo: t.tipo,
        descricao: t.descricao,
        metodo: t.metodo,
        contaId: Number(contaDestinoId),
        data: new Date(t.data).toISOString(),
      }));

      await api.post('/lancamentos-extrato/lote', payload);
      alert(`${selecionadas.length} transações importadas e salvas com sucesso!`);

      setArquivoImportado(null);
      setTransacoesImportadas([]);

      await carregarDados();
      setAbaAtiva('contas');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao importar transações: ' + (err.response?.data?.message || err.message));
    } finally {
      setImportandoLote(false);
    }
  };

  const formatarData = (isoString: string) => {
    if (!isoString) return '';
    const [year, month, day] = isoString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const paroquiasFiltradas = paroquias.filter(p =>
    p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    p.cidade.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const contasFiltradas = contas.filter(c =>
    c.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    c.paroquia?.nome.toLowerCase().includes(termoBusca.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header da Página */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1351b4] uppercase tracking-tight">Gestão de Contas e Paróquias</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configurações financeiras e administrativas</p>
        </div>
      </div>

      {/* SISTEMA DE ABAS PARA CONTAS E PARÓQUIAS */}
      <div className="border-b border-slate-200 overflow-x-auto custom-scrollbar no-scrollbar">
        <div className="flex gap-8">
          <button
            key="contas"
            onClick={() => setAbaAtiva('contas')}
            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${abaAtiva === 'contas'
              ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/20'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Wallet className="w-4 h-4" />
            Contas
          </button>
          <button
            key="paroquias"
            onClick={() => setAbaAtiva('paroquias')}
            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${abaAtiva === 'paroquias'
              ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/20'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Church className="w-4 h-4" />
            Paróquias
          </button>
          <button
            key="importar"
            onClick={() => setAbaAtiva('importar')}
            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${abaAtiva === 'importar'
              ? 'bg-[#1351b4] text-white shadow-lg shadow-blue-900/20'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
          >
            <RefreshCw className="w-4 h-4" />
            Importar
          </button>
        </div>
      </div>

      {/* Barra de Busca */}
      {abaAtiva !== 'importar' && (
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1351b4] transition-colors" />
            <input
              type="text"
              placeholder={`Localizar por ${abaAtiva === 'contas' ? 'nome da conta ou paróquia' : 'nome ou cidade'}...`}
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#1351b4] focus:ring-4 focus:ring-[#1351b4]/5 transition-all text-slate-700 placeholder:text-slate-300"
            />
          </div>
        </div>
      )}

      {/* Conteúdo - Tabela de Contas */}
      {abaAtiva === 'contas' && (
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{contasFiltradas.length} conta{contasFiltradas.length !== 1 ? 's' : ''} encontrada{contasFiltradas.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => abrirModalConta()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
              Nova Conta
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Identificação</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Paróquia Vinculada</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Atual</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1351b4]" /></td></tr>
                ) : contasFiltradas.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Nenhuma conta encontrada</td></tr>
                ) : (
                  contasFiltradas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center text-[#1351b4] border border-slate-200 group-hover:bg-[#1351b4] group-hover:text-white transition-all">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <span className="font-black text-slate-700 text-xs uppercase">{conta.nome}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]">
                          <Church className="w-3.5 h-3.5" />
                          {conta.paroquia?.nome || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.saldo)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => abrirModalExtrato(conta)} title="Ver Movimentações" className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-600 rounded-sm transition-all shadow-sm">
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button onClick={() => abrirModalConta(conta)} title="Editar" className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-[#1351b4] hover:border-[#1351b4] rounded-sm transition-all shadow-sm">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => excluirConta(conta.id)} title="Excluir" className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-500 rounded-sm transition-all shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo - Tabela de Paróquias */}
      {abaAtiva === 'paroquias' && (
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{paroquiasFiltradas.length} paróquia{paroquiasFiltradas.length !== 1 ? 's' : ''} encontrada{paroquiasFiltradas.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => abrirModalParoquia()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all shadow-sm group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
              Nova Paróquia
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Paróquia</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Responsável</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Localização</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1351b4]" /></td></tr>
                ) : paroquiasFiltradas.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Nenhuma paróquia encontrada</td></tr>
                ) : (
                  paroquiasFiltradas.map((paroquia) => (
                    <tr key={paroquia.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center text-[#1351b4] border border-slate-200 group-hover:bg-[#1351b4] group-hover:text-white transition-all">
                            <Church className="w-5 h-5" />
                          </div>
                          <span className="font-black text-slate-700 text-xs uppercase">{paroquia.nome}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-500 font-bold text-[11px]">
                        <div className="flex items-center gap-2 uppercase">
                          <UserIcon className="w-3.5 h-3.5" />
                          {paroquia.paroco}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-500 font-bold text-[11px]">
                        <div className="flex items-center gap-2 uppercase">
                          <MapPin className="w-3.5 h-3.5" />
                          {paroquia.cidade}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => abrirModalParoquia(paroquia)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-[#1351b4] hover:border-[#1351b4] rounded-sm transition-all shadow-sm">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => excluirParoquia(paroquia.id)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-500 rounded-sm transition-all shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo - Importação de Extrato */}
      {abaAtiva === 'importar' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-black text-[#1351b4] uppercase tracking-tight">Importação de Extrato Bancário</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Selecione uma conta, envie o extrato em PDF ou CSV e valide os lançamentos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Conta Financeira de Destino</label>
                <select
                  value={contaDestinoId}
                  onChange={(e) => setContaDestinoId(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none focus:border-[#1351b4] uppercase appearance-none"
                >
                  <option value="">Selecione a conta para receber os lançamentos...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome} (Saldo: {formatarMoeda(c.saldo)})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Método de Pagamento Padrão</label>
                <select
                  value={metodoImportar}
                  onChange={(e) => setMetodoImportar(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none focus:border-[#1351b4] uppercase"
                >
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </div>
            </div>

            {/* Dropzone de Upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Selecione o Arquivo do Extrato (.CSV ou .PDF)</label>
              <div
                onClick={() => document.getElementById('input-file-import')?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-[#1351b4]/40 bg-slate-50 hover:bg-[#1351b4]/5 cursor-pointer rounded-sm p-10 flex flex-col items-center justify-center text-center transition-all group"
              >
                <input
                  id="input-file-import"
                  type="file"
                  accept=".csv,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadArquivo(file);
                  }}
                />
                <ArrowRightLeft className="w-10 h-10 text-slate-300 group-hover:text-[#1351b4] group-hover:scale-110 transition-all mb-4" />
                {arquivoImportado ? (
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{arquivoImportado.name}</p>
                    <p className="text-[10px] text-[#1351b4] font-black uppercase mt-1">{(arquivoImportado.size / 1024).toFixed(1)} KB • CLIQUE PARA SUBSTITUIR</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-tight">Arraste e solte o arquivo aqui ou clique para selecionar</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Suporta extratos bancários em arquivos formato .csv ou .pdf</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Parser Loader */}
            {carregandoParser && (
              <div className="p-10 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="w-8 h-8 text-[#1351b4] animate-spin" />
                <p className="text-xs font-black text-[#1351b4] uppercase tracking-widest animate-pulse">{statusParserMsg}</p>
              </div>
            )}

            {/* Modal de Mapeamento Csv */}
            {visualizarMapeamentoCsv && linhasOriginaisCsv.length > 0 && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-sm space-y-4 animate-in fade-in duration-200">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Configuração das Colunas do CSV</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Como detectamos dados diferentes, informe quais colunas correspondem a cada campo:</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 border border-slate-200 rounded-sm">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Coluna de Data</label>
                    <select
                      value={mapeamentoColunas.data}
                      onChange={(e) => setMapeamentoColunas({ ...mapeamentoColunas, data: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-700 uppercase"
                    >
                      {linhasOriginaisCsv[0].map((h, idx) => (
                        <option key={idx} value={idx}>Coluna #{idx + 1}: {h || `(Vazia)`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Coluna de Descrição</label>
                    <select
                      value={mapeamentoColunas.descricao}
                      onChange={(e) => setMapeamentoColunas({ ...mapeamentoColunas, descricao: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-700 uppercase"
                    >
                      {linhasOriginaisCsv[0].map((h, idx) => (
                        <option key={idx} value={idx}>Coluna #{idx + 1}: {h || `(Vazia)`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Coluna de Histórico / Método (Opcional)</label>
                    <select
                      value={mapeamentoColunas.historico}
                      onChange={(e) => setMapeamentoColunas({ ...mapeamentoColunas, historico: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-700 uppercase"
                    >
                      <option value={-1}>Ignorar / Método Padrão</option>
                      {linhasOriginaisCsv[0].map((h, idx) => (
                        <option key={idx} value={idx}>Coluna #{idx + 1}: {h || `(Vazia)`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Coluna de Valor</label>
                    <select
                      value={mapeamentoColunas.valor}
                      onChange={(e) => setMapeamentoColunas({ ...mapeamentoColunas, valor: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-700 uppercase"
                    >
                      {linhasOriginaisCsv[0].map((h, idx) => (
                        <option key={idx} value={idx}>Coluna #{idx + 1}: {h || `(Vazia)`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setArquivoImportado(null);
                      setVisualizarMapeamentoCsv(false);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-500 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarMapeamentoCsv(linhasOriginaisCsv, delimitadorCsv, mapeamentoColunas)}
                    className="px-6 py-2 bg-[#1351b4] text-white rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-[#0047b7]"
                  >
                    Processar Lançamentos
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Transações Pré-Visualizadas */}
            {transacoesImportadas.length > 0 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      Lançamentos Identificados ({transacoesImportadas.filter(t => t.selecionado).length} de {transacoesImportadas.length} selecionados)
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Revise os dados, edite se necessário e desmarque o que não quer gravar.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTransacoesImportadas(prev => prev.map(t => ({ ...t, selecionado: true })))}
                      className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-slate-200"
                    >
                      Selecionar Tudo
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransacoesImportadas(prev => prev.map(t => ({ ...t, selecionado: false })))}
                      className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-slate-200"
                    >
                      Desmarcar Tudo
                    </button>
                  </div>
                </div>

                {/* Grid de Resumo e Simulação */}
                {(() => {
                  const contaDestino = contas.find(c => c.id.toString() === contaDestinoId);
                  const saldoAtual = contaDestino ? contaDestino.saldo : 0;
                  const selecionadas = transacoesImportadas.filter(t => t.selecionado);
                  const totalReceitas = selecionadas.filter(t => t.tipo === 'RECEITA').reduce((acc, t) => acc + t.valor, 0);
                  const totalDespesas = selecionadas.filter(t => t.tipo === 'DESPESA').reduce((acc, t) => acc + t.valor, 0);
                  const saldoProjetado = saldoAtual + totalReceitas - totalDespesas;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-sm">
                      <div className="bg-white border border-slate-200/60 p-3 rounded-sm shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Saldo Atual</span>
                        <p className="text-sm font-black text-slate-600 mt-1">{formatarMoeda(saldoAtual)}</p>
                      </div>
                      <div className="bg-white border border-slate-200/60 p-3 rounded-sm shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Receitas (+)</span>
                        <p className="text-sm font-black text-emerald-600 mt-1">+{formatarMoeda(totalReceitas)}</p>
                      </div>
                      <div className="bg-white border border-slate-200/60 p-3 rounded-sm shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Despesas (-)</span>
                        <p className="text-sm font-black text-rose-600 mt-1">-{formatarMoeda(totalDespesas)}</p>
                      </div>
                      <div className="bg-white border border-slate-200/60 p-3 rounded-sm shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Saldo Projetado</span>
                        <p className={`text-sm font-black mt-1 ${saldoProjetado >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatarMoeda(saldoProjetado)}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Tabela do Lote */}
                <div className="overflow-x-auto border border-slate-200 rounded-sm bg-white shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 sticky top-0 z-10">
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-12 text-center">Sel.</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-36">Data</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-40">Método / Histórico</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-28 text-center">Tipo</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-44 text-right">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transacoesImportadas.map((t, idx) => (
                        <tr key={t.idTemp || idx} className={`hover:bg-slate-50/50 transition-colors ${t.selecionado ? '' : 'opacity-40'}`}>
                          <td className="px-6 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={t.selecionado}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTransacoesImportadas(prev => prev.map((item, i) => i === idx ? { ...item, selecionado: checked } : item));
                              }}
                              className="w-4 h-4 text-[#1351b4] border-slate-300 rounded focus:ring-[#1351b4]"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="date"
                              required
                              value={t.data}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTransacoesImportadas(prev => prev.map((item, i) => i === idx ? { ...item, data: val } : item));
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              required
                              value={t.descricao}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTransacoesImportadas(prev => prev.map((item, i) => i === idx ? { ...item, descricao: val } : item));
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none uppercase"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              required
                              value={t.metodo || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTransacoesImportadas(prev => prev.map((item, i) => i === idx ? { ...item, metodo: val } : item));
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none uppercase"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <select
                              value={t.tipo}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTransacoesImportadas(prev => prev.map((item, i) => i === idx ? { ...item, tipo: val } : item));
                              }}
                              className={`w-full p-2 border rounded-sm text-[10px] font-black uppercase outline-none cursor-pointer ${t.tipo === 'RECEITA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
                            >
                              <option value="RECEITA">RECEITA</option>
                              <option value="DESPESA">DESPESA</option>
                            </select>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={t.valor}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setTransacoesImportadas(prev => prev.map((item, i) => i === idx ? { ...item, valor: val } : item));
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-black text-slate-700 outline-none text-right"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Ação de Gravação Final */}
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={confirmarImportacaoExtrato}
                    disabled={importandoLote || !contaDestinoId}
                    className="px-10 py-4 bg-emerald-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importandoLote ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Confirmar Importação de {transacoesImportadas.filter(t => t.selecionado).length} Registros
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Conta */}
      {modalContaAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">{contaEdicao ? 'Editar Conta' : 'Nova Conta Financeira'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Créditos e Rateios</p>
              </div>
              <button onClick={() => setModalContaAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={salvarConta} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Conta</label>
                <input
                  type="text" required value={formConta.nome}
                  onChange={(e) => setFormConta({ ...formConta, nome: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700"
                  placeholder="Ex: Fundo de Reserva - Paróquia"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Paróquia Responsável</label>
                <select
                  required value={formConta.paroquiaId}
                  onChange={(e) => setFormConta({ ...formConta, paroquiaId: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700 uppercase"
                >
                  <option value="">Selecione uma paróquia...</option>
                  {paroquias.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Saldo Inicial (Opcional)</label>
                <input
                  type="number" step="0.01" value={formConta.saldo}
                  onChange={(e) => setFormConta({ ...formConta, saldo: Number(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700"
                />
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button type="submit" disabled={enviando} className="flex-1 py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50">
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paróquia */}
      {modalParoquiaAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">{paroquiaEdicao ? 'Editar Paróquia' : 'Nova Unidade Paroquial'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Unidades</p>
              </div>
              <button onClick={() => setModalParoquiaAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={salvarParoquia} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Paróquia</label>
                <input
                  type="text" required value={formParoquia.nome}
                  onChange={(e) => setFormParoquia({ ...formParoquia, nome: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700"
                  placeholder="Ex: Paróquia Santo Antônio"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pároco Responsável</label>
                  <input
                    type="text" required value={formParoquia.paroco}
                    onChange={(e) => setFormParoquia({ ...formParoquia, paroco: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                  <input
                    type="text" required value={formParoquia.cidade}
                    onChange={(e) => setFormParoquia({ ...formParoquia, cidade: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button type="submit" disabled={enviando} className="flex-1 py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50">
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Extrato de Conta */}
      {modalExtratoAberto && contaSelecionada && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <Wallet className="w-6 h-6 text-[#1351b4]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Extrato: {contaSelecionada.nome}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Saldo Atual: <span className="text-emerald-600">{formatarMoeda(contaSelecionada.saldo)}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => abrirModalLancamento(contaSelecionada)}
                  className="px-6 py-2.5 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#0047b7] transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Lançar Movimento
                </button>
                <button onClick={() => setModalExtratoAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">Data</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">Descrição / Tipo</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!contaSelecionada.transacoes || contaSelecionada.transacoes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-16 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">
                          Nenhuma movimentação financeira encontrada nesta conta
                        </td>
                      </tr>
                    ) : (
                      contaSelecionada.transacoes.map((transacao: any) => {
                        const isReceita = transacao.tipo === 'RECEITA';
                        const isDespesa = transacao.tipo === 'DESPESA';
                        const valorColor = isReceita ? 'text-emerald-600' : isDespesa ? 'text-rose-600' : 'text-slate-600';
                        const bgIconColor = isReceita ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : isDespesa ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100';
                        const sinal = isReceita ? '+' : isDespesa ? '-' : '';
                        const Icon = isReceita ? ArrowUpCircle : isDespesa ? ArrowDownCircle : RefreshCw;

                        return (
                          <tr key={transacao.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-8 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                              {formatarData(transacao.data)}
                            </td>
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-sm flex items-center justify-center border ${bgIconColor} shadow-sm`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-700 text-xs uppercase">{transacao.descricao}</span>
                                  <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 font-bold">{transacao.tipo}</span>
                                </div>
                              </div>
                            </td>
                            <td className={`px-8 py-4 font-black text-xs text-right whitespace-nowrap ${valorColor}`}>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px]">{sinal}</span>
                                {formatarMoeda(transacao.valor)}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lançamento Rápido */}
      {modalLancamentoAberto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-[#1351b4] uppercase tracking-tight">Novo Lançamento</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Registrar entrada ou saída</p>
              </div>
              <button onClick={() => setModalLancamentoAberto(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={salvarLancamento} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Movimento</label>
                <select
                  value={formLancamento.tipo}
                  onChange={(e) => setFormLancamento({ ...formLancamento, tipo: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700 uppercase"
                >
                  <option value="RECEITA">Receita (Entrada)</option>
                  <option value="DESPESA">Despesa (Saída)</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <input
                  type="text" required value={formLancamento.descricao}
                  onChange={(e) => setFormLancamento({ ...formLancamento, descricao: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700"
                  placeholder="Ex: Doação de fiel, Compra de material..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                <input
                  type="number" step="0.01" required value={formLancamento.valor}
                  onChange={(e) => setFormLancamento({ ...formLancamento, valor: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1351b4] font-black text-slate-700"
                  placeholder="0,00"
                />
              </div>

              <div className="pt-4">
                <button type="submit" disabled={enviando} className="w-full py-4 bg-[#1351b4] text-white rounded-sm text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#0047b7] shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50">
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
