import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { Link } from 'react-router-dom';

const MisGatos = () => {
  const [gatos, setGatos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const gatosPorPagina = 10;
  const API = process.env.REACT_APP_BACKEND_URL;

  const fetchGatos = async () => {
    try {
      const response = await api.get(`/api/gatos/gatos/mis-gatos?skip=${(pagina - 1) * gatosPorPagina}&limit=${gatosPorPagina}`);
      setGatos(response.data);
      setTotalPaginas(Math.ceil(response.data.length / gatosPorPagina));
    } catch (error) {
      console.error('Error al obtener los gatos asignados:', error);
    }
  };

  useEffect(() => {
    fetchGatos();
  }, [pagina]);

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">🐾 Listado de Gatos Asignados</h2>
      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>ID del Gato</th>
            <th>Nombre</th>
            <th>Datos Básicos</th>
            <th>Datos Adicionales</th>
            <th>Imagen</th>
          </tr>
        </thead>
        <tbody>
          {gatos.map((gato, index) => (
            <tr key={gato.id}>
              <td>{(pagina - 1) * gatosPorPagina + index + 1}</td>
              <td>{gato.id}</td>
              <td>
                <Link to={`/gatos/${gato.id}`}>{gato.nombre}</Link>
              </td>
              <td>
                <strong>Raza:</strong> {gato.raza || '—'}<br />
                <strong>Sexo:</strong> {gato.sexo || '—'}<br />
                <strong>Edad:</strong> {gato.edad || '—'}<br />
                <strong>Estado Salud:</strong> {gato.estado_salud || '—'}<br />
                <strong>Ubicación:</strong> {gato.ubicacion || '—'}
              </td>
              <td>
                <strong>Colonia ID:</strong> {gato.colonia_id || '—'}<br />
                <strong>Evaluación:</strong> {gato.evaluacion_sanitaria || '—'}<br />
                <strong>Adoptabilidad:</strong> {gato.adoptabilidad || '—'}<br />
                <strong>Vacunación:</strong> {gato.vacunado ? 'Registrada' : 'No registrada'}<br />
                <strong>Desparasitación:</strong> {gato.desparasitado ? 'Registrada' : 'No registrada'}<br />
                <strong>Esterilización:</strong> {gato.fecha_esterilizacion || '—'}<br />
                <strong>Código:</strong> {gato.codigo_identificacion || 'Sin datos'}
              </td>
              <td>
              {gato.imagen ? (
                <img
                  src={`${API}/media/${gato.imagen}?v=${new Date().getTime()}`} // ✅ Forzar recarga
                  alt={gato.nombre}
                  style={{
                    maxWidth: '150px',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                />
              ) : (
                <span>Sin Imagen</span>
              )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="d-flex justify-content-between align-items-center">
        <button className="btn btn-outline-primary" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>
          ◀ Anterior
        </button>
        <span>Página {pagina}</span>
        <button className="btn btn-outline-primary" onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas}>
          Siguiente ▶
        </button>
      </div>
    </div>
  );
};

export default MisGatos;