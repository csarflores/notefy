import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import connectDB from './mongodb';
import Board from '@/models/Board';
import Project from '@/models/Project';
import Note from '@/models/Note';
import Task from '@/models/Task';
import { isValidObjectId } from './utils';
import { IBoard, IProject, ITask } from '@/types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

// Devuelve el usuario autenticado o null si no hay sesión
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || '',
    image: session.user.image,
  };
}

interface OwnableDoc {
  owner: { toString(): string };
  members?: string[];
}

export function isOwner(doc: OwnableDoc, user: AuthUser): boolean {
  return doc.owner?.toString() === user.id;
}

// Owner o miembro (members son emails)
export function isMemberOrOwner(doc: OwnableDoc, user: AuthUser): boolean {
  return isOwner(doc, user) || (doc.members ?? []).includes(user.email);
}

// Verifica que el userId recibido corresponde al usuario autenticado
export function isSelf(user: AuthUser, userId: string): boolean {
  return user.id === userId;
}

// Devuelve el tablero si el usuario es owner o miembro, null en caso contrario
export async function findAccessibleBoard(
  boardId: string,
  user: AuthUser
): Promise<IBoard | null> {
  if (!isValidObjectId(boardId)) return null;
  await connectDB();
  const board = await Board.findById(boardId);
  if (!board || !isMemberOrOwner(board, user)) return null;
  return board;
}

// Devuelve el tablero solo si el usuario es el propietario
export async function findOwnedBoard(
  boardId: string,
  user: AuthUser
): Promise<IBoard | null> {
  if (!isValidObjectId(boardId)) return null;
  await connectDB();
  const board = await Board.findById(boardId);
  if (!board || !isOwner(board, user)) return null;
  return board;
}

// Devuelve el proyecto si el usuario es owner o miembro, null en caso contrario
export async function findAccessibleProject(
  projectId: string,
  user: AuthUser
): Promise<IProject | null> {
  if (!isValidObjectId(projectId)) return null;
  await connectDB();
  const project = await Project.findById(projectId);
  if (!project || !isMemberOrOwner(project, user)) return null;
  return project;
}

// Devuelve el proyecto solo si el usuario es el propietario
export async function findOwnedProject(
  projectId: string,
  user: AuthUser
): Promise<IProject | null> {
  if (!isValidObjectId(projectId)) return null;
  await connectDB();
  const project = await Project.findById(projectId);
  if (!project || !isOwner(project, user)) return null;
  return project;
}

// Devuelve la tarea si el usuario tiene acceso a su tablero, null en caso contrario
export async function findAccessibleTask(
  taskId: string,
  user: AuthUser
): Promise<ITask | null> {
  if (!isValidObjectId(taskId)) return null;
  await connectDB();
  const task = await Task.findById(taskId);
  if (!task) return null;
  const board = await findAccessibleBoard(task.boardId.toString(), user);
  if (!board) return null;
  return task;
}

// Devuelve la tarea solo si el usuario puede eliminarla:
// quien la creó o el propietario del tablero que la contiene
export async function findDeletableTask(
  taskId: string,
  user: AuthUser
): Promise<ITask | null> {
  if (!isValidObjectId(taskId)) return null;
  await connectDB();
  const task = await Task.findById(taskId);
  if (!task) return null;
  const board = await Board.findById(task.boardId).select('owner');
  if (!board) return null;
  const isCreator = task.createdBy?.toString() === user.id;
  if (!isCreator && !isOwner(board, user)) return null;
  return task;
}

export interface SharedUserScope {
  ids: Set<string>;
  emails: Set<string>;
}

// IDs y emails de usuarios que comparten algún recurso con `user`
// (owners de recursos donde user es owner/miembro, y miembros de esos recursos)
export async function getSharedUserScope(user: AuthUser): Promise<SharedUserScope> {
  await connectDB();
  const accessFilter = { $or: [{ owner: user.id }, { members: user.email }] };
  const [boards, projects, notes] = await Promise.all([
    Board.find(accessFilter).select('owner members').lean(),
    Project.find(accessFilter).select('owner members').lean(),
    Note.find(accessFilter).select('owner members').lean(),
  ]);

  const scope: SharedUserScope = {
    ids: new Set([user.id]),
    emails: new Set([user.email]),
  };
  for (const doc of [...boards, ...projects, ...notes]) {
    scope.ids.add(doc.owner.toString());
    for (const email of doc.members ?? []) {
      scope.emails.add(email);
    }
  }
  return scope;
}
