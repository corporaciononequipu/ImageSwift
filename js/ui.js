/**
 * ImageSwift Web — UI Component Controller
 * Gestiona el renderizado de la cola de imágenes, estadísticas, registros y modales.
 */

class UIManager {
  constructor() {
    this.imageGrid = document.getElementById('imageGrid');
    this.emptyState = document.getElementById('emptyState');
    this.totalCountBadge = document.getElementById('totalCountBadge');
    this.totalSizeBadge = document.getElementById('totalSizeBadge');
    this.queueStatusBadge = document.getElementById('queueStatusBadge');
    
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.progressPercent = document.getElementById('progressPercent');
    this.progressStatusText = document.getElementById('progressStatusText');
    this.progressCounter = document.getElementById('progressCounter');
    this.progressSavedSavings = document.getElementById('progressSavedSavings');

    this.logConsole = document.getElementById('logConsole');
    this.logSection = document.getElementById('logSection');

    this.isListView = false;
  }

  /**
   * Actualiza los contadores globales en la cabecera del panel
   */
  updateQueueStats(items) {
    const totalCount = items.length;
    const totalBytes = items.reduce((acc, item) => acc + item.file.size, 0);
    const pendingCount = items.filter(item => item.status === 'pending').length;
    const successCount = items.filter(item => item.status === 'success').length;

    this.totalCountBadge.textContent = `${totalCount} ${totalCount === 1 ? 'imagen' : 'imágenes'}`;
    this.totalSizeBadge.textContent = this.formatBytes(totalBytes);
    
    if (pendingCount > 0) {
      this.queueStatusBadge.textContent = `${pendingCount} pendientes`;
      this.queueStatusBadge.style.color = '';
    } else if (totalCount > 0 && pendingCount === 0) {
      this.queueStatusBadge.textContent = `✓ ${successCount} completadas`;
      this.queueStatusBadge.style.color = 'var(--success)';
    } else {
      this.queueStatusBadge.textContent = `0 pendientes`;
    }

    if (totalCount === 0) {
      this.emptyState.style.display = 'block';
      this.imageGrid.innerHTML = '';
    } else {
      this.emptyState.style.display = 'none';
    }
  }

  /**
   * Renderiza una tarjeta para un elemento de la cola
   */
  createItemCard(item, onDownload, onDelete, onPreview) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `card-${item.id}`;

    const originalExt = item.file.name.split('.').pop().toUpperCase();
    const origSizeStr = this.formatBytes(item.file.size);

    card.innerHTML = `
      <div class="card-thumb-wrapper" title="Clic para ver antes/después">
        <img src="${item.previewUrl}" alt="${item.file.name}" class="card-thumb">
        <span class="card-overlay-badge">${originalExt}</span>
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <span class="card-filename" title="${item.file.name}">${item.file.name}</span>
          <span class="card-status-badge status-pending" id="badge-${item.id}">Pendiente</span>
        </div>
        <div class="card-meta-row">
          <span>Orig: ${origSizeStr}</span>
          <span class="size-change" id="size-${item.id}">—</span>
        </div>
        <div class="card-actions">
          <button class="btn-card-sm btn-card-delete" id="del-${item.id}" title="Eliminar de la lista">
            <i data-lucide="trash-2"></i>
            <span>Quitar</span>
          </button>
          <button class="btn-card-sm btn-card-download" id="dl-${item.id}" style="display: none;" title="Descargar imagen convertida">
            <i data-lucide="download"></i>
            <span>Descargar</span>
          </button>
        </div>
      </div>
    `;

    // Eventos
    card.querySelector('.card-thumb-wrapper').addEventListener('click', () => onPreview(item));
    card.querySelector(`#del-${item.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(item.id);
    });
    card.querySelector(`#dl-${item.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      onDownload(item);
    });

    this.imageGrid.appendChild(card);
    
    // Refrescar iconos SVG de Lucide dentro del nuevo elemento
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Actualiza el estado visual de una tarjeta individual
   */
  updateItemStatus(item) {
    const badge = document.getElementById(`badge-${item.id}`);
    const sizeSpan = document.getElementById(`size-${item.id}`);
    const dlBtn = document.getElementById(`dl-${item.id}`);

    if (!badge) return;

    badge.className = 'card-status-badge';

    if (item.status === 'converting') {
      badge.classList.add('status-converting');
      badge.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Convirtiendo...`;
    } else if (item.status === 'success') {
      badge.classList.add('status-success');
      badge.innerHTML = `✓ ${item.convertedData.format.toUpperCase()}`;
      
      const newSizeStr = this.formatBytes(item.convertedData.size);
      const diff = item.convertedData.size - item.file.size;
      const diffPercent = Math.round((Math.abs(diff) / item.file.size) * 100);

      if (diff < 0) {
        sizeSpan.className = 'size-change size-reduced';
        sizeSpan.textContent = `${newSizeStr} (-${diffPercent}%)`;
      } else {
        sizeSpan.className = 'size-change size-increased';
        sizeSpan.textContent = `${newSizeStr} (+${diffPercent}%)`;
      }

      if (dlBtn) dlBtn.style.display = 'inline-flex';
    } else if (item.status === 'error') {
      badge.classList.add('status-error');
      badge.innerHTML = `✗ Error`;
      badge.title = item.errorMessage || 'Error desconocido';
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Muestra una notificación Toast elegante dentro de la aplicación
   */
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'loading') iconName = 'loader-2';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="${type === 'loading' ? 'spin' : ''}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Actualiza la barra de progreso
   */
  updateProgress(current, total, savedBytesTotal = 0) {
    this.progressContainer.style.display = 'block';
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    
    this.progressBar.style.width = `${percent}%`;
    this.progressPercent.textContent = `${percent}%`;
    this.progressCounter.textContent = `${current} de ${total} procesadas`;

    if (savedBytesTotal > 0) {
      this.progressSavedSavings.textContent = `Ahorro total: ${this.formatBytes(savedBytesTotal)}`;
    } else {
      this.progressSavedSavings.textContent = '';
    }
  }

  hideProgress() {
    this.progressContainer.style.display = 'none';
  }

  /**
   * Agrega una entrada a la terminal de registro (Log)
   */
  addLog(msg, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const timeStr = new Date().toLocaleTimeString();
    entry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-msg">${msg}</span>
    `;

    this.logConsole.appendChild(entry);
    this.logConsole.scrollTop = this.logConsole.scrollHeight;
  }

  /**
   * Alterna entre vista de cuadrícula y lista
   */
  setGridView(isGrid) {
    this.isListView = !isGrid;
    if (isGrid) {
      this.imageGrid.classList.remove('list-view');
      document.getElementById('viewGridBtn').classList.add('active');
      document.getElementById('viewListBtn').classList.remove('active');
    } else {
      this.imageGrid.classList.add('list-view');
      document.getElementById('viewGridBtn').classList.remove('active');
      document.getElementById('viewListBtn').classList.add('active');
    }
  }

  /**
   * Formatea bytes en KB, MB, GB
   */
  formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

window.UIManager = UIManager;
