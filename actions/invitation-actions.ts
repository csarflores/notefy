'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Invitation from '@/models/Invitation';
import Project from '@/models/Project';
import Board from '@/models/Board';
import Note from '@/models/Note';
import { getAuthUser, findOwnedProject, findOwnedBoard, isOwner, isMemberOrOwner, AuthUser } from '@/lib/auth-helpers';
import { sendInvitationEmail } from '@/lib/mail';
import { notifyUserByEmail } from '@/lib/notify';
import { isValidObjectId } from '@/lib/utils';
import { ApiResponse, IInvitation, INote, MemberRole, ResourceType } from '@/types';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
const INVITATION_TTL_DAYS = 7;

// Roles asignables por tipo de recurso. Las notas no tienen comentarios,
// por lo que 'commenter' solo aplica a proyectos y tableros.
const ALLOWED_ROLES: Record<ResourceType, MemberRole[]> = {
  project: ['viewer', 'commenter', 'editor'],
  board: ['viewer', 'commenter', 'editor'],
  note: ['viewer', 'editor'],
};

interface OwnedResource {
  _id: import('mongoose').Types.ObjectId;
  name?: string;
  title?: string;
  members: string[];
}

// Devuelve el recurso solo si el usuario es el propietario
async function findOwnedResource(
  resourceType: ResourceType,
  resourceId: string,
  user: AuthUser
): Promise<OwnedResource | null> {
  if (resourceType === 'project') return findOwnedProject(resourceId, user);
  if (resourceType === 'board') return findOwnedBoard(resourceId, user);
  if (!isValidObjectId(resourceId)) return null;
  await connectDB();
  const note = await Note.findById(resourceId);
  if (!note || note.deletedAt || !isOwner(note, user)) return null;
  return note;
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
  project: 'proyecto',
  board: 'tablero',
  note: 'nota',
};

const RESOURCE_LINKS: Record<ResourceType, (id: string) => string> = {
  project: (id) => `/parent-project/${id}`,
  board: (id) => `/board/${id}`,
  note: (id) => `/notes/${id}`,
};

// Crear y enviar una invitación pendiente por email
export async function createInvitation(
  resourceType: ResourceType,
  resourceId: string,
  email: string,
  role: MemberRole = 'editor'
): Promise<ApiResponse<IInvitation>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return { success: false, error: 'Email inválido' };
    }
    if (normalizedEmail === user.email) {
      return { success: false, error: 'No puedes invitarte a ti mismo' };
    }
    if (!ALLOWED_ROLES[resourceType].includes(role)) {
      return { success: false, error: 'Rol inválido' };
    }

    const resource = await findOwnedResource(resourceType, resourceId, user);
    if (!resource) {
      return { success: false, error: 'Recurso no encontrado o sin permisos' };
    }

    if (resource.members.includes(normalizedEmail)) {
      return { success: false, error: 'El usuario ya es miembro' };
    }

    await connectDB();

    // Reemplazar cualquier invitación pendiente previa al mismo email
    await Invitation.deleteMany({
      resourceType,
      resourceId,
      email: normalizedEmail,
      status: 'pending',
    });

    const resourceName = resource.name || resource.title || 'Recurso';
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      email: normalizedEmail,
      resourceType,
      resourceId: resource._id,
      resourceName,
      invitedBy: user.id,
      invitedByName: user.name,
      role,
      token,
      expiresAt,
    });

    const inviteUrl = `${APP_URL}/invite/${token}`;
    const label = RESOURCE_NAMES[resourceType];

    // Email (mejor esfuerzo: no fallar si SMTP no está configurado)
    try {
      await sendInvitationEmail(normalizedEmail, user.name, resourceType, resourceName, role, inviteUrl);
    } catch (error) {
      console.error('No se pudo enviar el email de invitación:', error);
    }

    // Notificación in-app si el usuario ya tiene cuenta
    await notifyUserByEmail(
      normalizedEmail,
      'invite',
      `${user.name} te invitó a ${label} "${resourceName}"`,
      `/invite/${token}`
    );

    return { success: true, data: JSON.parse(JSON.stringify(invitation)) };
  } catch (error) {
    console.error('Error al crear invitación:', error);
    return { success: false, error: 'Error al crear la invitación' };
  }
}

// Datos públicos mínimos de una invitación para la página /invite/[token]
export async function getInvitationByToken(token: string): Promise<
  ApiResponse<{
    email: string;
    resourceName: string;
    resourceType: ResourceType;
    invitedByName: string;
    role: MemberRole;
    status: 'pending' | 'accepted' | 'declined';
    expired: boolean;
  }>
