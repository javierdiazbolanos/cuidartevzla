import React from 'react';
import { Hospital } from '../types';
import { MapPin, Phone, Building2, Navigation } from 'lucide-react';

interface HospitalCardProps {
  hospital: Hospital;
}

export default function HospitalCard({ hospital }: HospitalCardProps) {
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
          <span className="truncate">{hospital.nombre}</span>
        </h3>

        {/* Ubicación */}
        {ubicacion && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium ml-7">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{ubicacion}</span>
          </div>
        )}

        {/* Navegar (Google Maps) */}
        {hospital.lat && hospital.lng && (
          <div className="ml-7">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Navigation className="w-3 h-3" />
              Cómo llegar
            </a>
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
          {hospital.nombre.toLowerCase().includes('hospital') ? '🏥 Hospital' :
           hospital.nombre.toLowerCase().includes('clínica') || hospital.nombre.toLowerCase().includes('clinica') ? '🏨 Clínica' :
           hospital.nombre.toLowerCase().includes('policlínica') || hospital.nombre.toLowerCase().includes('policlinica') ? '🏨 Policlínica' :
           hospital.nombre.toLowerCase().includes('cruz roja') ? '🚑 Emergencias' :
           hospital.nombre.toLowerCase().includes('ivss') || hospital.nombre.toLowerCase().includes('seguro') ? '🏥 Público' :
           '🏥 Centro de Salud'}
        </span>
      </div>
    </div>
  );
}