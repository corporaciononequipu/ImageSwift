<div align="center">

# ⚡ ImageSwift Web Ultra

### Convertidor y Optimizador Multiformato de Última Generación

[![Version](https://img.shields.io/badge/version-2.0.0--web-6366f1?style=for-the-badge&logo=rocket)](https://github.com/)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)](LICENSE)
[![Zero-Install](https://img.shields.io/badge/install-0%20install%20needed-06b6d4?style=for-the-badge)](https://github.com/)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20client--side-ec4899?style=for-the-badge)](https://github.com/)

<p align="center">
  <b>Convierte, optimiza y comprime lotes masivos de imágenes directamente en tu navegador.</b><br>
  Sin instalaciones de librerías, sin subidas a servidores externos, con 100% de privacidad y velocidad nativa.
</p>

</div>

---

## 🌟 Características Destacadas

- 🚀 **Cero Instalación:** Funciona al instante en cualquier navegador (Chrome, Edge, Firefox, Safari, Opera) en Windows, macOS, Linux, iOS y Android.
- 🔒 **100% Privado (Client-Side Only):** Las imágenes se procesan directamente en la CPU/GPU de tu equipo mediante Canvas HTML5 y Web APIs. **Tus fotos jamás salen de tu dispositivo.**
- 📦 **Procesamiento y Descarga por Lotes:**
  - Arrastra y suelta cientos de imágenes o carpetas completas de golpe.
  - Pega capturas de pantalla tomadas con recortes de Windows directamente (`Ctrl + V`).
  - **Empaquetado inteligente en `.ZIP`** para descargar todas las imágenes convertidas en un solo archivo.
- 🎨 **Formatos de Vanguardia & Fotografía Profesional:**
  - **Próxima Generación:** `AVIF`, `WEBP`.
  - **Dispositivos Apple:** `HEIC / HEIF / HIF` (fotos directas de iPhone/iPad).
  - **Cámaras Réflex / Mirrorless (RAW):** Canon (`.CR2`, `.CR3`), Nikon (`.NEF`), Sony (`.ARW`), Adobe (`.DNG`), Olympus (`.ORF`), Panasonic (`.RW2`), Fuji (`.RAF`).
  - **Formatos Universales y Gráficos:** `JPG/JPEG`, `PNG` (transparencia sin pérdidas), `SVG`, `TIFF`, `BMP`, `GIF`, `ICO` (Favicons multi-tamaño) y `PDF`.
- 🎛️ **Controles Avanzados:**
  - Slider de calidad y compresión en tiempo real.
  - Escalado proporcional o redimensión personalizada por píxeles (Ancho × Alto).
  - Selección de relleno de fondo para transparencias (Blanco, Negro o Canal Alfa).
- 🌓 **Diseño Visual Ultra Premium:**
  - Interfaz moderna con *Glassmorphism*, gradientes vibrantes y animaciones fluidas.
  - Tema Oscuro y Tema Claro con persistencia automática.
  - Modal interactivo de **Comparación Antes / Después**.
  - Terminal de registro (Log) exportable en archivo `.txt`.
  - Soporte **PWA (Progressive Web App)** para instalar como aplicación independiente desde el navegador.

---

## 📊 Matriz de Formatos

| Formato | Entrada | Salida | Descripción / Uso Recomendado |
| :--- | :---: | :---: | :--- |
| **WEBP** | ✅ | ✅ | Alta compresión para páginas web y redes |
| **AVIF** | ✅ | ✅ | Formato de última generación con máxima optimización |
| **HEIC / HEIF** | ✅ | 🔄 *(a WebP/JPG/PNG)* | Formato nativo de cámaras iPhone / iOS |
| **RAW (CR2, NEF, ARW, DNG)** | ✅ | 🔄 *(a WebP/JPG/PNG)* | Fotografía profesional de cámaras réflex |
| **JPG / JPEG** | ✅ | ✅ | Fotografía estándar y compatibilidad universal |
| **PNG** | ✅ | ✅ | Gráficos, logotipos y transparencias sin pérdidas |
| **ICO** | ✅ | ✅ | Íconos de aplicación y Favicons (16x16 a 256x256) |
| **PDF** | ✅ | ✅ | Documentos digitales de alta fidelidad |
| **TIFF / TIF** | ✅ | ✅ | Impresión profesional e imágenes médicas |
| **BMP** | ✅ | ✅ | Mapas de bits estándar |
| **SVG** | ✅ | 🔄 *(Rasterizado)* | Gráficos vectoriales |
| **GIF** | ✅ | ✅ | Gráficos y paletas indexadas |

---

## 🛠️ Estructura del Proyecto

```
ImageSwift/
├── css/
│   └── styles.css          # Sistema de diseño, Glassmorphism, temas Dark/Light
├── js/
│   ├── app.js              # Controlador principal, File System API, eventos y ZIP
│   ├── converter.js        # Motor de conversión universal (AVIF, WebP, RAW, HEIC, PDF)
│   └── ui.js               # Renderizado reactivo, comparador Antes/Después y Toasts
├── favicon.svg             # Favicon vectorial con efecto resplandor
├── index.html              # Interfaz de usuario SPA
├── iniciar_web.bat         # Script de inicio rápido para Windows
├── LICENSE                 # Licencia de código abierto MIT
├── manifest.json           # Manifiesto PWA para instalación de escritorio/móvil
├── README.md               # Documentación oficial
└── server.py               # Servidor local con cabeceras CORS
```

---

## 🚀 Inicio Rápido

### Opción 1: Directo en el navegador (Sin servidor)
Haz doble clic en `index.html` para abrirlo de inmediato en cualquier navegador.

### Opción 2: Servidor local (Recomendado para red local)
Haz doble clic en `iniciar_web.bat` o ejecuta:
```bash
python server.py
```
Abre tu navegador en: `http://localhost:8000`

---

## ☁️ Despliegue en la Web (1 Clic)

Al ser una aplicación 100% estática (HTML, CSS y JS puro), puedes desplegarla de forma gratuita en:
- **GitHub Pages:** Sube los archivos a una rama `main` y activa Pages en la configuración del repositorio.
- **Vercel / Netlify / Cloudflare Pages:** Conecta tu repositorio y se desplegará instantáneamente sin necesidad de configuración de build.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.
