# 🍎 Notefy (MVP)

Un administrador de proyectos multiproyecto diseñado con la filosofía de simplicidad y estética de **Apple**, utilizando el stack moderno de **Next.js 15** y **MongoDB**.

## 🎯 Objetivo del Proyecto
El objetivo principal es proporcionar una herramienta de gestión de tareas **gratuita, sencilla y colaborativa**. A diferencia de las plataformas SaaS tradicionales que limitan el número de usuarios o tableros en sus planes gratuitos, este proyecto permite:
- Gestionar **múltiples proyectos** de forma independiente.
- Colaborar con un **equipo ilimitado** mediante invitaciones por correo.
- Mantener una experiencia de usuario fluida y de alta gama inspirada en **Design.md**.

## 🚀 Funcionalidades Principales
- **Tableros Kanban:** Flujo de trabajo visual con columnas de "Pendiente", "En Proceso" y "Finalizado".
- **Sistema Multiproyecto:** Un dashboard centralizado para navegar entre diferentes iniciativas o clientes.
- **Notas:** Editor de texto rico tipo Word para documentación y notas de proyecto.
- **Tipos de Notas:**
  - **Privadas:** Solo visible para el propietario (incluso dentro de proyectos).
  - **Compartidas:** Visible para propietario y miembros con permiso de edición.
  - **En Proyecto:** Asociadas a proyectos para mejor organización.
- **Tarjetas Enriquecidas:** Tareas con descripciones detalladas, soporte para imágenes (Cloudinary), asignación de responsables y sistema de etiquetas (Tags) por colores.
- **Arrastrar y Soltar:** Interfaz interactiva y rápida mediante `@hello-pangea/dnd`.
- **Diseño Premium:** Interfaz minimalista con bordes redondeados, sombras suaves y efectos de desenfoque (Glassmorphism).

## 🛠️ Stack Tecnológico
- **Frontend:** Next.js 15 (App Router) + TypeScript.
- **Estilos:** Tailwind CSS + [GetDesign Apple](https://getdesign.md/apple/design-md).
- **Base de Datos:** MongoDB & Mongoose.
- **Autenticación:** NextAuth.js (Gestionada por correos de equipo).
- **Editor de Texto:** Tiptap (editor de texto rico moderno).
- **Almacenamiento de Imágenes:** Cloudinary.

## 📁 Documentación del Contexto (Claude/AI)
Este repositorio incluye archivos de contexto para maximizar la eficiencia de los modelos de lenguaje:
- `INSTRUCTIONS.md`: Reglas de estilo y estándares de código.
- `ARCHITECTURE.md`: Estructura de carpetas y flujo del sistema.
- `SCHEMA.md`: Definición técnica de los modelos de datos.

---
*Desarrollado con enfoque en la productividad y el diseño limpio.*