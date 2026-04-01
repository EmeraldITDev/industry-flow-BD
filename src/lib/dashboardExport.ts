import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MIN_EXPORT_WIDTH_PX = 1920;

/** Light theme overrides for cloned DOM so exports are white, report-ready. */
function applyExportLightTheme(clonedRoot: HTMLElement) {
  clonedRoot.style.backgroundColor = '#ffffff';
  clonedRoot.style.color = '#0f172a';

  const walk = (el: Element) => {
    if (!(el instanceof HTMLElement)) return;
    const tag = el.tagName.toLowerCase();
    const cls = typeof el.className === 'string' ? el.className : '';

    if (tag === 'svg') {
      el.style.backgroundColor = '#ffffff';
    }
    if (tag === 'text' || tag === 'tspan') {
      const fs = parseFloat(el.getAttribute('font-size') || '12') || 12;
      const next = Math.max(12, fs);
      el.setAttribute('font-size', String(next));
      el.setAttribute('fill', '#0f172a');
    }

    if (cls.includes('bg-card') || cls.includes('bg-muted') || cls.includes('bg-background')) {
      el.style.backgroundColor = '#ffffff';
    }
    if (cls.includes('text-muted-foreground') || cls.includes('text-card-foreground')) {
      el.style.color = '#475569';
    }
    if (cls.includes('text-foreground') || cls.includes('font-semibold') || cls.includes('font-bold')) {
      if (!cls.includes('text-white') && !cls.includes('text-primary')) {
        el.style.color = '#0f172a';
      }
    }
    if (cls.includes('border-border') || cls.includes('border-t') || cls.includes('border-b')) {
      el.style.borderColor = '#e2e8f0';
    }

    el.childNodes.forEach((c) => {
      if (c.nodeType === Node.ELEMENT_NODE) walk(c as Element);
    });
  };

  walk(clonedRoot);
}

export async function exportElementToPng(element: HTMLElement, baseFilename: string): Promise<void> {
  const safeName = baseFilename.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const width = Math.max(1, element.offsetWidth);
  const scale = Math.min(4, Math.max(2, MIN_EXPORT_WIDTH_PX / width));

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale,
    useCORS: true,
    logging: false,
    onclone: (_doc, cloned) => {
      const root = cloned.querySelector('[data-dashboard-export-root]') as HTMLElement | null;
      if (root) applyExportLightTheme(root);
    },
  });

  const a = document.createElement('a');
  a.download = `${safeName}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

export async function exportElementToPdf(element: HTMLElement, baseFilename: string): Promise<void> {
  const safeName = baseFilename.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const width = Math.max(1, element.offsetWidth);
  const scale = Math.min(4, Math.max(2, MIN_EXPORT_WIDTH_PX / width));

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale,
    useCORS: true,
    logging: false,
    onclone: (_doc, cloned) => {
      const root = cloned.querySelector('[data-dashboard-export-root]') as HTMLElement | null;
      if (root) applyExportLightTheme(root);
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdfW = canvas.width;
  const pdfH = canvas.height;
  const pdf = new jsPDF({
    orientation: pdfW > pdfH ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pdfW, pdfH],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
  pdf.save(`${safeName}.pdf`);
}
