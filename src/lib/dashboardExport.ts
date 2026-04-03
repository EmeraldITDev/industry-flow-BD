import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MIN_EXPORT_WIDTH_PX = 1920;

/**
 * Prepare cloned DOM for html2canvas: solid white surfaces, dark readable text,
 * and resolved SVG paints. The previous implementation only walked HTMLElements, so
 * Recharts SVG <text>/<tspan> (not HTMLElement) never got dark fills — exports looked
 * faint/gray.
 */
function applyExportLightTheme(clonedRoot: HTMLElement) {
  clonedRoot.style.backgroundColor = '#ffffff';
  clonedRoot.style.color = '#0f172a';
  clonedRoot.style.opacity = '1';

  const win = clonedRoot.ownerDocument?.defaultView ?? window;

  // --- SVG text (axes, labels, legends): force readable dark ink (inline style beats attributes) ---
  clonedRoot.querySelectorAll('svg text, svg tspan').forEach((node) => {
    const el = node as SVGTextElement | SVGTSpanElement;
    try {
      const cs = win.getComputedStyle(el);
      const fs = parseFloat(cs.fontSize) || 12;
      el.setAttribute('font-size', String(Math.max(13, fs * 1.12)));
      el.style.setProperty('fill', '#0f172a', 'important');
      el.style.setProperty('stroke', 'none', 'important');
      el.style.setProperty('opacity', '1', 'important');
    } catch {
      el.setAttribute('fill', '#0f172a');
      el.setAttribute('opacity', '1');
    }
  });

  // --- Grid / axis lines ---
  clonedRoot.querySelectorAll('svg line').forEach((line) => {
    line.setAttribute('stroke', '#94a3b8');
    line.setAttribute('opacity', '1');
  });

  // --- Bars, bands (rect): bake computed fill (use !important to beat inline hsl(var())) ---
  clonedRoot.querySelectorAll('svg rect').forEach((node) => {
    const rect = node as SVGElement;
    try {
      const cs = win.getComputedStyle(rect);
      let fill = cs.fill;
      if (!fill || fill === 'none' || fill === 'rgba(0, 0, 0, 0)') {
        fill = '#14b8a6';
      }
      rect.style.setProperty('fill', fill, 'important');
      const op = cs.opacity;
      rect.style.setProperty('opacity', op === '0' || op === '' ? '1' : op || '1', 'important');
    } catch {
      rect.style.setProperty('fill', '#14b8a6', 'important');
      rect.style.setProperty('opacity', '1', 'important');
    }
  });

  // --- Paths (pies, arcs) ---
  clonedRoot.querySelectorAll('svg path').forEach((node) => {
    const path = node as SVGElement;
    try {
      const cs = win.getComputedStyle(path);
      if (cs.fill && cs.fill !== 'none') {
        path.style.setProperty('fill', cs.fill, 'important');
      }
      if (cs.stroke && cs.stroke !== 'none') {
        path.style.setProperty('stroke', cs.stroke, 'important');
      }
      path.style.setProperty('opacity', '1', 'important');
    } catch {
      /* keep attributes */
    }
  });

  clonedRoot.querySelectorAll('svg circle').forEach((node) => {
    const c = node as SVGElement;
    try {
      const cs = win.getComputedStyle(c);
      if (cs.fill && cs.fill !== 'none') {
        c.style.setProperty('fill', cs.fill, 'important');
      }
      c.style.setProperty('opacity', '1', 'important');
    } catch {
      /* keep */
    }
  });

  // --- Outer SVG surface ---
  clonedRoot.querySelectorAll('svg').forEach((svg) => {
    svg.style.backgroundColor = '#ffffff';
    svg.setAttribute('opacity', '1');
  });

  // --- HTML: card surfaces + body text (Tailwind dark theme → print-safe) ---
  clonedRoot.querySelectorAll<HTMLElement>('div, span, p, h1, h2, h3, h4, h5, h6, a, li, label, td, th').forEach((el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    if (
      cls.includes('bg-card') ||
      cls.includes('bg-muted') ||
      cls.includes('bg-background') ||
      cls.includes('bg-accent') ||
      cls.includes('bg-popover')
    ) {
      el.style.backgroundColor = '#ffffff';
    }
    if (cls.includes('text-muted-foreground')) {
      el.style.color = '#475569';
    } else if (
      cls.includes('text-card-foreground') ||
      cls.includes('text-foreground') ||
      cls.includes('font-semibold') ||
      cls.includes('font-bold') ||
      cls.includes('font-medium')
    ) {
      if (!cls.includes('text-primary') && !cls.includes('text-white') && !cls.includes('text-destructive')) {
        el.style.color = '#0f172a';
      }
    }
    el.style.opacity = '1';
  });
}

function computeExportScale(element: HTMLElement): number {
  const width = Math.max(1, element.offsetWidth);
  return Math.min(3, Math.max(2, MIN_EXPORT_WIDTH_PX / width));
}

async function renderExportCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const scale = computeExportScale(element);
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (_doc, cloned) => {
      const root = cloned.querySelector('[data-dashboard-export-root]') as HTMLElement | null;
      if (root) applyExportLightTheme(root);
    },
  });
}

export async function exportElementToPng(element: HTMLElement, baseFilename: string): Promise<void> {
  const safeName = baseFilename.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const canvas = await renderExportCanvas(element);
  const a = document.createElement('a');
  a.download = `${safeName}.png`;
  a.href = canvas.toDataURL('image/png', 1.0);
  a.click();
}

export async function exportElementToPdf(element: HTMLElement, baseFilename: string): Promise<void> {
  const safeName = baseFilename.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const canvas = await renderExportCanvas(element);
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdfW = canvas.width;
  const pdfH = canvas.height;
  const pdf = new jsPDF({
    orientation: pdfW > pdfH ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pdfW, pdfH],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'SLOW');
  pdf.save(`${safeName}.pdf`);
}
