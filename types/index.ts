import { Document, Types } from 'mongoose';

// Tipos para User
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  favorites: string[];
  notificationPrefs?: INotificationPrefs;
  emailVerified?: Date | null;
  verifyEmailToken?: string;
  verifyEmailExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Rol de un miembro en un recurso compartido
export type MemberRole = 'viewer' | 'commenter' | 'editor';

// Tipo de recurso compartible
export type ResourceType = 'project' | 'board' | 'note';

// Tipos para Project (agrupa tableros, no tiene tareas directamente)
export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: string[];
  memberRoles?: Record<string, MemberRole>;
  color: string;
  icon?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Board (tablero que contiene tareas)
export interface IBoard extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: string[];
  memberRoles?: Record<string, MemberRole>;
  tags: ITag[];
  projectId?: Types.ObjectId | null;
  color: string;
  icon?: string;
  publicToken?: string | null;
  order: number;
  columns?: IBoardColumn[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Columna personalizable de un tablero kanban
export interface IBoardColumn {
  id: string;
  title: string;
  color: string;
}

// Tipos para Tag
export interface ITag {
  text: string;
  color: string;
}

// Tipos para Reply (respuesta a un comentario)
export interface IReply {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string;
  authorImage?: string;
  content: string;
  createdAt: Date;
}

// Tipos para Attachment (archivo adjunto embebido en Task)
export interface ITaskAttachment {
  _id: Types.ObjectId;
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

// Tipos para Comment (subdocumento embebido en Task)
export interface IComment {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string;
  authorImage?: string;
  content: string;
  replies: IReply[];
  createdAt: Date;
}

// Tipos para Checklist item (subtarea dentro de una Task)
export interface IChecklistItem {
  _id: Types.ObjectId;
  text: string;
  done: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high';

// Frecuencia de repetición de una tarea recurrente
export type TaskRecurrence = 'daily' | 'weekly' | 'monthly';

// Tipos para Task
export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  // ID de la columna del tablero ('todo'|'in-progress'|'done' o columna personalizada)
  status: string;
  boardId: Types.ObjectId;
  createdBy?: Types.ObjectId | null;
  assignedTo: Types.ObjectId[];
  imageUrl?: string;
  attachments?: ITaskAttachment[];
  tags: ITag[];
  comments: IComment[];
  checklist?: IChecklistItem[];
  priority?: TaskPriority;
  recurrence?: TaskRecurrence | null;
  order: number;
  dueDate?: Date | null;
  deliveryDate?: Date | null;
  reminderSentFor?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Snapshot del historial de versiones de una nota
export interface INoteVersion {
  _id: Types.ObjectId;
  title: string;
  content: string;
  savedBy?: Types.ObjectId;
  savedByName?: string;
  createdAt: Date;
}

// Tipos para Note
export interface INote extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  visibility: 'private' | 'shared';
  owner: Types.ObjectId;
  members: string[];
  memberRoles?: Record<string, MemberRole>;
  publicToken?: string | null;
  linkedNotes?: Types.ObjectId[];
  projectId?: Types.ObjectId | null;
  color: string;
  versions?: INoteVersion[];
  comments?: IComment[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Notification
export interface INotification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: 'assigned' | 'comment' | 'reply' | 'mention' | 'invite' | 'member' | 'reminder';
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

// Tipos para Invitation (invitaciones pendientes por email)
export interface IInvitation extends Document {
  _id: Types.ObjectId;
  email: string;
  resourceType: 'project' | 'board' | 'note';
  resourceId: Types.ObjectId;
  resourceName: string;
  invitedBy: Types.ObjectId;
  invitedByName: string;
  role: MemberRole;
  token: string;
  status: 'pending' | 'accepted' | 'declined';
  expiresAt: Date;
  createdAt: Date;
}

// Preferencias de notificación del usuario
export interface INotificationPrefs {
  assigned: boolean;
  comment: boolean;
  reply: boolean;
  mention: boolean;
  invite: boolean;
  member: boolean;
  reminder: boolean;
  emailEnabled: boolean;
}

// Entrada del historial de actividad de un tablero
export interface IActivity extends Document {
  _id: Types.ObjectId;
  boardId: Types.ObjectId;
  taskId?: Types.ObjectId | null;
  taskTitle?: string;
  actorId: Types.ObjectId;
  actorName: string;
  actorImage?: string;
  action: 'created' | 'updated' | 'moved' | 'completed' | 'deleted' | 'commented' | 'assigned';
  detail?: string;
  createdAt: Date;
}

// Tipos para respuestas de API
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Tipos para formularios de Project
export type CreateProjectInput = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  members?: string[];
};

// Tipos para formularios de Board
export type CreateBoardInput = {
  name: string;
  description?: string;
  projectId?: string | null;
  color?: string;
  icon?: string;
};

export type UpdateBoardInput = Partial<CreateBoardInput> & {
  members?: string[];
  projectId?: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  boardId: string;
  status?: string;
  assignedTo?: string[];
  tags?: ITag[];
  imageUrl?: string;
  priority?: TaskPriority | null;
  checklist?: { _id?: string; text: string; done: boolean }[];
  dueDate?: string | null;
  deliveryDate?: string | null;
  recurrence?: TaskRecurrence | null;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  order?: number;
  imageUrl?: string;
  dueDate?: string | null;
  deliveryDate?: string | null;
};

// Tipos para formularios de Note
export type CreateNoteInput = {
  title: string;
  content: string;
  visibility?: 'private' | 'shared';
  projectId?: string | null;
  color?: string;
};

export type UpdateNoteInput = Partial<CreateNoteInput> & {
  members?: string[];
};
