# Arquitectura del Proyecto

## Estructura de Carpetas (Next.js 15 App Router)

```
notefy/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Layout raíz con providers
│   ├── page.tsx                 # Página principal (redirige a login/dashboard)
│   ├── providers.tsx            # SessionProvider + Notification + Tabs + AppShell
│   ├── globals.css              # Estilos globales + Tailwind v4 (@theme)
│   ├── dashboard/               # Dashboard principal
│   │   ├── page.tsx            # Lista de proyectos, tableros y notas
│   │   ├── DashboardClient.tsx  # Componente cliente del dashboard
│   │   └── DashboardWithDragDrop.tsx  # Componente con drag & drop
│   ├── board/                   # Vistas de tableros Kanban
│   │   └── [id]/               # Tablero específico (dinámico)
│   │       ├── page.tsx        # Vista del tablero
│   │       ├── BoardClient.tsx
│   │       └── BoardWithFilters.tsx
│   ├── parent-project/          # Vista de proyecto (contenedor de tableros)
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── ParentProjectClient.tsx
│   │       ├── BoardsListClient.tsx
│   │       ├── ProjectNotesClient.tsx
│   │       └── ProjectCalendarClient.tsx
│   ├── project/[id]/            # Redirige a /parent-project/[id]
│   ├── notes/[id]/              # Editor de nota individual
│   ├── calendar/                # Calendario global de tareas
│   ├── auth/                    # Autenticación
│   │   ├── login/              # Página de login
│   │   └── register/           # Página de registro
│   └── api/                     # API Routes (solo NextAuth)
│       └── auth/[...nextauth]/
├── components/                   # Componentes React
│   ├── dashboard/               # Tarjetas y modales del dashboard
│   ├── kanban/                  # KanbanBoard, TaskCard, modales, filtros, tags
│   ├── notes/                   # NoteCard, NoteEditor (TipTap), modales
│   ├── calendar/                # TaskCalendar, filtros, UpcomingTasks
│   ├── project/                 # InviteMemberModal
│   ├── layout/                  # AppShell, Sidebar, CommandPalette, recents
│   ├── tabs/                    # Sistema de pestañas (TabContext, TabBar, TabSyncer)
│   └── ui/                      # Primitivas: Button, Card, Modal, Avatar, Badge, etc.
├── actions/                     # Server Actions de Next.js 15
│   ├── auth-actions.ts         # Registro de usuarios (público)
│   ├── board-actions.ts        # CRUD de tableros
│   ├── task-actions.ts         # CRUD de tareas + comentarios/respuestas
│   ├── note-actions.ts         # CRUD de notas + compartir
│   ├── project-actions.ts      # CRUD de proyectos + miembros
│   ├── calendar-actions.ts     # Consultas de tareas por fecha
│   ├── search-actions.ts       # Búsqueda global (Ctrl+K)
│   ├── tag-actions.ts          # Gestión de etiquetas por tablero
│   └── user-actions.ts         # Consultas de usuarios
├── lib/                         # Utilidades y configuraciones
│   ├── auth.ts                 # Configuración de NextAuth (Credentials + JWT)
│   ├── auth-helpers.ts         # getAuthUser + verificación de acceso (owner/member)
│   ├── mongodb.ts              # Singleton de conexión MongoDB
│   └── utils.ts                # Funciones auxiliares (cn, isValidObjectId, etc.)
├── models/                      # Esquemas de Mongoose
│   ├── Board.ts                # Modelo de tablero
│   ├── Note.ts                 # Modelo de nota
│   ├── Project.ts              # Modelo de proyecto
│   ├── Task.ts                 # Modelo de tarea (incluye comentarios embebidos)
│   └── User.ts                 # Modelo de usuario (Credentials)
├── constants/                   # Constantes (project-colors.ts)
├── types/                       # Tipos TypeScript compartidos
│   ├── index.ts                # Definiciones de tipos principales
│   └── next-auth.d.ts          # Tipos de NextAuth
├── middleware.ts                # Protección de rutas (next-auth middleware)
└── .ai/                         # Documentación para IA
    ├── AGENTS.md               # Reglas de Next.js 15
    ├── ARCHITECTURE.md         # Este archivo
    ├── DESIGN.md               # Sistema de diseño Apple
    ├── INSTRUCTIONS.md         # Reglas de desarrollo
    ├── PROMPT_CONTEXT.md       # Contexto para IA
    └── SCHEMA.md               # Esquemas de datos
```

## Flujo de Datos

1. **Autenticación:** NextAuth.js (Credentials + JWT) en `lib/auth.ts`. Registro via `registerUser` (bcrypt).
2. **Autorización:** Toda Server Action verifica sesión con `getAuthUser()` y acceso con los helpers de `lib/auth-helpers.ts` (owner/member por email). El middleware protege las rutas de la app.
3. **Dashboard:** Lista proyectos, tableros y notas del usuario desde MongoDB usando Server Actions.
4. **Tableros Kanban:** Carga tareas por tablero, drag & drop con `@hello-pangea/dnd` + actualización optimista.
5. **Notas:** Editor TipTap; visibilidad `private`/`shared`; pueden vivir en proyectos.
6. **Calendario:** `react-big-calendar` con tareas por `deliveryDate` (global y por proyecto).
7. **Colaboración:** Sistema de miembros por email para proyectos, tableros y notas compartidas.
8. **Privacidad de perfiles:** `getUserById`/`getUsersByIds` solo devuelven usuarios que comparten algún recurso con el solicitante (`getSharedUserScope`), además del propio perfil.

## Jerarquía de Datos

- **Project** (Proyecto): Contenedor principal para agrupar tableros y notas
- **Board** (Tablero): Tablero Kanban con tareas, puede pertenecer a un proyecto o ser independiente
- **Task** (Tarea): Tareas dentro de un tablero con estado (todo/in-progress/done), comentarios y respuestas embebidos
- **Note** (Nota): Notas con editor de texto rico, privadas o compartidas, pueden estar en proyectos

## Convenciones

- **Server Components por defecto:** Usar `'use client'` solo cuando sea necesario (interactividad, drag & drop, forms)
- **Server Actions:** Preferir sobre API Routes para todas las mutaciones (CRUD)
- **Autorización obligatoria:** Toda action empieza verificando `getAuthUser()` y acceso al recurso (ver INSTRUCTIONS.md)
- **Tipado estricto:** Todo debe tener tipos TypeScript, usar interfaces en `types/index.ts`
- **Nombres de archivos:** kebab-case para carpetas, PascalCase para componentes
- **Estilos:** Tailwind CSS v4 con tokens del sistema de diseño Apple (DESIGN.md); hex inline según tokens
- **Validación:** Validación en modelos Mongoose y en componentes del frontend
- **Idioma:** UI en español, variables y comentarios en inglés
