'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Check, X, Tags } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { ITag } from '@/types';
import { addBoardTag, updateBoardTag, deleteBoardTag } from '@/actions/tag-actions';

const PRESET_COLORS = [
  '#0066cc',
  '#34c759',
  '#ff9500',
  '#ff3b30',
  '#af52de',
  '#5ac8fa',
  '#ffcc00',
  '#ff2d55',
  '#00c7be',
  '#8e8e93',
];

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  initialTags: ITag[];
}

interface TagRowProps {
  tag: ITag;
  onEdit: () => void;
  onDelete: () => void;
  isLoading: boolean;
}

function TagRow({ tag, onEdit, onDelete, isLoading }: TagRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-[#f5f5f7] group transition-colors">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: tag.color }}
      />
      <Badge variant="tag" color={tag.color} className="text-[11px]">
        {tag.text}
      </Badge>
      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-white transition-colors disabled:opacity-50"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-[#7a7a7a] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0"
          style={{
            backgroundColor: color,
            outline: value === color ? `2px solid ${color}` : 'none',
            outlineOffset: '2px',
          }}
        />
      ))}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-5 h-5 rounded-full border-2 border-dashed border-[#d0d0d0] hover:border-[#7a7a7a] transition-colors flex items-center justify-center"
          title="Color personalizado"
        >
          <Plus size={10} className="text-[#7a7a7a]" />
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
    </div>
  );
}

export default function TagManagerModal({
  isOpen,
  onClose,
  boardId,
  initialTags,
}: TagManagerModalProps) {
  const router = useRouter();
  const [tags, setTags] = useState<ITag[]>(initialTags);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [loadingIndex, setLoadingIndex] = useState<number | 'add' | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingIndex(null);
      setIsAdding(false);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.focus();
  }, [editingIndex]);

  useEffect(() => {
    if (isAdding) addInputRef.current?.focus();
  }, [isAdding]);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(tags[index].text);
    setEditColor(tags[index].color);
    setIsAdding(false);
    setError('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setError('');
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;
    const trimmed = editText.trim();
    if (!trimmed) return;

    setLoadingIndex(editingIndex);
    setError('');
    const oldText = tags[editingIndex].text;
    const result = await updateBoardTag(boardId, oldText, { text: trimmed, color: editColor });

    if (result.success && result.data) {
      setTags(result.data);
      setEditingIndex(null);
      router.refresh();
    } else {
      setError(result.error || 'Error al actualizar la etiqueta');
    }
    setLoadingIndex(null);
  };

  const handleDelete = async (index: number) => {
    setDeletingIndex(index);
    setError('');
    const result = await deleteBoardTag(boardId, tags[index].text);

    if (result.success && result.data) {
      setTags(result.data);
      if (editingIndex === index) setEditingIndex(null);
      router.refresh();
    } else {
      setError(result.error || 'Error al eliminar la etiqueta');
    }
    setDeletingIndex(null);
  };

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) return;

    setLoadingIndex('add');
    setError('');
    const result = await addBoardTag(boardId, { text: trimmed, color: newColor });

    if (result.success && result.data) {
      setTags(result.data);
      setNewText('');
      setNewColor(PRESET_COLORS[0]);
      setIsAdding(false);
      router.refresh();
    } else {
      setError(result.error || 'Error al agregar la etiqueta');
    }
    setLoadingIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
    if (e.key === 'Escape') {
      setEditingIndex(null);
      setIsAdding(false);
      setError('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Administrar Etiquetas" className="max-w-md">
      <div className="space-y-4">
        {/* Lista de etiquetas */}
        <div className="space-y-0.5">
          {tags.length === 0 && !isAdding && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Tags size={28} className="text-[#d0d0d0]" />
              <p className="text-[13px] text-[#7a7a7a]">No hay etiquetas en este tablero.</p>
              <p className="text-[11px] text-[#a0a0a8]">Crea una para empezar a organizar tus tareas.</p>
            </div>
          )}

          {tags.map((tag, index) =>
            editingIndex === index ? (
              <div
                key={index}
                className="space-y-3 p-3 bg-[#f5f5f7] rounded-xl border border-[#e5e5e5]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: editColor }}
                  />
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, saveEdit)}
                    maxLength={30}
                    placeholder="Nombre de la etiqueta"
                    className="flex-1 text-[13px] bg-white border border-[#e0e0e0] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#0066cc] transition-colors text-[#1d1d1f]"
                  />
                </div>
                <ColorPicker value={editColor} onChange={setEditColor} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={!editText.trim() || loadingIndex === index}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] disabled:opacity-50 text-white rounded-lg text-[12px] font-medium transition-colors"
                  >
                    <Check size={12} />
                    {loadingIndex === index ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[#7a7a7a] hover:bg-white rounded-lg text-[12px] transition-colors"
                  >
                    <X size={12} />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <TagRow
                key={index}
                tag={tag}
                onEdit={() => startEdit(index)}
                onDelete={() => handleDelete(index)}
                isLoading={deletingIndex === index}
              />
            )
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Formulario nueva etiqueta */}
        {isAdding ? (
          <div className="space-y-3 p-3 bg-[#f5f5f7] rounded-xl border border-[#e5e5e5]">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: newColor }}
              />
              <input
                ref={addInputRef}
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleAdd)}
                maxLength={30}
                placeholder="Nombre de la etiqueta"
                className="flex-1 text-[13px] bg-white border border-[#e0e0e0] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#0066cc] transition-colors text-[#1d1d1f]"
              />
            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={!newText.trim() || loadingIndex === 'add'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] disabled:opacity-50 text-white rounded-lg text-[12px] font-medium transition-colors"
              >
                <Plus size={12} />
                {loadingIndex === 'add' ? 'Agregando...' : 'Agregar'}
              </button>
              <button
                onClick={() => { setIsAdding(false); setNewText(''); setError(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[#7a7a7a] hover:bg-white rounded-lg text-[12px] transition-colors"
              >
                <X size={12} />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setIsAdding(true); setEditingIndex(null); setError(''); }}
            disabled={tags.length >= 20}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-[#d0d0d0] hover:border-[#0066cc] hover:bg-[#0066cc]/5 text-[#7a7a7a] hover:text-[#0066cc] text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            {tags.length >= 20 ? 'Límite alcanzado (20 etiquetas)' : 'Nueva etiqueta'}
          </button>
        )}
      </div>
    </Modal>
  );
}
