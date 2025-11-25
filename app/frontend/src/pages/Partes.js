import React, { useEffect, useState } from "react";
import api from '../api/api';

const Partes = () => {
  const [partes, setPartes] = useState([]);
  const [formData, setFormData] = useState({
    descripcion: "",
    estado: "pendiente",
  });
  const [mensaje, setMensaje] = useState("");

  // Obtener lista de partes
  useEffect(() => {
    const fetchPartes = async () => {
      try {
        const response = await api.get("/api/partes/partes/");
        setPartes(response.data);
      } catch (error) {
        console.error("Error al obtener los partes", error);
      }
    };

    fetchPartes();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Crear un nuevo parte
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/partes/partes/", formData);
      setMensaje("Parte creado exitosamente");
      setPartes([...partes, response.data]);
      setFormData({ descripcion: "", estado: "pendiente" });
    } catch (error) {
      console.error("Error al crear el parte", error);
      setMensaje("Error al crear el parte");
    }
  };

  return (
    <div className="container mt-4">
      <h1>Gestión de Partes</h1>

      {/* Formulario para crear un nuevo parte */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Crear Parte</h3>
          {mensaje && <div className="alert alert-info">{mensaje}</div>}
          <form onSubmit={handleSubmit}>
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
              <label htmlFor="estado" className="form-label">
                Estado
              </label>
              <select
                className="form-control"
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleInputChange}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en progreso">En Progreso</option>
                <option value="resuelto">Resuelto</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Crear Parte
            </button>
          </form>
        </div>
      </div>

      {/* Lista de partes */}
      <div className="card">
        <div className="card-body">
          <h3>Lista de Partes</h3>
          <ul className="list-group">
            {partes.map((parte) => (
              <li key={parte.id} className="list-group-item">
                <p><strong>Descripción:</strong> {parte.descripcion}</p>
                <p><strong>Estado:</strong> {parte.estado}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Partes;
