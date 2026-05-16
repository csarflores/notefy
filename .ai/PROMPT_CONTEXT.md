# Contexto para Claude

Para este proyecto, lee y respeta siempre los archivos locales en el orden indicado:

1. **AGENTS.md** - Reglas específicas de Next.js 15 y breaking changes
2. **INSTRUCTIONS.md** - Reglas de estilo, desarrollo y convenciones de código
3. **ARCHITECTURE.md** - Estructura de carpetas, flujo de datos y jerarquía
4. **SCHEMA.md** - Esquemas de datos de MongoDB (Board, Note, Project, Task)
5. **DESIGN.md** - Sistema de diseño Apple (colores, tipografía, componentes)

## Proyecto
**Notefy** es un administrador de proyectos multiproyecto con:
- Tableros Kanban con drag & drop
- Sistema de notas con editor de texto rico
- Colaboración por email (miembros)
- Diseño inspirado en Apple

## Stack Tecnológico
- Next.js 15 (App Router) + TypeScript
- MongoDB + Mongoose
- NextAuth.js para autenticación
- Tailwind CSS
- @hello-pangea/dnd para drag & drop

## Directrices
- No repitas explicaciones innecesarias
- Genera código directamente siguiendo los estándares
- Usa Server Actions para mutaciones
- UI en español, código en inglés
- Sigue la estética Apple de DESIGN.md