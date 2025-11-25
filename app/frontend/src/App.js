import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link} from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from './api/api';
import Login from './pages/Login';
import FichaGato from './components/FichaGato';
import ListadoGatos from './components/ListadoGatos';
import MisGatosWrapper from './components/MisGatosWrapper';
import ListadoColonias from "./components/ListadoColonias";
import Gatos from './pages/Gatos';
import Partes from "./pages/Partes";
import Actividades from "./pages/Actividades";
import Colonias from "./pages/Colonias";
import MisColonias from "./components/MisColonias";
import Campanas from "./pages/Campanas";
import Quejas from "./pages/Quejas";
import MisQuejas from "./components/MisQuejas";
import Inspecciones from "./pages/Inspecciones";
import MisInspecciones from "./components/MisInspecciones";
import Informes from "./pages/Informes";
import Voluntarios from "./pages/Voluntarios";
import RegistroVoluntarios from "./pages/RegistroVoluntarios";
import Backup from "./pages/Backup";
import icon_menu from './assets/icons/onegat_menu.webp';
import favicon from "./assets/icons/favicon.ico"; // Importa el favicon
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';

import HomePreview from "./components/HomePreview";
import QuienesSomos from "./components/QuienesSomos";
import Contacto from "./components/Contacto";
import DemoPrueba from "./components/DemoPrueba";
import MapaColonias from "./pages/MapaColonias"; // Importamos el nuevo componente

import CondicionesUso from "./components/CondicionesUso"; // Importamos el nuevo componente
import PoliticaPrivacidad from "./components/PoliticaPrivacidad"; // Importamos el nuevo componente
import NoAutorizado from "./components/NoAutorizado"; // Importamos el nuevo componente
import InformesGraficos from "./components/InformesGraficos";
import LegalModal from './components/LegalModal'; // ajusta ruta según tu estructura

import ResetPasswordForm from './pages/ResetPasswordForm';
import ChangePasswordForm from './pages/ChangePasswordForm';
import RequestPasswordResetForm from './pages/RequestPasswordResetForm';
import RequireAuth from './components/RequireAuth';

// Contexto de Autenticación
export const AuthContext = createContext();

