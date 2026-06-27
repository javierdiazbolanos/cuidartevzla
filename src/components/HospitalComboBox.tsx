import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Hospital } from '../types';
import { Search, X, MapPin, Check, ChevronDown, Building2 } from 'lucide-react';

interface HospitalComboBoxProps {
  hospitales: Hospital[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  id?: string;
}

export default function HospitalComboBox({
  hospitales,
  selectedId,
  onChange,
  placeholder = 'Buscar centro médico...',
  id = 'hospital-combobox'
}: HospitalComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedHospital = useMemo(() => {
    return hospitales.find(h => h.id === selectedId) || null;
  }, [hospitales, selectedId]);

  // Filtrar hospitales por consulta de búsqueda (nombre, estado, municipio) de forma ultra-rápida en memoria
  const filteredHospitales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return hospitales;
    return hospitales.filter(h => 
      h.nombre.toLowerCase().includes(q) || 
      (h.estado && h.estado.toLowerCase().includes(q)) ||
      (h.municipio && h.municipio.toLowerCase().includes(q))
    );
  }, [hospitales, searchQuery]);

  // Agrupar por estado para una navegación geográfica sumamente clara, ordenada y ágil
  const hospitalesPorEstado = useMemo(() => {
    const groups: { [estado: string]: Hospital[] } = {};
    filteredHospitales.forEach(h => {
      const estado = h.estado || 'Otros Estados';
      if (!groups[estado]) {
        groups[estado] = [];
      }
      groups[estado].push(h);
    });
    return groups;
  }, [filteredHospitales]);

  // Ordenar estados alfabéticamente
  const estadosOrdenados = useMemo(() => {
    return Object.keys(hospitalesPorEstado).sort((a, b) => a.localeCompare(b));
  }, [hospitalesPorEstado]);

  const handleSelect = (hospitalId: number | null) => {
    onChange(hospitalId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div id={`${id}-container`} className="relative w-full" ref={containerRef}>
      {/* Gatillo / Botón Principal del ComboBox */}
      <div className="relative">
        <button
          id={`${id}-trigger`}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between pl-3.5 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold text-left transition-all bg-slate-50/50 cursor-pointer ${
            isOpen 
              ? 'border-sky-500 ring-2 ring-sky-100 bg-white text-slate-800' 
              : selectedHospital 
                ? 'border-sky-200 text-sky-950 font-bold bg-sky-50/20 hover:bg-sky-50/40' 
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
          style={{ minHeight: '44px' }}
        >
          <div className="flex items-center gap-2 truncate pr-1">
            <Building2 className={`w-4 h-4 shrink-0 ${selectedHospital ? 'text-sky-600' : 'text-slate-400'}`} />
            <span className="truncate">
              {selectedHospital 
                ? `${selectedHospital.nombre} (${selectedHospital.estado || 'S.I.'})` 
                : placeholder
              }
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
        </button>

        {selectedHospital && (
          <button
            id={`${id}-clear`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
            }}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            title="Quitar filtro"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Menú Desplegable Flotante con Autocompletado */}
      {isOpen && (
        <div
          id={`${id}-dropdown`}
          className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[340px] animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* Caja de Búsqueda Interna del ComboBox */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 shrink-0">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
            <input
              id={`${id}-search-input`}
              type="text"
              autoFocus
              placeholder="Filtre por nombre, estado o municipio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-semibold"
              style={{ minHeight: '36px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista Scrolleable agrupada por Estados de Venezuela */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs [scrollbar-width:thin]">
            {/* Opción para restaurar / Todos */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-4 py-3 font-bold flex items-center justify-between hover:bg-sky-50/30 cursor-pointer ${
                selectedId === null ? 'text-sky-700 bg-sky-50/50' : 'text-slate-600'
              }`}
            >
              <span>-- Todos los Hospitales / Cobertura Completa --</span>
              {selectedId === null && <Check className="w-4 h-4 text-sky-600" />}
            </button>

            {estadosOrdenados.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-medium">
                Sin coincidencias encontradas
              </div>
            ) : (
              estadosOrdenados.map(estado => (
                <div key={estado} className="bg-white">
                  {/* Cabecera del Estado / Región */}
                  <div className="sticky top-0 bg-slate-50 px-4 py-1.5 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5 border-y border-slate-100/60 z-10">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {estado}
                  </div>

                  {/* Centros Médicos de este Estado */}
                  <div className="divide-y divide-slate-50">
                    {hospitalesPorEstado[estado].map(hospital => (
                      <button
                        key={hospital.id}
                        type="button"
                        onClick={() => handleSelect(hospital.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-slate-50 cursor-pointer text-xs sm:text-sm ${
                          selectedId === hospital.id 
                            ? 'text-sky-700 font-bold bg-sky-50/40 hover:bg-sky-50/50' 
                            : 'text-slate-700 font-medium'
                        }`}
                        style={{ minHeight: '40px' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{hospital.nombre}</p>
                          {hospital.municipio && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Municipio: {hospital.municipio}
                            </p>
                          )}
                        </div>
                        {selectedId === hospital.id && (
                          <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
