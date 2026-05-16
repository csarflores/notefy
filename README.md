# Notefy

Un administrador de proyectos multiproyecto diseñado con la filosofía de simplicidad y estética de **Apple**, utilizando el stack moderno de **Next.js 15** y **MongoDB**.

## 🎯 Objetivo del Proyecto
El objetivo principal es proporcionar una herramienta de gestión de tareas **gratuita, sencilla y colaborativa**. A diferencia de las plataformas SaaS tradicionales que limitan el número de usuarios o tableros en sus planes gratuitos, este proyecto permite:
- Gestionar **múltiples proyectos** de forma independiente.
- Colaborar con un **equipo ilimitado** mediante invitaciones por correo.
- Mantener una experiencia de usuario fluida y de alta gama inspirada en el diseño de Apple.

## 🚀 Funcionalidades Principales

### Tableros Kanban
- **Flujo de trabajo visual** con columnas de "Pendiente", "En Proceso" y "Finalizado"
- **Drag & Drop** intuitivo mediante `@hello-pangea/dnd`
- **Tarjetas enriquecidas** con descripciones, imágenes, asignación de responsables y etiquetas por colores
- **Sistema de etiquetas** personalizable por tablero (máximo 20 tags)
- **Ordenamiento flexible** de tareas dentro de cada columna

### Sistema Multiproyecto
- **Dashboard centralizado** para navegar entre diferentes proyectos
- **Tableros independientes** que pueden pertenecer a un proyecto o ser autónomos
- **Organización jerárquica**: Proyecto → Tableros → Tareas
- **Invitación de miembros** por email para colaboración

### Notas
- **Editor de texto rico** tipo Word para documentación
- **Tipos de notas**:
  - **Privadas**: Solo visible para el propietario
  - **Compartidas**: Visible para propietario y miembros con permiso de edición
  - **En Proyecto**: Asociadas a proyectos para mejor organización
- **Contenido en HTML** para formato rico

### Gestión de Tareas
- **Estados**: Pendiente, En Proceso, Finalizado
- **Fechas**: Fecha límite (dueDate) y fecha de entrega (deliveryDate)
- **Asignación**: Múltiples responsables por tarea
- **Etiquetas**: Sistema de tags por colores (máximo 10 por tarea)
- **Imágenes**: Soporte para imágenes adjuntas

### Diseño Premium
- **Interfaz minimalista** inspirada en Apple
- **Bordes redondeados** y sombras suaves
- **Tipografía SF Pro** con tracking negativo en headlines
- **Color de acción**: #0066cc (Action Blue)
- **Espaciado generoso** para mejor legibilidad

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** con sistema de diseño Apple personalizado
- **@hello-pangea/dnd** para drag & drop
- **React** Server Components por defecto

### Backend
- **MongoDB** + Mongoose para base de datos
- **NextAuth.js** para autenticación
- **Server Actions** de Next.js 15 para mutaciones

### Características Técnicas
- **TypeScript estricto** en todo el código
- **Server Components** por defecto, `'use client'` solo cuando es necesario
- **Actualizaciones optimistas** para UX instantánea
- **Validación** en modelos Mongoose y frontend
- **Índices optimizados** para búsquedas frecuentes

## 📁 Estructura del Proyecto

```
notefy/
├── app/                    # Next.js 15 App Router
│   ├── dashboard/          # Dashboard principal
│   ├── board/              # Vistas de tableros Kanban
│   ├── auth/               # Login y registro
│   └── api/                # NextAuth endpoints
├── components/             # Componentes React
│   ├── dashboard/          # Componentes del dashboard
│   ├── kanban/             # Componentes Kanban
│   ├── notes/              # Componentes de notas
│   └── project/            # Componentes de proyectos
├── actions/                # Server Actions
├── models/                 # Esquemas Mongoose
├── lib/                    # Utilidades y configuración
├── types/                  # Tipos TypeScript
└── .ai/                    # Documentación para IA
```

## 📁 Documentación del Contexto (Claude/AI)

Este repositorio incluye archivos de contexto para maximizar la eficiencia de los modelos de lenguaje:

- **`.ai/AGENTS.md`**: Reglas específicas de Next.js 15 y breaking changes
- **`.ai/INSTRUCTIONS.md`**: Reglas de estilo, desarrollo y convenciones de código
- **`.ai/ARCHITECTURE.md`**: Estructura de carpetas, flujo de datos y jerarquía
- **`.ai/SCHEMA.md`**: Esquemas de datos de MongoDB (Board, Note, Project, Task)
- **`.ai/DESIGN.md`**: Sistema de diseño Apple (colores, tipografía, componentes)
- **`.ai/PROMPT_CONTEXT.md`**: Contexto general para asistentes de IA

## 🚀 Comenzando

### Prerrequisitos
- Node.js 18+
- MongoDB (local o MongoDB Atlas)
- Cuenta de Google/OAuth para NextAuth (opcional)

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd notefy

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar migraciones (si es necesario)
npm run migrate

# Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno

```env
MONGODB_URI=mongodb://localhost:27017/notefy
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

## 📊 Modelos de Datos

### Project (Proyecto)
Contenedor principal para agrupar tableros y notas.

### Board (Tablero)
Tablero Kanban con tareas, puede pertenecer a un proyecto o ser independiente.

### Task (Tarea)
Tareas dentro de un tablero con estado, ordenamiento y fechas.

### Note (Nota)
Notas con editor de texto rico, pueden ser privadas o compartidas.

Ver `.ai/SCHEMA.md` para detalles completos de los esquemas.

## 🤝 Contribución

Este proyecto sigue las convenciones descritas en `.ai/INSTRUCTIONS.md`. Al contribuir:

1. Seguir la estética Apple de `.ai/DESIGN.md`
2. Usar Server Actions para mutaciones
3. Mantener tipado estricto en TypeScript
4. UI en español, código en inglés
5. Colocar archivos según `.ai/ARCHITECTURE.md`

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

*Desarrollado con enfoque en la productividad y el diseño limpio.*