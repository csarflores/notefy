'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const lowlight = createLowlight(common);

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
  minHeight?: string;
}

export default function NoteEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Escribe tu nota aquí...',
  maxLength = 50000,
  showCharCount = true,
  minHeight = '200px',
}: NoteEditorProps) {
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
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-[#e8f0fb] text-[#0066cc]'
          : 'text-[#636366] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]',
        !editable && 'opacity-30 cursor-not-allowed pointer-events-none'
      )}
      disabled={!editable}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <span className="w-px h-4 bg-[#e5e5ea] mx-1 shrink-0" />
  );

  const charCount = editor.getHTML().length;
  const isOverLimit = charCount > maxLength;
  const pct = Math.min(charCount / maxLength, 1);

  return (
    <div className="overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-b border-[#f0f0f0]">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Negrita"
          >
            <BoldIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Cursiva"
          >
            <ItalicIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Subrayado"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Encabezado 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Encabezado 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Encabezado 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Lista"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Bloque de código"
          >
            <Code className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              const url = window.prompt('URL:');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive('link')}
            title="Enlace"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

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
            onClick={() => editor.chain().focus().undo().run()}
            title="Deshacer"
          >
            <Undo className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Rehacer"
          >
            <Redo className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      )}

      <EditorContent editor={editor} />

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