> {
  try {
    if (!token || typeof token !== 'string' || token.length > 128) {
      return { success: false, error: 'Invitación inválida' };
    }
    await connectDB();
    const invitation = await Invitation.findOne({ token }).lean();
    if (!invitation) {
      return { success: false, error: 'Invitación no encontrada' };
    }
    return {
      success: true,
      data: {
        email: invitation.email,
        resourceName: invitation.resourceName,
        resourceType: invitation.resourceType,
        invitedByName: invitation.invitedByName,
        role: invitation.role,
        status: invitation.status,
        expired: invitation.expiresAt.getTime() < Date.now(),
      },
    };
  } catch (error) {
    console.error('Error al obtener invitación:', error);
    return { success: false, error: 'Error al obtener la invitación' };
  }
}

// Aceptar una invitación (requiere sesión con el email invitado)
export async function acceptInvitation(token: string): Promise<ApiResponse<{ link: string }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Debes iniciar sesión para aceptar la invitación' };
    }

    await connectDB();
    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
      return { success: false, error: 'Invitación no encontrada' };
    }
    if (invitation.email !== user.email.toLowerCase()) {
      return { success: false, error: 'Esta invitación fue enviada a otro email' };
    }
    if (invitation.status !== 'pending') {
      return { success: false, error: 'La invitación ya fue respondida' };
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      return { success: false, error: 'La invitación expiró' };
    }

    const { resourceType, role } = invitation;
    const resourceId = invitation.resourceId.toString();
    const link = RESOURCE_LINKS[resourceType](resourceId);

    if (resourceType === 'project') {
      const project = await Project.findById(resourceId);
      if (!project || project.deletedAt) return { success: false, error: 'El proyecto ya no existe' };
      if (!project.members.includes(invitation.email)) project.members.push(invitation.email);
      project.memberRoles?.set(invitation.email, role);
      await project.save();
      // Propagar a los tableros del proyecto
      const boards = await Board.find({ projectId: resourceId, deletedAt: null });
      for (const board of boards) {
        if (!board.members.includes(invitation.email)) board.members.push(invitation.email);
        board.memberRoles?.set(invitation.email, role);
        await board.save();
      }
    } else if (resourceType === 'board') {
      const board = await Board.findById(resourceId);
      if (!board || board.deletedAt) return { success: false, error: 'El tablero ya no existe' };
      if (!board.members.includes(invitation.email)) board.members.push(invitation.email);
      board.memberRoles?.set(invitation.email, role);
      await board.save();
    } else {
      const note = await Note.findById(resourceId);
      if (!note || note.deletedAt) return { success: false, error: 'La nota ya no existe' };
      if (!note.members.includes(invitation.email)) note.members.push(invitation.email);
      note.memberRoles?.set(invitation.email, role);
      note.visibility = 'shared';
      await note.save();
    }

    invitation.status = 'accepted';
    await invitation.save();

    // Notificar al que invitó
    const { notifyUser } = await import('@/lib/notify');
    await notifyUser(
      invitation.invitedBy.toString(),
      'member',
      `${user.name} aceptó tu invitación a ${RESOURCE_NAMES[resourceType]} "${invitation.resourceName}"`,
      link
    );

    revalidatePath('/dashboard');
    revalidatePath(link);

    return { success: true, data: { link } };
  } catch (error) {
    console.error('Error al aceptar invitación:', error);
    return { success: false, error: 'Error al aceptar la invitación' };
  }
}

// Rechazar una invitación (requiere sesión con el email invitado)
export async function declineInvitation(token: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Debes iniciar sesión para responder la invitación' };
    }

    await connectDB();
    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
      return { success: false, error: 'Invitación no encontrada' };
    }
    if (invitation.email !== user.email.toLowerCase()) {
      return { success: false, error: 'Esta invitación fue enviada a otro email' };
    }
    if (invitation.status !== 'pending') {
      return { success: false, error: 'La invitación ya fue respondida' };
    }

    invitation.status = 'declined';
    await invitation.save();

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al rechazar invitación:', error);
    return { success: false, error: 'Error al rechazar la invitación' };
  }
}

// Invitaciones pendientes de un recurso (solo propietario)
export async function getPendingInvitations(
  resourceType: ResourceType,
  resourceId: string
): Promise<ApiResponse<Pick<IInvitation, '_id' | 'email' | 'role' | 'token' | 'createdAt' | 'expiresAt'>[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const resource = await findOwnedResource(resourceType, resourceId, user);
    if (!resource) {
      return { success: false, error: 'Recurso no encontrado o sin permisos' };
    }

    await connectDB();
    const invitations = await Invitation.find({
      resourceType,
      resourceId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .select('_id email role token createdAt expiresAt')
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(invitations)) };
  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    return { success: false, error: 'Error al obtener las invitaciones' };
  }
}

// Cancelar una invitación pendiente (solo propietario del recurso)
export async function cancelInvitation(invitationId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(invitationId)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return { success: false, error: 'Invitación no encontrada' };
    }

    const resource = await findOwnedResource(
      invitation.resourceType,
      invitation.resourceId.toString(),
      user
    );
    if (!resource) {
      return { success: false, error: 'Sin permisos' };
    }

    await invitation.deleteOne();
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al cancelar invitación:', error);
    return { success: false, error: 'Error al cancelar la invitación' };
  }
}

// Cambiar el rol de un miembro (solo propietario del recurso)
export async function setMemberRole(
  resourceType: ResourceType,
  resourceId: string,
  email: string,
  role: MemberRole
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!ALLOWED_ROLES[resourceType].includes(role)) {
      return { success: false, error: 'Rol inválido' };
    }

    const resource = await findOwnedResource(resourceType, resourceId, user);
    if (!resource) {
      return { success: false, error: 'Recurso no encontrado o sin permisos' };
    }

    const doc = resource as unknown as {
      members: string[];
      memberRoles?: Map<string, MemberRole>;
      save(): Promise<unknown>;
    };
    const normalizedEmail = email.toLowerCase();
    if (!doc.members.includes(normalizedEmail)) {
      return { success: false, error: 'El usuario no es miembro' };
    }
    doc.memberRoles?.set(normalizedEmail, role);
    await doc.save();

    // Propagar cambio a tableros si es un proyecto
    if (resourceType === 'project') {
      const boards = await Board.find({ projectId: resourceId, deletedAt: null });
      for (const board of boards) {
        if (board.members.includes(normalizedEmail)) {
          board.memberRoles?.set(normalizedEmail, role);
          await board.save();
        }
      }
    }

    const links = { project: `/parent-project/${resourceId}`, board: `/board/${resourceId}`, note: `/notes/${resourceId}` };
    revalidatePath(links[resourceType]);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al cambiar rol:', error);
    return { success: false, error: 'Error al cambiar el rol' };
  }
}

// ─── Gestión unificada de miembros ───────────────────────────────────────────

interface AccessibleDoc {
  owner: { toString(): string };
  members: string[];
  memberRoles?: Map<string, MemberRole>;
}

// Devuelve el recurso si el usuario es owner o miembro (para ver la lista de miembros)
async function findAccessibleResource(
  resourceType: ResourceType,
  resourceId: string,
  user: AuthUser
): Promise<AccessibleDoc | null> {
  if (!isValidObjectId(resourceId)) return null;
  await connectDB();
  if (resourceType === 'project') {
    const p = await Project.findById(resourceId);
    return p && !p.deletedAt && isMemberOrOwner(p, user) ? p : null;
  }
  if (resourceType === 'board') {
    const b = await Board.findById(resourceId);
    return b && !b.deletedAt && isMemberOrOwner(b, user) ? b : null;
  }
  const n = await Note.findById(resourceId);
  if (!n || n.deletedAt) return null;
  const isMember = n.visibility === 'shared' && n.members.includes(user.email);
  return isOwner(n, user) || isMember ? n : null;
}

export interface ResourceMember {
  email: string;
  name: string | null;
  image: string | null;
  role: MemberRole;
  registered: boolean;
}

export interface ResourceMembersResult {
  owner: { id: string; name: string; email: string; image: string | null } | null;
  members: ResourceMember[];
}

// Owner + miembros de un recurso con nombre/avatar resueltos (cualquier miembro puede verlo)
export async function getResourceMembers(
  resourceType: ResourceType,
  resourceId: string
): Promise<ApiResponse<ResourceMembersResult>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const resource = await findAccessibleResource(resourceType, resourceId, user);
    if (!resource) {
      return { success: false, error: 'Recurso no encontrado o sin permisos' };
    }

    const User = (await import('@/models/User')).default;
    const ownerDoc = await User.findById(resource.owner.toString())
      .select('_id name email image')
      .lean();
    const memberUsers = resource.members.length
      ? await User.find({ email: { $in: resource.members } }).select('name email image').lean()
      : [];
    const byEmail = new Map(memberUsers.map((u) => [u.email.toLowerCase(), u]));

    const members: ResourceMember[] = resource.members.map((email) => {
      const u = byEmail.get(email.toLowerCase());
      return {
        email,
        name: u?.name ?? null,
        image: (u?.image as string | null | undefined) ?? null,
        role: resource.memberRoles?.get(email) ?? 'editor',
        registered: !!u,
      };
    });

    return {
      success: true,
      data: JSON.parse(
        JSON.stringify({
          owner: ownerDoc
            ? { id: ownerDoc._id.toString(), name: ownerDoc.name, email: ownerDoc.email, image: ownerDoc.image ?? null }
            : null,
          members,
        })
      ),
    };
  } catch (error) {
    console.error('Error al obtener miembros:', error);
    return { success: false, error: 'Error al obtener los miembros' };
  }
}

