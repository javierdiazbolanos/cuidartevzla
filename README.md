# Cuídarte Venezuela

<div align="center">

![Cuídarte Venezuela Logo](https://raw.githubusercontent.com/javierdiazbolanos/cuidartevzla/main/public/logo_cuidarte.svg)

**Sistema de Emergencias para la Gestión de Pacientes, Insumos, Transporte y Centros de Salud**
*Desarrollado en solidaridad con el pueblo venezolano — Terremotos de Venezuela, Junio 2026*

[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PHP 8.2+](https://img.shields.io/badge/PHP-8.2%2B-777BB4?logo=php&logoColor=white)](https://www.php.net)
[![MariaDB/MySQL](https://img.shields.io/badge/MariaDB-10.11%2B-003545?logo=mariadb&logoColor=white)](https://mariadb.org)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[**Sitio Productivo**](https://cuidartevzla.com/) • [**QAS / UAT**](https://qas.cuidartevzla.com/) • [**Documentación API**](#-endpoints-api) • [**Contribuir**](#-contribuir)

</div>

---

## 🎯 Descripción General

**Cuídarte Venezuela** es una **Progressive Web App (PWA)** diseñada para situaciones de emergencia sísmica en Venezuela. Permite a familiares, voluntarios y personal de salud:

| Módulo | Funcionalidad Principal |
|--------|-------------------------|
| 🏥 **Pacientes** | Búsqueda en tiempo real por nombre o cédula, filtrado por hospital, detalle con procedencia y estado clínico |
| 💊 **Insumos / Medicamentos** | Stock por hospital, categorías (Analgésicos, Antibióticos, Cardiovasculares, etc.), disponibilidad en tiempo real |
| 🚛 **Transporte Voluntario** | Registro de vehículos/conductores (auto-autenticados con cédula), búsqueda por ciudad, gestión de disponibilidad |
| 🏥 **Centros de Salud** | Directorio nacional (50+ hospitales) con geolocalización, teléfono, municipio y estado |
| 🏢 **Edificios Afectados** | Catastro de estructuras con daño total/severo post-sismo |

> **Diseñado para redes inestables**: Modo "Datos Bajos" automático (2G/3G), caché agresivo, fallback offline con datos simulados y Service Worker autodestructivo que fuerza actualizaciones.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (PWA)                           │
│  React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Lucide Icons │
│  ▸ Puerto 5173 (dev)  ▸ Build estático en /dist                │
│  ▸ Proxy /api → http://localhost:8001/backend                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST JSON
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (PHP 8.2+)                       │
│  API REST sin framework • PDO (Prepared Statements) • CORS      │
│  ▸ Puerto 8001  ▸ Endpoints en /backend/*.php                  │
│  ▸ Autenticación: Header X-Codigo-Voluntario (HMAC constante)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ PDO / TCP 3306
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BASE DE DATOS (MariaDB)                    │
│  5 tablas InnoDB utf8mb4_unicode_ci + FullText Search          │
│  ▸ hospitales (50 semilla)  ▸ pacientes  ▸ medicamentos        │
│  ▸ transporte              ▸ edificio_afectados                │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Capa | Tecnologías Clave |
|------|-------------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Lucide React, Motion |
| **Backend** | PHP 8.2+, PDO MySQL, `vlucas/phpdotenv` (opcional), sin framework |
| **Base de Datos** | MariaDB 10.11+ / MySQL 8.0+ (InnoDB, utf8mb4, FullText) |
| **DevOps** | Docker Compose (opcional), GitHub Actions (CI), FTP deploy a QAS/PRD |
| **PWA** | Service Worker (Workbox-style manual), Web App Manifest, Offline fallback |

---

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerrequisitos

- **Node.js ≥ 20** + **npm ≥ 10** (o `pnpm`/`yarn`)
- **PHP ≥ 8.2** con extensiones `pdo_mysql`, `mbstring`, `intl`, `json`
- **MariaDB ≥ 10.11** o **MySQL ≥ 8.0** corriendo en `localhost:3306`
- **Git**

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/javierdiazbolanos/cuidartevzla.git
cd cuidartevzla
npm ci
```

### 2. Base de datos local

```bash
# Crear BD y usuario (una sola vez)
sudo mysql -e "
  CREATE DATABASE IF NOT EXISTS cuidartevzla_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'cuidarte_user'@'localhost' IDENTIFIED BY 'cuidarte_pass_2026';
  GRANT ALL PRIVILEGES ON cuidartevzla_dev.* TO 'cuidarte_user'@'localhost';
  FLUSH PRIVILEGES;
"

# Cargar esquema + datos semilla (hospitales, etc.)
mysql -u cuidarte_user -pcuidarte_pass_2026 cuidartevzla_dev < backend/schema.sql

# (Opcional) Cargar pacientes de prueba
# mysql -u cuidarte_user -pcuidarte_pass_2026 cuidartevzla_dev < backend/import_patients.sql
```

### 3. Configurar entorno backend

```bash
cp backend/.env.example backend/.env 2>/dev/null || cat > backend/.env <<'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cuidartevzla_dev
DB_USER=cuidarte_user
DB_PASS=cuidarte_pass_2026
CODIGO_VOLUNTARIO=VENEZUELA_2026_DISASTER_RELIEF
EOF
```

> **⚠️ Seguridad**: Nunca commits `.env` real. El `.gitignore` ya lo excluye.

### 4. Levantar servidores (3 terminales)

```bash
# Terminal 1: Backend PHP (puerto 8001)
cd /home/jdiaz/dev/cuidartevzla
php -S 0.0.0.0:8001 -t . > ~/dev/backend.log 2.log 2>&1 &

# Terminal 2: Frontend Vite (puerto 5173)
npm run dev -- --port 5173 --host 0.0.0.0 > ~/dev/frontend.log 2>&1 &

# Terminal 3: (Opcional) Admin panel - puerto 5174
# cd /home/jdiaz/dev/cuidartevzla-admin && npm run dev -- --port 5174
```

### 5. Verificar

| Servicio | URL | Health Check |
|----------|-----|--------------|
| Frontend | <http://localhost:5173> | Carga PWA, tabs funcionan |
| Backend API | <http://localhost:8001/backend/hospitales.php> | JSON `{ok:true,data:[...]}` |
| Hospitales | 50+ registros | `curl -s .../hospitales.php \| jq '.data | length'` |

---

## 🐳 Alternativa: Docker Compose (Todo-en-uno)

```yaml
# docker-compose.yml (raíz del repo)
version: '3.8'
services:
  db:
    image: mariadb:10.11
    environment:
      MYSQL_DATABASE: cuidartevzla_dev
      MYSQL_USER: cuidarte_user
      MYSQL_PASSWORD: cuidarte_pass_2026
      MYSQL_ROOT_PASSWORD: root_pass_2026
    volumes:
      - db_data:/var/lib/mysql
      - ./backend/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
    ports: ["3306:3306"]
    healthcheck: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-proot_pass_2026"]

  backend:
    build: 
      context: .
      dockerfile: Dockerfile.php
    ports: ["8001:8001"]
    volumes:
      - ./backend:/var/www/html/backend:ro
      - ./backend/.env:/var/www/html/.env:ro
    depends_on: [db]
    environment:
      DB_HOST: db
      DB_PORT: 3306

  frontend:
    build: 
      context: .
      dockerfile: Dockerfile.node
    ports: ["5173:5173"]
    volumes:
      - ./:/app
      - /app/node_modules
    command: npm run dev -- --host 0.0.0.0 --port 5173
    depends_on: [backend]

volumes:
  db_data:
```

```bash
docker compose up -d --build
```

---

## 📁 Estructura del Proyecto

```
cuidartevzla/
├── public/                    # Assets estáticos servidos tal cual
│   ├── logo_cuidarte.svg      # Logo principal (se sirve en /logo_cuidarte.svg)
│   ├── manifest.json          # PWA Manifest
│   ├── sw.js                  # Service Worker (offline-first, auto-update)
│   └── config.json            # { "API_BASE": "/api" } - configuración runtime
├── src/                       # Frontend React + TypeScript
│   ├── components/            # Componentes UI reutilizables
│   │   ├── Header.tsx         # Header con tabs, logo, estado red, banner demo
│   │   ├── HospitalComboBox.tsx   # Select agrupado por estado (Venezuela)
│   │   ├── PacienteCard.tsx       # Tarjeta paciente con estado clínico
│   │   ├── PacienteDetailModal.tsx
│   │   ├── MedicamentoCard.tsx / MedicamentoDetailModal.tsx
│   │   ├── TransporteCard.tsx     # Registro/edición/borrado con cédula
│   │   ├── HospitalCard.tsx
│   │   ├── BuildingList.tsx
│   │   └── EmergencyAlerts.tsx
│   ├── apiClient.ts           # Cliente API con caché, fallback mock, data-saver
│   ├── types.ts               # Interfaces TypeScript (Hospital, Paciente, Medicamento, Transporte, Edificio)
│   ├── mockData.ts            # Datos de emergencia offline (hospitales, pacientes, insumos, transporte)
│   ├── icons.ts               # Re-exports de lucide-react (tree-shaking)
│   ├── App.tsx                # Raíz: estado global, tabs, efectos, data fetching
│   ├── main.tsx               # Entry point React 19
│   └── index.css              # Tailwind CSS 4 + estilos globales
├── backend/                   # API PHP (sin framework)
│   ├── db.php                 # Conexión PDO + helpers (CORS, JSON, auth, normalización)
│   ├── hospitales.php         # GET /hospitales
│   ├── pacientes.php          # GET/POST/PUT /pacientes (búsqueda, detalle, CRUD voluntario)
│   ├── pacientes_lote.php     # POST batch insert (≤500 registros, auth requerida)
│   ├── medicamentos.php       # GET/POST/PUT /medicamentos
│   ├── transporte.php         # GET/POST/PUT/DELETE /transporte (auth por cédula)
│   ├── stats.php              # GET conteos globales (pacientes, hospitales, última actualización)
│   ├── schema.sql             # DDL completo + 50 hospitales semilla
│   ├── .env                   # Credenciales locales (gitignored)
│   └── README.md              # Documentación técnica backend
├── .github/workflows/         # CI/CD (lint, typecheck, build, deploy FTP)
├── vite.config.ts             # Vite + Tailwind + Proxy /api → localhost:8001
├── tsconfig.json              # TypeScript estricto
├── package.json               # Scripts: dev, build, preview, lint, clean
└── README.md                  # Este archivo
```

---

## ⚙️ Configuración de Entorno

### Variables Backend (`backend/.env`)

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `DB_HOST` | ✅ | `localhost` | Host MariaDB/MySQL |
| `DB_PORT` | ❌ | `3306` | Puerto |
| `DB_NAME` | ✅ | `cuidarte_db` | Nombre BD |
| `DB_USER` | ✅ | `cuidarte_user` | Usuario |
| `DB_PASS` | ✅ | — | Contraseña |
| `CODIGO_VOLUNTARIO` | ✅ | — | Token HMAC (mín. 10 chars) para endpoints mutantes |

### Variables Frontend (`public/config.json`)

```json
{ "API_BASE": "/api" }
```

- En **dev**: Vite proxy reescribe `/api/*` → `http://localhost:8001/backend/*`
- En **QAS/PRD**: `config.json` apunta a la URL real del backend (ej. `https://qas.cuidartevzla.com/api`)

---

## 🔌 Endpoints API

> **Base URL dev**: `http://localhost:8001/backend`  
> **Base URL QAS**: `https://qas.cuidartevzla.com/api`  
> **Base URL PRD**: `https://cuidartevzla.com/api`

### Hospitales
| Método | Endpoint | Params | Descripción |
|--------|----------|--------|-------------|
| `GET` | `/hospitales.php` | — | Lista completa (50+) ordenada por nombre |

### Pacientes
| Método | Endpoint | Params | Descripción |
|--------|----------|--------|-------------|
| `GET` | `/pacientes.php` | `q` (min 2), `hospital_id` | Búsqueda por nombre/cédula + filtro hospital |
| `GET` | `/pacientes.php?id=N` | `id` | Detalle completo (procedencia, ingreso, cédula enmascarada) |
| `GET` | `/pacientes.php?cedula=12345678` | `cedula` | Búsqueda exacta por cédula |
| `POST` | `/pacientes.php` | Body JSON + `X-Codigo-Voluntario` | Crear paciente (voluntarios) |
| `PUT` | `/pacientes.php?id=N` | Body JSON + `X-Codigo-Voluntario` | Actualizar paciente |
| `POST` | `/pacientes_lote.php` | `{pacientes:[]}` + `X-Codigo-Voluntario` | Carga batch ≤500 (transacción) |

### Medicamentos / Insumos
| Método | Endpoint | Params | Descripción |
|--------|----------|--------|-------------|
| `GET` | `/medicamentos.php` | `q`, `categoria`, `hospital_id`, `solo_disponibles` | Búsqueda con filtros |
| `GET` | `/medicamentos.php?id=N` | `id` | Detalle |
| `POST` | `/medicamentos.php` | Body JSON + `X-Codigo-Voluntario` | Registrar insumo |
| `PUT` | `/medicamentos.php?id=N` | Body JSON + `X-Codigo-Voluntario` | Actualizar insumo |

### Transporte Voluntario
| Método | Endpoint | Params | Descripción |
|--------|----------|--------|-------------|
| `GET` | `/transporte.php` | `q`, `ciudad`, `solo_disponibles` | Lista pública (sin cédulas) |
| `POST` | `/transporte.php` | Body JSON (requiere `cedula`) | Registrar vehículo (cédula = contraseña) |
| `PUT` | `/transporte.php` | Body JSON `{id, cedula, ...}` | Editar (autentica con cédula) |
| `DELETE` | `/transporte.php` | Body/Query `{id, cedula}` | Borrar permanente (autentica con cédula) |

### Estadísticas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/stats.php` | `{pacientes_count, hospitales_count, ultimo_registro, ultima_actualizacion}` |

### Formato de Respuesta Estándar

```json
// Éxito
{ "ok": true, "data": [...] }

// Error
{ "ok": false, "error": "Mensaje legible" }
```

### Autenticación Voluntario (Endpoints Mutantes)

```bash
curl -X POST https://qas.cuidartevzla.com/api/pacientes.php \
  -H "Content-Type: application/json" \
  -H "X-Codigo-Voluntario: VENEZUELA_2026_DISASTER_RELIEF" \
  -d '{"nombre":"Juan Pérez","edad":35,"sexo":"Masculino",...}'
```

---

## 🗄️ Esquema de Base de Datos

### Tablas Principales

```sql
-- 50 hospitales semilla con id fijo, coordenadas, teléfono
hospitales (id PK, nombre UK, municipio, lat, lng, telefono)

-- Pacientes con búsqueda normalizada (nombre_norm) y FullText
pacientes (id PK, nombre, nombre_norm, cedula, edad, sexo, 
           procedencia, hospital_id FK, hospital_texto, 
           ingreso_fecha, ingreso_detalle, estado ENUM, 
           posible_duplicado, timestamps)

-- Medicamentos/insumos por hospital
medicamentos (id PK, nombre, nombre_norm, categoria, cantidad, unidad,
              hospital_id FK, hospital_texto, disponible, donante, notas, timestamps)

-- Transporte voluntario (autenticación por cédula = password)
transporte (id PK, nombre, nombre_norm, telefono, ciudad, vehiculo,
            capacidad_personas, capacidad_carga, disponible, notas, cedula, timestamps)

-- Edificios afectados post-sismo
edificio_afectados (id PK, nombre, tipo_dano ENUM('total','severo'), observacion, enlace)
```

### Índices Clave

- `pacientes`: `idx_nombre_norm`, `idx_cedula`, `idx_hospital`, `ft_nombre` (FullText)
- `medicamentos`: `idx_nombre_norm`, `idx_categoria`, `idx_hospital`, `idx_disponible`, `ft_nombre`
- `transporte`: `idx_ciudad`, `idx_disponible`, `idx_nombre_norm`

---

## 🌐 PWA & Offline-First

| Característica | Implementación |
|----------------|----------------|
| **Service Worker** | `public/sw.js` - Cache-first para assets, network-first para API. `activate` borra caches antiguos y fuerza `clients.claim()` + `reload()`. |
| **Manifest** | `public/manifest.json` - Nombre, iconos, `display: standalone`, `theme_color: #0284c7` (sky-600). |
| **Modo Datos Bajos** | Detección automática via `navigator.connection` (saveData, effectiveType 2g/3g, downlink <1.5). Debounce 800ms vs 350ms. Persiste en `sessionStorage`. |
| **Caché Inteligente** | `apiClient.ts`: Map en memoria + `localStorage` para hospitales. Fallback a `mockData.ts` si API falla. |
| **Offline Real** | Si `navigator.onLine === false` o API falla → UI usa mocks, banner "Sin señal. Visualizando información guardada localmente." |

---

## 🧪 Scripts Disponibles

```bash
npm run dev          # Vite dev server (puerto 3000 por defecto, configurable)
npm run build        # Build producción → /dist (TypeScript + Vite)
npm run preview      # Sirve /dist localmente para validar build
npm run lint         # tsc --noEmit (type-check estricto)
npm run clean        # Borra dist/ y server.js
```

---

## 🚢 Despliegue

### QAS / UAT (`qas.cuidartevzla.com`)

> **Credenciales FTP QAS** — Configuradas en GitHub Secrets (`FTP_QAS_PASSWORD`) y `backend/.env` (no versionado).
> - Host: `ftp.equiposdecamping.com` / Puerto 21 (Explicit FTPS)
> - Directorio remoto: `/htdocs/`
> - Credenciales: consultar a @Javier o al archivo `.env` local

> **Base de Datos QAS** — Configurada en `backend/.env` (no versionado).
> - Host: IP de Banahosting / Puerto 3306
> - BD: base de datos QAS
> - Credenciales: consultar a @Javier o al archivo `.env` local

#### Checklist Pre-Deploy a QAS

- [ ] `npm run build` ✅ sin errores TypeScript
- [ ] `npm run lint` ✅
- [ ] Branch limpio (`main` o `feature/*` squash-merged)
- [ ] `backend/.env` actualizado con credenciales QAS (no commitear)
- [ ] `public/config.json` → `"API_BASE": "https://qas.cuidartevzla.com/api"`
- [ ] Cambios documentados en CHANGELOG / PR description
- [ ] **Rollback plan**: Backup FTP + DB dump antes de desplegar
- [ ] Validación manual en `https://qas.cuidartevzla.com/` (móvil + desktop)

#### Deploy Manual (FTP)

```bash
# 1. Build
npm run build

# 2. Subir /dist/* a /htdocs/ (sobrescribe)
# 3. Subir backend/ a /htdocs/api/ (mantén .env fuera de repo)
# 4. Verificar health-check: curl https://qas.cuidartevzla.com/api/hospitales.php
```

#### Deploy Automatizado (GitHub Actions)

```yaml
# .github/workflows/deploy-qas.yml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-qas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci && npm run build && npm run lint
      - name: FTP Deploy
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ftp.equiposdecamping.com
          username: alex-qas@qas.cuidartevzla.com
          password: ${{ secrets.FTP_QAS_PASSWORD }}
          protocol: ftps
          local-dir: ./dist/
          server-dir: /htdocs/
```

### Producción (`cuidartevzla.com` / `www.cuidartevenezuela.com`)

> **⚠️ REGLAS DE ORO PRODUCCIÓN**
> - **NUNCA** desplegar directo a PRD sin pasar por QAS validado
> - **SIEMPRE** backup completo (FTP + `mysqldump`) antes de tocar PRD
> - Deploy solo con aprobación escrita de @Javier en este chat
> - Tag de release: `git tag -a vX.Y.Z -m "Release notes" && git push origin vX.Y.Z`

**Hosting PRD**: Banahosting (`cuidartevzla.com`)
- FTP: credenciales separadas (pedir a @Javier)
- DB: `204.93.224.104` / `fscrehao_cuidartevzla` / usuario dedicado

---

## 🤝 Contribuir

### Flujo de Trabajo

1. **Fork** → `git checkout -b feat/mi-feature` (o `fix/`, `docs/`, `refactor/`)
2. **Desarrolla** con commits atómicos siguiendo [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(pacientes): agregar filtro por estado clínico en búsqueda"
   git commit -m "fix(api): manejar null en hospital_id en transporte.php"
   ```
3. **Valida local**: `npm run lint && npm run build`
4. **Push** → Abre **Pull Request** contra `main`
5. **Code Review** (mínimo 1 aprobación, CI verde)
6. **Squash & Merge** → Deploy automático a QAS

### Estándares de Código

- **TypeScript**: `strict: true`, sin `any` implícito
- **React**: Functional components + Hooks, nada de clases
- **CSS**: Tailwind utility-first, sin CSS custom salvo `index.css`
- **PHP**: `declare(strict_types=1)`, PDO prepared statements **siempre**, validación de entrada
- **Commits**: Conventional Commits (feat, fix, docs, refactor, chore, test)

---

## 📄️⃣ Seguridad & Privacidad

| Medida | Implementación |
|--------|----------------|
| **CORS** | `Access-Control-Allow-Origin: *` (emergencia abierta) |
| **Auth Voluntarios** | Header `X-Codigo-Voluntario` (constante HMAC ≥10 chars) |
| **Cédulas** | Enmascaradas en UI (`***123`), nunca en logs, hash_equals para comparar |
| **SQL Injection** | 100% Prepared Statements (PDO) |
| **XSS** | React escapa por defecto; JSON `UNESCAPED_UNICODE` |
| **HTTPS** | Obligatorio en QAS/PRD (Let's Encrypt / cPanel) |
| **Secrets** | `.env` gitignored; secrets en GitHub Actions / cPanel |

---

## 📜 Licencia

**MIT License** — Uso libre, modificación y distribución permitida manteniendo atribución.

> Desarrollado con ❤️ y ☕ por el equipo de **Cuídarte Venezuela** en solidaridad con las víctimas del sismo de junio 2026.
> 
> *"La tecnología al servicio de la vida."*

---

## 📞 Contacto & Soporte

| Rol | Contacto |
|-----|----------|
| **Arquitecto / Lead Dev** | [@Javier](https://github.com/javierdiazbolanos) (Javier Díaz) |
| **DevOps / Full-Stack** | Alex Chen (este asistente) |
| **Issues / Bugs** | [GitHub Issues](https://github.com/javierdiazbolanos/cuidartevzla/issues) |
| **Deploy QAS** | Cualquier miembro del chat puede solicitar (con checklist) |

---

<div align="center">
  <sub>Última actualización: Junio 2026 • Versión 0.1.0-dev • <a href="https://github.com/javierdiazbolanos/cuidartevzla">Repositorio Oficial</a></sub>
</div>