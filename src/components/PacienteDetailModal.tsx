import React, { useEffect, useState } from 'react';
import { PacienteDetalle } from '../types';
import { getPacienteDetalle } from '../apiClient';
import { X, Calendar, Building, MapPin, Share2, AlertTriangle, MessageSquare, Info } from 'lucide-react';

interface PacienteDetailModalProps {
  pacienteId: number;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export default function PacienteDetailModal({ pacienteId, onClose, showToast }: PacienteDetailModalProps) {
  const [detail, setDetail] = useState<PacienteDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPacienteDetalle(pacienteId)
      .then(data => {
        if (active) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'Error al cargar detalles del paciente');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [pacienteId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-700">Buscando la ficha de ingreso, aguántame un momento...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">¡Epa! Hubo un problema</p>
          <p className="text-xs text-slate-500">{error || 'No pudimos conseguir los detalles de tu familiar'}</p>
          <button 
            onClick={onClose} 
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Generar mensaje para WhatsApp con tono venezolano pana
  const shareText = `¡Buenas noticias pana! Encontré a: ${detail.nombre}, de ${detail.edad !== null ? `${detail.edad} años` : 'edad no anotada'}, en el hospital ${detail.hospital}. Fecha de ingreso: ${detail.ingreso_fecha || 'no anotada'}.`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  // Colores de estado
  const stateColorClasses = {
    hospitalizado: 'bg-blue-600 text-white',
    alta: 'bg-emerald-600 text-white',
    referido: 'bg-amber-500 text-white',
    fallecido: 'bg-slate-700 text-white',
    desconocido: 'bg-rose-600 text-white'
  };

  const stateText = {
    hospitalizado: 'HOSPITALIZADO (En Tratamiento)',
    alta: 'DADO DE ALTA (Egreso Médico)',
    referido: 'REFERIDO A OTRO CENTRO',
    fallecido: 'FALLECIDO (En Morgue)',
    desconocido: 'EN OBSERVACIÓN / SIN IDENTIDAD CONFIRMADA'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-none">
        
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-display font-bold text-slate-900">Ficha Médica de Emergencia</h2>
          </div>
          <button 
            id="btn-close-modal"
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-6 space-y-5 overflow-y-auto">
          {/* Identidad */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Nombre Completo</span>
            <h3 className="text-xl font-bold text-slate-900">{detail.nombre}</h3>
            
            <div className="flex gap-4 pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-slate-400 font-mono">CÉDULA DE IDENTIDAD</span>
                <span className="text-xs font-mono font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded mt-0.5">
                  {detail.cedula_masked}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-slate-400 font-mono">EDAD</span>
                <span className="text-xs font-bold text-slate-700 mt-0.5">
                  {detail.edad !== null ? `${detail.edad} años` : 'No la anotaron'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-slate-400 font-mono">SEXO</span>
                <span className="text-xs font-bold text-slate-700 mt-0.5">{detail.sexo}</span>
              </div>
            </div>
          </div>

          {/* Estado de Salud actual */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Estado en el Hospital</span>
            <div className={`p-3 rounded-xl flex items-center justify-between ${stateColorClasses[detail.estado]} shadow-inner`}>
              <span className="text-xs font-extrabold tracking-wide">{stateText[detail.estado]}</span>
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
            </div>
          </div>

          {/* Ubicación y Hospitalización */}
          <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex gap-3">
              <Building className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono block">Centro Médico</span>
                <span className="text-sm font-bold text-slate-800 leading-snug">{detail.hospital}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono block">¿De dónde viene? / Zona de Origen</span>
                <span className="text-sm font-semibold text-slate-700">{detail.procedencia}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono block">Fecha cuando ingresó</span>
                <span className="text-sm font-mono font-semibold text-slate-700">
                  {detail.ingreso_fecha || 'No la anotaron'}
                </span>
              </div>
            </div>
          </div>

          {/* Detalles de Ingreso */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">¿Qué tiene? / Diagnóstico Inicial</span>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-slate-800 text-sm leading-relaxed font-medium">
              {detail.ingreso_detalle}
            </div>
          </div>

          {/* Alertas */}
          {detail.posible_duplicado && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex gap-2.5 items-start">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">Pilas: Registro Duplicado</h4>
                <p className="text-[11px] text-rose-700 leading-snug">
                  Parece que hay más de un registro con este nombre o cédula. Los panas voluntarios están revisando la base de datos para arreglar esto rápido.
                </p>
              </div>
            </div>
          )}

          {/* Cláusula de Privacidad */}
          <p className="text-[10px] text-slate-400 text-center leading-normal">
            * Ocultamos los últimos números de la cédula para cuidar la privacidad de la familia, tal como lo pide la ley de salud venezolana.
          </p>
        </div>

        {/* Acciones del Modal */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2 shrink-0">
          {/* Botón de Compartir WhatsApp con Altura 44px o superior */}
          <a
            id="btn-whatsapp-share"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            style={{ minHeight: '48px' }}
          >
            <MessageSquare className="w-5 h-5" />
            <span>COMPARTIR POR WHATSAPP</span>
          </a>

          <button
            id="btn-close-modal-bottom"
            onClick={onClose}
            className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
}
