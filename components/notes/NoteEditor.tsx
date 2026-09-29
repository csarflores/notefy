'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import TipTapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import { common, createLowlight } from 'lowlight';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Code,
  Link as LinkIcon,
  Underline as UnderlineIcon,
  Palette,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpload } from '@/hooks/useUpload';
import { useNotification } from '@/components/ui/NotificationContext';
import type { UploadScope } from '@/actions/upload-actions';

const lowlight = createLowlight(common);

function ToolbarButton({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-[#e8f0fb] text-[#0066cc]'
          : 'text-[#636366] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]',
        disabled && 'opacity-30 cursor-not-allowed pointer-events-none'
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-[#e5e5ea] mx-1 shrink-0" />;
}

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
  minHeight?: string;
  // Si ambos están presentes, el editor permite subir imágenes a S3
  uploadScope?: UploadScope;
  uploadResourceId?: string;
  // Alternativa cuando el recurso aún no existe (p.ej. tarea nueva):
  // recibe el File y devuelve una URL local (blob:) para insertarla de inmediato
  onLocalImage?: (file: File) => string;
}

export default function NoteEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Escribe tu nota aquí...',
  maxLength = 50000,
  showCharCount = true,
  minHeight = '200px',
  uploadScope,
  uploadResourceId,
  onLocalImage,
}: NoteEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const { upload } = useUpload();
  const { showNotification } = useNotification();
  const canUploadImages = !!(uploadScope && uploadResourceId);
  const canInsertImages = canUploadImages || !!onLocalImage;
  const fixContent = (html: string) => {
    if (!html) return html;
    let fixed = html;
    fixed = fixed.replace(/<p>```<\/p>([\s\S]*?)<p>```<\/p>/g, (match, content) => {
      const cleanContent = content
        .replace(/<\/p>\s*<p>/g, '\n')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '');
      return `<pre><code>${cleanContent}</code></pre>`;
    });
    fixed = fixed.replace(/<p>`([^`]+)`<\/p>/g, '<code>$1</code>');
    return fixed;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        bold: false,
        italic: false,
        strike: false,
        underline: false,
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      TextStyle,
      Color,
      Underline,
      Bold,
      Italic,
      Strike,
      TipTapImage.configure({ allowBase64: false, inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: fixContent(content),
    editable,
    enableInputRules: true,
    enablePasteRules: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      if (content) {
        setTimeout(() => {
          if (editor.getHTML().length < content.length) {
            try {
              editor.commands.setContent(fixContent(content), { emitUpdate: false });
            } catch (e) {
              console.error('Error setting content:', e);
            }
          }
        }, 100);
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-4 py-3 ${
          minHeight === '120px' ? 'min-h-[120px]' : 'min-h-[200px]'
        }`,
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((f) => void insertImageFile(f));
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        files.forEach((f) => void insertImageFile(f, pos?.pos));
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // En modo lectura, sincronizar el contenido cuando cambia la prop
  // (p.ej. [[links]] resueltos a anchors). En modo edición no tocar nada.
  useEffect(() => {
    if (!editor || editable || editor.isDestroyed) return;
    const next = fixContent(content);
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, editable, content]);

  // Sube la imagen a S3 y la inserta en el editor (o inserta URL local si no hay destino aún)
  const insertImageFile = async (file: File, at?: number) => {
    const insertAt = (src: string) => {
      if (editor && !editor.isDestroyed) {
        const chain = editor.chain().focus();
        if (typeof at === 'number') chain.setTextSelection(at);
        chain.setImage({ src }).run();
      }
    };

    if (!uploadScope || !uploadResourceId) {
      if (onLocalImage) {
        const src = onLocalImage(file);
        if (src) insertAt(src);
      }
      return;
    }

    setIsImageUploading(true);
    const result = await upload(file, { scope: uploadScope, resourceId: uploadResourceId });
    setIsImageUploading(false);

    if ('error' in result) {
      showNotification(result.error, 'error');
      return;
    }
    insertAt(result.publicUrl);
  };

  if (!editor) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await insertImageFile(file);
  };

  const charCount = editor.getHTML().length;
  const isOverLimit = charCount > maxLength;

  const openLinkInput = () => {
    const existing = editor.getAttributes('link').href as string | undefined;
    setLinkUrl(existing || '');
    setLinkInputOpen(true);
    setTimeout(() => linkInputRef.current?.focus(), 30);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkInputOpen(false);
    setLinkUrl('');
  };

  return (
    <div className="overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-b border-[#f0f0f0]">
          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Negrita"
          >
            <BoldIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Cursiva"
          >
            <ItalicIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Subrayado"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Encabezado 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Encabezado 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Encabezado 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Lista"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Bloque de código"
          >
            <Code className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editable}
            onClick={openLinkInput}
            active={editor.isActive('link') || linkInputOpen}
            title="Enlace"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          {canInsertImages && (
            <ToolbarButton
            disabled={!editable}
              onClick={() => imageInputRef.current?.click()}
              title="Imagen"
            >
              {isImageUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
            </ToolbarButton>
          )}

          {/* Color picker con icono */}
          <div className="relative">
            <button
              type="button"
              title="Color de texto"
              className={cn(
                'p-1.5 rounded transition-colors text-[#636366] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]',
                !editable && 'opacity-30 cursor-not-allowed pointer-events-none'
              )}
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <input
              type="color"
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              disabled={!editable}
              title="Color de texto"
            />
          </div>

          <Divider />

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().undo().run()}
            title="Deshacer"
          >
            <Undo className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            disabled={!editable}
            onClick={() => editor.chain().focus().redo().run()}
            title="Rehacer"
          >
            <Redo className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      )}

      {linkInputOpen && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#f0f0f0] bg-[#fafafc]">
          <LinkIcon className="w-3.5 h-3.5 text-[#8e8e93] shrink-0" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
              if (e.key === 'Escape') { setLinkInputOpen(false); setLinkUrl(''); }
            }}
            placeholder="https://ejemplo.com — vacío para quitar el enlace"
            className="flex-1 bg-transparent text-[12px] text-[#1d1d1f] placeholder-[#c7c7cc] outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="text-[11px] font-medium text-[#0066cc] hover:text-[#0055aa] px-2 py-0.5"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => { setLinkInputOpen(false); setLinkUrl(''); }}
            className="text-[11px] text-[#8e8e93] hover:text-[#1d1d1f] px-1 py-0.5"
          >
            Cancelar
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      {canInsertImages && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageSelect}
        />
      )}

      {showCharCount && (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-[#f0f0f0]">
          <span className={cn('text-[11px] tabular-nums', isOverLimit ? 'text-red-400' : 'text-[#c7c7cc]')}>
            {charCount.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
          {isOverLimit && (
            <span className="text-[11px] text-red-400">
              Excede el límite
            </span>
          )}
        </div>
      )}
    </div>
  );
}
