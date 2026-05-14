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

// Tipos para Project
export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: string[];
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
  projectId: Types.ObjectId;
  assignedTo: Types.ObjectId[];
  imageUrl?: string;
  tags: ITag[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para respuestas de API
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Tipos para formularios
export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  members?: string[];
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  projectId: string;
  status?: 'todo' | 'in-progress' | 'done';
  assignedTo?: string[];
  tags?: ITag[];
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  order?: number;
  imageUrl?: string;
};
