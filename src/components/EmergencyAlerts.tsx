import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  Plus, 
  Trash2, 
  PhoneCall, 
  Info, 
  Save, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  X,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet
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

// Valores por defecto orientados al contexto de Venezuela
const DEFAULT_NOTICES: EmergencyNotice[] = [
  { id: '1', text: '⚠️ Línea Gratuita de Emergencias Médicas (SOS Telemedicina UCV): (0212) 605-1555.', type: 'alert' },
  { id: '2', text: '📢 Suministro disponible de Insulina y Analgésicos en farmacias comunitarias autorizadas.', type: 'success' },
  { id: '3', text: '💡 Consejo: Activa el "Modo de Datos Bajos" si estás navegando con señal móvil congestionada de 2G/3G.', type: 'info' },
  { id: '4', text: '🏥 Hospitales de todo el país cargados localmente en memoria para consultas instantáneas sin saldo.', type: 'success' }
];

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: 'c1', name: 'SOS Telemedicina (UCV)', number: '0212-6051555', description: 'Orientación médica telefónica gratuita nacional.' },
  { id: 'c2', name: 'Cruz Roja Venezolana', number: '0212-5782187', description: 'Atención prehospitalaria y reportes de insumos.' },
  { id: 'c3', name: 'Bomberos del Distrito Capital', number: '0212-5422222', description: 'Emergencias en Caracas y zona metropolitana.' },
  { id: 'c4', name: 'Emergencias Nacionales (VEN 911)', number: '911', description: 'Línea de respuesta coordinada de seguridad ciudadana.' }
];

interface EmergencyAlertsProps {
  onTriggerToast: (msg: string) => void;
}

