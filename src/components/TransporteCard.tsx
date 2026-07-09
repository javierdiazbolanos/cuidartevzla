import React from 'react';
import { Transporte } from '../types';
import { Phone, MessageSquare, Car, Users, Package, MapPin, AlertCircle } from '../icons';

interface TransporteCardProps {
  key?: React.Key;
  transporte: Transporte;
  onEdit?: (transporte: Transporte) => void;
}

export default function TransporteCard({ transporte, onEdit }: TransporteCardProps) {
  // Limpiar el teléfono para el enlace de WhatsApp (dejar solo números)
  const cleanPhoneForWhatsapp = transporte.telefono.replace(/[^\d]/g, '');
  
  // Mensaje predeterminado de WhatsApp para emergencias
  const whatsappMessage = encodeURIComponent(
    `Hola ${transporte.nombre}, vi tu contacto en la plataforma de emergencia "Cuídarte Venezuela" donde ofreces tu vehículo (${transporte.vehiculo}). ¿Sigue disponible para un traslado voluntario?`
  );

  return (
    <div
      id={`transporte-card-${transporte.id}`}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-sky-300 transition-all flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div className="space-y-1">
          {/* Nombre de la persona */}
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {transporte.nombre}
          </h3>
          
          {/* Ciudad y Estado */}
          <div className="flex items-center gap-1.5 text-xs text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-lg w-fit border border-sky-100">
            <MapPin className="w-3.5 h-3.5" />
            <span>{transporte.ciudad}, Venezuela</span>
          </div>
        </div>

        {/* Badge de Disponibilidad y gestión */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
          <div>
            {transporte.disponible ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Disponible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-50 text-slate-500 border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Inactivo
              </span>
            )}
          </div>
          
          {onEdit && (
            <button
              onClick={() => onEdit(transporte)}
              className="text-[11px] font-bold text-slate-500 hover:text-sky-700 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 bg-white select-none shadow-xs active:scale-95"
              title="Modificar disponibilidad, datos o eliminar este registro"
              style={{ minHeight: '28px' }}
            >
              ⚙️ Gestionar
            </button>
          )}
        </div>
      </div>

      {/* Detalles del Vehículo y Capacidad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50 text-xs text-slate-700">
        {/* Vehículo */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-slate-500">
            <Car className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vehículo</p>
            <p className="font-bold truncate">{transporte.vehiculo}</p>
          </div>
        </div>

        {/* Capacidad de Personas */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-slate-500">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puestos</p>
            <p className="font-bold">{transporte.capacidad_personas} personas</p>
          </div>
        </div>

        {/* Capacidad de Carga */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-slate-500">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Carga</p>
            <p className="font-bold truncate">{transporte.capacidad_carga}</p>
          </div>
        </div>
      </div>

      {/* Notas del voluntario */}
      {transporte.notas && (
        <p className="text-xs text-slate-600 bg-amber-50/50 border border-amber-100/30 p-2.5 rounded-xl italic">
          "{transporte.notas}"
        </p>
      )}

      {/* Botones de acción directos */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed border-slate-100">
        {/* Llamar por teléfono */}
        <a
          id={`btn-call-${transporte.id}`}
          href={`tel:${transporte.telefono}`}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm text-center"
          style={{ minHeight: '44px' }}
        >
          <Phone className="w-4 h-4 text-sky-600" />
          Llamar Teléfono
        </a>

        {/* Enviar mensaje por WhatsApp */}
        <a
          id={`btn-whatsapp-${transporte.id}`}
          href={`https://wa.me/${cleanPhoneForWhatsapp}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-100 hover:shadow-none text-center"
          style={{ minHeight: '44px' }}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
