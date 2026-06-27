/**
 * Cuídarte Venezuela - Cliente de API e Integración con Fallback de Emergencia
 * Terremotos de Venezuela - Junio de 2026
 */

import { Hospital, Paciente, PacienteDetalle, Medicamento } from './types';
import { MOCK_HOSPITALES, MOCK_PACIENTES, MOCK_MEDICAMENTOS } from './mockData';

let apiBasePromise: Promise<string> | null = null;
let isMockMode = false;

// Sistema de caché transparente para resiliencia en redes de baja calidad (Venezuela)
const cacheHospitales: { data: Hospital[] | null } = { data: null };
const cachePacientes = new Map<string, Paciente[]>();
const cachePacienteDetalle = new Map<number, PacienteDetalle>();
const cacheMedicamentos = new Map<string, Medicamento[]>();
const cacheMedicamentoDetalle = new Map<number, Medicamento>();

/**
 * Indica si la compresión / ahorro de datos está activo
 */
export function isDataSaverEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = sessionStorage.getItem('cuidarte_data_saver');
  if (saved !== null) return saved === 'true';

  // Auto-detección basada en API de red del navegador
  const conn = (navigator as any).connection;
  if (conn) {
    if (conn.saveData) return true;
    const slowTypes = ['slow-2g', '2g', '3g'];
    if (slowTypes.includes(conn.effectiveType)) return true;
    if (conn.downlink && conn.downlink < 1.5) return true;
  }
  return false;
}

/**
 * Activa o desactiva manualmente el modo de ahorro de datos
 */
export function setDataSaverEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('cuidarte_data_saver', String(enabled));
  }
}

/**
 * Limpia la caché local (útil para recargas manuales)
 */
export function clearApiCache(): void {
  cacheHospitales.data = null;
  cachePacientes.clear();
  cachePacienteDetalle.clear();
  cacheMedicamentos.clear();
  cacheMedicamentoDetalle.clear();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('cuidarte_hospitales_v2');
    } catch (_) {}
  }
  console.log('[Cuídarte] Caché de red y persistencia restablecidas.');
}

/**
 * Obtiene la ruta base de la API leyéndola desde config.json en tiempo de ejecución.
 */
export function getApiBase(): Promise<string> {
  if (!apiBasePromise) {
    apiBasePromise = fetch('/config.json')
      .then((res) => {
        if (!res.ok) throw new Error('config.json no disponible');
        return res.json();
      })
      .then((config) => {
        const base = config.API_BASE || '/api';
        console.log(`[Cuídarte] Cargada base de API: ${base}`);
        return base;
      })
      .catch((err) => {
        console.warn('[Cuídarte] Falló carga de config.json, usando valor predeterminado "/api"', err);
        return '/api';
      });
  }
  return apiBasePromise;
}

/**
 * Indica si la aplicación está operando actualmente en modo de demostración local.
 */
export function isUsingMocks(): boolean {
  return isMockMode;
}

/**
 * Helper para forzar el modo simulación (útil para pruebas en AI Studio)
 */
export function setMockMode(enabled: boolean): void {
  isMockMode = enabled;
  console.log(`[Cuídarte] Modo simulación forzado: ${enabled}`);
}

/**
 * Función de normalización en TypeScript idéntica a la del backend en PHP (norm_nombre)
 */
function tsNormNombre(str: string): string {
  const unwanted: Record<string, string> = {
    'á': 'A', 'é': 'E', 'í': 'I', 'ó': 'O', 'ú': 'U', 'ü': 'U', 'ñ': 'N',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N',
    'à': 'A', 'è': 'E', 'ì': 'I', 'ò': 'O', 'ù': 'U', 'À': 'A', 'È': 'E', 'Ì': 'I', 'Ò': 'O', 'Ù': 'U'
  };
  
  // Reemplazar acentos manualmente
  let res = str.split('').map(char => unwanted[char] || char).join('');
  
  // Convertir a mayúsculas
  res = res.toUpperCase();
  
  // Limpiar caracteres extraños (letras, números y espacios)
  res = res.replace(/[^A-Z0-9 ]/g, '');
  
  // Colapsar espacios y recortar
  res = res.replace(/\s+/g, ' ');
  return res.trim();
}

/**
 * Limpia la cédula en el cliente para simular búsquedas
 */
function tsCleanCedula(str: string): string {
  return str.replace(/\D/g, '');
}

/**
 * Obtiene la lista de hospitales de Venezuela
 */
