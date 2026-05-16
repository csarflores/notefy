# Arquitectura del Proyecto

## Estructura de Carpetas (Next.js 15 App Router)

```
notefy/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Layout raíz con providers
│   ├── page.tsx                 # Página principal (landing/auth)
│   ├── globals.css              # Estilos globales + Tailwind
│   ├── dashboard/               # Dashboard multiproyecto
│   │   ├── page.tsx            # Lista de proyectos, tableros y notas
│   │   └── layout.tsx          # Layout del dashboard
│   ├── notes/                   # Vistas de notas
│   │   └── [id]/               # Nota específica (dinámico)
│   │       ├── page.tsx        # Vista y edición de nota
│   │       └── NoteEditorClient.tsx  # Componente cliente de edición
│   ├── parent-project/          # Vistas de proyectos
│   │   └── [id]/               # Proyecto específico (dinámico)
│   │       ├── page.tsx        # Tableros y notas del proyecto
│   │       └── ParentProjectClient.tsx  # Componente cliente
│   ├── project/                 # Vistas de proyecto (legacy)
│   │   └── [id]/               # Proyecto específico (dinámico)
│   │       ├── page.tsx        # Tablero Kanban
│   │       └── settings/       # Configuración del proyecto
│   │           └── page.tsx
│   └── api/                     # API Routes (si no se usan Server Actions)
│       ├── auth/               # NextAuth endpoints
│       └── projects/           # Endpoints REST opcionales
├── components/                   # Componentes React
│   ├── ui/                      # Componentes atómicos estilo Apple
│   │   ├── Button.tsx          # Botón principal (pill style)
│   │   ├── Card.tsx            # Tarjeta con glassmorphism
│   │   ├── Badge.tsx           # Badge para tags
│   │   └── Input.tsx           # Input con estilo Apple
│   ├── kanban/                  # Componentes del Kanban
│   │   ├── Board.tsx           # Tablero completo
│   │   ├── Column.tsx          # Columna (todo/in-progress/done)
│   │   └── TaskCard.tsx        # Tarjeta de tarea
│   ├── dashboard/               # Componentes del dashboard
│   │   └── ProjectCard.tsx     # Tarjeta de proyecto
│   └── notes/                   # Componentes de notas
│       ├── NoteEditor.tsx      # Editor de texto rico (Tiptap)
│       ├── NoteCard.tsx        # Tarjeta de nota
│       └── CreateNoteModal.tsx # Modal para crear notas
├── lib/                         # Utilidades y configuraciones
│   ├── mongodb.ts              # Singleton de conexión MongoDB
│   ├── cloudinary.ts           # Configuración de Cloudinary
│   └── utils.ts                # Funciones auxiliares
├── models/                      # Esquemas de Mongoose
│   ├── User.ts                 # Modelo de usuario
│   ├── Project.ts              # Modelo de proyecto
│   ├── Board.ts                # Modelo de tablero
│   ├── Task.ts                 # Modelo de tarea
│   └── Note.ts                 # Modelo de nota
├── actions/                     # Server Actions de Next.js 15
│   ├── auth-actions.ts         # Acciones de autenticación
│   ├── project-actions.ts      # Acciones de proyectos
│   ├── board-actions.ts        # Acciones de tableros
│   ├── tag-actions.ts          # Acciones de etiquetas
│   └── note-actions.ts         # Acciones de notas
├── types/                       # Tipos TypeScript compartidos
│   └── index.ts                # Definiciones de tipos
├── public/                      # Archivos estáticos
│   └── images/                 # Imágenes y assets
└── .ai/                         # Documentación para IA
    ├── INSTRUCTIONS.md         # Reglas de desarrollo
    ├── ARCHITECTURE.md         # Este archivo
    ├── SCHEMA.md               # Esquemas de datos
    └── DESIGN.md               # Sistema de diseño Apple

## Flujo de Datos

1. **Autenticación:** NextAuth.js maneja login/logout
2. **Dashboard:** Lista proyectos, tableros y notas del usuario desde MongoDB
3. **Kanban:** Carga tareas por tablero con Server Actions
4. **Notas:** Carga notas del usuario y de proyectos con Server Actions
5. **Editor de Notas:** Editor de texto rico (Tiptap) con actualización en tiempo real
6. **Drag & Drop:** Actualización optimista + Server Action para persistir
7. **Imágenes:** Upload a Cloudinary, URL guardada en MongoDB (pendiente para notas)

## Modelos de Datos

### Note (Nota)
- **title:** Título de la nota
- **content:** Contenido en HTML (del editor Tiptap)
- **visibility:** 'private' | 'shared'
- **owner:** Usuario propietario
- **members:** Array de emails (para notas compartidas)
- **projectId:** Referencia opcional a Project (null si no está en proyecto)

**Tipos de Notas:**
- **Privadas:** Solo visible para el owner (incluso si está en un proyecto)
- **Compartidas:** Visible para owner + members (pueden editar)
- **En Proyecto:** Asociada a un proyecto, pero puede ser privada o compartida

## Convenciones

- **Server Components por defecto:** Usar `'use client'` solo cuando sea necesario
- **Server Actions:** Preferir sobre API Routes para mutaciones
- **Tipado estricto:** Todo debe tener tipos TypeScript
- **Nombres de archivos:** kebab-case para carpetas, PascalCase para componentes
- **Estilos:** Tailwind CSS con tokens del sistema de diseño Apple