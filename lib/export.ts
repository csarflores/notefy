// Utilidades de exportación de notas (lado cliente, sin dependencias)

const CB_OPEN = 'CB';

// Convierte el HTML de TipTap a Markdown de forma aproximada
export function htmlToMarkdown(html: string): string {
  let md = html;

  // Bloques de código primero (para no procesar su interior)
  const codeBlocks: string[] = [];
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner) => {
    const code = inner.replace(/<[^>]+>/g, '');
    codeBlocks.push(code);
    return `${CB_OPEN}${codeBlocks.length - 1}`;
  });

  // Encabezados
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n\n# ${stripTags(c)}\n\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n\n## ${stripTags(c)}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n\n### ${stripTags(c)}\n\n`);
  md = md.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, (_m, c) => `\n\n#### ${stripTags(c)}\n\n`);

  // Énfasis
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  md = md.replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Links e imágenes
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, c) => `[${stripTags(c)}](${href})`);
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // Listas
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `\n- ${stripTags(c).trim()}`);
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');

  // Citas y reglas
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) =>
    `\n\n${stripTags(c).trim().split('\n').map((l: string) => `> ${l}`).join('\n')}\n\n`
  );
  md = md.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');

  // Párrafos y saltos
  md = md.replace(/<\/(p|div)>/gi, '\n\n');
  md = md.replace(/<br[^>]*\/?>/gi, '\n');
  md = md.replace(/<[^>]+>/g, '');

  // Restaurar bloques de código
  md = md.replace(/CB(\d+)/g, (_m, i) => `\n\n\`\`\`\n${codeBlocks[Number(i)]}\n\`\`\`\n\n`);

  // Entidades HTML comunes
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Limpiar espacios extra
  md = md.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return md;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function slugifyFileName(title: string): string {
  const s = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'nota';
}

// Descarga un archivo de texto en el navegador
function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Exportar nota como archivo .md
export function exportNoteAsMarkdown(title: string, html: string) {
  const md = `# ${title}\n\n${htmlToMarkdown(html)}`;
  downloadFile(`${slugifyFileName(title)}.md`, md, 'text/markdown;charset=utf-8');
}

// "Exportar" a PDF abriendo una ventana de impresión con solo el contenido de la nota
export function printNoteAsPdf(title: string, html: string) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return false;
  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
         color: #1d1d1f; max-width: 700px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
  h1 { font-size: 28px; border-bottom: 1px solid #e5e5ea; padding-bottom: 12px; }
  pre { background: #f6f8fa; padding: 12px; border-radius: 8px; overflow-x: auto; }
  code { font-family: 'SF Mono', Consolas, monospace; font-size: 0.9em; background: #f6f8fa; padding: 2px 5px; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  blockquote { border-left: 3px solid #0066cc; margin-left: 0; padding-left: 16px; color: #555; }
  a { color: #0066cc; }
  ul, ol { padding-left: 24px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${html}
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`);
  win.document.close();
  return true;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
