/**
 * ImageSwift Web — Main Application Controller
 * Coordina eventos de usuario, colas de procesamiento, empaquetado ZIP y persistencia.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Instanciar controladores
  const converter = new ImageConverter();
  const ui = new UIManager();

  // Estado de la aplicación
  let queue = [];
  let isConverting = false;
  let cancelRequested = false;
  let nextItemId = 1;

  // Elementos del DOM
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  const btnPasteClipboard = document.getElementById('btnPasteClipboard');

  const targetFormatSelect = document.getElementById('targetFormat');
  const qualityControlGroup = document.getElementById('qualityControlGroup');
  const qualityRange = document.getElementById('qualityRange');
  const qualityValue = document.getElementById('qualityValue');

  const resizeModeSelect = document.getElementById('resizeMode');
  const customResizeInputs = document.getElementById('customResizeInputs');
  const customWidthInput = document.getElementById('customWidth');
  const customHeightInput = document.getElementById('customHeight');
  const keepAspectCheck = document.getElementById('keepAspect');

  const transparencyGroup = document.getElementById('transparencyGroup');
  const transparentOption = document.getElementById('transparentOption');

  const btnConvertAll = document.getElementById('btnConvertAll');
  const btnDownloadZip = document.getElementById('btnDownloadZip');
  const btnCancel = document.getElementById('btnCancel');
  const btnClearList = document.getElementById('btnClearList');
  const btnToggleLog = document.getElementById('btnToggleLog');
  const btnExportLog = document.getElementById('btnExportLog');
  const btnClearLog = document.getElementById('btnClearLog');

  const themeToggle = document.getElementById('themeToggle');
  const btnInfo = document.getElementById('btnInfo');
  const infoModal = document.getElementById('infoModal');
  const btnCloseModal = document.getElementById('btnCloseModal');

  const previewModal = document.getElementById('previewModal');
  const btnClosePreview = document.getElementById('btnClosePreview');
  const previewTitle = document.getElementById('previewTitle');
  const modalImgOriginal = document.getElementById('modalImgOriginal');
  const modalImgConverted = document.getElementById('modalImgConverted');
  const modalInfoOriginal = document.getElementById('modalInfoOriginal');
  const modalInfoConverted = document.getElementById('modalInfoConverted');

  // ==========================================
  // 1. Manejo de Tema (Dark / Light)
  // ==========================================
  const savedTheme = localStorage.getItem('imageswift_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('imageswift_theme', newTheme);
  });

  // ==========================================
  // 2. Modales de Información y Ayuda
  // ==========================================
  btnInfo.addEventListener('click', () => infoModal.style.display = 'flex');
  btnCloseModal.addEventListener('click', () => infoModal.style.display = 'none');
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) infoModal.style.display = 'none';
  });

  btnClosePreview.addEventListener('click', () => previewModal.style.display = 'none');
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) previewModal.style.display = 'none';
  });

  // ==========================================
  // 3. Ajuste Dinámico de Opciones según Formato
  // ==========================================
  qualityRange.addEventListener('input', (e) => {
    qualityValue.textContent = `${e.target.value}%`;
  });

  targetFormatSelect.addEventListener('change', (e) => {
    const format = e.target.value;
    
    // Ocultar control de calidad si es PNG o BMP sin pérdidas
    if (format === 'png' || format === 'bmp' || format === 'ico') {
      qualityControlGroup.style.opacity = '0.4';
      qualityControlGroup.style.pointerEvents = 'none';
    } else {
      qualityControlGroup.style.opacity = '1';
      qualityControlGroup.style.pointerEvents = 'auto';
    }

    // Manejo de opción transparente según el formato
    if (format === 'jpg' || format === 'jpeg' || format === 'bmp' || format === 'pdf') {
      transparentOption.style.display = 'none';
      const checkedBg = document.querySelector('input[name="bgFill"]:checked');
      if (checkedBg && checkedBg.value === 'transparent') {
        document.querySelector('input[name="bgFill"][value="#ffffff"]').checked = true;
      }
    } else {
      transparentOption.style.display = 'flex';
    }
  });

  resizeModeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customResizeInputs.style.display = 'flex';
    } else {
      customResizeInputs.style.display = 'none';
    }
  });

  // ==========================================
  // 4. Carga de Archivos (Drag & Drop, Explorador Moderno, Portapapeles)
  // ==========================================
  
  // Drag & Drop con soporte recursivo para carpetas sin pop-ups del navegador
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', async (e) => {
    const items = e.dataTransfer.items;
    const files = [];

    if (items && items.length > 0) {
      const entries = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) entries.push(entry);
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (entries.length > 0) {
        for (const entry of entries) {
          await scanFilesFromEntry(entry, files);
        }
      }
    } else if (e.dataTransfer.files) {
      files.push(...Array.from(e.dataTransfer.files));
    }

    if (files.length > 0) {
      handleFilesSelected(files);
    }
  });

  /**
   * Recorre carpetas arrastradas de forma recursiva sin disparar advertencias del navegador
   */
  async function scanFilesFromEntry(entry, fileList) {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
          fileList.push(file);
          resolve();
        }, () => resolve());
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      return new Promise((resolve) => {
        const readEntries = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve();
            } else {
              for (const childEntry of entries) {
                await scanFilesFromEntry(childEntry, fileList);
              }
              readEntries(); // Seguir leyendo en lotes
            }
          }, () => resolve());
        };
        readEntries();
      });
    }
  }

  // Selector de Imágenes individuales
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
      fileInput.value = '';
    }
  });

  // Selector de Carpeta usando la API moderna File System Access (sin pop-up feo de subida)
  const btnSelectFolder = document.querySelector('label[for="folderInput"]');
  if (btnSelectFolder) {
    btnSelectFolder.addEventListener('click', async (e) => {
      // Si el navegador soporta showDirectoryPicker (Chrome, Edge, Opera)
      if ('showDirectoryPicker' in window) {
        e.preventDefault();
        try {
          const dirHandle = await window.showDirectoryPicker({
            mode: 'read'
          });
          const collectedFiles = [];
          await scanDirectoryHandle(dirHandle, collectedFiles);
          if (collectedFiles.length > 0) {
            handleFilesSelected(collectedFiles);
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.warn('Error accediendo a la carpeta:', err);
          }
        }
      }
    });
  }

  /**
   * Recorre directorios seleccionados con la moderna API showDirectoryPicker
   */
  async function scanDirectoryHandle(dirHandle, fileList) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        fileList.push(file);
      } else if (entry.kind === 'directory') {
        await scanDirectoryHandle(entry, fileList);
      }
    }
  }

  folderInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
      folderInput.value = '';
    }
  });

  // Pegar desde el portapapeles
  btnPasteClipboard.addEventListener('click', async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files = [];
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const ext = type.split('/')[1] || 'png';
            const file = new File([blob], `portapapeles_${Date.now()}.${ext}`, { type });
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        handleFilesSelected(files);
        ui.addLog(`${files.length} imagen(es) pegadas desde el portapapeles.`, 'info');
      } else {
        alert('No se detectó ninguna imagen en el portapapeles.');
      }
    } catch (err) {
      ui.addLog(`Error al acceder al portapapeles: ${err.message}`, 'error');
    }
  });

  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          files.push(new File([blob], `captura_${Date.now()}.png`, { type: blob.type }));
        }
      }
    }
    if (files.length > 0) {
      handleFilesSelected(files);
      ui.addLog(`${files.length} imagen(es) capturadas del portapapeles (Ctrl+V).`, 'info');
    }
  });

  /**
   * Procesa la lista de archivos agregados
   */
  async function handleFilesSelected(fileList) {
    let addedCount = 0;
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'hif', 'bmp', 'gif', 'tiff', 'tif', 'svg', 'ico', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'psd'];

    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop().toLowerCase();
      const isImage = file.type.startsWith('image/') || validExtensions.includes(ext);

      if (isImage) {
        const id = nextItemId++;
        
        // Generar URL visible para el navegador (incluyendo RAW y HEIC)
        const previewUrl = await converter.generatePreview(file);
        
        const item = {
          id,
          file,
          previewUrl,
          status: 'pending',
          convertedData: null,
          errorMessage: null
        };

        queue.push(item);
        ui.createItemCard(item, downloadSingleItem, deleteSingleItem, showPreviewModal);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      ui.updateQueueStats(queue);
      ui.addLog(`Agregadas ${addedCount} imagen(es) a la cola.`, 'info');
      ui.showToast(`Se agregaron ${addedCount} imagen(es) a la cola`, 'success');
      btnConvertAll.disabled = false;
      btnClearList.disabled = false;
    }
  }

  // ==========================================
  // 5. Eliminación y Limpieza de la Cola
  // ==========================================
  function deleteSingleItem(itemId) {
    const index = queue.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const item = queue[index];
      URL.revokeObjectURL(item.previewUrl);
      if (item.convertedData?.url) {
        URL.revokeObjectURL(item.convertedData.url);
      }
      queue.splice(index, 1);
      
      const card = document.getElementById(`card-${itemId}`);
      if (card) card.remove();

      ui.updateQueueStats(queue);
      if (queue.length === 0) {
        btnConvertAll.disabled = true;
        btnClearList.disabled = true;
        btnDownloadZip.style.display = 'none';
      }
    }
  }

  btnClearList.addEventListener('click', () => {
    queue.forEach(item => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.convertedData?.url) URL.revokeObjectURL(item.convertedData.url);
    });
    queue = [];
    ui.updateQueueStats(queue);
    ui.hideProgress();
    btnConvertAll.disabled = true;
    btnClearList.disabled = true;
    btnDownloadZip.style.display = 'none';
    ui.addLog('Lista de imágenes vaciada.', 'info');
  });

  // ==========================================
  // 6. Motor de Conversión por Lotes
  // ==========================================
  btnConvertAll.addEventListener('click', async () => {
    if (isConverting || queue.length === 0) return;

    isConverting = true;
    cancelRequested = false;

    btnConvertAll.style.display = 'none';
    btnCancel.style.display = 'inline-flex';
    btnDownloadZip.style.display = 'none';
    btnClearList.disabled = true;

    const options = {
      targetFormat: targetFormatSelect.value,
      quality: parseInt(qualityRange.value, 10) / 100,
      resizeMode: resizeModeSelect.value,
      customWidth: customWidthInput.value,
      customHeight: customHeightInput.value,
      keepAspect: keepAspectCheck.checked,
      bgFill: document.querySelector('input[name="bgFill"]:checked')?.value || '#ffffff'
    };

    ui.addLog(`Iniciando conversión de ${queue.length} archivo(s) a formato .${options.targetFormat.toUpperCase()}...`, 'info');

    let processedCount = 0;
    let savedBytesTotal = 0;
    let errorCount = 0;

    for (let i = 0; i < queue.length; i++) {
      if (cancelRequested) {
        ui.addLog('Conversión cancelada por el usuario.', 'warn');
        break;
      }

      const item = queue[i];
      item.status = 'converting';
      ui.updateItemStatus(item);
      ui.updateProgress(processedCount, queue.length, savedBytesTotal);

      try {
        const result = await converter.processImage(item.file, options);
        item.status = 'success';
        item.convertedData = result;

        const diff = item.file.size - result.size;
        if (diff > 0) savedBytesTotal += diff;

        ui.addLog(`✓ Convertido: ${item.file.name} -> .${result.format.toUpperCase()} (${ui.formatBytes(result.size)})`, 'success');
      } catch (err) {
        item.status = 'error';
        item.errorMessage = err.message;
        errorCount++;
        ui.addLog(`✗ Error en ${item.file.name}: ${err.message}`, 'error');
      }

      processedCount++;
      ui.updateItemStatus(item);
      ui.updateProgress(processedCount, queue.length, savedBytesTotal);
    }

    isConverting = false;
    btnCancel.style.display = 'none';
    btnConvertAll.style.display = 'inline-flex';
    btnClearList.disabled = false;

    const successCount = queue.filter(item => item.status === 'success').length;
    if (successCount > 0) {
      btnDownloadZip.style.display = 'inline-flex';
      btnDownloadZip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    ui.updateQueueStats(queue);
    ui.addLog(`Proceso finalizado: ${successCount} exitosas, ${errorCount} errores.`, successCount > 0 ? 'success' : 'warn');
  });

  btnCancel.addEventListener('click', () => {
    cancelRequested = true;
    ui.addLog('Cancelando proceso...', 'warn');
  });

  // ==========================================
  // 7. Descarga Individual y por Lote (.ZIP)
  // ==========================================
  function downloadSingleItem(item) {
    if (!item.convertedData) return;

    const originalNameWithoutExt = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
    const newFilename = `${originalNameWithoutExt}.${item.convertedData.format}`;

    const link = document.createElement('a');
    link.href = item.convertedData.url;
    link.download = newFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  btnDownloadZip.addEventListener('click', async () => {
    const successItems = queue.filter(item => item.status === 'success' && item.convertedData);
    if (successItems.length === 0) return;

    ui.addLog(`Empaquetando ${successItems.length} imágenes en archivo .ZIP...`, 'info');
    btnDownloadZip.disabled = true;
    btnDownloadZip.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Comprimiendo ZIP...`;

    try {
      const zip = new JSZip();
      
      for (const item of successItems) {
        const originalName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
        const filename = `${originalName}.${item.convertedData.format}`;
        zip.file(filename, item.convertedData.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `ImageSwift_Lote_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(zipUrl);
      ui.addLog('✓ Archivo ZIP descargado exitosamente.', 'success');
    } catch (err) {
      ui.addLog(`Error al generar ZIP: ${err.message}`, 'error');
    } finally {
      btnDownloadZip.disabled = false;
      btnDownloadZip.innerHTML = `<i data-lucide="download-cloud"></i> <span>Descargar Lote (.ZIP)</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // ==========================================
  // 8. Modal de Vista Previa (Antes / Después)
  // ==========================================
  function showPreviewModal(item) {
    previewTitle.textContent = `Detalles: ${item.file.name}`;
    modalImgOriginal.src = item.previewUrl;
    modalInfoOriginal.innerHTML = `
      <div><strong>Formato:</strong> ${item.file.name.split('.').pop().toUpperCase()}</div>
      <div><strong>Tamaño:</strong> ${ui.formatBytes(item.file.size)}</div>
    `;

    if (item.convertedData) {
      modalImgConverted.src = item.convertedData.url;
      modalInfoConverted.innerHTML = `
        <div><strong>Formato:</strong> ${item.convertedData.format.toUpperCase()}</div>
        <div><strong>Tamaño:</strong> ${ui.formatBytes(item.convertedData.size)}</div>
        <div><strong>Dimensiones:</strong> ${item.convertedData.width} × ${item.convertedData.height} px</div>
      `;
    } else {
      modalImgConverted.src = item.previewUrl;
      modalInfoConverted.innerHTML = `<div><em>Aún no convertida (Pendiente)</em></div>`;
    }

    previewModal.style.display = 'flex';
  }

  // ==========================================
  // 9. Vistas de Cuadrícula / Lista y Log
  // ==========================================
  document.getElementById('viewGridBtn').addEventListener('click', () => ui.setGridView(true));
  document.getElementById('viewListBtn').addEventListener('click', () => ui.setGridView(false));

  btnToggleLog.addEventListener('click', () => {
    const isHidden = ui.logSection.style.display === 'none';
    ui.logSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden) ui.logSection.scrollIntoView({ behavior: 'smooth' });
  });

  btnClearLog.addEventListener('click', () => {
    ui.logConsole.innerHTML = '';
    ui.addLog('Registro limpiado.', 'info');
  });

  btnExportLog.addEventListener('click', () => {
    const logs = Array.from(ui.logConsole.children).map(el => el.innerText).join('\n');
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ImageSwift_log_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  });

});
