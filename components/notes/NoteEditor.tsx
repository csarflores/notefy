'use client';

import { useEditor, EditorContent } from '@tiptap/react';
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
import { Bold as BoldIcon, Italic as ItalicIcon, List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo, Code, Link as LinkIcon, Underline as UnderlineIcon, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const lowlight = createLowlight(common);

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export default function NoteEditor({ content, onChange, editable = true, placeholder = 'Escribe tu nota aquí...', maxLength = 50000, showCharCount = true }: NoteEditorProps) {
  // Fix malformed code blocks in content
  const fixContent = (html: string) => {
    if (!html) return html;
    // Convert paragraphs that look like code blocks to proper pre/code tags
    let fixed = html;
    // Pattern 1: ``` followed by content followed by ```
    fixed = fixed.replace(/<p>```<\/p>([\s\S]*?)<p>```<\/p>/g, (match, content) => {
      // Remove paragraph tags from the content
      const cleanContent = content.replace(/<\/p>\s*<p>/g, '\n').replace(/<p>/g, '').replace(/<\/p>/g, '');
      return `<pre><code>${cleanContent}</code></pre>`;
    });
    // Pattern 2: Inline code with single backticks
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
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      TextStyle,
      Color,
      Underline,
      Bold,
      Italic,
      Strike,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: fixContent(content),
    editable,
    enableInputRules: true,
    enablePasteRules: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      // Force content to be set after editor is created
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
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        'hover:bg-gray-100',
        active ? 'bg-blue-50 text-blue-600' : 'text-gray-600',
        !editable && 'opacity-50 cursor-not-allowed'
      )}
      disabled={!editable}
    >
      {children}
    </button>
  );

  const charCount = editor?.getHTML().length || 0;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
          >
            <BoldIcon className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
          >
            <ItalicIcon className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
          >
            <List className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            active={editor.isActive('link')}
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>

          <div className="relative">
            <input
              type="color"
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              disabled={!editable}
              title="Text color"
            />
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}

      <EditorContent editor={editor} />

      {showCharCount && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
          <span>
            {charCount.toLocaleString()} / {maxLength.toLocaleString()} caracteres
          </span>
          {isOverLimit && (
            <span className="text-red-500 font-medium">
              ⚠️ Excede el límite (HTML incluye etiquetas de formato)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
