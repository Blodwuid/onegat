import React, { useEffect, useState } from "react";
import api from "../api/api";

const Actividades = () => {
  const [actividades, setActividades] = useState([]);
  const [formData, setFormData] = useState({
    descripcion: "",
    gato_id: "",
  });
  const [mensaje, setMensaje] = useState("");

  // Obtener lista de actividades
  useEffect(() => {
    const fetchActividades = async () => {
      try {
        const response = await api.get("/api/actividades/actividades/");
        setActividades(response.data);
      } catch (error) {
        console.error("Error al obtener las actividades", error);
      }
    };

    fetchActividades();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Registrar una nueva actividad
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/actividades/actividades/", formData);
      setMensaje("Actividad registrada exitosamente");
      setActividades([...actividades, response.data]);
      setFormData({ descripcion: "", gato_id: "" });
    } catch (error) {
      console.error("Error al registrar la actividad", error);
      setMensaje("Error al registrar la actividad");
    }
  };

  return (
    <div className="container mt-4">
      <h1>Gestión de Actividades</h1>

      {/* Formulario para registrar una actividad */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Registrar Actividad</h3>
          {mensaje && <div className="alert alert-info">{mensaje}</div>}
          <form onSubmit={handleSubmit}>
          <div className="mb-3">
              <label htmlFor="tipo" className="form-label">Tipo</label>
              <input
                type="text"
                className="form-control"
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="descripcion" className="form-label">
                Descripción
              </label>
              <input
                type="text"
                className="form-control"
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="gato_id" className="form-label">
                ID del Gato
              </label>
              <input
                type="text"
                className="form-control"
                id="gato_id"
                name="gato_id"
                value={formData.gato_id}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Registrar Actividad
            </button>
          </form>
        </div>
      </div>

      {/* Lista de actividades */}
      <div className="card">
        <div className="card-body">
          <h3>Lista de Actividades</h3>
          <ul className="list-group">
            {actividades.map((actividad) => (
              <li key={actividad.id} className="list-group-item">
                <p><strong>Descripción:</strong> {actividad.descripcion}</p>
                <p><strong>ID del Gato:</strong> {actividad.gato_id}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Actividades;
