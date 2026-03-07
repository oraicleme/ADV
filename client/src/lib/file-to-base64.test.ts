import { describe, it, expect } from 'vitest';
import { fileToBase64DataUri } from './file-to-base64';

function makeFile(name: string, type: string, content = 'hello'): File {
  return new File([content], name, { type });
}

describe('fileToBase64DataUri', () => {
  it('converts a PNG file to a data URI', async () => {
    const file = makeFile('test.png', 'image/png');
    const result = await fileToBase64DataUri(file);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('converts an SVG file to a data URI', async () => {
    const file = makeFile('test.svg', 'image/svg+xml', '<svg></svg>');
    const result = await fileToBase64DataUri(file);
    expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('converts a JPEG file to a data URI', async () => {
    const file = makeFile('test.jpg', 'image/jpeg');
    const result = await fileToBase64DataUri(file);
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('produces a non-empty base64 payload', async () => {
    const file = makeFile('test.png', 'image/png', 'some content here');
    const result = await fileToBase64DataUri(file);
    const base64Part = result.split(',')[1];
    expect(base64Part.length).toBeGreaterThan(0);
  });
});
