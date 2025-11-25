import React, { useEffect, useState} from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api'; // Ajusta la ruta según corresponda

const ListadoGatos = () => {
  const [gatos, setGatos] = useState([]);
  const [error, setError] = useState(null);
  const [selectedGato, setSelectedGato] = useState(null); // Gato seleccionado para actualizar
  const [formData, setFormData] = useState({}); // Formulario de actualización
  const [refresh, setRefresh] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGatos = gatos.slice(indexOfFirstItem, indexOfLastItem);
  const API = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchGatos();
}, [refresh]);

  const triggerRefresh = () => setRefresh(prev => !prev);

  const fetchGatos = async (incluirInactivos = false) => {
    try {
        const response = await api.get(`/api/gatos/gatos/?skip=0&limit=100&incluir_inactivos=${incluirInactivos}`);
        setGatos(response.data);
    } catch (err) {
        console.error('Error al obtener los gatos', err);
        setError(err);
    }
};

  const deleteGato = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este gato?')) {
      try {
        await api.delete(`/api/gatos/gatos/${id}`);
        // Actualizar lista de gatos
        setGatos(gatos.filter((gato) => gato.id !== id));
        alert('Gato eliminado exitosamente.');
      } catch (err) {
        console.error('Error al eliminar el gato', err);
        alert('Hubo un problema al eliminar el gato.');
      }
    }
  };

  const darBajaGato = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas dar de baja este gato?')) {
      try {
        await api.put(`/api/gatos/gatos/${id}/baja`);
        alert('Gato dado de baja exitosamente.');
        fetchGatos(); // Actualizar la lista
      } catch (err) {
        console.error('Error al dar de baja el gato', err);
        alert('Hubo un problema al dar de baja el gato.');
      }
    }
  };

  const handleEditClick = (gato) => {
    setSelectedGato(gato);
    setFormData({
      nombre: gato.nombre || "",
      raza: gato.raza || "",
      sexo: gato.sexo || "",
      edad_num: gato.edad_num || "",
      edad_unidad: gato.edad_unidad || "meses",
      estado_salud: gato.estado_salud || "",
      ubicacion: gato.ubicacion || "",
      colonia_id: gato.colonia_id || "",
      evaluacion_sanitaria: gato.evaluacion_sanitaria || "",
      adoptabilidad: gato.adoptabilidad || "",
      fecha_vacunacion: gato.fecha_vacunacion || "",
      tipo_vacuna: gato.tipo_vacuna || "",
      fecha_desparasitacion: gato.fecha_desparasitacion || "",
      fecha_esterilizacion: gato.fecha_esterilizacion || "",
      codigo_identificacion: gato.codigo_identificacion || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return null;
    return date.split("T")[0]; // Extrae solo la parte YYYY-MM-DD
};

const handleUpdateSubmit = async (e) => {
  e.preventDefault();

  try {
      let response;

      // Asegurar formato de fechas correcto antes de enviar
      const cleanFormData = { ...formData };
      if (cleanFormData.fecha_vacunacion) cleanFormData.fecha_vacunacion = formatDateToYYYYMMDD(cleanFormData.fecha_vacunacion);
      if (cleanFormData.fecha_desparasitacion) cleanFormData.fecha_desparasitacion = formatDateToYYYYMMDD(cleanFormData.fecha_desparasitacion);
      if (cleanFormData.fecha_esterilizacion) cleanFormData.fecha_esterilizacion = formatDateToYYYYMMDD(cleanFormData.fecha_esterilizacion);

      if (formData.imagen && typeof formData.imagen !== "string") {
          const formDataToSend = new FormData();
          Object.entries(cleanFormData).forEach(([key, value]) => {
              if (value) formDataToSend.append(key, value);
          });

          response = await api.put(`/api/gatos/gatos/${selectedGato.id}`, formDataToSend, {
              headers: { "Content-Type": "multipart/form-data" },
          });
      } else {
          const { imagen, ...dataToSend } = cleanFormData;
          const filteredData = Object.fromEntries(
              Object.entries(dataToSend).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
          );

          response = await api.put(`/api/gatos/gatos/${selectedGato.id}`, filteredData, {
              headers: { "Content-Type": "application/json" },
          });
      }

      alert("Gato actualizado exitosamente.");
      setSelectedGato(null); // Limpia el modal de edición antes de refrescar
      triggerRefresh(); // Refresca la lista
  } catch (err) {
      console.error("Error al actualizar el gato", err);
      alert("Hubo un problema al actualizar el gato.");
  }
};

const totalPages = Math.ceil(gatos.length / itemsPerPage);

const nextPage = () => {
  if (currentPage < totalPages) {
    setCurrentPage(currentPage + 1);
  }
};

const prevPage = () => {
  if (currentPage > 1) {
    setCurrentPage(currentPage - 1);
  }
};

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Listado de Gatos</h1>
      {error && <p className="alert alert-danger">Error: {error.message}</p>}
      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>ID del Gato</th>
            <th>Nombre</th>
            <th>Datos Básicos</th>
            <th>Datos Adicionales</th>
            <th>Imagen</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {currentGatos.map((gato, index) => (
            <tr key={index}>
              <td>{indexOfFirstItem + index + 1}</td>
              <td>{gato.id}</td>
              <td>
                <Link to={`/gatos/${gato.id}`}>{gato.nombre}</Link>
              </td>
              <td>
                <p><strong>Raza:</strong> {gato.raza}</p>
                <p><strong>Sexo:</strong> {gato.sexo}</p>
                <p><strong>Edad:</strong> {gato.edad_num} {gato.edad_unidad}</p>
                <p><strong>Estado Salud:</strong> {gato.estado_salud}</p>
                <p><strong>Ubicación:</strong> {gato.ubicacion}</p>
              </td>
              <td>
                <p><strong>Colonia ID:</strong> {gato.colonia_id}</p>
                <p><strong>Evaluación:</strong> {gato.evaluacion_sanitaria}</p>
                <p><strong>Adoptabilidad:</strong> {gato.adoptabilidad}</p>
                <p><strong>Vacunación:</strong> {gato.fecha_vacunacion ? new Date(gato.fecha_vacunacion).toLocaleDateString() + ` (${gato.tipo_vacuna})` : "No registrada"}</p>
                <p><strong>Desparasitación:</strong> {gato.fecha_desparasitacion ? new Date(gato.fecha_desparasitacion).toLocaleDateString() : "No registrada"}</p>
                <p><strong>Esterilización:</strong> {gato.fecha_esterilizacion ? new Date(gato.fecha_esterilizacion).toLocaleDateString() : "No registrada"}</p>
                <p><strong>Código:</strong> {gato.codigo_identificacion || "Sin datos"}</p>
              </td>
              <td className="text-center">
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
              <td>
                <div className="d-flex flex-column gap-2">
                  <button className="btn btn-success btn-sm" onClick={() => handleEditClick(gato)}>
                    Actualizar
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteGato(gato.id)}>
                    Eliminar
                  </button>
                  <button className="btn btn-warning btn-sm" onClick={() => darBajaGato(gato.id)}>
                    Dar de Baja
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Botones de paginación */}
      <div className="d-flex justify-content-center mt-4">
        <nav>
          <ul className="pagination">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link" onClick={prevPage} disabled={currentPage === 1}>
                &laquo; Anterior
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                Página {currentPage} de {totalPages}
              </span>
            </li>
            <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
              <button className="page-link" onClick={nextPage} disabled={currentPage === totalPages}>
                Siguiente &raquo;
              </button>
            </li>
          </ul>
        </nav>
      </div>


      {/* Modal para actualizar un gato */}
      {selectedGato && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Actualizar Gato</h5>
                <button className="btn-close" onClick={() => setSelectedGato(null)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdateSubmit}>
                  {/* Nombre */}
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={formData.nombre || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Raza */}
                  <div className="mb-3">
                    <label className="form-label">Raza</label>
                    <input
                      type="text"
                      className="form-control"
                      name="raza"
                      value={formData.raza || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Sexo */}
                  <div className="mb-3">
                    <label className="form-label">Sexo</label>
                    <select
                      className="form-control"
                      name="sexo"
                      value={formData.sexo || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccione</option>
                      <option value="M">Macho</option>
                      <option value="H">Hembra</option>
                    </select>
                  </div>

                  {/* Edad */}
                  <div className="mb-3">
                    <label className="form-label">Edad</label>
                    <div className="d-flex">
                      <input
                        type="number"
                        className="form-control me-2"
                        name="edad_num"
                        value={formData.edad_num || ""}
                        onChange={handleInputChange}
                      />
                      <select
                        className="form-control"
                        name="edad_unidad"
                        value={formData.edad_unidad || ""}
                        onChange={handleInputChange}
                      >
                        <option value="meses">Meses</option>
                        <option value="años">Años</option>
                      </select>
                    </div>
                  </div>

                  {/* Estado de Salud */}
                  <div className="mb-3">
                    <label className="form-label">Estado de Salud</label>
                    <select
                      className="form-control"
                      name="estado_salud"
                      value={formData.estado_salud || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccione</option>
                      <option value="Excelente">Excelente</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>

                  {/* Ubicación */}
                  <div className="mb-3">
                    <label className="form-label">Ubicación</label>
                    <input
                      type="text"
                      className="form-control"
                      name="ubicacion"
                      value={formData.ubicacion || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Colonia ID */}
                  <div className="mb-3">
                    <label className="form-label">Colonia ID</label>
                    <input
                      type="number"
                      className="form-control"
                      name="colonia_id"
                      value={formData.colonia_id || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Evaluación Sanitaria */}
                  <div className="mb-3">
                    <label className="form-label">Evaluación Sanitaria</label>
                    <input
                      type="text"
                      className="form-control"
                      name="evaluacion_sanitaria"
                      value={formData.evaluacion_sanitaria || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Adoptabilidad */}
                  <div className="mb-3">
                    <label className="form-label">Adoptabilidad</label>
                    <input
                      type="text"
                      className="form-control"
                      name="adoptabilidad"
                      value={formData.adoptabilidad || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Fecha de Vacunación */}
                  <div className="mb-3">
                    <label className="form-label">Fecha de Vacunación</label>
                    <input
                      type="date"
                      className="form-control"
                      name="fecha_vacunacion"
                      value={formData.fecha_vacunacion || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Tipo de Vacuna */}
                  <div className="mb-3">
                    <label className="form-label">Tipo de Vacuna</label>
                    <input
                      type="text"
                      className="form-control"
                      name="tipo_vacuna"
                      value={formData.tipo_vacuna || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Fecha de Desparasitación */}
                  <div className="mb-3">
                    <label className="form-label">Fecha de Desparasitación</label>
                    <input
                      type="date"
                      className="form-control"
                      name="fecha_desparasitacion"
                      value={formData.fecha_desparasitacion || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Fecha de Esterilización */}
                  <div className="mb-3">
                    <label className="form-label">Fecha de Esterilización</label>
                    <input
                      type="date"
                      className="form-control"
                      name="fecha_esterilizacion"
                      value={formData.fecha_esterilizacion || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Código de Identificación */}
                  <div className="mb-3">
                    <label className="form-label">Código de Identificación</label>
                    <input
                      type="text"
                      className="form-control"
                      name="codigo_identificacion"
                      maxLength="15"
                      pattern="\d{15}"
                      value={formData.codigo_identificacion || ""}
                      onChange={handleInputChange}
                      placeholder="Ingrese un código de 15 dígitos"
                    />
                  </div>

                  {/* Imagen */}
                  <div className="mb-3">
                    <label className="form-label">Subir Nueva Imagen</label>
                    <input
                      type="file"
                      className="form-control"
                      name="imagen"
                      onChange={(e) => setFormData({ ...formData, imagen: e.target.files[0] })}
                    />
                  </div>

                  {/* Botón de envío */}
                  <button type="submit" className="btn btn-primary w-100">
                    Guardar Cambios
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListadoGatos;