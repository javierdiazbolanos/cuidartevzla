import React, { useState, useEffect } from 'react';
import { getHospitales, getPacientes, getMedicamentos, getTransporte, isDataSaverEnabled, setDataSaverEnabled, clearApiCache, registrarTransporte, actualizarTransporte, eliminarTransporte, getApiBase } from './apiClient';
import { Hospital, Paciente, Medicamento, Transporte } from './types';
import { CIUDADES_VENEZUELA } from './mockData';
import Header from './components/Header';
import HospitalComboBox from './components/HospitalComboBox';
import EmergencyAlerts from './components/EmergencyAlerts';
import PacienteCard from './components/PacienteCard';
import PacienteDetailModal from './components/PacienteDetailModal';
import MedicamentoCard from './components/MedicamentoCard';
import MedicamentoDetailModal from './components/MedicamentoDetailModal';
import TransporteCard from './components/TransporteCard';
import HospitalCard from './components/HospitalCard';
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
  AlertCircle,
  Car,
  Building2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pacientes' | 'insumos' | 'transporte' | 'hospitales'>('pacientes');
  
  // Datos principales
  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  
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

  // Estados de filtros de Transporte
  const [transporteQuery, setTransporteQuery] = useState('');
  const [debouncedTransporteQuery, setDebouncedTransporteQuery] = useState('');
  const [transporteSelectedCiudad, setTransporteSelectedCiudad] = useState<string>('');
  const [transporteSoloDisponibles, setTransporteSoloDisponibles] = useState<boolean>(false);

  // Estados de filtros de Hospitales (Directorio)
  const [hospitalesQuery, setHospitalesQuery] = useState('');
  const [debouncedHospitalesQuery, setDebouncedHospitalesQuery] = useState('');
  const [hospitalesSelectedEstado, setHospitalesSelectedEstado] = useState<string>('');

  // Formularios de registro y gestión de transporte
  const [showRegisterTransportForm, setShowRegisterTransportForm] = useState<boolean>(false);
  const [editingTransport, setEditingTransport] = useState<Transporte | null>(null);
  
  const [regForm, setRegForm] = useState({
    nombre: '',
    telefono: '',
    ciudad: '',
    vehiculo: '',
    capacidad_personas: 0,
    capacidad_carga: '',
    cedula: '',
    notas: ''
  });

  const [editForm, setEditForm] = useState({
    nombre: '',
    telefono: '',
    ciudad: '',
    vehiculo: '',
    capacidad_personas: 0,
    capacidad_carga: '',
    cedula: '',
    notas: '',
    disponible: true
  });

  // Modales
  const [activePacienteId, setActivePacienteId] = useState<number | null>(null);
  const [activeMedicamentoId, setActiveMedicamentoId] = useState<number | null>(null);

  // Carga, Errores y Toasts
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Modo de Datos Bajos para redes inestables (Venezuela)
  const [dataSaver, setDataSaver] = useState<boolean>(() => isDataSaverEnabled());

  // Estadísticas de la BD (cantidad real y última fecha)
  const [stats, setStats] = useState<{ pacientes_count: number; ultimo_registro: string | null; hospitales_count: number } | null>(null);

  // Refs para enfocar automáticamente el buscador de cada pestaña
  const inputPacientesRef = React.useRef<HTMLInputElement>(null);
  const inputMedicamentosRef = React.useRef<HTMLInputElement>(null);
  const inputTransporteRef = React.useRef<HTMLInputElement>(null);

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

  // Helper para formatear fecha en español (hora Venezuela UTC-4)
  const formatStatsDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      // Parse YYYY-MM-DD manualmente (timezone-safe)
      const [y, m, d] = dateStr.split('-').map(Number);
      const meses = ['enero','febrero','marzo','abril','mayo','junio',
                     'julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
      // Crear fecha como mediodía UTC para evitar desplazamientos de zona horaria
      const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return `${dias[date.getUTCDay()]} ${d} de ${meses[m - 1]}`;
    } catch { return ''; }
  };

  // Manejadores para el registro y gestión de transporte voluntario
  const handleOpenEditTransport = (transporte: Transporte) => {
    setEditingTransport(transporte);
    setEditForm({
      nombre: transporte.nombre,
      telefono: transporte.telefono,
      ciudad: transporte.ciudad,
      vehiculo: transporte.vehiculo,
      capacidad_personas: transporte.capacidad_personas,
      capacidad_carga: transporte.capacidad_carga,
      cedula: '', // Campo vacío para que ingresen su cédula-contraseña
      notas: transporte.notas || '',
      disponible: transporte.disponible
    });
    setShowRegisterTransportForm(false); // Cerrar formulario de registro si estaba abierto
    // Desplazar suavemente hacia la vista de gestión
    setTimeout(() => {
      document.getElementById('transporte-management-anchor')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleRegisterTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.nombre.trim()) return triggerToast('El nombre completo es obligatorio.');
    if (!regForm.telefono.trim()) return triggerToast('El número de teléfono es obligatorio.');
    if (!regForm.ciudad) return triggerToast('Selecciona la ciudad de operación.');
    if (!regForm.vehiculo.trim()) return triggerToast('Describe brevemente tu vehículo.');
    if (!regForm.cedula.trim()) return triggerToast('La cédula es obligatoria (servirá como tu clave para cambios).');

    setLoading(true);
    try {
      await registrarTransporte(regForm);
      triggerToast('¡Te has registrado exitosamente como vehículo voluntario!');
      setShowRegisterTransportForm(false);
      // Limpiar formulario
      setRegForm({
        nombre: '',
        telefono: '',
        ciudad: '',
        vehiculo: '',
        capacidad_personas: 0,
        capacidad_carga: '',
        cedula: '',
        notas: ''
      });
      // Recargar lista de transporte
      const updated = await getTransporte(debouncedTransporteQuery, transporteSelectedCiudad, transporteSoloDisponibles);
      setTransportes(updated);
    } catch (err: any) {
      triggerToast(`Error al registrarse: ${err.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransport) return;
    if (!editForm.cedula.trim()) return triggerToast('Ingresa tu cédula de identidad para guardar los cambios.');

    setLoading(true);
    try {
      const res = await actualizarTransporte(editingTransport.id, editForm.cedula, {
        nombre: editForm.nombre,
        telefono: editForm.telefono,
        ciudad: editForm.ciudad,
        vehiculo: editForm.vehiculo,
        capacidad_personas: editForm.capacidad_personas,
        capacidad_carga: editForm.capacidad_carga,
        notas: editForm.notas,
        disponible: editForm.disponible
      });

      if (res.success) {
        triggerToast('¡Registro voluntario actualizado con éxito!');
        setEditingTransport(null);
        // Recargar lista de transporte
        const updated = await getTransporte(debouncedTransporteQuery, transporteSelectedCiudad, transporteSoloDisponibles);
        setTransportes(updated);
      } else {
        triggerToast(`No se pudieron guardar los cambios: ${res.error || 'Cédula de identidad incorrecta.'}`);
      }
    } catch (err: any) {
      triggerToast(`Error de conexión al actualizar: ${err.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransportSubmit = async () => {
    if (!editingTransport) return;
    if (!editForm.cedula.trim()) return triggerToast('Debes ingresar tu cédula de identidad para autorizar la eliminación.');
    
    if (!window.confirm('¿Confirmas que deseas eliminar permanentemente tu oferta de transporte voluntario? Esta acción es irreversible.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await eliminarTransporte(editingTransport.id, editForm.cedula);
      if (res.success) {
        triggerToast('Tu oferta de transporte voluntario ha sido eliminada permanentemente.');
        setEditingTransport(null);
        // Recargar lista de transporte
        const updated = await getTransporte(debouncedTransporteQuery, transporteSelectedCiudad, transporteSoloDisponibles);
        setTransportes(updated);
      } else {
        triggerToast(`No se pudo eliminar: ${res.error || 'Cédula de identidad incorrecta.'}`);
      }
    } catch (err: any) {
      triggerToast(`Error de conexión al eliminar: ${err.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setLoading(false);
    }
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

    // Escuchar cambios de red en tiempo real si el navegador lo soporta
    const conn = (navigator as any).connection;
    if (conn) {
      const handleConnectionChange = () => {
        const manualPref = sessionStorage.getItem('cuidarte_data_saver');
        if (manualPref === null) {
          const autoSaver = isDataSaverEnabled();
          setDataSaver(autoSaver);
          setDataSaverEnabled(autoSaver);
          clearApiCache();
          triggerToast(autoSaver 
            ? '⚡ Red inestable detectada. Activamos el ahorro de datos.' 
            : '✨ Tu señal mejoró. Volvimos a la conexión normal.'
          );
        }
      };

      try {
        conn.addEventListener('change', handleConnectionChange);
      } catch (e) {
        conn.onchange = handleConnectionChange;
      }

      return () => {
        try {
          conn.removeEventListener('change', handleConnectionChange);
        } catch (e) {
          conn.onchange = null;
        }
      };
    }
  }, []);

  // Efecto para cargar estadísticas reales de la BD
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiBase = await getApiBase();
        const res = await fetch(`${apiBase}/stats.php`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok) setStats(json.data);
        }
      } catch (_) {}
    };
    fetchStats();
  }, []);

  // Efecto para enfocar automáticamente el buscador según la pestaña activa
  useEffect(() => {
    if (activeTab === 'pacientes') {
      setTimeout(() => {
        inputPacientesRef.current?.focus();
      }, 50);
    } else if (activeTab === 'insumos') {
      setTimeout(() => {
        inputMedicamentosRef.current?.focus();
      }, 50);
    } else if (activeTab === 'transporte') {
      setTimeout(() => {
        inputTransporteRef.current?.focus();
      }, 50);
    }
  }, [activeTab]);

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

  // 3. Debounce dinámico de búsqueda de Medicamentos/Insumos (800ms en Datos Bajos)
  useEffect(() => {
    const delay = dataSaver ? 800 : 350;
    const handler = setTimeout(() => {
      setDebouncedMedicamentosQuery(medicamentosQuery);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [medicamentosQuery, dataSaver]);

  // 3.5. Debounce dinámico de búsqueda de Transporte (800ms en Datos Bajos)
  useEffect(() => {
    const delay = dataSaver ? 800 : 350;
    const handler = setTimeout(() => {
      setDebouncedTransporteQuery(transporteQuery);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [transporteQuery, dataSaver]);

  // 3.6. Debounce dinámico de búsqueda de Hospitales
  useEffect(() => {
    const delay = dataSaver ? 800 : 350;
    const handler = setTimeout(() => {
      setDebouncedHospitalesQuery(hospitalesQuery);
    }, delay);
    return () => { clearTimeout(handler); };
  }, [hospitalesQuery, dataSaver]);

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

  // 5.5. Búsqueda de Transporte reactiva a filtros
  useEffect(() => {
    let active = true;
    setLoading(true);
    
    getTransporte(debouncedTransporteQuery, transporteSelectedCiudad, transporteSoloDisponibles)
      .then(data => {
        if (active) {
          setTransportes(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          triggerToast('Error al consultar ofertas de transporte.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedTransporteQuery, transporteSelectedCiudad, transporteSoloDisponibles]);

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

        {/* ==================================
            PESTAÑA 1: BÚSQUEDA DE PACIENTES 
           ================================== */}
        {activeTab === 'pacientes' && (
          <div className="space-y-6">
            
            {/* Panel de Controles / Filtros de Pacientes */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">Buscador de Personas Registradas</span>
                <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-mono">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                  </span>
                  📢 {stats ? `${stats.pacientes_count.toLocaleString()} registros` : ''}{stats?.ultimo_registro ? ` • ${formatStatsDate(stats.ultimo_registro)}` : ''}
                </span>
              </div>

              {/* Caja de Búsqueda Grande con Touch Target de al menos 44px */}
              <div className="relative">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={inputPacientesRef}
                  id="input-pacientes-query"
                  type="text"
                  placeholder={
                    searchType === 'nombre' 
                      ? "Escribe el nombre completo o apellido de tu familiar..." 
                      : "Escribe los últimos números o la cédula completa..."
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
                        triggerToast('Buscando por Nombre y Apellido.');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        searchType === 'nombre' 
                          ? 'bg-white text-slate-950 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      Nombre y Apellido
                    </button>
                    <button
                      id="search-type-cedula"
                      onClick={() => {
                        setSearchType('cedula');
                        triggerToast('Buscando por Cédula de Identidad.');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        searchType === 'cedula' 
                          ? 'bg-white text-slate-950 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      Cédula de Identidad
                    </button>
                  </div>
                </div>

                {/* Dropdown de Filtro de Hospital con ComboBox de Autocompletado */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                    Filtrar por Hospital:
                  </span>
                  <HospitalComboBox
                    id="select-hospital-filter"
                    hospitales={hospitales}
                    selectedId={selectedHospitalId}
                    onChange={(id) => setSelectedHospitalId(id)}
                    placeholder="Escribe o selecciona un hospital..."
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
                    <h3 className="text-base font-bold text-slate-900 font-display">Busca a tu ser querido</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                      Escribe su nombre, apellido o número de cédula para ver en qué hospital de Venezuela se encuentra ingresado.
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-left flex gap-3">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-normal">
                      <strong>Nota de Privacidad:</strong> Por seguridad de los pacientes y para respetar su privacidad, no publicamos la lista completa. Solo busca directamente por el nombre o cédula.
                    </p>
                  </div>
                </div>
              ) : pacientes.length === 0 && !loading ? (
                /* Estado: Sin Coincidencias */
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-lg mx-auto">
                  <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                    <HelpCircle className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">No encontramos coincidencias</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    Revisa bien si escribiste bien el apellido o intenta colocando solo los números de su cédula. Si acaban de trasladar al paciente, el sistema puede tardar un par de horas en actualizarse.
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
            PESTAÑA 2: INSUMOS Y MEDICAMENTOS 
           ================================== */}
        {activeTab === 'insumos' && (
          <div className="space-y-6">
            
            {/* Panel de Controles / Filtros de Medicamentos */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">Buscador de Insumos y Medicamentos Donados</span>
                <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-mono">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                  </span>
                  📢 {stats ? `${stats.pacientes_count.toLocaleString()} registros` : ''}{stats?.ultimo_registro ? ` • ${formatStatsDate(stats.ultimo_registro)}` : ''}
                </span>
              </div>

              {/* Buscador de Medicamentos */}
              <div className="relative">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={inputMedicamentosRef}
                  id="input-medicamentos-query"
                  type="text"
                  placeholder="Escribe el insumo o medicamento que buscas (ej. Ibuprofeno, gasa, muletas)..."
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
                  ¿En cuál hospital buscas?:
                </span>
                <HospitalComboBox
                  id="select-med-hospital-filter"
                  hospitales={hospitales}
                  selectedId={medSelectedHospitalId}
                  onChange={(id) => setMedSelectedHospitalId(id)}
                  placeholder="Escribe o selecciona un hospital..."
                />
              </div>

              {/* Interruptor "Solo Disponibles" */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Mostrar solo los que hay</span>
                  <span className="text-[10px] text-slate-400 font-semibold font-sans">Ocultar los insumos que estén agotados temporalmente</span>
                </div>
                <button
                  id="toggle-solo-disponibles"
                  onClick={() => {
                    setSoloDisponibles(!soloDisponibles);
                    triggerToast(soloDisponibles ? 'Mostrando todos los insumos.' : 'Mostrando solo los disponibles.');
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
                  Categoría del Insumo / Fármaco:
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
                  Insumos en Existencia ({medicamentos.length})
                </h2>
              </div>

              {medicamentos.length === 0 && !loading ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-lg mx-auto">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <Pill className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">No hay de ese insumo</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    No encontramos donaciones o inventario activo con esos filtros en este momento. Intenta escribiendo con otras palabras (ej. muletas, gasa, venda) o quitando el filtro de hospital.
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

        {/* ==================================
            PESTAÑA 3: TRANSPORTE VOLUNTARIO 
           ================================== */}
        {activeTab === 'transporte' && (
          <div className="space-y-6">
            
            {/* Panel de Controles / Filtros de Transporte */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">Buscador de Conductores y Vehículos Voluntarios</span>
                <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-mono">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                  </span>
                  📢 Actualizado: En Tiempo Real Hora VE
                </span>
              </div>

              {/* Buscador de Palabras Clave */}
              <div className="relative">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={inputTransporteRef}
                  id="input-transporte-query"
                  type="text"
                  placeholder="Busca por nombre, vehículo, capacidad o notas..."
                  value={transporteQuery}
                  onChange={(e) => setTransporteQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all bg-slate-50/50"
                  style={{ minHeight: '48px' }}
                />
                {transporteQuery && (
                  <button 
                    onClick={() => setTransporteQuery('')} 
                    className="absolute right-4.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Selector Combo de Ciudades de Venezuela */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="select-ciudad-transporte" className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                  ¿En qué ciudad de Venezuela buscas?:
                </label>
                <div className="relative">
                  <select
                    id="select-ciudad-transporte"
                    value={transporteSelectedCiudad}
                    onChange={(e) => {
                      setTransporteSelectedCiudad(e.target.value);
                      triggerToast(e.target.value === '' ? 'Mostrando todas las ciudades.' : `Filtrando transporte en: ${e.target.value}`);
                    }}
                    className="w-full bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all cursor-pointer appearance-none"
                    style={{ minHeight: '48px' }}
                  >
                    <option value="">🗺️ Todas las ciudades / Nacional</option>
                    {[...CIUDADES_VENEZUELA].sort().map((ciudad) => (
                      <option key={ciudad} value={ciudad}>
                        {ciudad}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Interruptor "Solo Conductores Disponibles" */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800">Mostrar solo conductores disponibles ahora</span>
                  <span className="text-[10px] text-slate-400 font-semibold font-sans">Ocultar de la lista los vehículos que estén inactivos o en mantenimiento</span>
                </div>
                <button
                  id="toggle-transporte-solo-disponibles"
                  onClick={() => {
                    setTransporteSoloDisponibles(!transporteSoloDisponibles);
                    triggerToast(transporteSoloDisponibles ? 'Mostrando todos los conductores voluntarios.' : 'Mostrando solo los disponibles ahora.');
                  }}
                  className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                    transporteSoloDisponibles ? 'bg-sky-600' : 'bg-slate-200'
                  }`}
                  style={{ minHeight: '28px' }}
                >
                  <span className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow-sm ${
                    transporteSoloDisponibles ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>

            </div>

            {/* Botón de Auto-Registro y Formularios de Gestión de Transporte */}
            <div id="transporte-management-anchor" className="flex flex-col gap-4">
              {!showRegisterTransportForm && !editingTransport && (
                <button
                  id="btn-show-register-transport"
                  onClick={() => {
                    setShowRegisterTransportForm(true);
                    setEditingTransport(null);
                    setTimeout(() => {
                      document.getElementById('transporte-management-anchor')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className="w-full bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 active:scale-[0.98] text-white font-bold text-sm py-4 px-6 rounded-2xl shadow-md shadow-sky-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  style={{ minHeight: '48px' }}
                >
                  ➕ Auto-Registrar mi Vehículo / Ofrecer Transporte Voluntario
                </button>
              )}

              {/* FORMULARIO DE REGISTRO */}
              {showRegisterTransportForm && (
                <div className="bg-slate-50 border-2 border-dashed border-sky-200 rounded-2xl p-5 sm:p-6 space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-sky-600" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-display">Registrarme como Conductor Voluntario</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Ofrece tu vehículo para traslados o transporte de insumos</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRegisterTransportForm(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-200/50 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleRegisterTransportSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nombre completo */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Nombre y Apellido *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Pedro Pérez"
                          value={regForm.nombre}
                          onChange={(e) => setRegForm({ ...regForm, nombre: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Teléfono de contacto */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Teléfono de Contacto (WhatsApp) *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: +584123456789"
                          value={regForm.telefono}
                          onChange={(e) => setRegForm({ ...regForm, telefono: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Ciudad de Venezuela */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Ciudad de Operación *</label>
                        <select
                          required
                          value={regForm.ciudad}
                          onChange={(e) => setRegForm({ ...regForm, ciudad: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          <option value="">-- Seleccionar Ciudad --</option>
                          {[...CIUDADES_VENEZUELA].sort().map((ciudad) => (
                            <option key={ciudad} value={ciudad}>{ciudad}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tipo de Vehículo */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Vehículo *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Camioneta Pickup 4x4, Toyota Hilux"
                          value={regForm.vehiculo}
                          onChange={(e) => setRegForm({ ...regForm, vehiculo: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Capacidad Personas */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Capacidad de Personas (Puestos libres)</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          placeholder="Ej: 4"
                          value={regForm.capacidad_personas || ''}
                          onChange={(e) => setRegForm({ ...regForm, capacidad_personas: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Capacidad Carga */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Capacidad de Carga (Peso / Espacio)</label>
                        <input
                          type="text"
                          placeholder="Ej: 500 kg, Maletero grande, etc."
                          value={regForm.capacidad_carga}
                          onChange={(e) => setRegForm({ ...regForm, capacidad_carga: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    {/* Cédula como contraseña */}
                    <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl space-y-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-sky-800 font-mono tracking-wider">Cédula de Identidad (Tu Contraseña de Seguridad) *</label>
                        <input
                          type="password"
                          required
                          placeholder="Ej: 12345678 (Solo números)"
                          value={regForm.cedula}
                          onChange={(e) => setRegForm({ ...regForm, cedula: e.target.value })}
                          className="w-full bg-white border border-sky-200 rounded-xl py-3 px-4 text-xs font-bold text-sky-950 placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <p className="text-[10px] text-sky-700 font-semibold leading-relaxed">
                        ⚠️ **Importante**: Tu cédula de identidad se mantendrá estrictamente secreta y **nunca será mostrada** en la página. Solo la utilizas tú para poder modificar, actualizar tu disponibilidad (ej. si estás ocupado) o borrar tu registro permanentemente en el futuro.
                      </p>
                    </div>

                    {/* Notas o aclaraciones */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Notas adicionales u horario disponible</label>
                      <textarea
                        rows={2}
                        placeholder="Ej: Disponible de 7 AM a 9 PM, tengo soga de remolque, camilla improvisada, etc."
                        value={regForm.notas}
                        onChange={(e) => setRegForm({ ...regForm, notas: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRegisterTransportForm(false)}
                        className="px-5 py-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                        style={{ minHeight: '40px' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:bg-sky-400 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                        style={{ minHeight: '40px' }}
                      >
                        {loading ? 'Procesando...' : 'Confirmar Registro Voluntario'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* FORMULARIO DE EDICIÓN / GESTIÓN */}
              {editingTransport && (
                <div className="bg-amber-50/50 border-2 border-dashed border-amber-300 rounded-2xl p-5 sm:p-6 space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚙️</span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-display">Gestionar mi Registro Voluntario</h3>
                        <p className="text-[11px] text-amber-800 font-medium">Modifica los datos de {editingTransport.nombre} o elimina el registro</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingTransport(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-200/50 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleEditTransportSubmit} className="space-y-4">
                    {/* Disponibilidad (Disponible vs Inactivo) */}
                    <div className="bg-white border border-amber-100 p-4 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-800">Estado de Disponibilidad del Vehículo</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Cámbialo a inactivo si estás ocupado, sin gasolina o descansando para no recibir llamadas</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, disponible: !editForm.disponible })}
                        className={`w-14 h-8 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                          editForm.disponible ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                        style={{ minHeight: '32px' }}
                      >
                        <span className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all shadow-sm ${
                          editForm.disponible ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nombre completo */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Nombre y Apellido *</label>
                        <input
                          type="text"
                          required
                          value={editForm.nombre}
                          onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Teléfono de contacto */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Teléfono de Contacto (WhatsApp) *</label>
                        <input
                          type="text"
                          required
                          value={editForm.telefono}
                          onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Ciudad de Venezuela */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Ciudad de Operación *</label>
                        <select
                          required
                          value={editForm.ciudad}
                          onChange={(e) => setEditForm({ ...editForm, ciudad: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          {[...CIUDADES_VENEZUELA].sort().map((ciudad) => (
                            <option key={ciudad} value={ciudad}>{ciudad}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tipo de Vehículo */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Vehículo *</label>
                        <input
                          type="text"
                          required
                          value={editForm.vehiculo}
                          onChange={(e) => setEditForm({ ...editForm, vehiculo: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Capacidad Personas */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Capacidad de Personas (Puestos)</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={editForm.capacidad_personas || ''}
                          onChange={(e) => setEditForm({ ...editForm, capacidad_personas: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Capacidad Carga */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Capacidad de Carga</label>
                        <input
                          type="text"
                          value={editForm.capacidad_carga}
                          onChange={(e) => setEditForm({ ...editForm, capacidad_carga: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    {/* Notas u horario */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">Notas adicionales u horario disponible</label>
                      <textarea
                        rows={2}
                        value={editForm.notas}
                        onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                      />
                    </div>

                    {/* Autorización por cédula */}
                    <div className="bg-amber-100/50 border border-amber-200 p-4 rounded-xl space-y-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-amber-900 font-mono tracking-wider">Cédula de Identidad * (Introduce tu clave secreta para guardar o borrar)</label>
                        <input
                          type="password"
                          required
                          placeholder="Introduce los números de tu cédula para validar"
                          value={editForm.cedula}
                          onChange={(e) => setEditForm({ ...editForm, cedula: e.target.value })}
                          className="w-full bg-white border border-amber-300 rounded-xl py-3 px-4 text-xs font-bold text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                        🔑 Para poder aplicar cualquier cambio o eliminar definitivamente tu registro, debes ingresar tu cédula exactamente igual a como la colocaste al registrarte.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleDeleteTransportSubmit}
                        disabled={loading}
                        className="px-5 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold text-rose-700 transition-all cursor-pointer text-center"
                        style={{ minHeight: '40px' }}
                      >
                        🗑️ Eliminar Registro Permanentemente
                      </button>

                      <div className="flex gap-3 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingTransport(null)}
                          className="px-5 py-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                          style={{ minHeight: '40px' }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-3 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:bg-sky-400 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                          style={{ minHeight: '40px' }}
                        >
                          {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Listado de Transporte */}
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-slate-500 font-mono uppercase tracking-wider">
                  Contactos de Apoyo Voluntario ({transportes.length})
                </h2>
              </div>

              {transportes.length === 0 && !loading ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-lg mx-auto">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <Car className="w-7 h-7 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">No hay ofertas de transporte</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    No encontramos ningún contacto que coincida con tu búsqueda en este momento. Intenta seleccionando otra ciudad o buscando palabras generales (ej. camión, camioneta, rústico).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transportes.map((trans) => (
                    <TransporteCard 
                      key={trans.id} 
                      transporte={trans} 
                      onEdit={handleOpenEditTransport}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* =====================================
            PESTAÑA 4: DIRECTORIO DE HOSPITALES
           ===================================== */}
        {activeTab === 'hospitales' && (() => {
          // Filtrado en memoria de hospitales
          const q = debouncedHospitalesQuery.toLowerCase().trim();
          const filteredHospitales = hospitales.filter(h => {
            if (q && !h.nombre.toLowerCase().includes(q) && 
                !(h.municipio && h.municipio.toLowerCase().includes(q)) &&
                !(h.estado && h.estado.toLowerCase().includes(q))) {
              return false;
            }
            if (hospitalesSelectedEstado && h.estado !== hospitalesSelectedEstado) {
              return false;
            }
            return true;
          });

          // Lista de estados únicos para el filtro
          const estadosUnicos = [...new Set(
            hospitales.map(h => h.estado).filter(Boolean)
          )].sort();

          return (
            <div className="space-y-6">
              {/* Panel de Búsqueda */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-500">Directorio de Centros Hospitalarios</span>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-mono">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                    </span>
                    📢 {hospitales.length} centros registrados
                  </span>
                </div>

                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={inputTransporteRef}
                    type="text"
                    placeholder="Busca por nombre del hospital, clínica o municipio..."
                    value={hospitalesQuery}
                    onChange={(e) => setHospitalesQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all bg-slate-50/50"
                    style={{ minHeight: '48px' }}
                  />
                  {hospitalesQuery && (
                    <button 
                      onClick={() => setHospitalesQuery('')} 
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filtro por Estado */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                    Filtrar por Estado:
                  </span>
                  <div className="flex overflow-x-auto pb-1.5 sm:pb-0 sm:flex-wrap gap-1.5 pt-1 scroll-smooth -mx-1 px-1 [scrollbar-width:none]">
                    <button
                      onClick={() => setHospitalesSelectedEstado('')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        hospitalesSelectedEstado === ''
                          ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-100'
                          : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                      }`}
                      style={{ minHeight: '36px' }}
                    >
                      Todos
                    </button>
                    {estadosUnicos.map((estado) => (
                      <button
                        key={estado}
                        onClick={() => setHospitalesSelectedEstado(
                          hospitalesSelectedEstado === estado ? '' : estado
                        )}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                          hospitalesSelectedEstado === estado
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-100'
                            : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                        }`}
                        style={{ minHeight: '36px' }}
                      >
                        {estado}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Listado de Hospitales */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-slate-500 font-mono uppercase tracking-wider">
                    {loading ? 'Cargando...' : `Centros (${filteredHospitales.length})`}
                  </h2>
                  {loading && (
                    <span className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></span>
                  )}
                </div>

                {hospitales.length === 0 && !loading ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-lg mx-auto">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-display">Cargando directorio...</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                      Conectando con la base de datos de hospitales. Si tarda mucho, revisa tu conexión.
                    </p>
                  </div>
                ) : filteredHospitales.length === 0 && !loading ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-lg mx-auto">
                    <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center text-amber-500 mx-auto">
                      <Search className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-display">Sin resultados</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                      No encontramos centros que coincidan con "{hospitalesQuery}". Prueba con otro nombre, municipio o estado.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredHospitales.map((hospital) => (
                      <HospitalCard key={hospital.id} hospital={hospital} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      </main>

      {/* Barra de Ahorro de Datos / Estado de Red al pie de página (Venezuela) */}
      <footer className="w-full max-w-4xl mx-auto px-4 pb-12 mt-2 space-y-6">
        <div 
          id="data-saver-status-bar" 
          className={`rounded-2xl p-4 border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${
            dataSaver 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-white border-slate-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              dataSaver ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold flex flex-wrap items-center gap-1.5 leading-none">
                {dataSaver ? 'Ahorro de datos activo (Pocos megas)' : 'Visualización normal'}
                <span className="text-slate-300">•</span>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">
                  Autodetección de red activa
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-normal max-w-lg">
                {dataSaver 
                  ? 'Ocultamos fotos e información no urgente para que el buscador vuele aunque tengas una sola rayita de señal.' 
                  : 'Si estás corto de saldo o la señal en el hospital está muy lenta, puedes activar el ahorro para que cargue más rápido.'}
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
                ? '¡Listo pana! Activamos el ahorro de datos.' 
                : 'Modo ahorro desactivado. Cargando datos completos.'
              );
            }}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer text-center ${
              dataSaver 
                ? 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            style={{ minHeight: '40px' }}
          >
            {dataSaver ? 'Desactivar Ahorro' : 'Forzar Ahorro'}
          </button>
        </div>

        {/* Enlaces de Ayuda Externa y Contacto */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
              Otras páginas de ayuda:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <a 
                href="https://desaparecidosterremotovenezuela.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/20 text-slate-700 hover:text-sky-700 transition-all font-semibold text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>desaparecidosterremotovenezuela.com</span>
              </a>
              <a 
                href="https://venezuelatebusca.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/20 text-slate-700 hover:text-sky-700 transition-all font-semibold text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>venezuelatebusca.com</span>
              </a>
              <a 
                href="https://redayudavenezuela.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/20 text-slate-700 hover:text-sky-700 transition-all font-semibold text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>redayudavenezuela.com</span>
              </a>
              <a 
                href="https://enlazavenezuela.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/20 text-slate-700 hover:text-sky-700 transition-all font-semibold text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>enlazavenezuela.com</span>
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              📧 Contacto: <a href="mailto:info@cuidartevzla.com" className="text-sky-600 hover:underline">info@cuidartevzla.com</a>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Cuídarte Venezuela © 2026 • Apoyo Comunitario
            </span>
          </div>
        </div>
      </footer>

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
