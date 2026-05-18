'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Task from '@/models/Task';
import { CreateProjectInput, UpdateProjectInput, ApiResponse, IProject, ITag, IUser } from '@/types';
import { isValidObjectId } from '@/lib/utils';

// Obtener todos los proyectos del usuario
export async function getUserProjects(userId: string): Promise<ApiResponse<IProject[]>> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    await connectDB();

    // Obtener el email del usuario para buscar en members
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).lean();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Buscar proyectos donde el usuario es owner O está en members
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { members: user.email }
      ]
    })
      .sort({ updatedAt: -1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(projects)) };
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return { success: false, error: 'Error al obtener los proyectos' };
  }
}

// Obtener un proyecto por ID
export async function getProjectById(projectId: string): Promise<ApiResponse<IProject>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const project = await Project.findById(projectId);

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const projectData = project.toObject();
    return { success: true, data: JSON.parse(JSON.stringify(projectData)) };
  } catch (error) {
    console.error('Error al obtener proyecto:', error);
    return { success: false, error: 'Error al obtener el proyecto' };
  }
}

// Crear un nuevo proyecto
export async function createProject(
  userId: string,
  data: CreateProjectInput
): Promise<ApiResponse<IProject>> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'El nombre del proyecto es requerido' };
    }

    await connectDB();

    const newProject = await Project.create({
      name: data.name.trim(),
      description: data.description?.trim() || '',
      color: data.color || '#0066cc',
      owner: userId,
      members: [],
    });

    revalidatePath('/dashboard');

    return { success: true, data: JSON.parse(JSON.stringify(newProject)) };
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    return { success: false, error: 'Error al crear el proyecto' };
  }
}

// Actualizar un proyecto
export async function updateProject(
  projectId: string,
  data: UpdateProjectInput
): Promise<ApiResponse<IProject>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.color !== undefined) updateData.color = data.color;
    if (data.members !== undefined) updateData.members = data.members;

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProject) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/parent-project/${projectId}`);

    return { success: true, data: JSON.parse(JSON.stringify(updatedProject)) };
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    return { success: false, error: 'Error al actualizar el proyecto' };
  }
}

// Eliminar un proyecto (los tableros quedan sin proyecto)
export async function deleteProject(projectId: string): Promise<ApiResponse<null>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const project = await Project.findById(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    // Actualizar tableros para que queden sin proyecto
    const Board = (await import('@/models/Board')).default;
    await Board.updateMany(
      { projectId: projectId },
      { $set: { projectId: null } }
    );

    await Project.findByIdAndDelete(projectId);

    revalidatePath('/dashboard');

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    return { success: false, error: 'Error al eliminar el proyecto' };
  }
}

// Agregar miembro al proyecto
export async function addProjectMember(
  projectId: string,
  email: string
): Promise<ApiResponse<IProject>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, error: 'Email inválido' };
    }

    await connectDB();

    const project = await Project.findById(projectId);

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    if (project.members.includes(email)) {
      return { success: false, error: 'El miembro ya está en el proyecto' };
    }

    project.members.push(email);
    await project.save();

    // También agregar el miembro a todos los tableros del proyecto
    const Board = (await import('@/models/Board')).default;
    await Board.updateMany(
      { projectId: projectId },
      { $addToSet: { members: email } }
    );

    revalidatePath(`/project/${projectId}`);
    revalidatePath(`/parent-project/${projectId}`);

    return { success: true, data: JSON.parse(JSON.stringify(project)) };
  } catch (error) {
    console.error('Error al agregar miembro:', error);
    return { success: false, error: 'Error al agregar el miembro' };
  }
}

// Eliminar miembro del proyecto
export async function removeProjectMember(
  projectId: string,
  email: string
): Promise<ApiResponse<IProject>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const project = await Project.findById(projectId);

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    project.members = project.members.filter((member) => member !== email);
    await project.save();

    // También eliminar el miembro de todos los tableros del proyecto
    const Board = (await import('@/models/Board')).default;
    await Board.updateMany(
      { projectId: projectId },
      { $pull: { members: email } }
    );

    revalidatePath(`/project/${projectId}`);
    revalidatePath(`/parent-project/${projectId}`);

    return { success: true, data: JSON.parse(JSON.stringify(project)) };
  } catch (error) {
    console.error('Error al eliminar miembro:', error);
    return { success: false, error: 'Error al eliminar el miembro' };
  }
}

// Agregar tag al proyecto
export async function addProjectTag(
  projectId: string,
  tag: ITag
): Promise<ApiResponse<IProject>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const project = await Project.findById(projectId);

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    // Esta función ya no se usa - las etiquetas se obtienen de las tareas
    return { success: false, error: 'Función deprecada - usar getProjectTags de tag-actions' };
  } catch (error) {
    console.error('Error al agregar tag:', error);
    return { success: false, error: 'Error al agregar la etiqueta' };
  }
}

// Obtener usuarios del proyecto (owner + members)
export async function getProjectUsers(
  projectId: string
): Promise<ApiResponse<IUser[]>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const project = await Project.findById(projectId).lean();

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const User = (await import('@/models/User')).default;
    
    // Obtener owner
    const owner = await User.findById(project.owner).select('_id name email image').lean();
    
    if (!owner) {
      return { success: false, error: 'Propietario no encontrado' };
    }

    // Obtener members por email
    const members = await User.find({
      email: { $in: project.members }
    }).select('_id name email image').lean();

    // Combinar owner y members
    const allUsers = [owner, ...members];

    return { success: true, data: JSON.parse(JSON.stringify(allUsers)) };
  } catch (error) {
    console.error('Error al obtener usuarios del proyecto:', error);
    return { success: false, error: 'Error al obtener los usuarios' };
  }
}

