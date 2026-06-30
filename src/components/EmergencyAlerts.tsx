import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from '../icons';

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

const DEFAULT_NOTICES: EmergencyNotice[] = [
  { id: '1', text: '⚠️ SOS Telemedicina UCV (Línea Gratuita de Emergencias Médicas): Llame al (0212) 605-1555 si se siente mal.', type: 'alert' },
  { id: '2', text: '📢 ¡Buenas noticias! Encontraron insulina y analgésicos en farmacias comunitarias autorizadas.', type: 'success' },
];

const LS_KEY = 'cuidarte_alertas';

interface Alerta {
  id: string;
  texto: string;
  severidad: string;
  timestamp: string;
  voluntario: string;
}

function mapAlertaToNotice(a: Alerta): EmergencyNotice {
  const { severidad } = a;
  let type: EmergencyNotice['type'] = 'alert';
  if (severidad === 'media') type = 'info';
  else if (severidad === 'baja') type = 'success';
  // else remains alert
  return {
    id: a.id,
    text: a.texto,
    type,
  };
}

async function loadAlertsFromStorage(): Promise<EmergencyNotice[]> {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const alertas: Alerta[] = JSON.parse(saved);
      return alertas.map(mapAlertaToNotice);
    }
  } catch (e) {
    console.warn('Failed to parse alerts from localStorage', e);
  }
  return [];
}

async function loadAlertsFromServer(): Promise<EmergencyNotice[]> {
  try {
    const res = await fetch('/api/alertas.php');
    if (!res.ok) return [];
    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      const alertas: Alerta[] = json.data.map((a: any) => ({
        id: String(a.id),
        texto: a.texto,
        severidad: a.severidad || 'media',
        timestamp: a.created_at,
        voluntario: a.voluntario || 'Admin',
      }));
      return alertas.map(mapAlertaToNotice);
    }
  } catch (e) {
    console.warn('Failed to fetch alerts from server', e);
  }
  return [];
}

export default function EmergencyAlerts({ onTriggerToast }: { onTriggerToast: (msg: string) => void }) {
  const [notices, setNotices] = useState<EmergencyNotice[]>([]);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);
  const [showDirectory, setShowDirectory] = useState(false);

  // Load alerts from localStorage on mount and listen for storage changes
  useEffect(() => {
    const loadAndSet = async () => {
      let alertas = await loadAlertsFromStorage();
      if (alertas.length === 0) {
        alertas = await loadAlertsFromServer();
      }
      if (alertas.length === 0) {
        alertas = DEFAULT_NOTICES;
      }
      setNotices(alertas);
      setCurrentNoticeIndex(0);
    };

    loadAndSet();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue !== null) {
        (async () => {
          const stored = await loadAlertsFromStorage();
          if (stored.length > 0) {
            setNotices(stored);
            setCurrentNoticeIndex(0);
          }
        })();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handlePrev = () => {
    if (notices.length === 0) return;
    setCurrentNoticeIndex((prev) => (prev === 0 ? notices.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (notices.length === 0) return;
    setCurrentNoticeIndex((prev) => (prev === notices.length - 1 ? 0 : prev + 1));
  };

  const currentNotice = notices[currentNoticeIndex];

  return (
    <div>
      {/* 1. TICKER DE ALERTAS DE EMERGENCIA */}
      <div className="w-full space-y-3">
        <div className="w-full bg-rose-50/90 border border-rose-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-rose-500"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="min-w-0 flex-1">
              {currentNotice ? (
                <p className="text-xs sm:text-sm font-semibold text-rose-900 leading-snug">
                  {currentNotice.text}
                  <span className="text-[10px] font-mono font-normal">({currentNotice.id})</span>
                </p>
              ) : (
                <p className="text-xs sm:text-sm font-semibold text-slate-500">No hay alertas operacionales activas en este momento.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {notices.length > 0 && (
              <div className="bg-white border border-rose-100 rounded-xl px-2 py-1 flex items-center space-x-3 shadow-xs font-mono text-xs text-rose-900 select-none">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="hover:bg-rose-50 p-1 rounded-lg transition-colors text-rose-600 hover:text-rose-900 cursor-pointer"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold tracking-tight">{currentNoticeIndex + 1} / {notices.length}</span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="hover:bg-rose-50 p-1 rounded-lg transition-colors text-rose-600 hover:text-rose-900 cursor-pointer"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setShowDirectory(!showDirectory); }}
              id="btn-toggle-quick-directory"
              className="p-2 rounded-xl hover:bg-white/60 cursor-pointer transition-colors text-xs font-bold flex items-center justify-center gap-1 border-transparent"
              style={{ minHeight: '38px', minWidth: '38px' }}
              title="Directorio de emergencia"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Teléfonos</span>
            </button>
          </div>
        </div>

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
              {[
                { id: '1', name: 'SAMU', number: '171', description: 'Urgencias médicas nacionales' },
                { id: '2', name: 'Protección Civil', number: '0800-PROTEC (0800-776832)', description: 'Respuesta a desastres y evacuaciones' },
                { id: '3', name: 'Cruz Verde', number: '0800-CRUZVE (0800-278983)', description: 'Asistencia médica prehospitalaria' },
                { id: '4', name: 'Cruz Roja Venezolana', number: '0800-CRUZRO (0800-278976)', description: 'Ayuda humanitaria y primeros auxilios' },
                { id: '5', name: 'Bomberos de Caracas', number: '0212-504-1212', description: 'Emergencias de incendio y rescate' },
                { id: '6', name: 'Guardia Nacional Bolivariana', number: '0212-508-3131', description: 'Orden público y apoyo en desastres' },
                { id: '7', name: 'INAMHI', number: '0212-504-1313', description: 'Alertas meteorológicas y sísmicas' },
                { id: '8', name: 'Protección Animal', number: '0212-555-1212', description: 'Rescate y cuidado de animales en peligro' },
              ].map((c) => (
                <div key={c.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-sky-100 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.description}</p>
                  </div>
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
              💡 <strong>Un dato:</strong> Si está en su celular, toque el número para llamarlo directamente.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}