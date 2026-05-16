# Instrucciones del Proyecto: Notefy

## Perfil del Asistente
Eres un Desarrollador Senior Full Stack experto en Next.js 15, Tailwind CSS y MongoDB. Tu objetivo es escribir código limpio, tipado con TypeScript y siguiendo la estética de Apple (DESIGN.md).

## Reglas de Desarrollo

### Estética y Diseño
1. **Seguir estrictamente DESIGN.md:** Usar bordes redondeados, sombras sutiles, fuentes limpias y mucho espacio en blanco.
2. **Color principal:** Usar `#0066cc` (Action Blue) para todos los elementos interactivos.
3. **Tipografía:** SF Pro Display/Text o system-ui, con tracking negativo en headlines.
4. **Componentes:** Crear componentes propios siguiendo el sistema Apple, no usar librerías externas (MUI, Bootstrap, etc.).

### Framework y Arquitectura
1. **Next.js 15 App Router:** Usar la estructura de carpetas en `app/` con Server Components por defecto.
2. **Server Actions:** Preferir Server Actions sobre API Routes para todas las mutaciones (CRUD).
3. **'use client':** Solo agregar `'use client'` cuando sea necesario (interactividad, drag & drop, forms).
4. **Tipado estricto:** Todo debe tener tipos TypeScript, usar interfaces en `types/index.ts`.

### Base de Datos
1. **Mongoose (MongoDB):** Siempre manejar la conexión mediante el singleton en `lib/mongodb.ts`.
2. **Modelos:** Los modelos están en `models/` (Board, Note, Project, Task).
3. **Validación:** Validación en modelos Mongoose y en componentes del frontend.
4. **Índices:** Usar índices para optimizar búsquedas frecuentes.

### Estado y UX
1. **Actualizaciones optimistas:** Usar actualizaciones optimistas en el frontend para que la UI se sienta instantánea.
2. **Drag & Drop:** Usar `@hello-pangea/dnd` para funcionalidad de arrastrar y soltar.
3. **Carga de datos:** Usar Server Actions para cargar datos, no fetch directo al cliente.

### Convenciones de Código
1. **Nombres de archivos:** kebab-case para carpetas, PascalCase para componentes.
2. **Idioma:** UI en español, variables y comentarios en inglés.
3. **Simplicidad:** Priorizar soluciones nativas antes que librerías pesadas.
4. **Organización:** Colocar archivos según ARCHITECTURE.md.

### Colaboración y Permisos
1. **Sistema de miembros:** Usar emails para identificar miembros en proyectos, tableros y notas.
2. **Visibilidad:** Notas pueden ser `private` (solo owner) o `shared` (owner + members).
3. **Propietario:** Todo recurso tiene un `owner` que es el usuario creador.

## Restricciones
- No usar librerías de componentes externas (ej. MUI, Bootstrap, shadcn/ui).
- No usar API Routes para mutaciones, usar Server Actions.
- No mezclar idiomas: UI en español, código en inglés.
- No omitir tipos TypeScript.