import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PdfExportOptions {
  filename?: string;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Mathematical conversion from OKLCH color space to sRGB.
 * Prevents html2canvas color parser from crashing with:
 * "Attempting to parse an unsupported color function 'oklch'"
 */
function parseOklchToRgb(str: string): string {
  // Regex to extract L, C, H and optional Alpha from oklch(L C H [/ A])
  const match = str.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:\s*(?:\/|,)\s*([\d.]+%?))?\s*\)/i);
  if (!match) return 'rgb(0, 0, 0)';

  let l = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
  // If Chroma has %, normalize (100% chroma is approx 0.4 in OKLCH)
  let c = match[2].endsWith('%') ? (parseFloat(match[2]) / 100) * 0.4 : parseFloat(match[2]);
  let h = parseFloat(match[3]) || 0;
  let a = 1;
  if (match[4]) {
    a = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
  }

  // Handle hue in radians
  const hRad = (h * Math.PI) / 180;
  const aLab = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);

  // OKLab -> linear LMS
  const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  // linear LMS -> linear sRGB
  const rLin = +4.0767439362 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Gamma correction to standard sRGB
  const toGamma = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    return clamped <= 0.0031308
      ? Math.round(clamped * 12.92 * 255)
      : Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255);
  };

  const r = toGamma(rLin);
  const g = toGamma(gLin);
  const b = toGamma(bLin);

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Replaces all occurrences of oklch(...) in any string with standard rgb(...) or rgba(...)
 */
export function sanitizeAllOklch(input: string): string {
  if (!input || typeof input !== 'string' || !input.includes('oklch')) return input;
  return input.replace(/oklch\([^)]+\)/gi, (match) => parseOklchToRgb(match));
}

/**
 * Sanitizes element styles and stylesheets to guarantee html2canvas never encounters unsupported oklch
 */
export function sanitizeOklchInElement(root: HTMLElement | Document): void {
  const doc = root.ownerDocument || (root instanceof Document ? root : document);

  // 1. Sanitize all <style> elements in the document
  if (doc) {
    const styles = doc.querySelectorAll('style');
    styles.forEach((styleTag) => {
      if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
        styleTag.textContent = sanitizeAllOklch(styleTag.textContent);
      }
    });
  }

  // 2. Traversal of DOM elements to override computed oklch colors with explicit inline styles
  const rootEl = root instanceof Document ? root.body : root;
  if (!rootEl) return;

  const colorProps = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'fill',
    'stroke',
    'boxShadow'
  ] as const;

  const elements = [rootEl, ...Array.from(rootEl.querySelectorAll('*'))] as HTMLElement[];

  elements.forEach((el) => {
    if (!el.style) return;

    let computed: CSSStyleDeclaration | null = null;
    try {
      computed = window.getComputedStyle(el);
    } catch {
      computed = null;
    }

    if (computed) {
      colorProps.forEach((prop) => {
        const val = computed![prop as any];
        if (val && typeof val === 'string' && val.includes('oklch')) {
          (el.style as any)[prop] = sanitizeAllOklch(val);
        }
      });
    }

    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.includes('oklch')) {
      el.setAttribute('style', sanitizeAllOklch(styleAttr));
    }
  });
}

/**
 * Generates and downloads a clean, pristine PDF document directly in the browser.
 * - Extracts each .contract-page-a4 page separately
 * - Renders each page directly to jsPDF as exact A4 (210mm x 297mm)
 * - Removes web UI controls, outer borders, modal backgrounds, and shadows
 * - Protects html2canvas against oklch color crashes via mathematical color conversion and Proxy
 */
export async function downloadElementAsPdf(
  elementOrId: HTMLElement | string,
  options: PdfExportOptions = {}
): Promise<void> {
  const { filename = 'Dokumen_Kontrak.pdf', onStart, onSuccess, onError } = options;

  if (onStart) onStart();

  const targetElement = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!targetElement) {
    console.error('Target element for PDF export not found:', elementOrId);
    if (onError) onError(new Error('Elemen dokumen tidak ditemukan.'));
    return;
  }

  // Create isolated offscreen container
  const container = document.createElement('div');
  container.className = 'pdf-export-isolated-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0px';
  container.style.width = '210mm';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';

  // Clone document element
  const clone = targetElement.cloneNode(true) as HTMLElement;

  // Reset any zoom applied to the element
  clone.style.zoom = '1';
  clone.style.transform = 'none';

  // Remove interactive web elements like buttons, selects, or no-pdf items
  const elementsToRemove = clone.querySelectorAll('.print\\:hidden, button, select, input, .no-pdf, .no-print');
  elementsToRemove.forEach(el => el.remove());

  // Collect all individual A4 pages inside the clone
  let pageElements = Array.from(clone.querySelectorAll('.contract-page-a4')) as HTMLElement[];

  // If no .contract-page-a4 found, treat the cloned container as a single page
  if (pageElements.length === 0) {
    pageElements = [clone];
  }

  // Format all pages with exact A4 portrait dimensions
  pageElements.forEach((page) => {
    page.style.boxShadow = 'none';
    page.style.border = 'none';
    page.style.outline = 'none';
    page.style.margin = '0 auto';
    page.style.padding = '1cm 2.54cm 1.75cm 2.54cm';
    page.style.width = '210mm';
    page.style.minHeight = '297mm';
    page.style.maxHeight = '297mm';
    page.style.boxSizing = 'border-box';
    page.style.backgroundColor = '#ffffff';
    page.style.color = '#000000';
    page.style.overflow = 'hidden';
  });

  container.appendChild(clone);
  document.body.appendChild(container);

  // Sanitize oklch colors before html2canvas processes it
  sanitizeOklchInElement(container);

  const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          // Layer 1: Sanitize all <style> tags in cloned document
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach((s) => {
            if (s.textContent && s.textContent.includes('oklch')) {
              s.textContent = sanitizeAllOklch(s.textContent);
            }
          });

          // Layer 2: Intercept getComputedStyle in the iframe window to convert any oklch return values
          if (clonedDoc.defaultView) {
            const originalGetComputedStyle = clonedDoc.defaultView.getComputedStyle;
            clonedDoc.defaultView.getComputedStyle = function (el: Element, pseudo?: string | null) {
              const res = originalGetComputedStyle.call(this, el, pseudo);
              return new Proxy(res, {
                get(target, prop) {
                  const val = (target as any)[prop];
                  if (typeof val === 'string' && val.includes('oklch')) {
                    return sanitizeAllOklch(val);
                  }
                  if (typeof val === 'function') {
                    return val.bind(target);
                  }
                  return val;
                }
              });
            };
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    pdf.save(cleanFilename);
    if (onSuccess) onSuccess();
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    if (onError) onError(err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Triggers direct browser print window with clean styling.
 * Temporarily resets zoom to 100% so browser print engine renders all pages cleanly.
 */
export function printDirectly(containerId: string = 'mailmerge-printable-container'): void {
  const printableContainer = document.getElementById(containerId) || document.getElementById('mailmerge-printable-container');
  let originalZoom: string | undefined = undefined;

  if (printableContainer) {
    originalZoom = printableContainer.style.zoom;
    printableContainer.style.zoom = '1';
  }

  window.focus();
  setTimeout(() => {
    window.print();
    if (printableContainer && originalZoom) {
      printableContainer.style.zoom = originalZoom;
    }
  }, 150);
}
