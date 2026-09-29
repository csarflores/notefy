'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { CreateProjectInput, UpdateProjectInput, ApiResponse, IProject, IUser, MemberRole } from '@/types';
import { createInvitation } from '@/actions/invitation-actions';
import {
  getAuthUser,
  isSelf,
  findAccessibleProject,
  findOwnedProject,
} from '@/lib/auth-helpers';

// Obtener todos los proyectos del usuario
export async function getUserProjects(userId: string): Promise<ApiResponse<IProject[]>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    // Buscar proyectos donde el usuario es owner O está en members
    const projects = await Project.find({
      deletedAt: null,
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
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const project = await findAccessibleProject(projectId, user);
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
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'El nombre del proyecto es requerido' };
    }

    await connectDB();

    const newProject = await Project.create({
      name: data.name.trim(),
      description: data.description?.trim() || '',
      color: data.color || '#0066cc',
      icon: data.icon?.slice(0, 8) || '',
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

// Actualizar un proyecto (solo el propietario)
export async function updateProject(
  projectId: string,
  data: UpdateProjectInput
): Promise<ApiResponse<IProject>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const project = await findOwnedProject(projectId, user);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado o sin permisos' };
    }

    const updateData: UpdateProjectInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon ? data.icon.slice(0, 8) : '';
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

// Eliminar un proyecto (los tableros y notas quedan sin proyecto, solo el propietario)
export async function deleteProject(projectId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const project = await findOwnedProject(projectId, user);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado o sin permisos' };
    }

    // Soft-delete: el proyecto va a la papelera; tableros y notas quedan sin proyecto
    const Board = (await import('@/models/Board')).default;
    const Note = (await import('@/models/Note')).default;
    await Promise.all([
      Board.updateMany({ projectId: projectId }, { $set: { projectId: null } }),
      Note.updateMany({ projectId: projectId }, { $set: { projectId: null } }),
    ]);

    project.deletedAt = new Date();
    await project.save();

    revalidatePath('/dashboard');

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    return { success: false, error: 'Error al eliminar el proyecto' };
  }
}

// Invitar miembro al proyecto (solo el propietario) — crea invitación pendiente
export async function addProjectMember(
  projectId: string,
  email: string,
  role: MemberRole = 'editor'
): Promise<ApiResponse<null>> {
  const result = await createInvitation('project', projectId, email, role);
  if (result.success) revalidatePath(`/parent-project/${projectId}`);
  return { success: result.success, data: null, error: result.error };
}

// Eliminar miembro del proyecto (solo el propietario)
export async function removeProjectMember(
  projectId: string,
  email: string
): Promise<ApiResponse<IProject>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const project = await findOwnedProject(projectId, user);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado o sin permisos' };
    }

    project.members = project.members.filter((member) => member !== email);
    project.memberRoles?.delete(email);
    await project.save();

    // También eliminar el miembro de todos los tableros del proyecto
    const Board = (await import('@/models/Board')).default;
    await Board.updateMany(
      { projectId: projectId },
      { $pull: { members: email } }
    );
    // Limpiar el rol en los tableros del proyecto
    const boards = await Board.find({ projectId, memberRoles: { $exists: true } });
    for (const board of boards) {
      if (board.memberRoles?.has(email)) {
        board.memberRoles.delete(email);
        await board.save();
      }
    }

    revalidatePath(`/parent-project/${projectId}`);

    return { success: true, data: JSON.parse(JSON.stringify(project)) };
  } catch (error) {
    console.error('Error al eliminar miembro:', error);
    return { success: false, error: 'Error al eliminar el miembro' };
  }
}

// Obtener usuarios del proyecto (owner + members)
export async function getProjectUsers(
  projectId: string
): Promise<ApiResponse<IUser[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const project = await findAccessibleProject(projectId, user);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado o sin permisos' };
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
