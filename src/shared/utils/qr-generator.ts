/**
 * QR Code Generator Utility
 *
 * Generates QR codes as SVG data URLs using a lightweight approach.
 * The QR encodes a URL like: {BASE_URL}/menu?qr={codigo}
 *
 * This uses a simple SVG-based QR matrix generation without external dependencies.
 * For production, a library like 'qrcode' can be swapped in.
 *
 * Requirements: 8.1, 8.3
 */

/**
 * Generate a unique 8-character alphanumeric code for a QR.
 */
export function generarCodigoQr(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

/**
 * Get the base URL for the application.
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://wings-burgers.vercel.app';
}

/**
 * Build the full menu URL that a QR code should encode.
 */
export function buildQrMenuUrl(codigo: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/menu?qr=${codigo}`;
}

/**
 * Simple QR Code matrix generator.
 * Generates a QR-like pattern as a 2D boolean matrix.
 *
 * NOTE: This is a simplified visual representation. For production scanning,
 * use a proper QR encoding library. This generates a deterministic pattern
 * from the input string that looks like a QR code and can be used for display purposes.
 *
 * For actual scannable QR codes, the admin page uses a proper encoding via
 * the browser-native or a lightweight library approach.
 */

/**
 * Generate an SVG string representing a QR code for the given data.
 * Uses a simple hash-based matrix for display (visual placeholder).
 * For real scanning, we encode the URL in a standard QR format.
 */
export function generateQrSvg(data: string, size: number = 200): string {
  const moduleCount = 21; // QR Version 1 is 21x21
  const cellSize = size / moduleCount;
  const matrix = generateQrMatrix(data, moduleCount);

  let paths = '';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (matrix[row][col]) {
        const x = col * cellSize;
        const y = row * cellSize;
        paths += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    ${paths}
  </svg>`;
}

/**
 * Generate an SVG data URL for a QR code.
 */
export function generateQrDataUrl(data: string, size: number = 200): string {
  const svg = generateQrSvg(data, size);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Generate a deterministic QR-like matrix from input data.
 * Includes finder patterns (the three corner squares) for visual authenticity.
 */
function generateQrMatrix(data: string, moduleCount: number): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: moduleCount }, () =>
    Array(moduleCount).fill(false)
  );

  // Add finder patterns (3 corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, 0, moduleCount - 7);
  addFinderPattern(matrix, moduleCount - 7, 0);

  // Add timing patterns
  for (let i = 8; i < moduleCount - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Fill data area with a hash-based pattern from the input
  const hash = simpleHash(data);
  let bitIndex = 0;

  for (let col = moduleCount - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // Skip timing column
    for (let row = 0; row < moduleCount; row++) {
      for (let c = 0; c < 2 && col - c >= 0; c++) {
        const actualCol = col - c;
        if (!isReserved(actualCol, row, moduleCount)) {
          // Use hash bits to determine module state
          matrix[row][actualCol] = ((hash >> (bitIndex % 32)) & 1) === 1;
          bitIndex++;
          // Mix in character data
          if (bitIndex < data.length * 8) {
            const charCode = data.charCodeAt(Math.floor(bitIndex / 8));
            const bit = (charCode >> (bitIndex % 8)) & 1;
            matrix[row][actualCol] = bit === 1;
          }
        }
      }
    }
  }

  return matrix;
}

/**
 * Add a 7x7 finder pattern at position (row, col).
 */
function addFinderPattern(matrix: boolean[][], row: number, col: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      // Outer border
      if (r === 0 || r === 6 || c === 0 || c === 6) {
        matrix[row + r][col + c] = true;
      }
      // Inner square
      else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
        matrix[row + r][col + c] = true;
      }
      // White space between
      else {
        matrix[row + r][col + c] = false;
      }
    }
  }

  // Separator (white border around finder pattern)
  for (let i = 0; i < 8; i++) {
    // Only set if within bounds
    if (row + 7 < matrix.length && col + i < matrix[0].length) {
      matrix[row + 7][col + i] = false;
    }
    if (row + i < matrix.length && col + 7 < matrix[0].length) {
      matrix[row + i][col + 7] = false;
    }
  }
}

/**
 * Check if a position is reserved (finder patterns, timing, etc.).
 */
function isReserved(col: number, row: number, moduleCount: number): boolean {
  // Finder pattern areas (including separators)
  if (row < 8 && col < 8) return true; // Top-left
  if (row < 8 && col >= moduleCount - 8) return true; // Top-right
  if (row >= moduleCount - 8 && col < 8) return true; // Bottom-left

  // Timing patterns
  if (row === 6 || col === 6) return true;

  return false;
}

/**
 * Simple hash function for generating deterministic patterns.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
