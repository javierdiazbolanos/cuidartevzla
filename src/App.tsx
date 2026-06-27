import React, { useState, useEffect } from 'react';
import { getHospitales, getPacientes, getMedicamentos, isDataSaverEnabled, setDataSaverEnabled, clearApiCache } from './apiClient';
import { Hospital, Paciente, Medicamento } from './types';
import Header from './components/Header';
import HospitalComboBox from './components/HospitalComboBox';
import EmergencyAlerts from './components/EmergencyAlerts';
import PacienteCard from './components/PacienteCard';
import PacienteDetailModal from './components/PacienteDetailModal';
import MedicamentoCard from './components/MedicamentoCard';
import MedicamentoDetailModal from './components/MedicamentoDetailModal';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  FileText, 
  HelpCircle, 
  Users, 
  Pill, 
  Check, 
  MapPin, 
  X,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pacientes' | 'medicamentos'>('pacientes');
  
  // Datos principales
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  
  // Estados de filtros de Pacientes
  const [pacientesQuery, setPacientesQuery] = useState('');
  const [debouncedPacientesQuery, setDebouncedPacientesQuery] = useState('');
  const [searchType, setSearchType] = useState<'nombre' | 'cedula'>('nombre');
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  
  // Estados de filtros de Medicamentos
  const [medicamentosQuery, setMedicamentosQuery] = useState('');
  const [debouncedMedicamentosQuery, setDebouncedMedicamentosQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [soloDisponibles, setSoloDisponibles] = useState<boolean>(false);
  const [medSelectedHospitalId, setMedSelectedHospitalId] = useState<number | null>(null);

  // Modales
  const [activePacienteId, setActivePacienteId] = useState<number | null>(null);
  const [activeMedicamentoId, setActiveMedicamentoId] = useState<number | null>(null);

  // Carga, Errores y Toasts
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Modo de Datos Bajos para redes inestables (Venezuela)
  const [dataSaver, setDataSaver] = useState<boolean>(() => isDataSaverEnabled());

  // Categorías fijas de Medicamentos
  const CATEGORIAS_MEDICAMENTOS = [
    'Analgésico',
    'Antibiótico',
    'Cardiovascular',
    'Hidratación',
    'Material de curación',
    'Diabetes',
    'Respiratorio',
    'Otro'
  ];

  // Helper para mostrar Toasts rápidos
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // 1. Efecto inicial: Cargar Hospitales (Caché en memoria)
  const cargarHospitalesIniciales = () => {
    setLoading(true);
    getHospitales()
      .then(data => {
        setHospitales(data);
        setErrorMsg(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error al cargar hospitales:', err);
        triggerToast('No se pudieron conectar los hospitales locales. Operando sin conexión.');
        setLoading(false);
      });
  };

  useEffect(() => {
    cargarHospitalesIniciales();
    
    // Notificar si se autodetectó modo datos bajos
    if (isDataSaverEnabled()) {
      setTimeout(() => {
        triggerToast('⚠️ Conexión inestable detectada. Se activó automáticamente el Modo de Datos Bajos.');
      }, 1000);
    }
  }, []);

  // 2. Debounce dinámico de búsqueda de Pacientes (800ms en Datos Bajos para evitar ráfagas de red)
  useEffect(() => {
    const delay = dataSaver ? 800 : 350;
    const handler = setTimeout(() => {
      setDebouncedPacientesQuery(pacientesQuery);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [pacientesQuery, dataSaver]);

  // 3. Debounce dinámico de búsqueda de Medicamentos (800ms en Datos Bajos)
  useEffect(() => {
    const delay = dataSaver ? 800 : 350;
    const handler = setTimeout(() => {
      setDebouncedMedicamentosQuery(medicamentosQuery);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [medicamentosQuery, dataSaver]);

  // 4. Búsqueda de Pacientes reactiva a filtros
  useEffect(() => {
    let active = true;
    
    // Condición: min 2 caracteres de búsqueda o filtro de hospital activo
    if (debouncedPacientesQuery.trim().length >= 2 || selectedHospitalId !== null) {
      setLoading(true);
      getPacientes(debouncedPacientesQuery, selectedHospitalId)
        .then(data => {
          if (active) {
            setPacientes(data);
            setLoading(false);
          }
        })
        .catch(err => {
          if (active) {
            console.error(err);
            triggerToast('Error de red al consultar pacientes. Se activó respaldo sin conexión.');
            setLoading(false);
          }
        });
    } else {
      setPacientes([]);
    }

    return () => {
      active = false;
    };
  }, [debouncedPacientesQuery, selectedHospitalId]);

  // 5. Búsqueda de Medicamentos reactiva a filtros
  useEffect(() => {
    let active = true;
    setLoading(true);
    
    // Medicamentos se pueden ver sin búsqueda (listado completo con filtros o búsqueda parcial)
    getMedicamentos(debouncedMedicamentosQuery, selectedCategory, medSelectedHospitalId, soloDisponibles)
      .then(data => {
        if (active) {
          setMedicamentos(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          triggerToast('Error al consultar inventario de medicamentos.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedMedicamentosQuery, selectedCategory, medSelectedHospitalId, soloDisponibles]);

  // Manejar reconexión / reintento manual
  const handleRetry = () => {
    triggerToast('Reconectando con el registro nacional de hospitales...');
    cargarHospitalesIniciales();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Cabecera Principal */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setErrorMsg(null);
        }} 
        onRetry={handleRetry} 
      />

      {/* Contenedor de la Aplicación (Centrado, responsivo, Desktop-First max width) */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-4">
        
        {/* Barra de Avisos de Emergencia y Directorio */}
        <EmergencyAlerts onTriggerToast={triggerToast} />
        
        {/* Banner de Estado de Red / Modo Ahorro de Datos (Venezuela) */}
        <div 
          id="data-saver-status-bar" 
          className={`rounded-2xl p-3.5 border transition-all duration-300 flex flex-col min-[520px]:flex-row items-start min-[520px]:items-center justify-between gap-3.5 shadow-sm ${
            dataSaver 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-white border-slate-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
              dataSaver ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold flex flex-wrap items-center gap-1.5 leading-none">
                {dataSaver ? 'Optimizador de Ancho de Banda Activo' : 'Red de Emergencia • Señal Inestable'}
                {dataSaver ? (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] bg-emerald-600 text-white font-extrabold uppercase tracking-wider">
                    Modo Datos Bajos
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] bg-amber-500 text-white font-extrabold uppercase tracking-wider">
                    Ancho de Banda Estándar
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                {dataSaver 
                  ? 'La aplicación ha desactivado recursos gráficos innecesarios, ralentizado peticiones en curso y cacheado búsquedas en memoria de 0 bytes para mayor resiliencia en zonas sin señal.'
                  : 'Si se encuentra en una zona con mala cobertura, active el Modo de Datos Bajos para conservar saldo y optimizar la velocidad.'}
              </p>
            </div>
          </div>
          <button
            id="btn-toggle-datasaver"
            onClick={() => {
              const newValue = !dataSaver;
              setDataSaver(newValue);
              setDataSaverEnabled(newValue);
              clearApiCache(); // Vaciar caché para forzar nueva recarga limpia
              triggerToast(newValue 
                ? 'Modo Datos Bajos habilitado. Conexiones cacheadas y optimizadas.' 
                : 'Modo de Datos Bajos desactivado. Carga de red regular restablecida.'
              );
            }}
            className={`w-full min-[520px]:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer text-center ${
              dataSaver 
                ? 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
            style={{ minHeight: '44px' }}
          >
            {dataSaver ? 'Desactivar Ahorro' : 'Activar Modo Datos Bajos'}
          </button>
        </div>

        {/* ==================================
            PESTAÑA 1: BÚSQUEDA DE PACIENTES 
           ================================== */}
        {activeTab === 'pacientes' && (
          <div className="space-y-6">
            
            {/* Panel de Controles / Filtros de Pacientes */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
              
              {/* Caja de Búsqueda Grande con Touch Target de al menos 44px */}
              <div className="relative">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="input-pacientes-query"
                  type="text"
                  placeholder={
                    searchType === 'nombre' 
                      ? "Escriba el nombre completo o apellido del paciente..." 
                      : "Escriba los últimos dígitos o cédula completa..."
                  }
                  value={pacientesQuery}
                  onChange={(e) => setPacientesQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all bg-slate-50/50"
                  style={{ minHeight: '48px' }}
                />
                {pacientesQuery && (
                  <button 
                    onClick={() => setPacientesQuery('')} 
                    className="absolute right-4.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Controles secundarios: Toggle Tipo de Búsqueda y Filtro de Hospital */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                
                {/* Segmented Control para Tipo de Búsqueda */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                    Buscar por:
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      id="search-type-nombre"
                      onClick={() => {
                        setSearchType('nombre');
                        triggerToast('Búsqueda configurada por Nombre y Apellido.');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        searchType === 'nombre' 
                          ? 'bg-white text-slate-950 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      Nombre / Apellido
                    </button>
                    <button
                      id="search-type-cedula"
                      onClick={() => {
                        setSearchType('cedula');
                        triggerToast('Búsqueda configurada por Cédula de Identidad.');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        searchType === 'cedula' 
                          ? 'bg-white text-slate-950 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      Cédula Identidad
                    </button>
                  </div>
                </div>

                {/* Dropdown de Filtro de Hospital con ComboBox de Autocompletado */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                    Filtrar por Centro Médico:
                  </span>
                  <HospitalComboBox
                    id="select-hospital-filter"
                    hospitales={hospitales}
                    selectedId={selectedHospitalId}
                    onChange={(id) => setSelectedHospitalId(id)}
                    placeholder="Escriba o seleccione un hospital..."
                  />
                </div>

              </div>

            </div>

            {/* Listado de Resultados de Pacientes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-slate-500 font-mono uppercase tracking-wider">
                  {loading ? 'Buscando registros...' : `Resultados (${pacientes.length})`}
                </h2>
                {loading && (
                  <span className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></span>
                )}
              </div>

              {/* Estado Inicial: Sin Búsqueda */}
              {pacientesQuery.trim().length < 2 && selectedHospitalId === null ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-4 shadow-sm max-w-lg mx-auto">
                  <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 mx-auto">
                    <Search className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 font-display">Busque a sus seres queridos</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                      Ingrese un nombre, apellido o los números de cédula para iniciar la búsqueda en tiempo real de pacientes ingresados en los hospitales principales de Venezuela.
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-left flex gap-3">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-normal">
                      <strong>Nota de Seguridad:</strong> Con el fin de resguardar el derecho constitucional a la intimidad, no se publicará el listado masivo en crudo. Utilice la caja de búsqueda para consultar fichas específicas.
                    </p>
                  </div>
                </div>
              ) : pacientes.length === 0 && !loading ? (
                /* Estado: Sin Coincidencias */
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-lg mx-auto">
                  <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                    <HelpCircle className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">No se encontraron coincidencias</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    Asegúrese de escribir correctamente el apellido o intente ingresando únicamente números de la Cédula de Identidad. Si el paciente fue trasladado recientemente, la ficha de ingreso podría tardar unas horas en actualizarse.
                  </p>
                </div>
              ) : (
                /* Lista de Pacientes */
                <div className="grid grid-cols-1 gap-3">
                  {pacientes.map((paciente) => (
                    <PacienteCard 
                      key={paciente.id} 
                      paciente={paciente} 
                      onTap={(id) => setActivePacienteId(id)} 
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================================
            PESTAÑA 2: MEDICAMENTOS 
           ================================== */}
        {activeTab === 'medicamentos' && (
          <div className="space-y-6">
            
            {/* Panel de Controles / Filtros de Medicamentos */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
              
              {/* Buscador de Medicamentos */}
              <div className="relative">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="input-medicamentos-query"
                  type="text"
                  placeholder="Escriba el nombre del medicamento a buscar (ej. Ibuprofeno, Insulina)..."
                  value={medicamentosQuery}
                  onChange={(e) => setMedicamentosQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all bg-slate-50/50"
                  style={{ minHeight: '48px' }}
                />
                {medicamentosQuery && (
                  <button 
                    onClick={() => setMedicamentosQuery('')} 
                    className="absolute right-4.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Selector de Hospital de Custodia con ComboBox de Autocompletado */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                  Ubicación por Hospital:
                </span>
                <HospitalComboBox
                  id="select-med-hospital-filter"
                  hospitales={hospitales}
                  selectedId={medSelectedHospitalId}
                  onChange={(id) => setMedSelectedHospitalId(id)}
                  placeholder="Escriba o seleccione un hospital..."
                />
              </div>

              {/* Interruptor "Solo Disponibles" */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Filtrar medicamentos disponibles</span>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">Ocultar insumos y fármacos que se encuentren agotados temporalmente</span>
                </div>
                <button
                  id="toggle-solo-disponibles"
                  onClick={() => {
                    setSoloDisponibles(!soloDisponibles);
                    triggerToast(soloDisponibles ? 'Mostrando todos los medicamentos.' : 'Filtrando solo medicamentos disponibles.');
                  }}
                  className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                    soloDisponibles ? 'bg-sky-600' : 'bg-slate-200'
                  }`}
                  style={{ minHeight: '28px' }}
                >
                  <span className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow-sm ${
                    soloDisponibles ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Filtro de Categoría por Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                  Categoría Farmacéutica:
                </span>
                <div className="flex overflow-x-auto pb-1.5 sm:pb-0 sm:flex-wrap gap-1.5 pt-1 scroll-smooth -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedCategory === ''
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-100'
                        : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                    }`}
                    style={{ minHeight: '36px' }}
                  >
                    Todos
                  </button>
                  {CATEGORIAS_MEDICAMENTOS.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(selectedCategory === cat ? '' : cat);
                        triggerToast(selectedCategory === cat ? 'Quitando filtro de categoría.' : `Filtrando por categoría: ${cat}`);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-100'
                          : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Listado de Medicamentos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-slate-500 font-mono uppercase tracking-wider">
                  Fármacos en Existencia ({medicamentos.length})
                </h2>
              </div>

              {medicamentos.length === 0 && !loading ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-lg mx-auto">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <Pill className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">Sin medicamentos</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    No se encontraron donaciones o inventarios de medicamentos con los filtros seleccionados en este momento. Intente ampliando el término de búsqueda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {medicamentos.map((med) => (
                    <MedicamentoCard 
                      key={med.id} 
                      medicamento={med} 
                      onTap={(id) => setActiveMedicamentoId(id)} 
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ==================================
          MODALES DE DETALLE (PACIENTES / MEDICAMENTOS)
         ================================== */}
      {activePacienteId !== null && (
        <PacienteDetailModal 
          pacienteId={activePacienteId} 
          onClose={() => setActivePacienteId(null)} 
          showToast={triggerToast}
        />
      )}

      {activeMedicamentoId !== null && (
        <MedicamentoDetailModal 
          medicamentoId={activeMedicamentoId} 
          onClose={() => setActiveMedicamentoId(null)} 
          showToast={triggerToast}
        />
      )}

      {/* ==================================
          SISTEMA DE TOASTS ABSOLUTOS
         ================================== */}
      {toastMsg && (
        <div id="toast-message" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2.5 z-50 animate-bounce max-w-sm w-[90vw] text-center border border-slate-800">
          <AlertCircle className="w-4.5 h-4.5 text-sky-400 shrink-0" />
          <span className="flex-1">{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
