/**
 * ImageSwift Web — Core Conversion Engine (Universal & Next-Gen Support)
 * Soporta AVIF, WebP, HEIC/HEIF, RAW (CR2, NEF, ARW, DNG), TIFF, PNG, JPG, ICO, BMP, PDF, SVG.
 */

class ImageConverter {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  }

  /**
   * Procesa y convierte un archivo de imagen según las opciones dadas.
   * @param {File} file - Archivo de imagen original
   * @param {Object} options - Configuración de conversión
   * @returns {Promise<{blob: Blob, url: string, width: number, height: number, size: number, format: string}>}
   */
  async processImage(file, options = {}) {
    const {
      targetFormat = 'webp',
      quality = 0.9,
      resizeMode = 'original',
      customWidth = null,
      customHeight = null,
      keepAspect = true,
      bgFill = '#ffffff'
    } = options;

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let sourceCanvas = null;

      // 1. Decodificación según tipo de archivo
      if (ext === 'heic' || ext === 'heif' || ext === 'hif') {
        sourceCanvas = await this.decodeHeic(file);
      } else if (['cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'tiff', 'tif'].includes(ext)) {
        sourceCanvas = await this.decodeRawOrTiff(file);
      } else {
        sourceCanvas = await this.decodeStandardImage(file);
      }

      // 2. Calcular dimensiones resultantes
      const origWidth = sourceCanvas.width;
      const origHeight = sourceCanvas.height;
      let targetW = origWidth;
      let targetH = origHeight;

      if (resizeMode === '0.75') {
        targetW = Math.round(origWidth * 0.75);
        targetH = Math.round(origHeight * 0.75);
      } else if (resizeMode === '0.50') {
        targetW = Math.round(origWidth * 0.50);
        targetH = Math.round(origHeight * 0.50);
      } else if (resizeMode === '0.25') {
        targetW = Math.round(origWidth * 0.25);
        targetH = Math.round(origHeight * 0.25);
      } else if (resizeMode === 'custom' && (customWidth || customHeight)) {
        if (customWidth && customHeight && !keepAspect) {
          targetW = parseInt(customWidth, 10);
          targetH = parseInt(customHeight, 10);
        } else if (customWidth && (!customHeight || keepAspect)) {
          targetW = parseInt(customWidth, 10);
          targetH = Math.round((targetW / origWidth) * origHeight);
        } else if (customHeight && (!customWidth || keepAspect)) {
          targetH = parseInt(customHeight, 10);
          targetW = Math.round((targetH / origHeight) * origWidth);
        }
      }

      // 3. Renderizar en el canvas final
      this.canvas.width = Math.max(targetW, 1);
      this.canvas.height = Math.max(targetH, 1);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Si el formato de salida no soporta canal alfa o el usuario eligió un color de fondo
      const formatHasNoAlpha = ['jpg', 'jpeg', 'bmp', 'pdf'].includes(targetFormat.toLowerCase());
      const needsBackground = formatHasNoAlpha || (bgFill !== 'transparent');
      
      if (needsBackground) {
        this.ctx.fillStyle = (bgFill === 'transparent') ? '#ffffff' : bgFill;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(sourceCanvas, 0, 0, this.canvas.width, this.canvas.height);

      // 4. Codificación y Exportación según el formato seleccionado
      return await this.encodeOutput(targetFormat.toLowerCase(), quality, file.name);

    } catch (err) {
      console.error(`Error procesando ${file.name}:`, err);
      throw err;
    }
  }

  /**
   * Genera una URL de vista previa visible para el navegador.
   * Para archivos RAW (.CR2, .NEF, .ARW, .DNG) y HEIC que el navegador no puede mostrar en un <img> nativo,
   * extrae la miniatura incrustada o renderiza un canvas.
   */
  async generatePreview(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    // Formatos nativos del navegador
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico'].includes(ext)) {
      return URL.createObjectURL(file);
    }

    // Para archivos RAW de cámaras, extraer preview JPEG incrustado o decodificar con UTIF
    if (['cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'tiff', 'tif'].includes(ext)) {
      try {
        // Intento 1: Extraer JPEG incrustado en el archivo RAW (ultrarrápido)
        const embeddedJpeg = await this.extractEmbeddedJpeg(file);
        if (embeddedJpeg) {
          return URL.createObjectURL(embeddedJpeg);
        }

        // Intento 2: Decodificar con UTIF
        const rawCanvas = await this.decodeRawOrTiff(file);
        const previewBlob = await this.canvasToBlob(rawCanvas, 'image/jpeg', 0.85);
        return URL.createObjectURL(previewBlob);
      } catch (err) {
        console.warn('No se pudo generar miniatura RAW previa:', err);
        return URL.createObjectURL(file);
      }
    }

    // Para archivos HEIC / HEIF de iPhone
    if (['heic', 'heif', 'hif'].includes(ext)) {
      try {
        const heicCanvas = await this.decodeHeic(file);
        const previewBlob = await this.canvasToBlob(heicCanvas, 'image/jpeg', 0.85);
        return URL.createObjectURL(previewBlob);
      } catch (err) {
        console.warn('No se pudo generar miniatura HEIC:', err);
        return URL.createObjectURL(file);
      }
    }

    return URL.createObjectURL(file);
  }

  /**
   * Extrae el preview JPEG incrustado que todas las cámaras DSLR/Mirrorless guardan en el archivo RAW
   */
  async extractEmbeddedJpeg(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Buscar marcadores JPEG SOI (0xFF, 0xD8) y EOI (0xFF, 0xD9)
    let startIdx = -1;
    for (let i = 0; i < Math.min(bytes.length - 1, 2000000); i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8) {
        // Verificar que sea cabecera JFIF o Exif
        if (bytes[i + 2] === 0xFF) {
          startIdx = i;
          break;
        }
      }
    }

    if (startIdx !== -1) {
      for (let j = startIdx + 1000; j < bytes.length - 1; j++) {
        if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
          const jpegSlice = bytes.slice(startIdx, j + 2);
          if (jpegSlice.length > 5000) {
            return new Blob([jpegSlice], { type: 'image/jpeg' });
          }
        }
      }
    }

    return null;
  }

  /**
   * Decodifica imágenes estándar (JPG, PNG, WebP, AVIF, GIF, SVG, BMP)
   */
  decodeStandardImage(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileOrBlob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth || img.width;
        tempCanvas.height = img.naturalHeight || img.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(tempCanvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('El navegador no pudo abrir este formato de imagen de forma directa.'));
      };
      img.src = url;
    });
  }

  /**
   * Decodifica fotos HEIC / HEIF de iPhone usando heic2any
   */
  async decodeHeic(file) {
    if (typeof heic2any === 'undefined') {
      throw new Error('Módulo de soporte HEIC/HEIF no cargado.');
    }
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/png',
      quality: 1.0
    });
    const blobToLoad = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    return await this.decodeStandardImage(blobToLoad);
  }

  /**
   * Decodifica fotos RAW de cámaras (CR2, NEF, ARW, DNG) y archivos TIFF usando UTIF.js
   */
  async decodeRawOrTiff(file) {
    if (typeof UTIF === 'undefined') {
      // Fallback a decodificación estándar
      return await this.decodeStandardImage(file);
    }

    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    
    if (!ifds || ifds.length === 0) {
      // Intentar decodificación estándar
      return await this.decodeStandardImage(file);
    }

    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    const width = ifds[0].width;
    const height = ifds[0].height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(rgba);
    ctx.putImageData(imgData, 0, 0);

    return tempCanvas;
  }

  /**
   * Codifica el canvas actual al formato de salida solicitado
   */
  async encodeOutput(format, quality, originalFilename) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    switch (format) {
      case 'webp': {
        const blob = await this.canvasToBlob(this.canvas, 'image/webp', quality);
        return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'webp' };
      }

      case 'avif': {
        try {
          const blob = await this.canvasToBlob(this.canvas, 'image/avif', quality);
          // Verificar si el navegador soportó AVIF o devolvió fallback PNG
          if (blob.type === 'image/avif') {
            return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'avif' };
          }
        } catch (e) {
          // Fallback a WebP si el navegador aún no soporta encoder nativo AVIF
        }
        const fallbackBlob = await this.canvasToBlob(this.canvas, 'image/webp', quality);
        return { blob: fallbackBlob, url: URL.createObjectURL(fallbackBlob), width, height, size: fallbackBlob.size, format: 'webp' };
      }

      case 'jpg':
      case 'jpeg': {
        const blob = await this.canvasToBlob(this.canvas, 'image/jpeg', quality);
        return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'jpg' };
      }

      case 'png': {
        const blob = await this.canvasToBlob(this.canvas, 'image/png', 1.0);
        return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'png' };
      }

      case 'ico': {
        return await this.exportAsIco(this.canvas);
      }

      case 'bmp': {
        return await this.exportAsBmp(this.canvas);
      }

      case 'tiff':
      case 'tif': {
        return await this.exportAsTiff(this.canvas);
      }

      case 'pdf': {
        return await this.exportAsPdf(this.canvas, originalFilename, width, height);
      }

      case 'gif': {
        const blob = await this.canvasToBlob(this.canvas, 'image/png', 1.0);
        return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'gif' };
      }

      default: {
        const blob = await this.canvasToBlob(this.canvas, 'image/png', 1.0);
        return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'png' };
      }
    }
  }

  /**
   * Helper Promise para toBlob
   */
  canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          try {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mimeType }));
          } catch (e) {
            reject(new Error(`Fallo al codificar a ${mimeType}: ${e.message}`));
          }
        }
      }, mimeType, quality);
    });
  }

  /**
   * Exporta a formato TIFF usando UTIF
   */
  async exportAsTiff(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    
    if (typeof UTIF !== 'undefined' && UTIF.encodeImage) {
      const tiffBuffer = UTIF.encodeImage(imgData.data, width, height);
      const blob = new Blob([tiffBuffer], { type: 'image/tiff' });
      return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'tiff' };
    } else {
      const blob = await this.canvasToBlob(canvas, 'image/png', 1.0);
      return { blob, url: URL.createObjectURL(blob), width, height, size: blob.size, format: 'tiff' };
    }
  }

  /**
   * Exporta a formato ICO (Íconos de 16x16 a 256x256)
   */
  async exportAsIco(canvas) {
    const size = Math.min(Math.max(canvas.width, 32), 256);
    const icoCanvas = document.createElement('canvas');
    icoCanvas.width = size;
    icoCanvas.height = size;
    const ctx = icoCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, size, size);

    const pngBlob = await this.canvasToBlob(icoCanvas, 'image/png', 1.0);
    const arrayBuffer = await pngBlob.arrayBuffer();
    const pngData = new Uint8Array(arrayBuffer);

    const header = new Uint8Array([
      0, 0,
      1, 0,
      1, 0,
      size >= 256 ? 0 : size,
      size >= 256 ? 0 : size,
      0,
      0,
      1, 0,
      32, 0,
      pngData.length & 0xFF, (pngData.length >> 8) & 0xFF, (pngData.length >> 16) & 0xFF, (pngData.length >> 24) & 0xFF,
      22, 0, 0, 0
    ]);

    const icoBlob = new Blob([header, pngData], { type: 'image/x-icon' });
    return {
      blob: icoBlob,
      url: URL.createObjectURL(icoBlob),
      width: size,
      height: size,
      size: icoBlob.size,
      format: 'ico'
    };
  }

  /**
   * Exporta a formato BMP estándar
   */
  async exportAsBmp(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // Cabecera BMP
    view.setUint16(0, 0x4D42, false); // "BM"
    view.setUint32(2, fileSize, true);
    view.setUint32(6, 0, true);
    view.setUint32(10, 54, true);

    // DIB Header
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(30, 0, true);
    view.setUint32(34, pixelArraySize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    let offset = 54;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        view.setUint8(offset++, data[i + 2]); // B
        view.setUint8(offset++, data[i + 1]); // G
        view.setUint8(offset++, data[i]);     // R
      }
      const padding = rowSize - (width * 3);
      for (let p = 0; p < padding; p++) {
        view.setUint8(offset++, 0);
      }
    }

    const bmpBlob = new Blob([buffer], { type: 'image/bmp' });
    return {
      blob: bmpBlob,
      url: URL.createObjectURL(bmpBlob),
      width,
      height,
      size: bmpBlob.size,
      format: 'bmp'
    };
  }

  /**
   * Exporta a documento PDF
   */
  async exportAsPdf(canvas, filename, width, height) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      throw new Error('Librería jsPDF no disponible.');
    }
    const { jsPDF } = window.jspdf || window;
    
    const orientation = width > height ? 'l' : 'p';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [width, height]
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);

    const pdfBlob = pdf.output('blob');
    return {
      blob: pdfBlob,
      url: URL.createObjectURL(pdfBlob),
      width,
      height,
      size: pdfBlob.size,
      format: 'pdf'
    };
  }
}

window.ImageConverter = ImageConverter;
