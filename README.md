<div align="center">
  <img src="public/logo_cuidarte.svg" alt="Cuídarte Venezuela" width="180" />
  
  # Cuídarte Venezuela 🇻🇪
  
  **Buscador de Pacientes — Emergencia Sísmica Junio 2026**
  
  [![Website](https://img.shields.io/badge/site-cuidartevzla.com-002f87?style=flat-square)](https://cuidartevzla.com)
  [![Stack](https://img.shields.io/badge/stack-React%20%2B%20PHP%20%2B%20MySQL-3b82f6?style=flat-square)](#)
  [![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
  [![Records](https://img.shields.io/badge/pacientes-5%2C223-ef4444?style=flat-square)](#)
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

---

## 🏗️ Arquitectura

```
┌─────────────────────────┐     ┌──────────────────────────┐
│   React 19 + Vite 6     │────▶│   PHP 8 REST API          │
│   (Frontend PWA)        │     │   /api/*.php              │
│                         │     │                          │
│  • Tailwind CSS 4       │     │  • PDO + MySQL           │
│  • TypeScript           │     │  • CORS abierto           │
│  • Service Worker       │     │  • FULLTEXT search        │
│  • Lucide Icons         │     │  • Normalización UTF-8    │
│  • Motion animations    │     │  • Código voluntario      │
└─────────────────────────┘     └──────────┬───────────────┘
                                            │
                                 ┌──────────▼───────────────┐
                                 │   MySQL 8 (InnoDB)        │
                                 │   sql303.infinityfree.com │
                                 │                          │
                                 │  • 26 hospitales          │
                                 │  • 5,223 pacientes        │
                                 │  • FULLTEXT indexes       │
                                 └──────────────────────────┘
```

## 📦 Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS 4 |
| Backend | PHP 8+, MySQL 8 (InnoDB), Apache mod_rewrite |
| Hosting | InfinityFree (shared), FTP deploy |
| PWA | Service Worker, Web Manifest, offline cache |
| Búsqueda | MySQL FULLTEXT + normalización de acentos (PHP + TS) |
| Mapas | Coordenadas geográficas (lat/lng) por hospital |

## 🗄️ Modelo de Datos

```sql
hospitales (id, nombre, municipio, lat, lng, telefono)
pacientes  (id, nombre, nombre_norm, cedula, edad, sexo, procedencia,
            hospital_id, hospital_texto, ingreso_fecha, estado,
            posible_duplicado)
medicamentos (id, nombre, categoria, cantidad, hospital_id, disponible)
transporte   (id, nombre, telefono, ciudad, vehiculo, capacidad_personas,
              capacidad_carga, disponible)
```

### Diseño clave

- **`hospital_id` + `hospital_texto`**: Mapeo robusto a hospital canónico con fallback a texto libre. Soporta datos de campo inconsistentes (múltiples fuentes, nombres variantes).
- **`nombre_norm`**: Normalización de acentos y mayúsculas (`ñ→N`, `é→E`) para búsquedas insensibles a tildes.
- **`posible_duplicado`**: Flag automático por coincidencia de nombre normalizado entre múltiples fuentes de datos.
- **`ingreso_fecha`**: Parseo tolerante de formatos (Excel serial, dd/mm/yy, dd-mm-yyyy).

## 🚀 Deploy Rápido

```bash
# 1. Clonar
git clone https://github.com/javierdiazbolanos/cuidartevzla.git
cd cuidartevzla

# 2. Instalar y build
npm install
npm run build

# 3. Subir a hosting compartido (FTP)
# Contenido de dist/ → /htdocs/
# Contenido de backend/ → /htdocs/api/

# 4. Base de datos
# Ejecutar schema.sql → crear tablas
# Ejecutar import_data.sql → datos semilla (hospitales, medicamentos, transporte)
# Ejecutar import_patients.sql → pacientes reales
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