export async function getHospitales(): Promise<Hospital[]> {
  // 1. Revisar si ya están en caché de memoria
  if (cacheHospitales.data) {
    console.log('[Cuídarte Cache] Hospitales devueltos de caché de memoria.');
    return cacheHospitales.data;
  }

  // 2. Intentar cargar desde localStorage para resiliencia offline extrema
  if (typeof window !== 'undefined') {
    try {
      const localStored = localStorage.getItem('cuidarte_hospitales_v2');
      if (localStored) {
        const parsed = JSON.parse(localStored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Cuídarte LocalStorage] Cargados ${parsed.length} hospitales venezolanos guardados localmente.`);
          cacheHospitales.data = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Cuídarte] Error leyendo caché persistente local de hospitales:', e);
    }
  }

  if (isMockMode) {
    cacheHospitales.data = MOCK_HOSPITALES;
    // Guardar en localStorage para siguientes inicios sin conexión
    try {
      localStorage.setItem('cuidarte_hospitales_v2', JSON.stringify(MOCK_HOSPITALES));
    } catch (_) {}
    return MOCK_HOSPITALES;
  }

  try {
    const apiBase = await getApiBase();
    const res = await fetch(`${apiBase}/hospitales.php`);
    if (!res.ok) throw new Error('Respuesta HTTP no exitosa');
    
    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      cacheHospitales.data = json.data;
      // Guardar en localStorage para siguientes inicios sin conexión
      try {
        localStorage.setItem('cuidarte_hospitales_v2', JSON.stringify(json.data));
      } catch (_) {}
      return json.data;
    }
    throw new Error(json.error || 'Formato de respuesta incorrecto');
  } catch (err) {
    console.warn('[Cuídarte] No se pudo conectar con el servidor PHP para obtener hospitales. Activando fallback local y guardando en persistencia.');
    isMockMode = true;
    cacheHospitales.data = MOCK_HOSPITALES;
    try {
      localStorage.setItem('cuidarte_hospitales_v2', JSON.stringify(MOCK_HOSPITALES));
    } catch (_) {}
    return MOCK_HOSPITALES;
  }
}

/**
 * Busca pacientes según texto y hospital opcional
 */
export async function getPacientes(q: string, hospitalId?: number | null): Promise<Paciente[]> {
  const cacheKey = `${q.trim()}_${hospitalId || 'null'}`;
  
  if (isDataSaverEnabled() && cachePacientes.has(cacheKey)) {
    console.log(`[Cuídarte Cache] Pacientes devueltos de caché local: "${cacheKey}"`);
    return cachePacientes.get(cacheKey)!;
  }

  let result: Paciente[];
  if (isMockMode) {
    result = mockSearchPacientes(q, hospitalId);
  } else {
    try {
      const apiBase = await getApiBase();
      const url = new URL(`${window.location.origin}${apiBase}/pacientes.php`);
      url.searchParams.set('q', q);
      if (hospitalId) {
        url.searchParams.set('hospital_id', String(hospitalId));
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Error de red');
      
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        result = json.data;
      } else {
        throw new Error(json.error || 'Formato de respuesta incorrecto');
      }
    } catch (err) {
      console.warn('[Cuídarte] Falló consulta a pacientes en el servidor PHP. Usando base de datos simulada de emergencia.');
      isMockMode = true;
      result = mockSearchPacientes(q, hospitalId);
    }
  }

  // Guardar en caché siempre (sirve para consultas instantáneas en modo datos bajos)
  cachePacientes.set(cacheKey, result);
  return result;
}

/**
 * Obtiene el detalle de un paciente específico por su ID
 */
export async function getPacienteDetalle(id: number): Promise<PacienteDetalle> {
  if (cachePacienteDetalle.has(id)) {
    console.log(`[Cuídarte Cache] Detalle de paciente ${id} devuelto de caché.`);
    return cachePacienteDetalle.get(id)!;
  }

  let result: PacienteDetalle;
  if (isMockMode) {
    const found = MOCK_PACIENTES.find(p => p.id === id);
    if (!found) throw new Error('Paciente no encontrado');
    result = found;
  } else {
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/pacientes.php?id=${id}`);
      if (!res.ok) throw new Error('Error de red');
      
      const json = await res.json();
      if (json.ok && json.data) {
        result = json.data as PacienteDetalle;
      } else {
        throw new Error(json.error || 'Formato incorrecto');
      }
    } catch (err) {
      isMockMode = true;
      const found = MOCK_PACIENTES.find(p => p.id === id);
      if (!found) throw new Error('Paciente no encontrado en el registro simulado');
      result = found;
    }
  }

  cachePacienteDetalle.set(id, result);
  return result;
}

/**
 * Busca medicamentos en stock de hospitales
 */
