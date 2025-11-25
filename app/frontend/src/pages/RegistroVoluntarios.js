// RegistroVoluntarios.js
import React, { useEffect, useState } from 'react';
import api from "../api/api";

const RegistroVoluntarios = () => {
  const [personas, setPersonas] = useState([]);
  const [colonias, setColonias] = useState([]);
  const [filtroColonia, setFiltroColonia] = useState('');
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 5;

  useEffect(() => {
    // Obtener personas asignadas
    api.get('/api/colonias/asignaciones/')
      .then(res => setPersonas(res.data))
      .catch(err => console.error('Error al cargar las asignaciones', err));

    // Obtener listado de colonias
    api.get('/api/colonias/colonias/').then(res => setColonias(res.data));
  }, []);

  const handleFiltro = (texto) => {
    setFiltroColonia(texto);
    setPagina(1);
  };

  const personasFiltradas = personas.filter(persona =>
    persona.colonia_nombre?.toLowerCase().includes(filtroColonia.toLowerCase())
  );

  const totalPaginas = Math.ceil(personasFiltradas.length / itemsPorPagina);
  const inicio = (pagina - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const personasPagina = personasFiltradas.slice(inicio, fin);

  return (
    <div className="container mt-4">
      <h3>Personas Asignadas a Colonias</h3>

      {/* 🔍 Buscador de texto */}
      <input
        type="text"
        placeholder="Buscar por nombre de colonia..."
        className="form-control mb-2"
        value={filtroColonia}
        onChange={(e) => handleFiltro(e.target.value)}
      />

      {/* ⬇️ Selector de colonias */}
      <select
        className="form-select mb-4"
        value={filtroColonia}
        onChange={(e) => handleFiltro(e.target.value)}
      >
        <option value="">-- Filtrar por colonia --</option>
        {colonias.map(colonia => (
          <option key={colonia.id} value={colonia.nombre}>
            {colonia.nombre}
          </option>
        ))}
      </select>

      {/* 🧑‍🤝‍🧑 Lista paginada */}
      <ul className="list-group">
        {personasPagina.map(persona => (
          <li key={persona.id} className="list-group-item">
            <p><strong>Nombre:</strong> {persona.username}</p>
            <p><strong>Rol:</strong> {persona.role}</p>
            <p><strong>Colonia asignada:</strong> {persona.colonia_nombre || 'No asignada'}</p>
          </li>
        ))}
      </ul>

      {/* 📄 Paginación */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <button
          className="btn btn-outline-primary"
          onClick={() => setPagina(p => Math.max(p - 1, 1))}
          disabled={pagina === 1}
        >
          ◀ Anterior
        </button>
        <span>Página {pagina}</span>
        <button
          className="btn btn-outline-primary"
          onClick={() => setPagina(p => p + 1)}
          disabled={pagina === totalPaginas || totalPaginas === 0}
        >
          Siguiente ▶
        </button>
      </div>
    </div>
  );
};

export default RegistroVoluntarios;
