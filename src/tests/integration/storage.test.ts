import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStorageAdapter } from '@/adapters/driven/storage/SupabaseStorageAdapter';
import { ArchivoInvalidoError } from '@/shared/errors/ArchivoInvalidoError';
import { ServicioExternoError } from '@/shared/errors/ServicioExternoError';

/**
 * Helper para crear un mock de File con propiedades específicas
 */
function crearMockFile(opciones: {
  nombre: string;
  tipo: string;
  tamanoBytes: number;
}): File {
  const buffer = new ArrayBuffer(opciones.tamanoBytes);
  return new File([buffer], opciones.nombre, { type: opciones.tipo });
}

describe('SupabaseStorageAdapter - Integration Tests', () => {
  let adapter: SupabaseStorageAdapter;
  let mockUpload: ReturnType<typeof vi.fn>;
  let mockRemove: ReturnType<typeof vi.fn>;
  let mockGetPublicUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUpload = vi.fn().mockResolvedValue({ error: null });
    mockRemove = vi.fn().mockResolvedValue({ error: null });
    mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/public/productos/imagen.jpg' },
    });

    const mockStorage = {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: mockGetPublicUrl,
      }),
    };

    const mockSupabase = {
      storage: mockStorage,
    } as any;

    adapter = new SupabaseStorageAdapter(mockSupabase);
  });

  describe('validación de archivos - rechazo de formatos inválidos', () => {
    it('debe rechazar archivo con formato no permitido para imágenes de productos', async () => {
      const archivoInvalido = crearMockFile({
        nombre: 'documento.gif',
        tipo: 'image/gif',
        tamanoBytes: 1024,
      });

      await expect(
        adapter.subirImagen(archivoInvalido, 'productos/imagen-1.gif')
      ).rejects.toThrow(ArchivoInvalidoError);
    });

    it('debe rechazar archivo con tipo application/pdf en ruta de productos', async () => {
      const archivoPdf = crearMockFile({
        nombre: 'catalogo.pdf',
        tipo: 'application/pdf',
        tamanoBytes: 2048,
      });

      await expect(
        adapter.subirImagen(archivoPdf, 'productos/catalogo.pdf')
      ).rejects.toThrow(ArchivoInvalidoError);
    });

    it('debe aceptar PDF en ruta de comprobantes', async () => {
      const comprobantePdf = crearMockFile({
        nombre: 'comprobante.pdf',
        tipo: 'application/pdf',
        tamanoBytes: 2048,
      });

      await adapter.subirImagen(comprobantePdf, 'comprobantes/comp-123.pdf');

      expect(mockUpload).toHaveBeenCalled();
    });

    it('debe rechazar formato WebP en ruta de comprobantes', async () => {
      const archivoWebp = crearMockFile({
        nombre: 'comprobante.webp',
        tipo: 'image/webp',
        tamanoBytes: 1024,
      });

      await expect(
        adapter.subirImagen(archivoWebp, 'comprobantes/comp-123.webp')
      ).rejects.toThrow(ArchivoInvalidoError);
    });

    it('debe rechazar archivo que excede 5MB', async () => {
      const archivoGrande = crearMockFile({
        nombre: 'foto-grande.jpg',
        tipo: 'image/jpeg',
        tamanoBytes: 6 * 1024 * 1024, // 6MB
      });

      await expect(
        adapter.subirImagen(archivoGrande, 'productos/grande.jpg')
      ).rejects.toThrow(ArchivoInvalidoError);
    });

    it('debe aceptar archivo justo en el límite de 5MB', async () => {
      const archivoLimite = crearMockFile({
        nombre: 'foto-limite.jpg',
        tipo: 'image/jpeg',
        tamanoBytes: 5 * 1024 * 1024, // Exactamente 5MB
      });

      await adapter.subirImagen(archivoLimite, 'productos/limite.jpg');

      expect(mockUpload).toHaveBeenCalled();
    });
  });

  describe('subirImagen - formatos válidos', () => {
    it('debe aceptar imagen JPG para productos', async () => {
      const imagenJpg = crearMockFile({
        nombre: 'alitas.jpg',
        tipo: 'image/jpeg',
        tamanoBytes: 500_000,
      });

      const url = await adapter.subirImagen(imagenJpg, 'productos/alitas.jpg');

      expect(url).toContain('https://storage.supabase.co');
      expect(mockUpload).toHaveBeenCalledWith(
        'productos/alitas.jpg',
        imagenJpg,
        expect.objectContaining({
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        })
      );
    });

    it('debe aceptar imagen PNG para productos', async () => {
      const imagenPng = crearMockFile({
        nombre: 'hamburguesa.png',
        tipo: 'image/png',
        tamanoBytes: 800_000,
      });

      await adapter.subirImagen(imagenPng, 'productos/hamburguesa.png');
      expect(mockUpload).toHaveBeenCalled();
    });

    it('debe aceptar imagen WebP para productos', async () => {
      const imagenWebp = crearMockFile({
        nombre: 'bebida.webp',
        tipo: 'image/webp',
        tamanoBytes: 200_000,
      });

      await adapter.subirImagen(imagenWebp, 'productos/bebida.webp');
      expect(mockUpload).toHaveBeenCalled();
    });
  });

  describe('subirImagen - errores de storage', () => {
    it('debe lanzar ServicioExternoError cuando Supabase Storage falla', async () => {
      mockUpload.mockResolvedValueOnce({
        error: { message: 'Bucket not found' },
      });

      const imagen = crearMockFile({
        nombre: 'test.jpg',
        tipo: 'image/jpeg',
        tamanoBytes: 1024,
      });

      await expect(
        adapter.subirImagen(imagen, 'productos/test.jpg')
      ).rejects.toThrow(ServicioExternoError);
    });
  });

  describe('obtenerUrlPublica', () => {
    it('debe retornar la URL pública del archivo', () => {
      const url = adapter.obtenerUrlPublica('productos/alitas.jpg');

      expect(url).toBe('https://storage.supabase.co/public/productos/imagen.jpg');
    });
  });

  describe('eliminarImagen', () => {
    it('debe eliminar archivo correctamente', async () => {
      await adapter.eliminarImagen('productos/vieja.jpg');

      expect(mockRemove).toHaveBeenCalledWith(['productos/vieja.jpg']);
    });

    it('debe lanzar ServicioExternoError cuando la eliminación falla', async () => {
      mockRemove.mockResolvedValueOnce({
        error: { message: 'File not found' },
      });

      await expect(
        adapter.eliminarImagen('productos/inexistente.jpg')
      ).rejects.toThrow(ServicioExternoError);
    });
  });
});
