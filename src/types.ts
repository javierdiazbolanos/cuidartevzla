/**
 * Cuídarte Venezuela - Modelos de Datos en TypeScript
 * Terremotos de Venezuela - Junio de 2026
 */

export interface Hospital {
  id: number;
  nombre: string;
  municipio?: string | null;
  estado?: string | null;
  lat?: number | null;
  lng?: number | null;
  telefono?: string | null;
}

export type EstadoPaciente = 'hospitalizado' | 'alta' | 'referido' | 'fallecido' | 'desconocido';

export interface Paciente {
  id: number;
  nombre: string;
  edad: number | null;
  sexo: 'Masculino' | 'Femenino' | 'Desconocido';
  hospital: string;
  hospital_id: number | null;
  ingreso_fecha: string | null;
  estado: EstadoPaciente;
  posible_duplicado: boolean;
  cedula_masked: string;
}

export interface PacienteDetalle extends Paciente {
  procedencia: string;
  ingreso_detalle: string;
  cedula_enmascarada?: string; // Duplicado de seguridad en español
}

export interface Insumo {
  id: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  hospital: string;
  hospital_id: number | null;
  disponible: boolean;
  donante?: string | null;
  notas?: string | null;
}

export type Medicamento = Insumo;

export interface Edificio {
  id: number;
  nombre: string;
  tipo_dano: 'total' | 'severo';
  observacion: string;
  enlace: string;
}

export interface Transporte {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string;
  vehiculo: string;
  capacidad_personas: number;
  capacidad_carga: string;
  disponible: boolean;
  notas?: string | null;
  cedula?: string;
}
