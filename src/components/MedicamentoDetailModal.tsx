import React, { useEffect, useState } from 'react';
import { Medicamento } from '../types';
import { getMedicamentoDetalle } from '../apiClient';
import { X, Building, Layers, Heart, Info, AlertTriangle, HelpCircle } from 'lucide-react';

interface MedicamentoDetailModalProps {
  medicamentoId: number;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export default function MedicamentoDetailModal({ medicamentoId, onClose, showToast }: MedicamentoDetailModalProps) {
  const [detail, setDetail] = useState<Medicamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMedicamentoDetalle(medicamentoId)
      .then(data => {
        if (active) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'Error al cargar detalles del medicamento');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [medicamentoId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-700">Revisando el inventario del hospital, espérate un momento...</p>
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
          <p className="text-sm font-bold text-slate-900">¡Epa! Algo salió mal</p>
          <p className="text-xs text-slate-500">{error || 'No pudimos conseguir los detalles del medicamento'}</p>
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-none">
        
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-display font-bold text-slate-900">Detalles del Suministro de Medicinas</h2>
          </div>
          <button 
            id="btn-close-med-modal"
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-5 py-6 space-y-5 overflow-y-auto">
          {/* Identidad de Medicamento */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Medicamento / Insumo</span>
            <h3 className="text-xl font-bold text-slate-900">{detail.nombre}</h3>
            
            <div className="flex items-center gap-2 pt-1.5">
              <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold uppercase rounded font-mono">
                Categoría: {detail.categoria}
              </span>
            </div>
          </div>

          {/* Stock y Disponibilidad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 font-mono block">¿CUÁNTOS QUEDAN?</span>
              <span className="text-lg font-mono font-bold text-slate-800">
                {detail.cantidad} {detail.unidad}
              </span>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 font-mono block">¿HAY EN EXISTENCIA?</span>
              {detail.disponible && detail.cantidad > 0 ? (
                <span className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                  Sí hay
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span>
                  Se acabó
                </span>
              )}
            </div>
          </div>

          {/* Hospital Custodio */}
          <div className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <Building className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 font-mono block">HOSPITAL DONDE ESTÁ</span>
              <span className="text-sm font-bold text-slate-800 leading-snug">{detail.hospital}</span>
            </div>
          </div>

          {/* Donante / Origen */}
          <div className="flex gap-3 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
            <Heart className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 font-mono block">QUIÉN LO DONÓ</span>
              <span className="text-sm font-semibold text-sky-950">{detail.donante || 'Donante Anónimo (Alguien chévere)'}</span>
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Notas de Distribución e Indicaciones</span>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-slate-800 text-sm leading-relaxed font-medium">
              {detail.notas || 'No hay notas adicionales de cuidado o distribución.'}
            </div>
          </div>

          {/* Información de Acceso */}
          <div className="p-3 bg-slate-50 rounded-xl flex gap-2 items-start">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-normal">
              Para pedir este medicamento, ve a la farmacia interna del hospital que dice arriba. No te olvides de llevar el informe médico y tu cédula de identidad.
            </p>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            id="btn-close-med-modal-bottom"
            onClick={onClose}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-100 transition-colors cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            Cerrar Información
          </button>
        </div>

      </div>
    </div>
  );
}
