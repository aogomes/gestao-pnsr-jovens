import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionRequirement } from './permissions.decorator';
import { hasPermission, PapelUsuario } from './permissions.config';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se a rota não define uma permissão específica com @RequirePermissions, 
    // a verificação passa (assumindo que o JwtAuthGuard já tratou a autenticação básica).
    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    console.log('PermissionsGuard - User:', user);
    
    if (!user || !user.papel) {
      throw new ForbiddenException('Usuário não autenticado ou papel não definido.');
    }

    const hasAccess = hasPermission(user.papel as PapelUsuario, requiredPermission.modulo, requiredPermission.acao);
    
    const request = context.switchToHttp().getRequest();
    const targetId = parseInt(request.params.id, 10);

    let isOwnResource = false;

    // Se o usuário está tentando modificar sua própria pessoa
    if (requiredPermission.modulo === 'pessoas' && targetId && user.pessoaId === targetId) {
      isOwnResource = true;
    }

    // Se o usuário está tentando modificar o seu próprio usuário (ex: alterar senha)
    if (requiredPermission.modulo === 'usuarios' && targetId && user.sub === targetId) {
      isOwnResource = true;
    }

    // Se o usuário está tentando se inscrever em um evento (POST /inscricoes com sua pessoaId)
    if (requiredPermission.modulo === 'inscricoes' && request.method === 'POST' && !targetId) {
      if (request.body && request.body.pessoaId && parseInt(request.body.pessoaId, 10) === user.pessoaId) {
        isOwnResource = true;
      }
    }
    
    if (!hasAccess && !isOwnResource) {
      throw new ForbiddenException(`Acesso negado: Seu perfil (${user.papel}) não permite '${requiredPermission.acao}' no módulo '${requiredPermission.modulo}'.`);
    }

    return true;
  }
}
