# Esquema de Datos (Mongoose)

## User
- _id: ObjectId
- name: String (required)
- email: String (required, unique)
- image: String (URL del avatar)
- createdAt: Date (timestamp automático)
- updatedAt: Date (timestamp automático)

## Project
- _id: ObjectId
- name: String (required)
- description: String
- owner: ObjectId (ref: User, required)
- members: [String] (Array de emails invitados)
- createdAt: Date (timestamp automático)
- updatedAt: Date (timestamp automático)

## Task
- _id: ObjectId
- title: String (required)
- description: String
- status: Enum ['todo', 'in-progress', 'done'] (default: 'todo')
- projectId: ObjectId (ref: Project, required)
- assignedTo: [ObjectId] (ref: User)
- imageUrl: String (URL de Cloudinary)
- tags: Array of { text: String, color: String }
- order: Number (para ordenamiento en columnas)
- createdAt: Date (timestamp automático)
- updatedAt: Date (timestamp automático)

## Notas Técnicas
- Todos los modelos usan `timestamps: true` en Mongoose para createdAt/updatedAt automáticos
- Los índices se crean en: `User.email`, `Task.projectId`, `Task.status`
- La conexión a MongoDB se maneja mediante singleton en `lib/mongodb.ts`