function App() {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')) || null,
  });

  const [showLegalModal, setShowLegalModal] = useState(false);

  // Cargar token desde localStorage al iniciar la app
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
  
    if (token && user) {
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
  
        if (!isExpired && user.accepted_demo_terms) {
          setAuthState({
            token,
            isAuthenticated: true,
            user,
          });
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error al decodificar token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);
  

  // ✅ Nuevo useEffect para mostrar el modal de términos DEMO si no se han aceptado
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    if (token && user && !user.accepted_demo_terms === false) {
      setShowLegalModal(true);
    }
  }, []);  

  useEffect(() => {
    const link = document.querySelector("link[rel='icon']");
    if (!link) {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = favicon;
      document.head.appendChild(newLink);
    } else {
      link.href = favicon;
    }
  }, []);

  // Función para iniciar sesión y actualizar el contexto
  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState({
      token,
      isAuthenticated: true,
      user,
    });
  };

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthState({
      token: null,
      isAuthenticated: false,
      user: null,
    });
  };

  // ✅ Bloque para mostrar el modal si aún no se han aceptado los términos demo
  if (showLegalModal) {
    return (
      <LegalModal
        onAccept={async () => {
          try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Token no encontrado');

            await api.post('/api/auth/accept-demo-terms');


            const perfilResponse = await api.get('/api/auth/me');


            const updatedUser = perfilResponse.data;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            login(token, updatedUser);
            setShowLegalModal(false);

          } catch (error) {
            console.error('Error al aceptar términos demo:', error);
            alert('No se pudieron aceptar los términos demo.');
          }
        }}
      />
    );
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      <Router>
      <header className="bg-dark text-white">
        <div className="container py-3">
          {/* Encabezado centrado */}
          <div className="text-center mb-3">
            <h2 className="m-0" style={{ width: '100%', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Montserrat, sans-serif', letterSpacing: '2px' }}>
              Onegat
            </h2>
          </div>

          {/* Menú e ícono */}
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <img
                src={icon_menu} alt="App Icon" style={{ width: '60px', height: '60px', marginRight: '10px' }} />
            </div>
            {authState.user && <Navigation />}
          </div>
        </div>
      </header>

        <main className="bg-light" style={{ minHeight: "90vh" }}>
          <div className="container py-5">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/preview" element={<HomePreview />} />  {/* Nueva versión en prueba */}
              <Route path="/quienes-somos" element={<QuienesSomos />} />
              <Route path="/contacto" element={<Contacto />} />
              <Route path="/demo" element={<DemoPrueba />} />
              <Route path="/mapa" element={<MapaColonias />} /> {/* Nueva ruta */}

              <Route path="/gatos" element={<ProtectedRoute role={['admin', 'responsable', 'voluntario', 'veterinario']} component={ListadoGatos} />} />
              <Route path="/gatos/:id" element={<ProtectedRoute role={['admin', 'responsable', 'voluntario', 'veterinario', 'usuario']} component={FichaGato} />} />
              <Route path="/crear-gato" element={<ProtectedRoute role={['admin','responsable', 'voluntario']} component={Gatos} />} />
              <Route path="/partes" element={<ProtectedRoute role={['admin']} component={Partes} />} />
              <Route path="/actividades" element={<ProtectedRoute role={['admin', 'veterinario']} component={Actividades} />} />
              <Route path="/colonias" element={<ProtectedRoute role={['admin', 'responsable']} component={Colonias} />} />
              <Route path="/mis-colonias" element={<ProtectedRoute role={['voluntario']} component={MisColonias}/> }/>
              <Route path="/campanas" element={<ProtectedRoute role={['admin', 'responsable', 'veterinario']} component={Campanas} />} />
              <Route path="/quejas" element={<ProtectedRoute role={['admin', 'responsable', 'usuario']} component={Quejas} />} />
              <Route path="/inspecciones" element={<ProtectedRoute role={['admin', 'responsable']} component={Inspecciones} />} />
              <Route path="/informes" element={<ProtectedRoute role={['admin', 'responsable']} component={Informes} />} />
              <Route path="/voluntarios" element={<ProtectedRoute role={['admin', 'responsable']} component={Voluntarios} />} />
              <Route path="/registrovoluntarios" element={<ProtectedRoute role={['admin', 'responsable']} component={RegistroVoluntarios} />} />
              <Route path="/backup" element={<ProtectedRoute role={["admin"]} component={Backup} />} />
              <Route path="/colonias-listado" element={<ProtectedRoute role={['usuario', 'veterinario']} component={ListadoColonias} />} />
              <Route path="/mis-quejas" element={<ProtectedRoute role={['usuario', 'voluntario']} component={MisQuejas} />} />
              <Route path="/mis-inspecciones" element={<ProtectedRoute role={['usuario', 'voluntario']} component={MisInspecciones} />} />
              <Route path="/mis-gatos" element={ <ProtectedRoute role={['usuario', 'voluntario']} component={MisGatosWrapper}/>}/>

              <Route path="/condiciones-uso" element={<CondicionesUso />} />
              <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
              <Route path="/no-autorizado" element={<NoAutorizado />} />
              <Route path="/graficos" element={<InformesGraficos />} />

               <Route path="/solicitar-recuperacion" element={<RequestPasswordResetForm />} />
               <Route path="/resetear-contrasena" element={<ResetPasswordForm />} />
               <Route path="/cambiar-contrasena" element={<ChangePasswordForm />} />
               <Route path="/cambiar-contrasena" element={ <RequireAuth> <ChangePasswordForm /> </RequireAuth> } />
            </Routes>
          </div>
        </main>          
        <footer className="bg-dark text-white text-center py-3">
          <p className="m-0">&copy; 2025 Onegat - Gestión de Colonias de Gatos. Todos los derechos reservados.</p>
        </footer>
      </Router>
    </AuthContext.Provider>
  );
}

