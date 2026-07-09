import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  X,
  ChevronLeft,
  ChevronRight
} from '../icons';
import { getApiBase } from '../apiClient';

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

// ── Contactos de emergencia (estáticos, rara vez cambian) ──
const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: 'c1', name: 'SOS Telemedicina (UCV)', number: '0212-6051555', description: 'Te atienden doctores gratis por teléfono.' },
  { id: 'c2', name: 'Cruz Roja Venezolana', number: '0212-5782187', description: 'Primeros auxilios y reportes de medicinas.' },
  { id: 'c3', name: 'Bomberos de Caracas', number: '0212-5422222', description: 'Emergencias en la capital y zona metropolitana.' },
  { id: 'c4', name: 'Emergencias Nacionales (VEN 911)', number: '911', description: 'Central de llamadas de seguridad del país.' }
];

// ── Fallback de notices si no hay alertas en BD ──
const DEFAULT_NOTICES: EmergencyNotice[] = [
  { id: 'd1', text: '⚠️ SOS Telemedicina UCV (Línea Gratuita de Emergencias Médicas): Llama al (0212) 605-1555 si te sientes mal.', type: 'alert' },
  { id: 'd2', text: '📢 ¡Hay buenas noticias! Encontraron Insulina y Analgésicos en farmacias comunitarias autorizadas.', type: 'success' },
];

// ── Mapeo severidad → tipo de notice ──
function severidadToType(s: string): EmergencyNotice['type'] {
  switch (s) {
    case 'critica':
    case 'alta':   return 'alert';
    case 'media':  return 'info';
    case 'baja':   return 'success';
    default:       return 'info';
  }
}

interface AlertaFromDB {
  id: number;
  texto: string;
  severidad: string;
  voluntario: string;
  created_at: string;
  updated_at: string;
}

