import React, { useState } from 'react';
import api from '../api/api';

const RequestPasswordResetForm = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo válido.');
      return;
    }

    try {
      await api.post('/api/auth/request-reset', { email });
      setMessage('Si el correo está registrado, se ha enviado un enlace para restablecer la contraseña.');
      setEmail('');
    } catch (err) {
      console.error(err);
      setError('Error al solicitar el restablecimiento de contraseña. Intenta más tarde.');
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow-sm">
        <h2 className="mb-3 text-center">Recuperar Contraseña</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="form-control mb-3"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-primary w-100">
            Enviar Enlace de Recuperación
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequestPasswordResetForm;
