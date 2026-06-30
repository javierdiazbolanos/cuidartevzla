<div align="center">
  <img src="public/logo_cuidarte.svg" alt="Cuídarte Venezuela" width="180" />
  
  # Cuídarte Venezuela 🇻🇪
  
  **Buscador de Pacientes — Emergencia Sísmica Junio 2026**
  
  [![Website](https://img.shields.io/badge/site-cuidartevzla.com-002f87?style=flat-square)](https://cuidartevzla.com)
  [![Stack](https://img.shields.io/badge/stack-React%20%2B%20PHP%20%2B%20MySQL-3b82f6?style=flat-square)](#)
  [![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
  [![Records](https://img.shields.io/badge/pacientes-5%2C677-ef4444?style=flat-square)](#)
</div>

---

## 🎯 Propósito

Aplicación **PWA progresiva** de búsqueda de pacientes, medicamentos y transporte voluntario desplegada en respuesta a la emergencia sísmica en Venezuela (junio 2026). Permite a familiares localizar a sus seres queridos consultando listados oficiales de hospitales desde cualquier dispositivo, incluso con conexiones inestables o sin cobertura.

### Alcance

- 🔍 **Buscador de pacientes** por nombre, cédula u hospital
- 💊 **Catálogo de medicamentos** con disponibilidad por centro de salud
- 🚛 **Directorio de transporte voluntario** para traslados y logística
- 📱 **PWA offline-first** con Service Worker autocorrectivo y caché resiliente
- 🌐 **Optimizado para Venezuela** — modo datos bajos, compresión, carga rápida en 2G/3G
- 📄 **Carga masiva por PDF/imagen** con OCR (Tesseract.js) + LLM (OpenRouter) para digitalizar listados
- 🔄 **Motor de deduplicación** inteligente con fuzzy matching y merge de registros

---

## 🏗️ Arquitectura

```
┌─────────────────────────┐     ┌──────────────────────────┐
│   React 19 + Vite 6     │────▶│   PHP 8 REST API          │
│   (Frontend PWA)        │     │   /api/*.php              │
│                         │     │                          │
│  • Tailwind CSS 4       │     │  • PDO + MySQL           │
│  • TypeScript           │     │  • CORS abierto           │
│  • Service Worker       │     │  • FULLTEXT search       │
│  • OpenCV.js (OCR pre)  │     │  • Normalización UTF-8    │
│  • Tesseract.js (OCR)    │     │  • Código voluntario      │
│  • Lucide Icons         │     │  • Deduplicación          │
│  • Motion animations    │     │  • LLM proxy (OpenRouter) │
└─────────────────────────┘     └──────────┬───────────────┘
                                            │
                                 ┌──────────▼───────────────┐
                                 │   MySQL 8 (InnoDB)        │
                                 │   cuidartevzla.com:3306    │
                                 │                          │
                                 │  • 54 hospitales          │
                                 │  • 5,677 pacientes        │
                                 │  • 530 edificios          │
                                 │  • FULLTEXT indexes       │
                                 └──────────────────────────┘
```

## 📦 Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS 4 |
| Backend | PHP 8+, MySQL 8 (InnoDB), Apache mod_rewrite |
| Hosting PRD | Banahosting (`cuidartevzla.com`) — producción |
| Hosting QAS | InfinityFree (`cuidartevzla.freedev.app`) — testing |
| PWA | Service Worker, Web Manifest, offline cache |
| OCR | Tesseract.js (español) + OpenCV.js (pre-procesamiento) |
| LLM | OpenRouter API (procesamiento de OCR de baja calidad) |
| Búsqueda | MySQL FULLTEXT + normalización de acentos (PHP + TS) |
| Mapas | Coordenadas geográficas (lat/lng) por hospital |

## 🗄️ Modelo de Datos

```sql
hospitales (id, nombre, municipio, lat, lng, telefono)
pacientes  (id, nombre, nombre_norm, cédula, edad, sexo, procedencia,
            hospital_id, hospital_texto, ingreso_fecha, estado,
            posible_duplicado, carga_id)
carga_log  (id, codigo, hospital_id, total_pacientes, ip, fecha)
edificios  (id, nombre, direccion, municipio, lat, lng)
medicamentos (id, nombre, categoria, cantidad, hospital_id, disponible)
transporte   (id, nombre, telefono, ciudad, vehiculo, capacidad_personas,
              capacidad_carga, disponible)
alertas     (id, tipo, mensaje, hospital_id, created_at)
```

### Diseño clave

- **`hospital_id` + `hospital_texto`**: Mapeo robusto a hospital canónico con fallback a texto libre. Soporta datos de campo inconsistentes (múltiples fuentes, nombres variantes).
- **`nombre_norm`**: Normalización de acentos y mayúsculas (`ñ→N`, `é→E`) para búsquedas insensibles a tildes.
- **`posible_duplicado`**: Flag automático por coincidencia de nombre normalizado entre múltiples fuentes de datos.
- **`ingreso_fecha`**: Parseo tolerante de formatos (Excel serial, dd/mm/yy, dd-mm-yyyy).
- **`carga_id`**: Trazabilidad de origen de datos. Cada carga masiva registra código, hospital, IP y fecha.

## 📄 Pipeline OCR + LLM

```
PDF/Imagen → OpenCV.js (upscale 4× + grayscale) → Tesseract.js (OCR español)
                                                        │
                                                        ▼
                                              ¿Confianza > 60%?
                                              ├── SÍ → Insertar pacientes
                                              └── NO → LLM (OpenRouter) procesa imagen
```

- **Pre-procesamiento**: Upscale 4× + grayscale con OpenCV.js para mejorar precisión del OCR
- **OCR**: Tesseract.js con modelo entrenado para español
- **Fallback LLM**: Si el OCR no detecta pacientes (confianza baja), se envía la imagen optimizada al LLM para extracción de texto
- **Deduplicación**: Al sincronizar, el motor compara cédula exacta + fuzzy match de nombres para evitar duplicados

## 🚀 Deploy Rápido

```bash
# 1. Clonar
git clone https://github.com/javierdiazbolanos/cuidartevzla.git
cd cuidartevzla

# 2. Instalar y build
npm install
npm run build

# 3. Subir a hosting compartido (FTP)
# Contenido de dist/ → /voluntarios/      (frontend)
# Contenido de backend/ → /api/           (backend PHP)

# 4. Configurar credenciales
cp backend/.env.example backend/.env
# Editar .env con credenciales de DB y OPENROUTER_API_KEY

# 5. Base de datos
# Ejecutar schema.sql → crear tablas
# Importar datos de pacientes
```

## 🔧 Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/hospitales.php` | GET | Lista de hospitales |
| `/api/pacientes.php?q=NOMBRE` | GET | Búsqueda de pacientes |
| `/api/pacientes.php?id=N` | GET | Detalle de paciente |
| `/api/medicamentos.php?q=NOMBRE` | GET | Búsqueda de medicamentos |
| `/api/transporte.php?ciudad=X` | GET | Transporte voluntario |
| `/api/stats.php` | GET | Conteos (pacientes, hospitales, etc.) |
| `/api/pacientes_lote.php` | POST | Carga batch (requiere código voluntario) |
| `/api/sync.php?codigo=X` | POST | Deduplicación + sincronización de pacientes |
| `/api/procesar_con_llm.php` | POST | Proxy LLM para OCR de baja calidad (OpenRouter) |

## 📱 PWA & Offline

- **Service Worker autodestructivo**: Borra todo el caché en cada `activate` y fuerza reload. Garantiza que los usuarios siempre vean la versión más reciente.
- **Modo datos bajos**: Detección automática de redes lentas (2G/3G). Reduce frecuencia de polling y activa caché agresivo.
- **Fallback offline**: Si la API no responde, el frontend opera con datos mock locales para no dejar de funcionar.
- **localStorage**: Persiste hospitales para arranques sin conexión.

## 🤝 Contribuir

1. Fork del repo
2. Crea tu feature branch (`git checkout -b feat/mi-feature`)
3. Commit (`git commit -m 'feat: agrega X'`)
4. Push (`git push origin feat/mi-feature`)
5. Abre un Pull Request

### Convenciones de commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `docs:` cambios en documentación
- `refactor:` mejora de código sin cambiar funcionalidad

---

<div align="center">
  <sub>Desarrollado en solidaridad con el pueblo venezolano ❤️🇻🇪</sub>
</div>
