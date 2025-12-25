
import React, { useState, useContext } from 'react';
import api from '../api/api';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import KeyHandlerWrapper from '../components/KeyHandlerWrapper';
import LegalModal from '../components/LegalModal';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [mustAcceptTerms, setMustAcceptTerms] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showLegalModal, setShowLegalModal] = useState(false);
  const API = process.env.REACT_APP_BACKEND_URL;

const handleLogin = async () => {
  try {
    const loginPayload = {
      username,
      password,
    };

    if (mustAcceptTerms) {
      loginPayload.accepted_terms = acceptedTerms;
      if (!acceptedTerms) {
        alert('Debes aceptar los términos y condiciones antes de continuar.');
        return;
      }
    }

    console.log('Enviando login:', loginPayload);

    // Enviar login
    const response = await api.post('/api/auth/login', loginPayload);
    const token = response.data.access_token;
    localStorage.setItem('token', token);

    // Obtener perfil del usuario
    const perfilResponse = await api.get('/api/auth/me');
    const user = perfilResponse.data;
    console.log("Perfil recibido:", user);

    // Validar términos pendientes
    if (!user.accepted_demo_terms) {
      setShowLegalModal(true);
      return; // Espera a que acepte antes de continuar
    }

    if (!user.accepted_terms) {
      console.warn("Backend aún devuelve accepted_terms: false");
    }

    // Guardar usuario y continuar
    localStorage.setItem('user', JSON.stringify(user));
    login(token, user);
    console.log("Redireccionando a /colonias");

    // Redirigir según rol
    const role = user.role;
    if (role === 'admin' || role === 'responsable') navigate('/colonias');
    else if (role === 'voluntario') navigate('/mis-colonias');
    else if (role === 'veterinario') navigate('/gatos');
    else if (role === 'usuario') navigate('/mis-gatos');
    else navigate('/');

    alert('Inicio de sesión exitoso');
  } catch (error) {
    console.error("🔥 Error en login:", error);

    const responseData = error?.response?.data;
    const detail = responseData?.detail || responseData;
    console.log("📦 Detalle capturado:", detail);

    if (typeof detail === 'string') {
      const msg = detail.toLowerCase();
      if (msg.includes('términos y condiciones')) {
        setMustAcceptTerms(true);
        alert('Debes aceptar los términos y condiciones para continuar.');
      } else if (msg.includes('credentials')) {
        alert('Credenciales incorrectas. Verifica usuario y contraseña.');
      } else if (msg.includes('licencia') && msg.includes('expirado')) {
        alert(detail);
      } else {
        alert(detail);
      }
    } else {
      alert('Error inesperado al iniciar sesión.');
    }
  }
};

  return (
    <KeyHandlerWrapper onEnterPress={handleLogin}>
      <div className="d-flex justify-content-center mt-5 px-3">
        <div
          className="card p-4 shadow-sm"
          style={{ width: '100%', maxWidth: '380px' }}
        >
          <h1 className="text-center mb-3">Iniciar Sesión</h1>
          <input
            className="form-control mb-2"
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="form-control mb-3"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="text-end mb-3">
            <Link to="/solicitar-recuperacion" className="small">¿Olvidaste tu contraseña?</Link>
          </div>
          {mustAcceptTerms && (
            <>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={() => setAcceptedTerms(!acceptedTerms)}
                />
                <label className="form-check-label" htmlFor="acceptTerms">
                  Acepto los <a href="/condiciones-uso" target="_blank" rel="noreferrer">Términos y Condiciones</a> y la <a href="/politica-privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a>.
                </label>
              </div>

              <p className="form-text text-muted mt-1" style={{ fontSize: '0.85rem' }}>
                Al aceptar los términos, das tu consentimiento para el tratamiento de tus datos conforme a la normativa vigente. Esta acción será registrada.
              </p>
            </>
          )}
          {showLegalModal && (
            <LegalModal
              onAccept={async () => {
                try {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    throw new Error('Token no encontrado en localStorage');
                  }

                  // ✅ Llamada al backend para aceptar los términos demo
                  await api.post('/api/auth/accept-demo-terms', null, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });

                  // ✅ Re-obtener el perfil actualizado
                  const perfilResponse = await api.get('/api/auth/me', {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  const updatedUser = perfilResponse.data;

                  // Guardar y continuar
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                  login(token, updatedUser);

                  // ✅ Cierra modal al aceptar
                  setShowLegalModal(false);

                  // Redirección según rol
                  const role = updatedUser.role;
                  if (role === 'admin') navigate('/colonias');
                  else if (role === 'responsable') navigate('/colonias');
                  else if (role === 'voluntario') navigate('/mis-colonias');
                  else if (role === 'veterinario') navigate('/gatos');
                  else if (role === 'usuario') navigate('/mis-gatos');
                  else navigate('/');

                } catch (error) {
                  console.error("❌ Error al aceptar los términos demo:", error);
                  alert("Error al aceptar los términos. Intenta nuevamente.");
                }
              }}
            />
          )}
          <button onClick={handleLogin} className="btn btn-primary w-100">
            Iniciar Sesión
          </button>
        </div>
      </div>
    </KeyHandlerWrapper>
  );
};

export default Login;
