import React from 'react';

const NoAutorizado = () => (
  <div className="container py-5 text-center">
    <h2 className="text-danger mb-4">Acceso no autorizado</h2>
    <p>No tienes los permisos necesarios para acceder a esta sección.</p>
    <a href="/" className="btn btn-primary mt-3">Volver al inicio</a>
  </div>
);

export default NoAutorizado;