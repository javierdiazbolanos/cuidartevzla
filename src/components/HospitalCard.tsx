import React from 'react';
import { Hospital } from '../types';
import { MapPin, Phone, Building2 } from '../icons';

interface HospitalCardProps {
  hospital: Hospital;
  key?: React.Key;
}

export default function HospitalCard({ hospital }: HospitalCardProps) {
  const nombre = hospital.nombre || (hospital as any).text || 'Centro de Salud';

  // Formatear teléfono para enlace tel: (quitar paréntesis, espacios, guiones)
  const rawPhone = hospital.telefono
    ? hospital.telefono.replace(/[\(\)\s\-\.]/g, '')
    : null;

  // Detectar si es celular (empieza con 04) para prefijo internacional
  const phoneHref = rawPhone
    ? rawPhone.startsWith('04')
      ? `tel:+58${rawPhone.substring(1)}`
      : `tel:+58${rawPhone}`
    : null;

  // Formatear ubicación
  const ubicacion = [hospital.municipio, hospital.estado]
    .filter(Boolean)
    .join(', ');

  const nombreLower = nombre.toLowerCase();

  return (
    <div
      id={`hospital-card-${hospital.id}`}
      className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-sky-300 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4"
      style={{ minHeight: '80px' }}
    >
      {/* Info principal */}
      <div className="flex-1 space-y-1.5 min-w-0 w-full">
        {/* Nombre del hospital */}
        <h3 className="text-base font-bold text-slate-900 leading-tight flex items-start gap-2">
          <Building2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <span className="truncate">{nombre}</span>
        </h3>

        {/* Ubicación */}
        {ubicacion && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium ml-7">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{ubicacion}</span>
          </div>
        )}
      </div>

      {/* Botón de llamada */}
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2.5 sm:pt-0 border-t border-dashed border-slate-100 sm:border-t-0">
        {hospital.telefono ? (
          <a
            href={phoneHref || '#'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-100 transition-all cursor-pointer no-underline"
            style={{ minHeight: '44px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-4 h-4" />
            {hospital.telefono}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100">
            <Phone className="w-3.5 h-3.5" />
            Sin teléfono
          </span>
        )}

        {/* Tipo de centro */}
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">
          {nombreLower.includes('hospital') ? '🏥 Hospital' :
           nombreLower.includes('clínica') || nombreLower.includes('clinica') ? '🏨 Clínica' :
           nombreLower.includes('policlínica') || nombreLower.includes('policlinica') ? '🏨 Policlínica' :
           nombreLower.includes('cruz roja') ? '🚑 Emergencias' :
           nombreLower.includes('ivss') || nombreLower.includes('seguro') ? '🏥 Público' :
           '🏥 Centro de Salud'}
        </span>
      </div>
    </div>
  );
}