// Quita un email del recurso y aplica efectos colaterales
// (propagación a tableros del proyecto, nota vuelve a privada sin miembros)
async function removeMemberFromResource(
  resourceType: ResourceType,
  resourceId: string,
  email: string
): Promise<void> {
  await connectDB();
  let doc = null;
  if (resourceType === 'project') doc = await Project.findById(resourceId);
  else if (resourceType === 'board') doc = await Board.findById(resourceId);
  else doc = await Note.findById(resourceId);
  if (!doc) return;

  doc.members = doc.members.filter((m: string) => m !== email);
  doc.memberRoles?.delete(email);
  if (resourceType === 'note' && doc.members.length === 0) {
    (doc as INote).visibility = 'private';
  }
  await doc.save();

  if (resourceType === 'project') {
    const boards = await Board.find({ projectId: resourceId, deletedAt: null });
    for (const board of boards) {
      if (board.members.includes(email) || board.memberRoles?.has(email)) {
        board.members = board.members.filter((m) => m !== email);
        board.memberRoles?.delete(email);
        await board.save();
      }
    }
  }
}

// Quitar un miembro de un recurso (solo propietario)
export async function removeResourceMember(
  resourceType: ResourceType,
  resourceId: string,
  email: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resource = await findOwnedResource(resourceType, resourceId, user);
    if (!resource) {
      return { success: false, error: 'Recurso no encontrado o sin permisos' };
    }
    if (!resource.members.includes(normalizedEmail)) {
      return { success: false, error: 'El usuario no es miembro' };
    }

    await removeMemberFromResource(resourceType, resourceId, normalizedEmail);

    revalidatePath(RESOURCE_LINKS[resourceType](resourceId));
    revalidatePath('/dashboard');

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al remover miembro:', error);
    return { success: false, error: 'Error al remover el miembro' };
  }
}

// Abandonar un recurso compartido (cualquier miembro que no sea el propietario)
export async function leaveResource(
  resourceType: ResourceType,
  resourceId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const resource = await findAccessibleResource(resourceType, resourceId, user);
    if (!resource) {
      return { success: false, error: 'Recurso no encontrado o sin permisos' };
    }
    if (isOwner(resource, user)) {
      return { success: false, error: 'El propietario no puede abandonar el recurso' };
    }
    if (!resource.members.includes(user.email)) {
      return { success: false, error: 'No eres miembro de este recurso' };
    }

    await removeMemberFromResource(resourceType, resourceId, user.email);

    revalidatePath(RESOURCE_LINKS[resourceType](resourceId));
    revalidatePath('/dashboard');

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al abandonar recurso:', error);
    return { success: false, error: 'Error al abandonar el recurso' };
  }
}

// Reenviar el email + notificación de una invitación pendiente (solo propietario)
export async function resendInvitation(invitationId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(invitationId)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();
    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.status !== 'pending') {
      return { success: false, error: 'Invitación no encontrada' };
    }

    const resource = await findOwnedResource(
      invitation.resourceType,
      invitation.resourceId.toString(),
      user
    );
    if (!resource) {
      return { success: false, error: 'Sin permisos' };
    }

    const inviteUrl = `${APP_URL}/invite/${invitation.token}`;
    const label = RESOURCE_NAMES[invitation.resourceType];

    try {
      await sendInvitationEmail(
        invitation.email,
        user.name,
        invitation.resourceType,
        invitation.resourceName,
        invitation.role,
        inviteUrl
      );
    } catch (error) {
      console.error('No se pudo reenviar el email de invitación:', error);
    }

    await notifyUserByEmail(
      invitation.email,
      'invite',
      `${user.name} te reenvió la invitación a ${label} "${invitation.resourceName}"`,
      `/invite/${invitation.token}`
    );

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al reenviar invitación:', error);
    return { success: false, error: 'Error al reenviar la invitación' };
  }
}
