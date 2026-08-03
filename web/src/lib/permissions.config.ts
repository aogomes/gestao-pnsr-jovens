// Arquivo central de permissões.
// Este arquivo deve ser idêntico ao do backend para manter sincronia.

export type PapelUsuario = 'ADMIN' | 'AUDITOR' | 'GESTOR' | 'CONSULTOR' | 'USUARIO';

export type Modulo =
  | 'painel'
  | 'minhas-rifas'
  | 'vendas'
  | 'pessoas'
  | 'trabalhos'
  | 'inscricoes'
  | 'transacoes'
  | 'contas'
  | 'eventos'
  | 'rifas'
  | 'usuarios'
  | 'relatorios';

export type Acao = 'ler' | 'escrever';

export type PermissionsMap = Record<PapelUsuario, Partial<Record<Modulo, Acao[]>>>;

export const rolePermissions: PermissionsMap = {
  USUARIO: {
    'painel': ['ler']
    // 'minhas-rifas': ['ler', 'escrever'],
    // 'vendas': ['ler', 'escrever']
  },
  CONSULTOR: {
    'painel': ['ler'],
    'minhas-rifas': ['ler', 'escrever'],
    'vendas': ['ler', 'escrever'],
    'pessoas': ['ler']
  },
  GESTOR: {
    'painel': ['ler'],
    // 'contas': ['ler'],
    'trabalhos': ['ler'],
    'eventos': ['ler', 'escrever'],
    // 'inscricoes': ['ler', 'escrever'],
    'pessoas': ['ler'],
    'relatorios': ['ler']
  },
  AUDITOR: {
    'painel': ['ler'],
    'minhas-rifas': ['ler', 'escrever'],
    'transacoes': ['ler'],
    'contas': ['ler'],
    'vendas': ['ler', 'escrever'],
    'trabalhos': ['ler', 'escrever'],
    'inscricoes': ['ler', 'escrever'],
    'eventos': ['ler', 'escrever'],
    'rifas': ['ler', 'escrever'],
    'pessoas': ['ler'],
    'usuarios': ['ler'],
    'relatorios': ['ler']
  },
  ADMIN: {
    'painel': ['ler', 'escrever'],
    'minhas-rifas': ['ler', 'escrever'],
    'transacoes': ['ler', 'escrever'],
    'contas': ['ler', 'escrever'],
    'vendas': ['ler', 'escrever'],
    'trabalhos': ['ler', 'escrever'],
    'inscricoes': ['ler', 'escrever'],
    'eventos': ['ler', 'escrever'],
    'rifas': ['ler', 'escrever'],
    'pessoas': ['ler', 'escrever'],
    'usuarios': ['ler', 'escrever'],
    'relatorios': ['ler']
  }
};

/**
 * Função utilitária para verificar permissão
 */
export function hasPermission(papel: PapelUsuario, modulo: Modulo, acao: Acao): boolean {
  if (papel === 'ADMIN') return true; // ADMIN tem acesso total a tudo por definição.

  const permissoesDoPapel = rolePermissions[papel];
  if (!permissoesDoPapel) return false;

  const permissoesDoModulo = permissoesDoPapel[modulo];
  if (!permissoesDoModulo) return false;

  return permissoesDoModulo.includes(acao);
}
