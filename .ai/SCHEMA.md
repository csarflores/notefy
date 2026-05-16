# Esquema de Datos (Mongoose)

## Project (Proyecto)
Contenedor principal para agrupar tableros y notas.

- **_id**: ObjectId
- **name**: String (required, max 100 caracteres)
- **description**: String (max 500 caracteres)
- **owner**: ObjectId (ref: User, required)
- **members**: [String] (Array de emails invitados, validados)
- **createdAt**: Date (timestamp automático)
- **updatedAt**: Date (timestamp automático)

**Índices**: owner

## Board (Tablero)
Tablero Kanban con tareas, puede pertenecer a un proyecto o ser independiente.

- **_id**: ObjectId
- **name**: String (required, max 100 caracteres)
- **description**: String (max 500 caracteres)
- **owner**: ObjectId (ref: User, required)
- **members**: [String] (Array de emails invitados, validados)
- **tags**: Array of { text: String, color: String } (máximo 20 tags)
- **projectId**: ObjectId (ref: Project, opcional - null si es independiente)
- **createdAt**: Date (timestamp automático)
- **updatedAt**: Date (timestamp automático)

**Índices**: owner, projectId

## Task (Tarea)
Tareas dentro de un tablero con estado y ordenamiento.

- **_id**: ObjectId
- **title**: String (required, max 200 caracteres)
- **description**: String (max 2000 caracteres)
- **status**: Enum ['todo', 'in-progress', 'done'] (default: 'todo')
- **boardId**: ObjectId (ref: Board, required)
- **assignedTo**: [ObjectId] (ref: User)
- **imageUrl**: String (URL de imagen, opcional)
- **tags**: Array of { text: String, color: String } (máximo 10 tags)
- **order**: Number (para ordenamiento en columnas, default: 0)
- **dueDate**: Date (fecha límite, opcional)
- **deliveryDate**: Date (fecha de entrega, opcional)
- **createdAt**: Date (timestamp automático)
- **updatedAt**: Date (timestamp automático)

**Índices**: boardId + status, boardId + order

## Note (Nota)
Notas con editor de texto rico, pueden ser privadas o compartidas.

- **_id**: ObjectId
- **title**: String (required, max 200 caracteres)
- **content**: String (contenido en HTML del editor)
- **visibility**: Enum ['private', 'shared'] (default: 'private')
- **owner**: ObjectId (ref: User, required)
- **members**: [String] (Array de emails invitados, validados)
- **projectId**: ObjectId (ref: Project, opcional - null si no está en proyecto)
- **createdAt**: Date (timestamp automático)
- **updatedAt**: Date (timestamp automático)

**Índices**: owner, projectId, owner + projectId

## User (Usuario)
Gestionado por NextAuth.js, no tiene modelo Mongoose explícito.

- **name**: String
- **email**: String (unique)
- **image**: String (URL del avatar)

## Notas Técnicas

### Validaciones
- **Emails**: Todos los campos `members` validan formato de email con regex `/^\S+@\S+\.\S+$/`
- **Colores**: Tags validan formato hexadecimal con regex `/^#[0-9A-F]{6}$/i`
- **Longitudes**: Máximos definidos en cada campo para evitar datos excesivos

### Timestamps
- Todos los modelos usan `timestamps: true` en Mongoose para createdAt/updatedAt automáticos

### Índices
- Índices compuestos para búsquedas frecuentes (boardId + status, owner + projectId)
- Índices simples para búsquedas por propietario y relaciones

### Conexión
- La conexión a MongoDB se maneja mediante singleton en `lib/mongodb.ts`
- Los modelos se definen en `models/` con recarga en desarrollo (delete mongoose.models.ModelName)

### Relaciones
- **Project → Board**: Un proyecto puede tener múltiples tableros (projectId opcional en Board)
- **Project → Note**: Un proyecto puede tener múltiples notas (projectId opcional en Note)
- **Board → Task**: Un tablero tiene múltiples tareas (boardId requerido en Task)
- **User → Project/Board/Note**: Usuario es owner de recursos
- **Members**: Sistema de colaboración por email (no referencias ObjectId)