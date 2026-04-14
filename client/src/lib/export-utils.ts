/**
 * Export utilities for downloading ads as HTML or PNG
 * Handles canvas-to-image conversion and file download
 * STORY-143: Resolves http(s) image URLs to data URIs before capture so product images render.
 */

import html2canvas from 'html2canvas';
import { resolveImagesInElement } from './export-image-resolution';

export interface ExportOptions {
  filename?: string;
  quality?: number;
  scale?: number;
}

/**
 * Export ad as PNG image
 */
export async function exportAdAsPNG(
  elementId: string,
  options: ExportOptions = {},
): Promise<void> {
  const { filename = 'ad-creative.png', quality = 0.95, scale = 2 } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    document.body.appendChild(clone);
    try {
      await resolveImagesInElement(clone);
      const canvas = await html2canvas(clone, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error('Failed to create blob from canvas');
          }
          downloadBlob(blob, filename);
        },
        'image/png',
        quality,
      );
    } finally {
      clone.remove();
    }
  } catch (error) {
    console.error('PNG export failed:', error);
    throw error;
  }
}

/**
 * Export ad as HTML file
 */
export async function exportAdAsHTML(
  elementId: string,
  options: ExportOptions = {},
): Promise<void> {
  const { filename = 'ad-creative.html' } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;

    // Create a complete HTML document
    const html = createHTMLDocument(clone);

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('HTML export failed:', error);
    throw error;
  }
}

/**
 * Export ad as JPEG image
 */
export async function exportAdAsJPEG(
  elementId: string,
  options: ExportOptions = {},
): Promise<void> {
  const { filename = 'ad-creative.jpg', quality = 0.85, scale = 2 } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    document.body.appendChild(clone);
    try {
      await resolveImagesInElement(clone);
      const canvas = await html2canvas(clone, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error('Failed to create blob from canvas');
          }
          downloadBlob(blob, filename);
        },
        'image/jpeg',
        quality,
      );
    } finally {
      clone.remove();
    }
  } catch (error) {
    console.error('JPEG export failed:', error);
    throw error;
  }
}

/**
 * Export ad as multiple formats (PNG, JPEG, HTML)
 */
export async function exportAdAsMultiple(
  elementId: string,
  formats: ('png' | 'jpeg' | 'html')[] = ['png', 'html'],
  options: ExportOptions = {},
): Promise<void> {
  try {
    for (const format of formats) {
      const filename = options.filename
        ? options.filename.replace(/\.[^.]+$/, `.${format}`)
        : `ad-creative.${format}`;

      switch (format) {
        case 'png':
          await exportAdAsPNG(elementId, { ...options, filename });
          break;
        case 'jpeg':
          await exportAdAsJPEG(elementId, { ...options, filename });
          break;
        case 'html':
          await exportAdAsHTML(elementId, { ...options, filename });
          break;
      }

      // Add small delay between exports to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Multi-format export failed:', error);
    throw error;
  }
}

/**
 * Create a complete HTML document with embedded styles
 */
function createHTMLDocument(element: HTMLElement): string {
  // Get all stylesheets
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        // Cross-origin stylesheets cannot be accessed
        return '';
      }
    })
    .join('\n');

  // Get computed styles for the element and its children
  const computedStyles = getComputedStylesForElement(element);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ad Creative</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .ad-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    ${styles}
    ${computedStyles}
  </style>
</head>
<body>
  <div class="ad-container">
    ${element.outerHTML}
  </div>
</body>
</html>`;
}

/**
 * Extract computed styles from an element and its children
 */
function getComputedStylesForElement(element: HTMLElement): string {
  const styles: string[] = [];

  // Function to recursively get styles
  function processElement(el: Element, depth = 0): void {
    if (depth > 10) return; // Prevent infinite recursion

    const computed = window.getComputedStyle(el);
    const selector = getElementSelector(el);

    if (selector) {
      const cssText = Array.from(computed)
        .map((prop) => `${prop}: ${computed.getPropertyValue(prop)};`)
        .join('\n    ');

      if (cssText) {
        styles.push(`${selector} {\n    ${cssText}\n  }`);
      }
    }

    // Process children
    for (const child of el.children) {
      processElement(child, depth + 1);
    }
  }

  processElement(element);
  return styles.join('\n');
}

/**
 * Generate a CSS selector for an element
 */
function getElementSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const classes = element.className;
  if (classes && typeof classes === 'string') {
    return `.${classes.split(' ').join('.')}`;
  }

  return element.tagName.toLowerCase();
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get canvas from element for advanced processing.
 * Resolves http(s) image URLs to data URIs before capture (STORY-143).
 */
export async function getCanvasFromElement(
  elementId: string,
  options: ExportOptions = {},
): Promise<HTMLCanvasElement> {
  const { scale = 2 } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  document.body.appendChild(clone);
  try {
    await resolveImagesInElement(clone);
    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });
    return canvas;
  } finally {
    clone.remove();
  }
}
