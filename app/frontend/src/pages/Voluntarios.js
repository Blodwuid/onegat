import React, { useEffect, useState } from "react";
import api from "../api/api";

const Voluntarios = () => {
  const [voluntarios, setVoluntarios] = useState([]);
  const [formData, setFormData] = useState({
    descripcion: "",
    voluntario_id: "",
    estatus: "pendiente",
  });
  const [mensaje, setMensaje] = useState("");

  // Obtener lista de voluntarios
  useEffect(() => {
    const fetchVoluntarios = async () => {
      try {
        const response = await api.get("/api/voluntarios/voluntarios/");
        setVoluntarios(response.data);
      } catch (error) {
        console.error("Error al obtener los voluntarios", error);
      }
    };

    fetchVoluntarios();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Asignar una actividad
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/voluntarios/actividades_voluntarios/", formData);
      setMensaje("Actividad asignada exitosamente");
      setFormData({ descripcion: "", voluntario_id: "", estatus: "pendiente" });
    } catch (error) {
      console.error("Error al asignar la actividad", error);
      setMensaje("Error al asignar la actividad");
    }
  };

  return (
    <div className="container mt-4">
      <h1>Gestión de Voluntarios</h1>

      {/* Formulario para asignar una actividad */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Asignar Actividad</h3>
          {mensaje && <div className="alert alert-info">{mensaje}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="descripcion" className="form-label">
                Descripción de la Actividad
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
              <label htmlFor="voluntario_id" className="form-label">
                Seleccionar Voluntario
              </label>
              <select
                className="form-control"
                id="voluntario_id"
                name="voluntario_id"
                value={formData.voluntario_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione un voluntario</option>
                {voluntarios.map((voluntario) => (
                  <option key={voluntario.id} value={voluntario.id}>
                    {voluntario.username}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Asignar Actividad
            </button>
          </form>
        </div>
      </div>

      {/* Lista de voluntarios */}
      <div className="card">
        <div className="card-body">
          <h3>Lista de Voluntarios</h3>
          <ul className="list-group">
            {voluntarios.map((voluntario) => (
              <li key={voluntario.id} className="list-group-item">
                <p><strong>Nombre de voluntario:</strong> {voluntario.username}</p>
                <p><strong>Colonia asignada:</strong> {voluntario.colonia_nombre}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Voluntarios;
