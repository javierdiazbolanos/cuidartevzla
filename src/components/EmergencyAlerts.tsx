import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  X
} from 'lucide-react';

export interface EmergencyNotice {
  id: string;
  text: string;
  type: 'alert' | 'info' | 'success';
}

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  description: string;
}

// Valores por defecto orientados al contexto de Venezuela con un tono pana amigable y tuteo
const DEFAULT_NOTICES: EmergencyNotice[] = [
  { id: '1', text: '⚠️ SOS Telemedicina UCV (Línea Gratuita de Emergencias Médicas): Llama al (0212) 605-1555 si te sientes mal.', type: 'alert' },
  { id: '2', text: '📢 ¡Hay buenas noticias! Encontraron Insulina y Analgésicos en farmacias comunitarias autorizadas.', type: 'success' },
  { id: '3', text: '💡 Consejo: Si estás navegando con 3G o tienes pocos megas, activa ya mismo el "Modo de Datos Bajos" abajo.', type: 'info' },
  { id: '4', text: '🏥 ¡Tranquilo! Guardamos todos los hospitales en tu teléfono para que los consultes al instante aunque no tengas saldo.', type: 'success' }
];

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: 'c1', name: 'SOS Telemedicina (UCV)', number: '0212-6051555', description: 'Te atienden doctores gratis por teléfono.' },
  { id: 'c2', name: 'Cruz Roja Venezolana', number: '0212-5782187', description: 'Primeros auxilios y reportes de medicinas.' },
  { id: 'c3', name: 'Bomberos de Caracas', number: '0212-5422222', description: 'Emergencias en la capital y zona metropolitana.' },
  { id: 'c4', name: 'Emergencias Nacionales (VEN 911)', number: '911', description: 'Central de llamadas de seguridad del país.' }
];

interface EmergencyAlertsProps {
  onTriggerToast: (msg: string) => void;
}

export default function EmergencyAlerts({ onTriggerToast }: EmergencyAlertsProps) {
  const [notices, setNotices] = useState<EmergencyNotice[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  
  // Interfaz de navegación / colapsos
  const [showDirectory, setShowDirectory] = useState(false);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  // 1. Cargar datos iniciales desde localStorage o Defaults para resiliencia offline completa
  useEffect(() => {
    let savedNotices = DEFAULT_NOTICES;
    let savedContacts = DEFAULT_CONTACTS;
    
    if (typeof window !== 'undefined') {
      try {
        const localN = localStorage.getItem('cuidarte_notices');
        if (localN) savedNotices = JSON.parse(localN);
        
        const localC = localStorage.getItem('cuidarte_contacts');
        if (localC) savedContacts = JSON.parse(localC);
      } catch (e) {
        console.warn('Error leyendo avisos locales:', e);
      }
    }
    
    setNotices(savedNotices);
    setContacts(savedContacts);
  }, []);

  // 2. Rotación automática del Ticker cada 6 segundos para no abrumar al usuario
  useEffect(() => {
    if (notices.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentNoticeIndex(prev => (prev + 1) % notices.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [notices]);

  const activeNotice = notices[currentNoticeIndex];

  return (
    <div id="emergency-alerts-root" className="w-full space-y-3">
      
      {/* 1. TICKER AUTOMÁTICO DE NOTICIAS DE EMERGENCIA */}
      {notices.length > 0 && activeNotice && (
        <div 
          id="emergency-ticker-banner"
          className={`relative overflow-hidden rounded-2xl border px-4 py-3 shadow-sm transition-all duration-300 flex items-center justify-between gap-3 ${
            activeNotice.type === 'alert' 
              ? 'bg-rose-50/90 border-rose-200 text-rose-950' 
              : activeNotice.type === 'success'
                ? 'bg-sky-50/90 border-sky-200 text-sky-950'
                : 'bg-amber-50/90 border-amber-200 text-amber-950'
          }`}
        >
          {/* Luz intermitente de alerta */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeNotice.type === 'alert' 
                  ? 'bg-rose-500' 
                  : activeNotice.type === 'success'
                    ? 'bg-sky-500'
                    : 'bg-amber-500'
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                activeNotice.type === 'alert' 
                  ? 'bg-rose-600' 
                  : activeNotice.type === 'success'
                    ? 'bg-sky-600'
                    : 'bg-amber-600'
              }`} />
            </span>
            
            {/* Mensaje de la noticia */}
            <div className="flex-1 text-xs sm:text-sm font-bold leading-snug tracking-tight">
              <p className="line-clamp-2 sm:line-clamp-1">{activeNotice.text}</p>
            </div>
          </div>

          {/* Botones de acción del Ticker */}
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {notices.length > 1 && (
              <span className="text-[10px] font-mono font-bold bg-white/70 px-2 py-0.5 rounded-lg border border-slate-200/50 hidden min-[360px]:inline-block">
                {currentNoticeIndex + 1}/{notices.length}
              </span>
            )}
            
            {/* Botón para abrir directorio rápido */}
            <button
              id="btn-toggle-quick-directory"
              onClick={() => {
                setShowDirectory(!showDirectory);
              }}
              className={`p-1.5 rounded-lg hover:bg-white/60 cursor-pointer transition-colors text-xs font-bold flex items-center gap-1 border border-transparent ${
                showDirectory ? 'bg-white/80 border-slate-200 text-sky-800' : 'text-slate-600'
              }`}
              style={{ minHeight: '32px' }}
              title="Directorio de emergencia"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Teléfonos</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. DIRECTORIO TELEFÓNICO DE EMERGENCIA (COLAPSIBLE) */}
      {showDirectory && (
        <div 
          id="emergency-directory-panel"
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-1 duration-200 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-sky-600 animate-pulse" />
              Números de Emergencia para la Comunidad
            </h3>
            <button
              onClick={() => setShowDirectory(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map(c => (
              <div 
                key={c.id} 
                className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-sky-100 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.description}</p>
                </div>
                
                {/* Enlace tel: directo que funciona en teléfonos celulares */}
                <a
                  href={`tel:${c.number.replace(/\s+/g, '')}`}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm shadow-sky-100 active:scale-95 transition-all cursor-pointer"
                  style={{ minHeight: '38px' }}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{c.number}</span>
                </a>
              </div>
            ))}
          </div>
          
          <div className="text-[10px] font-mono text-slate-400 text-center bg-slate-50 py-1.5 px-2 rounded-lg leading-relaxed">
            💡 <strong>Un dato:</strong> Si estás en tu celular, dale un toque al número para llamarlos de una vez.
          </div>
        </div>
      )}
    </div>
  );
}
