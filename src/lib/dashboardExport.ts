import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MIN_EXPORT_WIDTH_PX = 1920;

/**
 * Prepare cloned DOM for html2canvas: solid white surfaces, dark readable text,
 * and resolved SVG paints. The previous implementation only walked HTMLElements, so
 * Recharts SVG <text>/<tspan> (not HTMLElement) never got dark fills — exports looked
 * faint/gray.
 */
function resolveHslVar(raw: string): string | null {
  // Detect hsl(var(--...)) patterns that html2canvas can't resolve
  if (!raw || raw === 'none' || raw === 'rgba(0, 0, 0, 0)') return null;
  if (raw.includes('var(')) return null; // unresolved CSS variable
  return raw;
}

function applyExportLightTheme(clonedRoot: HTMLElement) {
  clonedRoot.style.backgroundColor = '#ffffff';
  clonedRoot.style.color = '#0f172a';
  clonedRoot.style.opacity = '1';

  // Inject CSS variables into the cloned root so hsl(var(--...)) resolves
  const varsToInject: Record<string, string> = {
    '--foreground': '222.2 84% 4.9%',
    '--background': '0 0% 100%',
    '--muted-foreground': '215.4 16.3% 46.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '222.2 84% 4.9%',
    '--popover': '0 0% 100%',
    '--border': '214.3 31.8% 91.4%',
    '--primary': '222.2 47.4% 11.2%',
    '--primary-foreground': '210 40% 98%',
    '--accent': '210 40% 96.1%',
    '--accent-foreground': '222.2 47.4% 11.2%',
  };
  Object.entries(varsToInject).forEach(([k, v]) => {
    clonedRoot.style.setProperty(k, v);
  });

  const win = clonedRoot.ownerDocument?.defaultView ?? window;

  // --- SVG text (axes, labels, legends): force readable dark ink ---
  clonedRoot.querySelectorAll('svg text, svg tspan').forEach((node) => {
    const el = node as SVGTextElement | SVGTSpanElement;
    try {
      const cs = win.getComputedStyle(el);
      const fs = parseFloat(cs.fontSize) || 12;
      el.setAttribute('font-size', String(Math.max(14, fs * 1.25)));
      // Force dark fill — resolve or fallback
      const resolved = resolveHslVar(cs.fill);
      el.style.setProperty('fill', resolved || '#0f172a', 'important');
      el.style.setProperty('stroke', 'none', 'important');
      el.style.setProperty('opacity', '1', 'important');
      // Also set attribute as fallback for html2canvas
      el.setAttribute('fill', resolved || '#0f172a');
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

  // --- Bars, bands (rect): bake computed fill ---
  clonedRoot.querySelectorAll('svg rect').forEach((node) => {
    const rect = node as SVGElement;
    try {
      const cs = win.getComputedStyle(rect);
      let fill = resolveHslVar(cs.fill);
      if (!fill) fill = '#14b8a6';
      rect.style.setProperty('fill', fill, 'important');
      rect.setAttribute('fill', fill);
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
      const fill = resolveHslVar(cs.fill);
      if (fill) {
        path.style.setProperty('fill', fill, 'important');
        path.setAttribute('fill', fill);
      }
      const stroke = resolveHslVar(cs.stroke);
      if (stroke) {
        path.style.setProperty('stroke', stroke, 'important');
        path.setAttribute('stroke', stroke);
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
      const fill = resolveHslVar(cs.fill);
      if (fill) {
        c.style.setProperty('fill', fill, 'important');
        c.setAttribute('fill', fill);
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
    // Ensure SVG overflow is visible so labels outside the pie aren't clipped
    svg.style.overflow = 'visible';
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
    // Allow labels that extend outside chart SVG bounds to render
    removeContainer: true,
    onclone: (_doc, cloned) => {
      const root = cloned.querySelector('[data-dashboard-export-root]') as HTMLElement | null;
      if (root) {
        // Make overflow visible so pie labels outside SVG viewBox aren't clipped
        root.style.overflow = 'visible';
        applyExportLightTheme(root);
      }
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
