import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Board from '@/models/Board';
import Task from '@/models/Task';

async function migrateProjectsToBoards() {
  try {
    await connectDB();
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los projects
    const projects = await Project.find({});
    console.log(`📦 Encontrados ${projects.length} projects`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const project of projects) {
      // Verificar si ya existe un board con este ID
      const existingBoard = await Board.findById(project._id);
      if (existingBoard) {
        console.log(`⏭️  Board ya existe para project ${project.name}, saltando...`);
        skippedCount++;
        continue;
      }

      // Crear un nuevo Board con los datos del Project
      const board = new Board({
        _id: project._id, // Usar el mismo ID
        name: project.name,
        description: project.description || '',
        owner: project.owner,
        members: project.members || [],
        tags: [], // Projects ya no tienen tags
        projectId: null, // Boards independientes no tienen projectId
      });

      await board.save();
      console.log(`✅ Migrado project "${project.name}" a board`);

      // Migrar tasks asociadas a este project
      const tasks = await Task.find({ projectId: project._id });
      if (tasks.length > 0) {
        await Task.updateMany(
          { projectId: project._id },
          { boardId: project._id }
        );
        console.log(`   📝 Migradas ${tasks.length} tasks`);
      }

      migratedCount++;
    }

    console.log(`\n🎉 Migración completada:`);
    console.log(`   ✅ Migrados: ${migratedCount} projects`);
    console.log(`   ⏭️  Saltados: ${skippedCount} projects (ya existían como boards)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateProjectsToBoards();
