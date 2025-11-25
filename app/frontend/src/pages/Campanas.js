import React, { useEffect, useRef, useState } from "react";
import api from "../api/api";

const Campanas = () => {
  const [campanas, setCampanas] = useState([]);
  const [gatos, setGatos] = useState([]);
  const gatosRef = useRef(null); // Referencia para el scroll automático
  const [formData, setFormData] = useState({
    nombre: "",
    fecha_inicio: "",
    fecha_fin: "",
    estatus: "",
    voluntarios_involucrados: "",
    gatos_objetivo: 0,
  });
  const [mensaje, setMensaje] = useState("");

  // Obtener lista de campañas
  useEffect(() => {
    const fetchCampanas = async () => {
      try {
        const response = await api.get("/api/campanas/campanas/");
        setCampanas(response.data);
      } catch (error) {
        console.error("Error al obtener las campañas", error);
      }
    };

    fetchCampanas();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Crear una nueva campaña
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/campanas/campanas/", formData);
      setMensaje("Campaña creada exitosamente");
      setCampanas([...campanas, response.data]);
      setFormData({
        nombre: "",
        fecha_inicio: "",
        fecha_fin: "",
        estatus: "",
        voluntarios_involucrados: "",
        gatos_objetivo: 0,
      });
    } catch (error) {
      console.error("Error al crear la campaña", error);
      setMensaje("Error al crear la campaña");
    }
  };

  // Obtener gatos de una campaña y hacer scroll automático
  const fetchGatosDeCampana = async (campanaId) => {
    try {
      const response = await api.get(`/api/campanas/campanas/${campanaId}/gatos`);
      setGatos(response.data);
      
      // Esperar un breve momento antes de hacer scroll
      setTimeout(() => {
        if (gatosRef.current) {
          gatosRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
    } catch (error) {
      console.error("Error al obtener los gatos de la campaña", error);
    }
  };

  // Obtener el Nombre de la colonia a través de colonia_id

  const [colonias, setColonias] = useState({});

  useEffect(() => {
    const fetchColonias = async () => {
      try {
        const response = await api.get("/api/colonias/colonias"); // Ajusta la URL si es diferente
        const coloniasData = response.data.reduce((acc, colonia) => {
          acc[colonia.id] = colonia.nombre; // Guarda { id: nombre }
          return acc;
        }, {});
        setColonias(coloniasData);
      } catch (error) {
        console.error("Error al obtener las colonias", error);
      }
    };

    fetchColonias();
  }, []);


  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString("es-ES");
  };

  return (
    <div className="container mt-4">
      <h1>Gestión de Campañas</h1>

      {/* Formulario para crear una nueva campaña */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Crear Campaña</h3>
          {mensaje && <div className="alert alert-info">{mensaje}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="nombre" className="form-label">Nombre</label>
              <input
                type="text"
                className="form-control"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="fecha_inicio" className="form-label">Fecha de Inicio</label>
              <input
                type="date"
                className="form-control"
                id="fecha_inicio"
                name="fecha_inicio"
                value={formData.fecha_inicio}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="fecha_fin" className="form-label">Fecha de Finalización</label>
              <input
                type="date"
                className="form-control"
                id="fecha_fin"
                name="fecha_fin"
                value={formData.fecha_fin}
                onChange={handleInputChange}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="estatus" className="form-label">Estatus</label>
              <select
                className="form-control"
                id="estatus"
                name="estatus"
                value={formData.estatus}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>Seleccione estado</option>
                <option value="planeada">Planeada</option>
                <option value="en progreso">En Progreso</option>
                <option value="completada">Completada</option>
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="voluntarios_involucrados" className="form-label">Voluntarios Involucrados</label>
              <input
                type="text"
                className="form-control"
                id="voluntarios_involucrados"
                name="voluntarios_involucrados"
                value={formData.voluntarios_involucrados}
                onChange={handleInputChange}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="gatos_objetivo" className="form-label">Gatos Objetivo</label>
              <input
                type="number"
                className="form-control"
                id="gatos_objetivo"
                name="gatos_objetivo"
                value={formData.gatos_objetivo}
                onChange={handleInputChange}
              />
            </div>
            <button type="submit" className="btn btn-primary">Crear Campaña</button>
          </form>
        </div>
      </div>

      {/* Lista de campañas */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Lista de Campañas</h3>
          <ul className="list-group">
            {campanas.map((campana) => (
              <li key={campana.id} className="list-group-item">
                <p><strong>Nombre:</strong> {campana.nombre}</p>
                <p><strong>Fecha de Inicio:</strong> {formatearFecha(campana.fecha_inicio)}</p>
                <p><strong>Fecha de Finalización:</strong> {formatearFecha(campana.fecha_fin)}</p>
                <p><strong>Estatus:</strong> {campana.estatus}</p> {/* ✅ Mostrar el estado actualizado */}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchGatosDeCampana(campana.id)}
                >
                  Ver Gatos
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lista de gatos de una campaña con referencia para scroll automático */}
      {gatos.length > 0 && (
        <div className="card" ref={gatosRef}>
          <div className="card-body">
            <h3>Gatos de la Campaña</h3>
            <ul className="list-group">
              {gatos.map((gato) => (
                <li key={gato.id} className="list-group-item">
                  <p><strong>Nombre:</strong> {gato.nombre}</p>
                  <p><strong>Código de Identificación:</strong> {gato.codigo_identificacion || "Sin datos actualizados"}</p>
                  <p><strong>Colonia:</strong> {colonias[gato.colonia_id] || "Sin datos actualizados"}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campanas;