// Navegación dinámica
const Navigation = () => {
  const { user, logout } = useContext(AuthContext);

  const menu = {
    admin: [
      { path: '/colonias', label: 'Colonias', icon: 'bi-house-door' },
      //{ path: '/crear-gato', label: 'Nuevo Gato', icon: 'bi-plus-circle' },
      { path: '/gatos', label: 'Listado Gatos', icon: 'bi-list-ul' },
      { path: '/partes', label: 'Partes', icon: 'bi-journal-text' },
      { path: '/actividades', label: 'Actividades', icon: 'bi-activity' },
      { path: '/campanas', label: 'Campañas', icon: 'bi-calendar2-event' },
      { path: '/quejas', label: 'Incidencias', icon: 'bi-chat-dots' },
      { path: '/inspecciones', label: 'Inspecciones', icon: 'bi-search' },
      { path: '/informes', label: 'Informes', icon: 'bi-file-earmark-text' },
      { path: '/voluntarios', label: 'Voluntarios', icon: 'bi-people' },
      { path: '/registrovoluntarios', label: 'Registro Voluntarios', icon: 'bi-people' },
      { path: '/backup', label: 'Gestión Backups', icon: 'bi-database' }
    ],
    responsable: [
      { path: '/colonias', label: 'Colonias', icon: 'bi-house-door' },
      { path: '/crear-gato', label: 'Nuevo Gato', icon: 'bi-plus-circle' },
      { path: '/gatos', label: 'Listado Gatos', icon: 'bi-list-ul' },
      { path: '/campanas', label: 'Campañas', icon: 'bi-calendar2-event' },
      { path: '/quejas', label: 'Incidencias', icon: 'bi-chat-dots' },
      { path: '/inspecciones', label: 'Inspecciones', icon: 'bi-search' },
      { path: '/informes', label: 'Informes', icon: 'bi-file-earmark-text' },
      { path: '/voluntarios', label: 'Voluntarios', icon: 'bi-people' },
      { path: '/registrovoluntarios', label: 'Registro Voluntarios', icon: 'bi-people' }
    ],
    voluntario: [
      { path: '/mis-colonias', label: 'Mis Colonias', icon: 'bi-house-door' },
      { path: '/mis-gatos', label: 'Mis Gatos', icon: 'bi-people' },
      { path: '/mis-quejas', label: 'Listado de Incidencias', icon: 'bi-chat-dots' },
      { path: '/mis-inspecciones', label: 'Listado de Inspecciones', icon: 'bi-chat-dots' }
    ],
    veterinario: [
      { path: '/gatos', label: 'Listado de Gatos', icon: 'bi-list-ul' },
      { path: '/colonias-listado', label: 'Listado de Colonias', icon: 'bi-house-door' },
      { path: '/campanas', label: 'Campañas', icon: 'bi-calendar2-event' },
      { path: '/actividades', label: 'Actividades', icon: 'bi-activity' }
    ],
    usuario: [
      { path: '/mis-gatos', label: 'Mis Gatos', icon: 'bi-person-lines-fill' },
      { path: '/mis-quejas', label: 'Listado de Incidencias', icon: 'bi-chat-dots' },
      { path: '/mis-inspecciones', label: 'Listado de Inspecciones', icon: 'bi-chat-dots' }
    ]
  };

  if (!user) return null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container d-flex justify-content-between align-items-center">
      <button className="navbar-toggler me-3" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav">
            {menu[user.role]?.map((item) => (
              <li className="nav-item" key={item.path}>
                <Link to={item.path} className="nav-link">
                  <i className={`bi ${item.icon} me-2`}></i>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={logout} className="btn nav-link text-light d-flex align-items-center ms-3">
          <i className="bi bi-box-arrow-right me-2"></i>Cerrar
        </button>
      </div>
    </nav>
  );
};


// Rutas protegidas
const ProtectedRoute = ({ role, component: Component }) => {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/" />;

  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) return <Navigate to="/no-autorizado" />;

  return <Component />;
};

export default App;
