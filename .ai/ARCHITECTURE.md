# Arquitectura del Proyecto

## Estructura de Carpetas (Next.js 15 App Router)

```
notefy/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Layout raíz con providers
│   ├── page.tsx                 # Página principal (landing/auth)
│   ├── globals.css              # Estilos globales + Tailwind
│   ├── dashboard/               # Dashboard principal
│   │   ├── page.tsx            # Lista de proyectos, tableros y notas
│   │   ├── DashboardClient.tsx  # Componente cliente del dashboard
│   │   └── DashboardWithDragDrop.tsx  # Componente con drag & drop
│   ├── board/                   # Vistas de tableros Kanban
│   │   └── [id]/               # Tablero específico (dinámico)
│   │       └── page.tsx        # Vista del tablero
│   ├── auth/                    # Autenticación
│   │   ├── login/              # Página de login
│   │   │   └── page.tsx
│   │   └── register/           # Página de registro
│   │       └── page.tsx
│   └── api/                     # API Routes (NextAuth)
│       └── auth/               # NextAuth endpoints
├── components/                   # Componentes React
│   ├── dashboard/               # Componentes del dashboard
│   │   ├── BoardCard.tsx       # Tarjeta de tablero
│   │   ├── CreateBoardModal.tsx  # Modal para crear tableros
│   │   ├── CreateProjectGroupModal.tsx  # Modal para crear grupos
│   │   └── ProjectCard.tsx     # Tarjeta de proyecto
│   ├── kanban/                  # Componentes del Kanban
│   │   ├── KanbanBoard.tsx     # Tablero Kanban completo
│   │   ├── CreateTaskModal.tsx  # Modal para crear tareas
│   │   ├── EditTaskModal.tsx   # Modal para editar tareas
│   │   └── TaskCard.tsx        # Tarjeta de tarea
│   ├── notes/                   # Componentes de notas
│   │   ├── NoteCard.tsx        # Tarjeta de nota
│   │   ├── NoteEditor.tsx      # Editor de texto rico
│   │   └── CreateNoteModal.tsx # Modal para crear notas
│   └── project/                # Componentes de proyectos
│       └── InviteMemberModal.tsx  # Modal para invitar miembros
├── lib/                         # Utilidades y configuraciones
│   ├── auth.ts                 # Configuración de NextAuth
│   ├── mongodb-client.ts       # Cliente MongoDB
│   ├── mongodb.ts              # Singleton de conexión MongoDB
│   └── utils.ts                # Funciones auxiliares
├── models/                      # Esquemas de Mongoose
│   ├── Board.ts                # Modelo de tablero
│   ├── Note.ts                 # Modelo de nota
│   ├── Project.ts              # Modelo de proyecto
│   └── Task.ts                 # Modelo de tarea
├── actions/                     # Server Actions de Next.js 15
│   ├── auth-actions.ts         # Acciones de autenticación
│   ├── board-actions.ts        # Acciones de tableros
│   ├── note-actions.ts         # Acciones de notas
│   └── project-actions.ts      # Acciones de proyectos
├── types/                       # Tipos TypeScript compartidos
│   ├── index.ts                # Definiciones de tipos principales
│   └── next-auth.d.ts          # Tipos de NextAuth
├── scripts/                     # Scripts de utilidad
│   └── migrate-projects-to-boards.ts  # Script de migración
├── public/                      # Archivos estáticos
└── .ai/                         # Documentación para IA
    ├── AGENTS.md               # Reglas de Next.js 15
    ├── ARCHITECTURE.md         # Este archivo
    ├── DESIGN.md               # Sistema de diseño Apple
    ├── INSTRUCTIONS.md         # Reglas de desarrollo
    ├── PROMPT_CONTEXT.md       # Contexto para Claude
    └── SCHEMA.md               # Esquemas de datos

## Flujo de Datos

1. **Autenticación:** NextAuth.js maneja login/logout con configuración en `lib/auth.ts`
2. **Dashboard:** Lista proyectos, tableros y notas del usuario desde MongoDB usando Server Actions
3. **Tableros Kanban:** Carga tareas por tablero con Server Actions, soporta drag & drop con `@hello-pangea/dnd`
4. **Notas:** Carga notas del usuario y de proyectos con Server Actions, editor de texto rico
5. **Drag & Drop:** Actualización optimista + Server Action para persistir cambios de orden
6. **Colaboración:** Sistema de miembros por email para proyectos, tableros y notas compartidas

## Jerarquía de Datos

- **Project** (Proyecto): Contenedor principal para agrupar tableros y notas
- **Board** (Tablero): Tablero Kanban con tareas, puede pertenecer a un proyecto o ser independiente
- **Task** (Tarea): Tareas dentro de un tablero con estado (todo/in-progress/done)
- **Note** (Nota): Notas con editor de texto rico, pueden ser privadas o compartidas, pueden estar en proyectos

## Convenciones

- **Server Components por defecto:** Usar `'use client'` solo cuando sea necesario (interactividad, drag & drop, forms)
- **Server Actions:** Preferir sobre API Routes para todas las mutaciones (CRUD)
- **Tipado estricto:** Todo debe tener tipos TypeScript, usar interfaces en `types/index.ts`
- **Nombres de archivos:** kebab-case para carpetas, PascalCase para componentes
- **Estilos:** Tailwind CSS con tokens del sistema de diseño Apple (DESIGN.md)
- **Validación:** Validación en modelos Mongoose y en componentes del frontend
- **Idioma:** UI en español, variables y comentarios en inglés