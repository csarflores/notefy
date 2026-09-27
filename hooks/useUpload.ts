'use client';

import { useCallback, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { getPresignedUploadUrl, type UploadScope } from '@/actions/upload-actions';

interface UploadOptions {
  scope: UploadScope;
  resourceId?: string;
  compress?: boolean;
}

export type UploadResult = { key: string; publicUrl: string } | { error: string };

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Error al subir (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Error de red al subir'));
    xhr.send(file);
  });
}

export function useUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async (file: File, opts: UploadOptions): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);
    try {
      let toUpload = file;
      let fileName = file.name;

      const shouldCompress =
        opts.compress !== false && file.type.startsWith('image/') && file.type !== 'image/gif';
      if (shouldCompress) {
        toUpload = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          fileType: 'image/webp',
          useWebWorker: true,
        });
        fileName = file.name.replace(/\.[^.]+$/, '') + '.webp';
      }

      const sign = await getPresignedUploadUrl({
        scope: opts.scope,
        resourceId: opts.resourceId,
        fileName,
        fileType: toUpload.type,
        fileSize: toUpload.size,
      });
      if (!sign.success || !sign.data) {
        return { error: sign.error || 'Error al preparar la subida' };
      }

      await putWithProgress(sign.data.url, toUpload, setProgress);
      return { key: sign.data.key, publicUrl: sign.data.publicUrl };
    } catch {
      return { error: 'Error al subir el archivo' };
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, progress, isUploading };
}