// ── Tiempo relativo para mostrar ──
function relativeTime(ts: string): string {
  const now = Date.now();
  const then = new Date(ts).getTime(); // MySQL timestamp as UTC
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Hace ${diffD}d`;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

interface EmergencyAlertsProps {
  onTriggerToast: (msg: string) => void;
}

export default function EmergencyAlerts({ onTriggerToast }: EmergencyAlertsProps) {
  const [notices, setNotices] = useState<EmergencyNotice[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  const [showDirectory, setShowDirectory] = useState(false);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleNext = () => {
    if (notices.length <= 1) return;
    setCurrentNoticeIndex(prev => (prev + 1) % notices.length);
  };

  const handlePrev = () => {
    if (notices.length <= 1) return;
    setCurrentNoticeIndex(prev => (prev - 1 + notices.length) % notices.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diffX = touchStartX - e.changedTouches[0].clientX;
    if (diffX > 50) { handleNext(); onTriggerToast('Mostrando siguiente aviso'); }
    else if (diffX < -50) { handlePrev(); onTriggerToast('Mostrando aviso anterior'); }
    setTouchStartX(null);
  };

  // ==========================================
  // fetchAlertas — consulta la BD via alertas.php
  // ==========================================
  const fetchAlertas = async () => {
    try {
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/alertas.php`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      
      if (json.ok && Array.isArray(json.data)) {
        const alertas: AlertaFromDB[] = json.data;
        
        if (alertas.length > 0) {
          const mapped: EmergencyNotice[] = alertas.map(a => ({
            id: String(a.id),
            text: `${a.texto} — ${relativeTime(a.created_at)}`,
            type: severidadToType(a.severidad),
          }));
          setNotices(mapped);
          setLastUpdated(new Date().toLocaleTimeString('es-VE'));
          // Guardar en localStorage para siguiente carga instantánea
          localStorage.setItem('cuidarte_notices', JSON.stringify(mapped));
          return;
        }
      }
    } catch (err) {
      console.warn('[Alertas] Backend no disponible:', err);
    }
    
    // Fallback: localStorage → defaults
    try {
      const cached = localStorage.getItem('cuidarte_notices');
      if (cached) {
        setNotices(JSON.parse(cached));
        return;
      }
    } catch {}
    setNotices(DEFAULT_NOTICES);
  };

  // ==========================================
  // 1. Carga inicial: localStorage (instantáneo) + backend
  // ==========================================
  useEffect(() => {
    // Cargar contacts de localStorage o defaults
    try {
      const c = localStorage.getItem('cuidarte_contacts');
      setContacts(c ? JSON.parse(c) : DEFAULT_CONTACTS);
    } catch {
      setContacts(DEFAULT_CONTACTS);
    }

    // Cargar notices de localStorage (instantáneo)
    try {
      const n = localStorage.getItem('cuidarte_notices');
      if (n) setNotices(JSON.parse(n));
    } catch {}
    
    // Fetch de BD (sobrescribe si hay datos)
    fetchAlertas();

    // Cleanup
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ==========================================
  // 2. Polling cada 5 minutos
  // ==========================================
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchAlertas();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ==========================================
  // 3. Cross-tab sync via storage event
  // ==========================================
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cuidarte_notices' && e.newValue) {
        try { setNotices(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'cuidarte_contacts' && e.newValue) {
        try { setContacts(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ==========================================
  // 4. Rotación automática cada 6 segundos
  // ==========================================
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
      
      {/* TICKER AUTOMÁTICO */}
      {notices.length > 0 && activeNotice && (
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`relative overflow-hidden rounded-2xl border px-3 sm:px-4 py-3 shadow-sm transition-all duration-300 flex items-center justify-between gap-2.5 sm:gap-3 ${
            activeNotice.type === 'alert' 
              ? 'bg-rose-50/90 border-rose-200 text-rose-950' 
              : activeNotice.type === 'success'
                ? 'bg-sky-50/90 border-sky-200 text-sky-950'
                : 'bg-amber-50/90 border-amber-200 text-amber-950'
          }`}
          title="Desliza horizontalmente para ver más avisos"
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <span className={`animate-ping inline-flex rounded-full h-3 w-3 shrink-0 opacity-75 ${
                activeNotice.type === 'alert' ? 'bg-rose-500' : activeNotice.type === 'success' ? 'bg-sky-500' : 'bg-amber-500'
              }`} />
            <div className="flex-1 text-xs sm:text-sm font-bold leading-snug tracking-tight">
              <p className="line-clamp-2 sm:line-clamp-1">{activeNotice.text}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-1">
            {notices.length > 1 && (
              <div className="flex items-center bg-white/75 border border-slate-200/50 rounded-xl p-0.5 shadow-xs">
                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                  style={{ minWidth: '36px', minHeight: '36px' }} title="Mensaje anterior">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 min-w-[28px] text-center text-slate-800 select-none">
                  {currentNoticeIndex + 1}/{notices.length}
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                  style={{ minWidth: '36px', minHeight: '36px' }} title="Siguiente mensaje">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <button onClick={(e) => { e.stopPropagation(); setShowDirectory(!showDirectory); }}
              className={`p-2 rounded-xl hover:bg-white/60 cursor-pointer transition-colors text-xs font-bold flex items-center justify-center gap-1 border border-transparent ${
                showDirectory ? 'bg-white/80 border-slate-200 text-sky-800' : 'text-slate-600'
              }`} style={{ minHeight: '38px', minWidth: '38px' }} title="Directorio de emergencia">
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Teléfonos</span>
            </button>
          </div>
        </div>
      )}

      {/* DIRECTORIO TELEFÓNICO */}
      {showDirectory && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-sky-600 animate-pulse" />
              Números de Emergencia para la Comunidad
            </h3>
            <button onClick={() => setShowDirectory(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map(c => (
              <div key={c.id} 
                className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-sky-100 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.description}</p>
                </div>
                <a href={`tel:${c.number.replace(/\s+/g, '')}`}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm shadow-sky-100 active:scale-95 transition-all cursor-pointer"
                  style={{ minHeight: '38px' }}>
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