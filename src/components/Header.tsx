import React, { useState, useEffect } from 'react';
import { 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  Users, 
  Home, 
  Pill, 
  Car, 
  Building2
} from '../icons';
import { isUsingMocks } from '../apiClient';

interface HeaderProps {
  activeTab: 'pacientes' | 'insumos' | 'transporte' | 'hospitales' | 'edificios';
  setActiveTab: (tab: 'pacientes' | 'insumos' | 'transporte' | 'hospitales' | 'edificios') => void;
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
    <header className="relative w-full border-b border-slate-200 bg-white">
      {/* Banner de Emergencia / Simulación */}
      {showDemoBanner && (
        <div id="demo-banner" className="bg-sky-50 border-b border-sky-100 px-3 py-2 text-center text-[10px] sm:text-xs text-sky-800 font-semibold flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="leading-tight">
            <strong>Modo Demo:</strong> Datos de respaldo cargados. PHP 8 + MySQL listos en <code>/backend</code>.
          </span>
        </div>
      )}

      {/* Indicador de Desconexión */}
      {!isOnline && (
        <div id="offline-banner" className="bg-amber-500 text-white px-3 py-2 text-center text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 leading-tight">
          <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>Sin señal. Visualizando información guardada localmente.</span>
          <button 
            id="btn-retry-offline"
            onClick={onRetry} 
            className="ml-1 bg-white/20 hover:bg-white/30 text-white text-[9px] sm:text-xs px-2 py-0.5 rounded font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Reintentar
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5">
        <div className="flex flex-row items-center justify-between gap-2">
          {/* Logo y Título Alineados a la izquierda */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-left min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden shrink-0">
              <img 
                src="https://raw.githubusercontent.com/javierdiazbolanos/cuidartevzla/main/public/logo_cuidarte.svg" 
                alt="Cuídarte Venezuela" 
                className="w-full h-full object-cover select-none" 
                id="logo-cuidarte-vzla"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="text-[7px] sm:text-[9px] font-mono font-black tracking-wider text-sky-800 uppercase bg-sky-50 border border-sky-100 px-1 sm:px-1.5 py-0.5 rounded leading-none">
                  OPERATIVO INTERNO
                </span>
                <span className="text-[7px] sm:text-[9px] font-mono text-slate-400 font-medium bg-slate-50 border border-slate-100 px-1 sm:px-1.5 py-0.5 rounded leading-none">
                  Sismo Jun-2026
                </span>
                {/* Indicador de conexión compacto micro en JetBrains Mono */}
                <div className="flex items-center gap-1 ml-1 text-[7px] sm:text-[9px] font-mono font-medium text-slate-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="hidden xs:inline">CONECTADO</span>
                </div>
              </div>
              
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-slate-800 tracking-tight font-display leading-tight truncate">
                Cuídarte <span className="text-sky-600 font-bold">Venezuela</span>
              </h1>
              
              <p className="text-[8px] sm:text-[11px] text-slate-500 font-sans flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 leading-none">
                <span className="truncate max-w-[120px] sm:max-w-none">Sistema de Emergencias • <strong className="text-slate-700 font-semibold">Cuídarte</strong></span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <a href="/" className="text-sky-600 hover:text-sky-800 font-bold hover:underline inline-flex items-center gap-1 transition-colors">Ir a búsqueda</a>
              </p>
            </div>
          </div>
        </div>

        {/* Sistema de Pestañas (Tabs) con Diseño Responsivo */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex flex-row w-full gap-0.5 xs:gap-1 sm:gap-1.5">
            
            {/* Pestaña: Pacientes */}
            <button
              id="tab-pacientes"
              onClick={() => setActiveTab('pacientes')}
              className={`flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 py-1 xs:py-1.5 sm:py-2 px-0.5 xs:px-1 rounded-lg text-[8px] xs:text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer flex-1 animate-fadeIn ${
                activeTab === 'pacientes'
                  ? 'bg-slate-50 text-sky-600 border border-sky-200/80 shadow-xs'
                  : 'bg-white hover:bg-slate-50/50 text-slate-500 hover:text-slate-700 border border-slate-100/80'
              }`}
            >
              <Users className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span>PACIENTES</span>
            </button>

            {/* Pestaña: Edificios */}
            <button
              id="tab-edificios"
              onClick={() => setActiveTab('edificios')}
              className={`flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 py-1 xs:py-1.5 sm:py-2 px-0.5 xs:px-1 rounded-lg text-[8px] xs:text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer flex-1 animate-fadeIn ${
                activeTab === 'edificios'
                  ? 'bg-slate-50 text-sky-600 border border-sky-200/80 shadow-xs'
                  : 'bg-white hover:bg-slate-50/50 text-slate-500 hover:text-slate-700 border border-slate-100/80'
              }`}
            >
              <Home className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span>EDIFICIOS</span>
            </button>

            {/* Pestaña: Insumos */}
            <button
              id="tab-insumos"
              onClick={() => setActiveTab('insumos')}
              className={`flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 py-1 xs:py-1.5 sm:py-2 px-0.5 xs:px-1 rounded-lg text-[8px] xs:text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer flex-1 animate-fadeIn ${
                activeTab === 'insumos'
                  ? 'bg-slate-50 text-sky-600 border border-sky-200/80 shadow-xs'
                  : 'bg-white hover:bg-slate-50/50 text-slate-500 hover:text-slate-700 border border-slate-100/80'
              }`}
            >
              <Pill className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span>INSUMOS</span>
            </button>

            {/* Pestaña: Transporte */}
            <button
              id="tab-transporte"
              onClick={() => setActiveTab('transporte')}
              className={`flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 py-1 xs:py-1.5 sm:py-2 px-0.5 xs:px-1 rounded-lg text-[8px] xs:text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer flex-1 animate-fadeIn ${
                activeTab === 'transporte'
                  ? 'bg-slate-50 text-sky-600 border border-sky-200/80 shadow-xs'
                  : 'bg-white hover:bg-slate-50/50 text-slate-500 hover:text-slate-700 border border-slate-100/80'
              }`}
            >
              <Car className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span>TRANSPORTE</span>
            </button>

            {/* Pestaña: Centros de Salud */}
            <button
              id="tab-hospitales"
              onClick={() => setActiveTab('hospitales')}
              className={`flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 py-1 xs:py-1.5 sm:py-2 px-0.5 xs:px-1 rounded-lg text-[8px] xs:text-[10px] sm:text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer flex-1 animate-fadeIn ${
                activeTab === 'hospitales'
                  ? 'bg-slate-50 text-sky-600 border border-sky-200/80 shadow-xs'
                  : 'bg-white hover:bg-slate-50/50 text-slate-500 hover:text-slate-700 border border-slate-100/80'
              }`}
            >
              <Building2 className="w-3 h-3 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span>CENTROS</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
