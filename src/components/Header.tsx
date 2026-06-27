import React, { useState, useEffect } from 'react';
import { Shield, Users, Pill, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { isUsingMocks } from '../apiClient';

interface HeaderProps {
  activeTab: 'pacientes' | 'medicamentos';
  setActiveTab: (tab: 'pacientes' | 'medicamentos') => void;
  onRetry: () => void;
}

export default function Header({ activeTab, setActiveTab, onRetry }: HeaderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDemoBanner, setShowDemoBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Revisar periódicamente si estamos usando los mocks
    const interval = setInterval(() => {
      setShowDemoBanner(isUsingMocks());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="w-full bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
      {/* Banner de Emergencia / Simulación */}
      {showDemoBanner && (
        <div id="demo-banner" className="bg-sky-50 border-b border-sky-100 px-4 py-2 text-center text-xs text-sky-800 font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-sky-500 shrink-0" />
          <span>
            <strong>Modo Demostración Activo:</strong> Se están utilizando datos locales. El backend completo en PHP 8 + MySQL está guardado en la carpeta <code>/backend</code> listo para producción.
          </span>
        </div>
      )}

      {/* Indicador de Desconexión */}
      {!isOnline && (
        <div id="offline-banner" className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>Usted está actualmente sin conexión a Internet. Visualizando datos guardados localmente.</span>
          <button 
            id="btn-retry-offline"
            onClick={onRetry} 
            className="ml-3 bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-sky-200 shrink-0">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-slate-950 flex items-center gap-2">
                Cuídarte <span className="text-sky-600 font-medium text-lg px-2 py-0.5 bg-sky-50 rounded-lg border border-sky-100">Venezuela</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Registro de Emergencia Sismo Junio 2026 • Ayuda Humanitaria
              </p>
            </div>
          </div>

          {/* Información del Estado del Sismo */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-right">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
            <span className="text-xs text-slate-600 font-semibold">
              Búsqueda de familiares libre de costo
            </span>
          </div>
        </div>

        {/* Sistema de Pestañas (Tabs) con Touch Targets Grandes (mínimo 44px) */}
        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
          <button
            id="tab-pacientes"
            onClick={() => setActiveTab('pacientes')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 py-2.5 sm:py-3 px-1.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'pacientes'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-100'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
            }`}
            style={{ minHeight: '48px' }}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>PACIENTES</span>
          </button>
          <button
            id="tab-medicamentos"
            onClick={() => setActiveTab('medicamentos')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 py-2.5 sm:py-3 px-1.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'medicamentos'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-100'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
            }`}
            style={{ minHeight: '48px' }}
          >
            <Pill className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>MEDICAMENTOS</span>
          </button>
        </div>
      </div>
    </header>
  );
}
