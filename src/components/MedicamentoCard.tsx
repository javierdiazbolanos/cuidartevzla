import React from 'react';
import { Medicamento } from '../types';
import { Pill, Building, Layers, Eye } from 'lucide-react';

interface MedicamentoCardProps {
  key?: React.Key;
  medicamento: Medicamento;
  onTap: (id: number) => void;
}

export default function MedicamentoCard({ medicamento, onTap }: MedicamentoCardProps) {
  // Colores de categorías
  const categoryColors: Record<string, string> = {
    analgesico: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    antibiotico: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cardiovascular: 'bg-rose-50 text-rose-700 border-rose-100',
    hidratacion: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    'material de curacion': 'bg-slate-100 text-slate-700 border-slate-200',
    diabetes: 'bg-orange-50 text-orange-700 border-orange-100',
    respiratorio: 'bg-sky-50 text-sky-700 border-sky-100',
    otro: 'bg-amber-50 text-amber-700 border-amber-100'
  };

  const key = medicamento.categoria.toLowerCase();
  const catColor = categoryColors[key] || categoryColors.otro;

  return (
    <div
      id={`medicamento-card-${medicamento.id}`}
      onClick={() => onTap(medicamento.id)}
      className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-sky-300 active:bg-slate-50 transition-all cursor-pointer flex flex-col min-[420px]:flex-row justify-between items-start min-[420px]:items-center gap-3 min-[420px]:gap-4"
      style={{ minHeight: '80px' }}
    >
      <div className="flex-1 space-y-1.5 min-w-0 w-full">
        {/* Cabecera del Medicamento: Nombre */}
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-sky-600 shrink-0" />
          <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
            {medicamento.nombre}
          </h3>
        </div>

        {/* Fila de Categoría y Cantidad */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${catColor}`}>
            {medicamento.categoria}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-mono font-bold text-slate-700">
            Cantidad: {medicamento.cantidad} {medicamento.unidad}
          </span>
        </div>

        {/* Hospital que lo posee */}
        <div className="flex items-start gap-1.5 text-xs text-slate-600">
          <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span className="font-semibold truncate">{medicamento.hospital}</span>
        </div>
      </div>

      {/* Disponibilidad e indicador */}
      <div className="flex flex-row min-[420px]:flex-col items-center min-[420px]:items-end justify-between w-full min-[420px]:w-auto gap-2 shrink-0 pt-2.5 min-[420px]:pt-0 border-t border-dashed border-slate-100 min-[420px]:border-t-0">
        {medicamento.disponible && medicamento.cantidad > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Disponible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-50 text-rose-700 border-rose-100">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Agotado
          </span>
        )}
        
        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
          Detalles <Eye className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
