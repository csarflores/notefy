import { Document, Types } from 'mongoose';

// Tipos para User
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Project (agrupa tableros, no tiene tareas directamente)
export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: string[];
  color: string;
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
  tags: ITag[];
  projectId?: Types.ObjectId | null;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Tag
export interface ITag {
  text: string;
  color: string;
}

// Tipos para Task
export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  boardId: Types.ObjectId;
  assignedTo: Types.ObjectId[];
  imageUrl?: string;
  tags: ITag[];
  order: number;
  dueDate?: Date | null;
  deliveryDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Note
export interface INote extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  visibility: 'private' | 'shared';
  owner: Types.ObjectId;
  members: string[];
  projectId?: Types.ObjectId | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
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
};

export type UpdateBoardInput = Partial<CreateBoardInput> & {
  members?: string[];
  projectId?: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  boardId: string;
  status?: 'todo' | 'in-progress' | 'done';
  assignedTo?: string[];
  tags?: ITag[];
  dueDate?: string | null;
  deliveryDate?: string | null;
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
