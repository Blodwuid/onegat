import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Asegúrate de usar react-router
import api from '../api/api'; // Ajusta la ruta según corresponda

const FichaGato = () => {
  const { id } = useParams();
  const [gato, setGato] = useState(null);
  const [error, setError] = useState(null);
  const API = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    api.get(`/api/gatos/gatos/${id}/ficha`)
      .then(response => {
        setGato(response.data);
      })
      .catch(err => {
        setError(err);
        console.error(err);
      });
  }, [id]);

  if (error) {
    return <p className="alert alert-danger">Error: {error.message}</p>;
  }

  if (!gato) {
    return <p>Cargando...</p>;
  }

 return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Ficha del Gato</h1>
      <div className="card p-4 shadow-sm">
        {/* Ajuste del tamaño de la imagen */}
        <img
          src={`${API}/media/${gato.imagen}`}
          alt={gato.nombre}
          className="card-img-top mx-auto mb-3"
          style={{ maxWidth: '300px', height: 'auto', objectFit: 'contain' }}
        />
        <div className="card-body">
          <h2 className="card-title">{gato.nombre}</h2>
          <p><strong>Raza:</strong> {gato.raza}</p>
          <p><strong>Sexo:</strong> {gato.sexo}</p>
          <p><strong>Edad:</strong> {gato.edad_num} {gato.edad_unidad}</p>
          <p><strong>Estado de Salud:</strong> {gato.estado_salud}</p>
          <p><strong>Ubicación:</strong> {gato.ubicacion}</p>
          <p><strong>Colonia ID:</strong> {gato.colonia_id}</p>
          <p><strong>Evaluación Sanitaria:</strong> {gato.evaluacion_sanitaria}</p>
          <p><strong>Adoptabilidad:</strong> {gato.adoptabilidad}</p>
          <p><strong>Fecha de Vacunación:</strong> {new Date(gato.fecha_vacunacion).toLocaleDateString()}</p>
          <p><strong>Tipo de Vacuna:</strong> {gato.tipo_vacuna}</p>
          <p><strong>Fecha de Desparasitación:</strong> {new Date(gato.fecha_desparasitacion).toLocaleDateString()}</p>
          <p><strong>Fecha de Esterilización:</strong> {new Date(gato.fecha_esterilizacion).toLocaleDateString()}</p>
          <p><strong>Código de Identificación:</strong> {gato.codigo_identificacion}</p>
        </div>
      </div>
    </div>
  );
};

export default FichaGato;