export async function getMedicamentos(
  q: string, 
  categoria?: string, 
  hospitalId?: number | null, 
  soloDisponibles?: boolean
): Promise<Medicamento[]> {
  const cacheKey = `${q.trim()}_${categoria || 'null'}_${hospitalId || 'null'}_${soloDisponibles ? '1' : '0'}`;

  if (isDataSaverEnabled() && cacheMedicamentos.has(cacheKey)) {
    console.log(`[Cuídarte Cache] Medicamentos devueltos de caché local: "${cacheKey}"`);
    return cacheMedicamentos.get(cacheKey)!;
  }

  let result: Medicamento[];
  if (isMockMode) {
    result = mockSearchMedicamentos(q, categoria, hospitalId, soloDisponibles);
  } else {
    try {
      const apiBase = await getApiBase();
      const url = new URL(`${window.location.origin}${apiBase}/medicamentos.php`);
      url.searchParams.set('q', q);
      if (categoria) url.searchParams.set('categoria', categoria);
      if (hospitalId) url.searchParams.set('hospital_id', String(hospitalId));
      if (soloDisponibles) url.searchParams.set('solo_disponibles', '1');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Error de red');
      
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        result = json.data;
      } else {
        throw new Error(json.error || 'Formato incorrecto');
      }
    } catch (err) {
      console.warn('[Cuídarte] Falló consulta a medicamentos en el servidor PHP. Usando base de datos simulada de emergencia.');
      isMockMode = true;
      result = mockSearchMedicamentos(q, categoria, hospitalId, soloDisponibles);
    }
  }

  cacheMedicamentos.set(cacheKey, result);
  return result;
}

/**
 * Obtiene el detalle de un medicamento específico
 */
export async function getMedicamentoDetalle(id: number): Promise<Medicamento> {
  if (cacheMedicamentoDetalle.has(id)) {
    console.log(`[Cuídarte Cache] Detalle de medicamento ${id} devuelto de caché.`);
    return cacheMedicamentoDetalle.get(id)!;
  }

  let result: Medicamento;
  if (isMockMode) {
    const found = MOCK_MEDICAMENTOS.find(m => m.id === id);
    if (!found) throw new Error('Medicamento no encontrado');
    result = found;
  } else {
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/medicamentos.php?id=${id}`);
      if (!res.ok) throw new Error('Error de red');
      
      const json = await res.json();
      if (json.ok && json.data) {
        result = json.data as Medicamento;
      } else {
        throw new Error(json.error || 'Formato incorrecto');
      }
    } catch (err) {
      isMockMode = true;
      const found = MOCK_MEDICAMENTOS.find(m => m.id === id);
      if (!found) throw new Error('Medicamento no encontrado en el stock simulado');
      result = found;
    }
  }

  cacheMedicamentoDetalle.set(id, result);
  return result;
}

// ==========================================
// BUSCADORES SIMULADOS (MOCK SEARCH ENGINES)
// ==========================================

function mockSearchPacientes(q: string, hospitalId?: number | null): Paciente[] {
  const queryTrimmed = q.trim();
  
  // Si no hay filtro de hospital ni query con al menos 2 letras, retornar vacío
  if (queryTrimmed.length < 2 && (hospitalId === undefined || hospitalId === null)) {
    return [];
  }

  return MOCK_PACIENTES.filter(p => {
    // Filtro por hospital
    if (hospitalId && p.hospital_id !== hospitalId) {
      return false;
    }

    if (queryTrimmed.length >= 2) {
      const qNorm = tsNormNombre(queryTrimmed);
      const cedulaClean = tsCleanCedula(queryTrimmed);
      
      const pNorm = tsNormNombre(p.nombre);
      const pCedula = p.cedula_masked; // En los mocks simulamos coincidencia parcial inteligente
      
      // Coincide por cédula limpia (si tiene números) o por nombre normalizado
      const matchNombre = pNorm.includes(qNorm);
      const matchCedula = cedulaClean.length >= 3 && p.id.toString().includes(cedulaClean); // Simular coincidencia de cédula con ID en mock
      
      return matchNombre || matchCedula;
    }

    return true;
  }).sort((a, b) => {
    // Primero no duplicados (posible_duplicado === false primero, es decir, false es menor que true)
    if (a.posible_duplicado !== b.posible_duplicado) {
      return a.posible_duplicado ? 1 : -1;
    }
    return tsNormNombre(a.nombre).localeCompare(tsNormNombre(b.nombre));
  });
}

function mockSearchMedicamentos(
  q: string, 
  categoria?: string, 
  hospitalId?: number | null, 
  soloDisponibles?: boolean
): Medicamento[] {
  const queryTrimmed = q.trim();

  return MOCK_MEDICAMENTOS.filter(m => {
    // Filtro por categoría
    if (categoria && m.categoria.toLowerCase() !== categoria.toLowerCase()) {
      return false;
    }

    // Filtro por hospital
    if (hospitalId && m.hospital_id !== hospitalId) {
      return false;
    }

    // Filtro disponibilidad
    if (soloDisponibles && !m.disponible) {
      return false;
    }

    // Filtro por texto query (mínimo 2 letras)
    if (queryTrimmed.length >= 2) {
      const qNorm = tsNormNombre(queryTrimmed);
      const mNorm = tsNormNombre(m.nombre);
      return mNorm.includes(qNorm);
    }

    return true;
  }).sort((a, b) => {
    // Ordenar por disponible desc, luego por nombre asc
    if (a.disponible !== b.disponible) {
      return a.disponible ? -1 : 1;
    }
    return tsNormNombre(a.nombre).localeCompare(tsNormNombre(b.nombre));
  });
}
