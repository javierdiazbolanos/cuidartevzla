import React, { useState, useEffect } from 'react';
import { Shield, Users, Pill, WifiOff, RefreshCw, AlertCircle, Car } from 'lucide-react';
import { isUsingMocks } from '../apiClient';

interface HeaderProps {
  activeTab: 'pacientes' | 'insumos' | 'transporte';
  setActiveTab: (tab: 'pacientes' | 'insumos' | 'transporte') => void;
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
        <div id="demo-banner" className="bg-sky-50 border-b border-sky-100 px-4 py-2 text-center text-xs text-sky-800 font-semibold flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-sky-500 shrink-0" />
          <span>
            <strong>Modo Demo Activo:</strong> Estamos usando los datos de tu teléfono. El backend completo con PHP 8 y MySQL está listo en la carpeta <code>/backend</code> para cuando lo montes en producción.
          </span>
        </div>
      )}

      {/* Indicador de Desconexión */}
      {!isOnline && (
        <div id="offline-banner" className="bg-amber-500 text-white px-4 py-2 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>¡Pana, te quedaste sin señal! Pero tranquilo, estás viendo la información guardada en tu teléfono.</span>
          <button 
            id="btn-retry-offline"
            onClick={onRetry} 
            className="ml-2 bg-white/20 hover:bg-white/30 text-white text-[10px] sm:text-xs px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            {/* Logo de Cuídarte Venezuela en SVG de alta resolución */}
            <img 
              src="/logo_cuidarte.svg" 
              alt="Logo Cuídarte Venezuela" 
              className="w-14 h-14 shrink-0 shadow-md shadow-sky-200/50 rounded-2xl select-none object-contain" 
              id="logo-cuidarte-vzla"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-0.5 max-w-xl">
              <h1 className="text-lg sm:text-xl font-display font-bold tracking-tight text-slate-950 flex flex-wrap items-center gap-x-2 gap-y-1">
                Cuídarte <span className="text-sky-600 font-medium text-sm px-2 py-0.5 bg-sky-50 rounded-lg border border-sky-100 leading-none">Venezuela</span>
              </h1>
              <h2 className="text-xs font-extrabold text-slate-800 leading-tight">
                Lista de Pacientes — Terremoto Venezuela
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                Este es un buscador digital de los listados que se publican en Redes Sociales, no pretendemos ser exhaustivos.
              </p>
            </div>
          </div>

          {/* Información del Estado del Sismo */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-right">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
            <span className="text-xs text-slate-600 font-bold">
              Busca a tu gente totalmente gratis
            </span>
          </div>
        </div>

        {/* Sistema de Pestañas (Tabs) con Touch Targets Grandes (mínimo 44px) */}
        <div className="mt-5 flex flex-wrap sm:flex-nowrap gap-2 border-t border-slate-100 pt-4">
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
            id="tab-insumos"
            onClick={() => setActiveTab('insumos')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 py-2.5 sm:py-3 px-1.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'insumos'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-100'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
            }`}
            style={{ minHeight: '48px' }}
          >
            <Pill className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>INSUMOS</span>
          </button>
          <button
            id="tab-transporte"
            onClick={() => setActiveTab('transporte')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 py-2.5 sm:py-3 px-1.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'transporte'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-100'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
            }`}
            style={{ minHeight: '48px' }}
          >
            <Car className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>TRANSPORTE</span>
          </button>
        </div>
      </div>
    </header>
  );
}