export default function EmergencyAlerts({ onTriggerToast }: EmergencyAlertsProps) {
  const [notices, setNotices] = useState<EmergencyNotice[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  
  // Interfaz de navegación / colapsos
  const [showDirectory, setShowDirectory] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  // Estados de los formularios de administración
  const [newNoticeText, setNewNoticeText] = useState('');
  const [newNoticeType, setNewNoticeType] = useState<'alert' | 'info' | 'success'>('info');
  
  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newContactDesc, setNewContactDesc] = useState('');

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

  // Guardar datos en localStorage
  const saveNoticesToStorage = (updatedNotices: EmergencyNotice[]) => {
    setNotices(updatedNotices);
    try {
      localStorage.setItem('cuidarte_notices', JSON.stringify(updatedNotices));
    } catch (_) {}
  };

  const saveContactsToStorage = (updatedContacts: EmergencyContact[]) => {
    setContacts(updatedContacts);
    try {
      localStorage.setItem('cuidarte_contacts', JSON.stringify(updatedContacts));
    } catch (_) {}
  };

  // Acciones: Agregar aviso
  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeText.trim()) return;

    const newNotice: EmergencyNotice = {
      id: String(Date.now()),
      text: newNoticeText.trim(),
      type: newNoticeType
    };

    const updated = [...notices, newNotice];
    saveNoticesToStorage(updated);
    setNewNoticeText('');
    setCurrentNoticeIndex(updated.length - 1);
    onTriggerToast('✅ Noticia de emergencia agregada exitosamente.');
  };

  // Acciones: Eliminar aviso
  const handleDeleteNotice = (id: string) => {
    const updated = notices.filter(n => n.id !== id);
    saveNoticesToStorage(updated);
    if (currentNoticeIndex >= updated.length) {
      setCurrentNoticeIndex(Math.max(0, updated.length - 1));
    }
    onTriggerToast('🗑️ Noticia eliminada.');
  };

  // Acciones: Agregar contacto
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactNumber.trim()) return;

    const newContact: EmergencyContact = {
      id: String(Date.now()),
      name: newContactName.trim(),
      number: newContactNumber.trim(),
      description: newContactDesc.trim() || 'Sin descripción adicional.'
    };

    const updated = [...contacts, newContact];
    saveContactsToStorage(updated);
    setNewContactName('');
    setNewContactNumber('');
    setNewContactDesc('');
    onTriggerToast('✅ Contacto telefónico registrado en el directorio.');
  };

  // Acciones: Eliminar contacto
  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    saveContactsToStorage(updated);
    onTriggerToast('🗑️ Contacto eliminado del directorio local.');
  };

  // Restaurar datos por defecto
  const handleRestoreDefaults = () => {
    if (window.confirm('¿Está seguro de que desea restablecer la información de emergencia por defecto? Se perderán las modificaciones locales.')) {
      saveNoticesToStorage(DEFAULT_NOTICES);
      saveContactsToStorage(DEFAULT_CONTACTS);
      setCurrentNoticeIndex(0);
      onTriggerToast('🔄 Información de emergencia restablecida.');
    }
  };

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
                if (showAdminPanel) setShowAdminPanel(false);
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
            
            {/* Botón para abrir panel admin (sin credenciales) */}
            <button
              id="btn-toggle-ticker-admin"
              onClick={() => {
                setShowAdminPanel(!showAdminPanel);
                if (showDirectory) setShowDirectory(false);
              }}
              className={`p-1.5 rounded-lg hover:bg-white/60 cursor-pointer transition-colors text-slate-600 ${
                showAdminPanel ? 'bg-white/80 border-slate-200 text-slate-900' : ''
              }`}
              style={{ minHeight: '32px' }}
              title="Panel Administrador"
            >
              <Settings className="w-4 h-4 shrink-0" />
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
              Directorio de Asistencia de Emergencia (Venezuela)
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
            💡 <strong>Sugerencia:</strong> Toque un número desde su teléfono celular para iniciar la llamada de emergencia directamente.
          </div>
        </div>
      )}

      {/* 3. PANEL DE ADMINISTRACIÓN (SIN CREDENCIALES, EDITA EL LOCALSTORAGE) */}
      {showAdminPanel && (
        <div 
          id="emergency-admin-panel"
          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-1 duration-200 space-y-4"
        >
          {/* Header Panel */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-sky-100 text-sky-800 p-1.5 rounded-lg">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-950">
                  Panel de Gestión de Emergencia e Información
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">Modo de Administración Directa (Sin Credenciales)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-[10px] font-extrabold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                Restablecer Valores
              </button>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* SECCIÓN A: Gestión de Noticias de Ticker */}
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>1. Publicar Avisos en el Ticker</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">({notices.length} activos)</span>
              </h4>

              {/* Formulario de Nuevo Aviso */}
              <form onSubmit={handleAddNotice} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                    Texto del Mensaje de Alerta:
                  </label>
                  <textarea
                    rows={2}
                    value={newNoticeText}
                    onChange={(e) => setNewNoticeText(e.target.value)}
                    placeholder="Escriba información relevante sobre escasez, alertas de red, números gratis, etc..."
                    className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    maxLength={160}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] text-slate-400 font-mono">{newNoticeText.length}/160 caracteres</span>
                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Se guarda localmente</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                      Nivel / Color:
                    </label>
                    <select
                      value={newNoticeType}
                      onChange={(e: any) => setNewNoticeType(e.target.value)}
                      className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <option value="alert">Crítico / Alerta (Rojo)</option>
                      <option value="info">Consejo / Guía (Amarillo)</option>
                      <option value="success">Normal / Disponible (Azul)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer shrink-0 shadow-sm transition-all mt-4 self-end"
                    style={{ minHeight: '38px' }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Publicar</span>
                  </button>
                </div>
              </form>

              {/* Listado para Borrar Avisos */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-[160px] overflow-y-auto divide-y divide-slate-50">
                {notices.map((n, idx) => (
                  <div key={n.id} className="flex items-start gap-2 py-1.5 text-xs">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      n.type === 'alert' ? 'bg-rose-500' : n.type === 'success' ? 'bg-sky-500' : 'bg-amber-500'
                    }`} />
                    <p className="flex-1 font-semibold text-slate-700 line-clamp-2 leading-tight">
                      [{idx + 1}] {n.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotice(n.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors"
                      title="Eliminar noticia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN B: Gestión del Directorio de Contactos */}
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>2. Añadir Números de Asistencia</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">({contacts.length} registrados)</span>
              </h4>

              {/* Formulario de Nuevo Contacto */}
              <form onSubmit={handleAddContact} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-0.5">
                      Nombre del Centro:
                    </label>
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Ej. Cruz Roja Valencia"
                      className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-0.5">
                      Teléfono / Código:
                    </label>
                    <input
                      type="text"
                      value={newContactNumber}
                      onChange={(e) => setNewContactNumber(e.target.value)}
                      placeholder="Ej. 0241-8212121"
                      className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-0.5">
                    Breve Descripción de Ayuda:
                  </label>
                  <input
                    type="text"
                    value={newContactDesc}
                    onChange={(e) => setNewContactDesc(e.target.value)}
                    placeholder="Ej. Suministro de oxígeno y traslado ambulatorio."
                    className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    maxLength={80}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer shrink-0 shadow-sm transition-all"
                    style={{ minHeight: '34px' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir al Directorio</span>
                  </button>
                </div>
              </form>

              {/* Listado para Borrar Contactos */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-[140px] overflow-y-auto divide-y divide-slate-50">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-2 py-1.5 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 truncate">
                        {c.name} ({c.number})
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{c.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteContact(c.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors"
                      title="Eliminar contacto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
          
          <div className="bg-sky-50 text-sky-950 p-3 rounded-xl border border-sky-100 flex items-start gap-2 text-[11px] leading-relaxed">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong>Información Técnica Importante:</strong> El Panel utiliza sincronización asíncrona local mediante <code>localStorage</code>. Esto asegura que cualquier cambio de noticias o números de emergencia se mantenga guardado en el navegador de los doctores de guardia, permitiéndoles acceder y consultar los avisos sin conexión o en cortes eléctricos.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
