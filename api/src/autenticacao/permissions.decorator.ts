import { SetMetadata } from '@nestjs/common';
import { Modulo, Acao } from './permissions.config';

export const PERMISSIONS_KEY = 'permissions';
export interface PermissionRequirement {
  modulo: Modulo;
  acao: Acao;
}

export const RequirePermissions = (modulo: Modulo, acao: Acao) => SetMetadata(PERMISSIONS_KEY, { modulo, acao });
