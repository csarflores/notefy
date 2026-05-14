# Arquitectura del Proyecto

## Estructura de Carpetas (Next.js 15 App Router)

```
notefy/
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Layout raíz con providers
│   ├── page.tsx                 # Página principal (landing/auth)
│   ├── globals.css              # Estilos globales + Tailwind
│   ├── dashboard/               # Dashboard multiproyecto
│   │   ├── page.tsx            # Lista de proyectos
│   │   └── layout.tsx          # Layout del dashboard
│   ├── project/                 # Vistas de proyecto
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
│   └── dashboard/               # Componentes del dashboard
│       └── ProjectCard.tsx     # Tarjeta de proyecto
├── lib/                         # Utilidades y configuraciones
│   ├── mongodb.ts              # Singleton de conexión MongoDB
│   ├── cloudinary.ts           # Configuración de Cloudinary
│   └── utils.ts                # Funciones auxiliares
├── models/                      # Esquemas de Mongoose
│   ├── User.ts                 # Modelo de usuario
│   ├── Project.ts              # Modelo de proyecto
│   └── Task.ts                 # Modelo de tarea
├── actions/                     # Server Actions de Next.js 15
│   ├── project-actions.ts      # Acciones de proyectos
│   └── task-actions.ts         # Acciones de tareas
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
2. **Dashboard:** Lista proyectos del usuario desde MongoDB
3. **Kanban:** Carga tareas por proyecto con Server Actions
4. **Drag & Drop:** Actualización optimista + Server Action para persistir
5. **Imágenes:** Upload a Cloudinary, URL guardada en MongoDB

## Convenciones

- **Server Components por defecto:** Usar `'use client'` solo cuando sea necesario
- **Server Actions:** Preferir sobre API Routes para mutaciones
- **Tipado estricto:** Todo debe tener tipos TypeScript
- **Nombres de archivos:** kebab-case para carpetas, PascalCase para componentes
- **Estilos:** Tailwind CSS con tokens del sistema de diseño Apple