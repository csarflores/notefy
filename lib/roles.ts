import { MemberRole, ResourceType } from '@/types';

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  editor: 'Editor',
  commenter: 'Comentarista',
  viewer: 'Solo lectura',
};

export const MEMBER_ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  editor: 'Puede ver, comentar y editar',
  commenter: 'Puede ver y comentar',
  viewer: 'Solo puede ver',
};

// Roles que se pueden asignar según el tipo de recurso.
// Las notas no tienen comentarios, por eso no ofrecen 'commenter'.
export function rolesForResource(resourceType: ResourceType): MemberRole[] {
  return resourceType === 'note' ? ['editor', 'viewer'] : ['editor', 'commenter', 'viewer'];
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  project: 'proyecto',
  board: 'tablero',
  note: 'nota',
};
