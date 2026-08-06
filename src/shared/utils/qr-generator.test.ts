import { describe, it, expect } from 'vitest';
import { generarCodigoQr, buildQrMenuUrl, generateQrSvg, generateQrDataUrl } from './qr-generator';

describe('qr-generator', () => {
  describe('generarCodigoQr', () => {
    it('genera un código de 8 caracteres', () => {
      const codigo = generarCodigoQr();
      expect(codigo).toHaveLength(8);
    });

    it('genera códigos alfanuméricos', () => {
      const codigo = generarCodigoQr();
      expect(codigo).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    it('genera códigos únicos (Req 8.3)', () => {
      const codigos = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codigos.add(generarCodigoQr());
      }
      // With 62^8 possibilities, 100 codes should all be unique
      expect(codigos.size).toBe(100);
    });
  });

  describe('buildQrMenuUrl', () => {
    it('construye URL con parámetro qr', () => {
      const url = buildQrMenuUrl('ABC12345');
      expect(url).toContain('/menu?qr=ABC12345');
    });

    it('incluye el código completo en la URL', () => {
      const codigo = 'TestCode';
      const url = buildQrMenuUrl(codigo);
      expect(url).toContain(`qr=${codigo}`);
    });
  });

  describe('generateQrSvg', () => {
    it('genera un SVG válido', () => {
      const svg = generateQrSvg('https://example.com/menu?qr=ABC123');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('usa el tamaño especificado', () => {
      const svg = generateQrSvg('test', 300);
      expect(svg).toContain('width="300"');
      expect(svg).toContain('height="300"');
    });
  });

  describe('generateQrDataUrl', () => {
    it('genera una data URL con el prefijo correcto', () => {
      const dataUrl = generateQrDataUrl('test-data');
      expect(dataUrl).toMatch(/^data:image\/svg\+xml,/);
    });
  });
});
