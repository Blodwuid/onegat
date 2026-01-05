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
  const [loginError, setLoginError] = useState(''); // 🔴 NUEVO
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showLegalModal, setShowLegalModal] = useState(false);

  const handleLogin = async () => {
    try {
      setLoginError(''); // 🔴 Limpia errores previos

      const loginPayload = { username, password };

      if (mustAcceptTerms) {
        loginPayload.accepted_terms = acceptedTerms;
        if (!acceptedTerms) {
          setLoginError('Debes aceptar los términos y condiciones para continuar.');
          return;
        }
      }

      const response = await api.post('/api/auth/login', loginPayload);
      const token = response.data.access_token;
      localStorage.setItem('token', token);

      const perfilResponse = await api.get('/api/auth/me');
      const user = perfilResponse.data;

      if (!user.accepted_demo_terms) {
        setShowLegalModal(true);
        return;
      }

      localStorage.setItem('user', JSON.stringify(user));
      login(token, user);

      const role = user.role;
      if (role === 'admin' || role === 'responsable') navigate('/colonias');
      else if (role === 'voluntario') navigate('/mis-colonias');
      else if (role === 'veterinario') navigate('/gatos');
      else if (role === 'usuario') navigate('/mis-gatos');
      else navigate('/');

      // 🟢 SIN alert de éxito
    } catch (error) {
      console.error('Error en login:', error);

      const detail = error?.response?.data?.detail;

      if (typeof detail === 'string') {
        const msg = detail.toLowerCase();

        if (msg.includes('términos')) {
          setMustAcceptTerms(true);
          setLoginError('Debes aceptar los términos y condiciones para continuar.');
        } else if (msg.includes('credentials') || msg.includes('credenciales')) {
          setLoginError('El usuario o la contraseña son incorrectos.');
        } else {
          setLoginError(detail);
        }
      } else {
        setLoginError('No se ha podido iniciar sesión. Inténtalo de nuevo.');
      }
    }
  };

  return (
    <KeyHandlerWrapper onEnterPress={handleLogin}>
      <div className="d-flex justify-content-center mt-5 px-3">
        <div className="card p-4 shadow-sm" style={{ width: '100%', maxWidth: '380px' }}>
          <h1 className="text-center mb-3">Iniciar Sesión</h1>

          <input
            className="form-control mb-2"
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setLoginError('');
            }}
          />

          <input
            className="form-control mb-2"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError('');
            }}
          />

          {/* 🔴 MENSAJE DE ERROR INLINE */}
          {loginError && (
            <div className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
              {loginError}
            </div>
          )}

          <div className="text-end mb-3">
            <Link to="/solicitar-recuperacion" className="small">
              ¿Olvidaste tu contraseña?
            </Link>
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
            </>
          )}

          {showLegalModal && (
            <LegalModal
              onAccept={async () => {
                const token = localStorage.getItem('token');
                await api.post('/api/auth/accept-demo-terms', null, {
                  headers: { Authorization: `Bearer ${token}` },
                });

                const perfilResponse = await api.get('/api/auth/me');
                const updatedUser = perfilResponse.data;

                localStorage.setItem('user', JSON.stringify(updatedUser));
                login(token, updatedUser);
                setShowLegalModal(false);

                const role = updatedUser.role;
                if (role === 'admin' || role === 'responsable') navigate('/colonias');
                else if (role === 'voluntario') navigate('/mis-colonias');
                else if (role === 'veterinario') navigate('/gatos');
                else if (role === 'usuario') navigate('/mis-gatos');
                else navigate('/');
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