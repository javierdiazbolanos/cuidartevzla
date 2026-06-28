import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Home, AlertTriangle, X } from 'lucide-react';
import { Edificio } from '../types';
import { getEdificios } from '../apiClient';

export default function BuildingList() {
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [query, setQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'total' | 'severo'>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadEdificios();

    // Refrescar cada 5 minutos
    const interval = setInterval(loadEdificios, 300000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };

    async function loadEdificios() {
      try {
        const data = await getEdificios(query, filtroTipo === 'todos' ? '' : filtroTipo);
        if (mounted) {
          setEdificios(data);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }
  }, [query, filtroTipo]);

  const filtered = edificios.filter(e => {
    if (filtroTipo !== 'todos' && e.tipo_dano !== filtroTipo) return false;
    if (query) {
      const q = query.toLowerCase();
      return e.nombre.toLowerCase().includes(q) || e.observacion.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: edificios.filter(e => e.tipo_dano === 'total').length,
    severo: edificios.filter(e => e.tipo_dano === 'severo').length,
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-50">
          <span className="text-xs font-bold text-slate-500">Edificios Afectados por el Sismo</span>
          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg font-mono">
            🏚️ {edificios.length} edificios registrados
          </span>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar edificio por nombre o ubicación..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all bg-slate-50/50"
            style={{ minHeight: '48px' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros por tipo */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroTipo('todos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroTipo === 'todos'
                ? 'bg-slate-800 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({edificios.length})
          </button>
          <button
            onClick={() => setFiltroTipo('total')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filtroTipo === 'total'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Daño Total ({stats.total})
          </button>
          <button
            onClick={() => setFiltroTipo('severo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filtroTipo === 'severo'
                ? 'bg-amber-500 text-white shadow'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Daño Severo ({stats.severo})
          </button>
        </div>
      </div>

      {/* Lista de edificios */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <Home className="w-10 h-10 mx-auto mb-3 animate-pulse" />
          <p className="text-sm font-semibold">Cargando edificios afectados...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
          <Home className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No se encontraron edificios</p>
          <p className="text-xs text-slate-400 mt-1">Intenta con otro término de búsqueda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((edificio) => {
            const isTotal = edificio.tipo_dano === 'total';
            return (
              <div
                key={edificio.id}
                className={`bg-white rounded-xl p-4 border shadow-sm transition-all hover:shadow-md ${
                  isTotal ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isTotal ? (
                        <Home className="w-4 h-4 text-rose-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <h3 className="text-sm font-bold text-slate-800 truncate">
                        {edificio.nombre}
                      </h3>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isTotal
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isTotal ? 'DAÑO TOTAL' : 'DAÑO SEVERO'}
                      </span>
                    </div>
                    {edificio.observacion && (
                      <p className="text-xs text-slate-500 ml-6 line-clamp-2">
                        📍 {edificio.observacion}
                      </p>
                    )}
                  </div>
                  {edificio.enlace && (
                    <a
                      href={edificio.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`shrink-0 flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        isTotal
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ficha
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agradecimiento */}
      <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 rounded-2xl p-5 border border-sky-200 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🙏</span>
          <div>
            <p className="text-sm font-bold text-sky-800 leading-relaxed">
              Agradecimiento especial a la web{' '}
              <a
                href="https://terremotovenezuela.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:text-sky-700 underline decoration-sky-300 underline-offset-2 transition-colors"
              >
                terremotovenezuela.com
              </a>{' '}
              por los datos sobre edificaciones afectadas.
            </p>
            <p className="text-xs font-semibold text-sky-600 mt-1.5 flex items-center gap-1">
              🇻🇪 Todos unidos por Venezuela.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}