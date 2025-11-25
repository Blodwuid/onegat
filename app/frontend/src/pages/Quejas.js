import React, { useEffect, useState } from "react";
import api from "../api/api";
import { resizeImage } from '../components/imageResizer'; // Optimaiza imagen
import { sanitize } from "../utils/sanitize";

const Quejas = () => {
  const [quejas, setQuejas] = useState([]);
  const [colonias, setColonias] = useState([]); // ✅ Nuevo estado para colonias
  const [formData, setFormData] = useState({
    descripcion: "",
    colonia_id: "",
    solucion_responsable: "",
    archivo: null,
  });
  const [mensaje, setMensaje] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Obtener lista de quejas y colonias
  const fetchQuejas = async () => {
    try {
      console.log("🔄 Cargando quejas...");
      const response = await api.get("/api/quejas/quejas/");
      console.log("✅ Quejas cargadas:", response.data);
      setQuejas(response.data);
    } catch (error) {
      console.error("❌ Error al obtener las quejas", error);
    }
  };

  useEffect(() => {
    fetchQuejas();
  }, []);

  const fetchColonias = async () => {
    try {
      console.log("🔄 Cargando colonias...");
      const response = await api.get("/api/inspecciones/inspecciones/colonias/"); // ✅ URL corregida si colonias está en inspecciones
      console.log("✅ Colonias cargadas:", response.data);
      setColonias(response.data);
    } catch (error) {
      console.error("❌ Error al obtener las colonias", error);
    }
  };

  useEffect(() => {
    fetchQuejas();
    fetchColonias(); // ✅ Cargar las colonias al inicio
  }, []);

  // Manejar cambios en los inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Manejar la selección de archivos
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
    try {
      if (imageTypes.includes(file.type)) {
        const resized = await resizeImage(file, 1024, 1024); // o ajustar según uso
        setFormData({ ...formData, archivo: resized });
      } else {
        // Archivos no imagen (PDF, DOC, etc.)
        setFormData({ ...formData, archivo: file });
      }
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
    }
  };

  // Registrar una nueva queja
  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("descripcion", formData.descripcion);
    data.append("colonia_id", formData.colonia_id);
    data.append("solucion_responsable", formData.solucion_responsable || "");
    if (formData.archivo) {
      data.append("archivo", formData.archivo);
    }

    try {
      await api.post("/api/quejas/quejas/", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setMensaje("Queja registrada exitosamente");

      // ✅ Recargar la lista de quejas después de registrar una nueva
      await fetchQuejas();

      // ✅ Limpiar el formulario después de actualizar la lista
      setFormData({ descripcion: "", colonia_id: "", solucion_responsable: "", archivo: null });

    } catch (error) {
      console.error("❌ Error al registrar la queja", error);
      setMensaje("Error al registrar la queja");
    }
  };

  const resolverQueja = async (id) => {
    const confirmacion = window.confirm("¿Estás seguro de marcar esta queja como resuelta?");
    if (!confirmacion) return;

    try {
      await api.put(`/api/quejas/quejas/${id}/resolver`);
      fetchQuejas(); // ✅ Asegurar que recargamos los datos actualizados
    } catch (error) {
      console.error("❌ Error al resolver la queja", error);
    }
  };

  const totalPages = Math.ceil(quejas.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentQuejas = quejas.slice(indexOfFirstItem, indexOfLastItem);

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
    <div className="container mt-4">
      <h1>Gestión de Incidencias</h1>

      {/* Formulario para registrar una queja */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Registrar Incidencia</h3>
          {mensaje && <div className="alert alert-info">{mensaje}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-control"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Colonia</label>
              <select
                className="form-control"
                name="colonia_id"
                value={formData.colonia_id}
                onChange={handleInputChange}
              >
                <option value="">Seleccione una colonia</option>
                {colonias.map((colonia) => (
                  <option key={colonia.id} value={colonia.id}>{colonia.nombre}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Solución Responsable (opcional)</label>
              <input
                type="text"
                className="form-control"
                name="solucion_responsable"
                value={formData.solucion_responsable}
                onChange={handleInputChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Subir Archivo (Imagen/PDF) (opcional)</label>
              <input
                type="file"
                className="form-control"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </div>
            <button type="submit" className="btn btn-primary">Registrar Incidencia</button>
          </form>
        </div>
      </div>

      {/* Lista de quejas */}
      <div className="card">
        <div className="card-body">
          <h3>Lista de Incidencias</h3>
          <ul className="list-group">
              {currentQuejas.map((queja) => (
                <li key={queja.id} className="list-group-item">
                  <p><strong>Fecha:</strong> {queja.fecha}</p>
                  <p><strong>Descripción:</strong> <span dangerouslySetInnerHTML={{ __html: sanitize(queja.descripcion) }} /></p>
                  <p><strong>Colonia:</strong> {queja.colonia_nombre || "N/A"}</p>
                  <p><strong>Solución Responsable:</strong> <span dangerouslySetInnerHTML={{ __html: sanitize(queja.solucion_responsable || "N/A") }} /></p>

                  {/* Manejo de archivos adjuntos: solo imágenes seguras */}
                  {queja.archivo && queja.archivo.match(/\.(jpg|png)$/i) && (
                    <div>
                      <strong>Archivo:</strong>
                      <img
                        src={`${queja.archivo}?v=${new Date().getTime()}`}
                        alt="Queja"
                        style={{ maxWidth: "200px", maxHeight: "200px", display: "block", marginBottom: "5px" }}
                      />
                      <a
                        href={queja.archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver imagen completa
                      </a>
                    </div>
                  )}
                  
                  <p><strong>Estatus:</strong> {queja.estatus}</p>

                  {/* 🔹 Botón para marcar como resuelta */}
                  {queja.estatus !== "resuelta" && (
                    <button className='btn btn-success rounded-pill shadow-sm' onClick={() => resolverQueja(queja.id)}>✔ Marcar como Resuelta</button>
                )}
                </li>
              ))}
          </ul>
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
        </div>
      </div>
    </div>
  );
};

export default Quejas;
