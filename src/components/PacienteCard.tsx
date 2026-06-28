import React from 'react';
import { Paciente } from '../types';
import { Calendar, Building, HelpCircle, AlertTriangle, ChevronRight } from 'lucide-react';

interface PacienteCardProps {
  key?: React.Key;
  paciente: Paciente;
  onTap: (id: number) => void;
}

export default function PacienteCard({ paciente, onTap }: PacienteCardProps) {
  // Configuración de colores según el estado
  const stateConfig = {
    hospitalizado: { bg: 'bg-blue-50 text-blue-700 border-blue-100', text: 'Hospitalizado', dot: 'bg-blue-500' },
    alta: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'Dado de Alta', dot: 'bg-emerald-500' },
    referido: { bg: 'bg-amber-50 text-amber-700 border-amber-100', text: 'Trasladado', dot: 'bg-amber-500' },
    fallecido: { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Fallecido', dot: 'bg-slate-500' },
    desconocido: { bg: 'bg-rose-50 text-rose-700 border-rose-100', text: 'En Observación', dot: 'bg-rose-500' }
  };

  const config = stateConfig[paciente.estado] || stateConfig.desconocido;

  return (
    <div
      id={`paciente-card-${paciente.id}`}
      onClick={() => onTap(paciente.id)}
      className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-sky-300 active:bg-slate-50 transition-all cursor-pointer flex flex-col min-[420px]:flex-row justify-between items-start min-[420px]:items-center gap-3 min-[420px]:gap-4"
      style={{ minHeight: '80px' }}
    >
      <div className="flex-1 space-y-1.5 min-w-0 w-full">
        {/* Cabecera del Paciente: Nombre */}
        <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
          {paciente.nombre}
        </h3>

        {/* Fila de Datos Secundarios: Edad y Sexo */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 font-medium font-mono">
          <span>Edad: {paciente.edad !== null ? `${paciente.edad} años` : 'Sin datos'}</span>
          <span className="text-slate-300">•</span>
          <span>Sexo: {paciente.sexo}</span>
          <span className="text-slate-300">•</span>
          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
            C.I.: {paciente.cedula_masked}
          </span>
        </div>

        {/* Fila del Hospital */}
        <div className="flex items-start gap-1.5 text-xs text-slate-600">
          <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span className="font-semibold truncate">{paciente.hospital}</span>
        </div>

        {/* Fila de Fecha */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Entró el: {paciente.ingreso_fecha ? paciente.ingreso_fecha : 'No especificado'}</span>
        </div>
      </div>

      {/* Badges de Estado y Alertas */}
      <div className="flex flex-row min-[420px]:flex-col items-center min-[420px]:items-end justify-between w-full min-[420px]:w-auto gap-2 shrink-0 pt-2.5 min-[420px]:pt-0 border-t border-dashed border-slate-100 min-[420px]:border-t-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.text}
          </span>

          {paciente.posible_duplicado && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold uppercase tracking-wide">
              <AlertTriangle className="w-3 h-3" /> Duplicado
            </span>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-slate-400 hidden min-[420px]:block mt-1" />
        <span className="text-[10px] font-bold text-slate-400 flex min-[420px]:hidden items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
          Detalles <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
