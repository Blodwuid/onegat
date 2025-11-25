import React, { useEffect, useState } from "react";
import api from "../api/api";
import { resizeImage } from '../components/imageResizer'; // Optimaiza imagen
import { sanitize } from "../utils/sanitize";

const Inspecciones = () => {
  const [inspecciones, setInspecciones] = useState([]);
  const [colonias, setColonias] = useState([]);
  const [formData, setFormData] = useState({
    colonia_id: "",
    observaciones: "",
    acciones_recomendadas: "",
    archivo: null,
  });
  const [mensaje, setMensaje] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      console.log("🔄 Cargando inspecciones...");
      const [inspeccionesRes, coloniasRes] = await Promise.all([
        api.get("/api/inspecciones/inspecciones/"),
        api.get("/api/inspecciones/inspecciones/colonias/")
      ]);
      console.log("✅ Inspecciones cargadas:", inspeccionesRes.data);
      setInspecciones(inspeccionesRes.data);
      setColonias(coloniasRes.data);
    } catch (error) {
      console.error("❌ Error al obtener los datos", error);
    }
  };
  
  // Cargar inspecciones cuando se monte el componente
  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
    try {
      if (imageTypes.includes(file.type)) {
        const resized = await resizeImage(file, 1024, 1024); // ajustar si querés
        setFormData({ ...formData, archivo: resized });
      } else {
        setFormData({ ...formData, archivo: file });
      }
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("colonia_id", formData.colonia_id);
    data.append("observaciones", formData.observaciones);
    data.append("acciones_recomendadas", formData.acciones_recomendadas || "");
    if (formData.archivo) {
      data.append("archivo", formData.archivo);
    }
  
    try {
      const response = await api.post("/api/inspecciones/inspecciones/", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
  
      console.log("✅ Inspección registrada:", response.data);
  
      setMensaje("Inspección registrada exitosamente");
  
      // ✅ Esperar a que la inspección se registre antes de recargar la lista
      await fetchData();

      // ✅ Forzar re-render de React asegurando que los cambios en el estado son detectados
      setInspecciones(prev => [...prev]);
  
      // ✅ Limpiar el formulario después de actualizar la lista
      setFormData({ colonia_id: "", observaciones: "", acciones_recomendadas: "", archivo: null });
  
    } catch (error) {
      console.error("❌ Error al registrar la inspección", error);
      setMensaje("Error al registrar la inspección");
    }
  };

  const resolverInspeccion = async (id) => {
    const confirmacion = window.confirm("¿Estás seguro de marcar esta inspección como resuelta?");
    if (!confirmacion) return;

    try {
      await api.put(`/api/inspecciones/inspecciones/${id}/resolver`);
      fetchData(); // ✅ Recargar la lista después de marcar como resuelta
    } catch (error) {
      console.error("❌ Error al resolver la inspección", error);
    }
  };

  const totalPages = Math.ceil(inspecciones.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInspecciones = inspecciones.slice(indexOfFirstItem, indexOfLastItem);

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
      <h1>Gestión de Inspecciones</h1>
      <div className="card mb-4">
        <div className="card-body">
          <h3>Registrar Inspección</h3>
          {mensaje && <div className="alert alert-info">{mensaje}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Colonia</label>
              <select
                className="form-control"
                name="colonia_id"
                value={formData.colonia_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione una colonia</option>
                {colonias.map((colonia) => (
                  <option key={colonia.id} value={colonia.id}>{colonia.nombre}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-control"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Acciones Recomendadas (opcional)</label>
              <textarea
                className="form-control"
                name="acciones_recomendadas"
                value={formData.acciones_recomendadas}
                onChange={handleInputChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Subir Archivo (Imagen/PDF)</label>
              <input
                type="file"
                className="form-control"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </div>
            <button type="submit" className="btn btn-primary">Registrar Inspección</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3>Lista de Inspecciones</h3>
          <ul className="list-group">
              {currentInspecciones.map((inspeccion) => (
                <li key={inspeccion.id} className="list-group-item">
                  <p><strong>Fecha:</strong> {inspeccion.fecha}</p>
                  <p><strong>Colonia:</strong> {inspeccion.colonia_nombre || "N/A"}</p>
                  <p><strong>Observaciones:</strong> <span dangerouslySetInnerHTML={{ __html: sanitize(inspeccion.observaciones) }} /></p>
                  <p><strong>Acciones Recomendadas:</strong> <span dangerouslySetInnerHTML={{ __html: sanitize(inspeccion.acciones_recomendadas || "N/A") }} /></p>

                  {/* Solo mostrar imágenes jpg/png seguras */}
                  {inspeccion.archivo && inspeccion.archivo.match(/\.(jpg|png)$/i) && (
                    <p>
                      <strong>Archivo:</strong>{" "}
                      <img
                        src={`${inspeccion.archivo}?v=${Date.now()}`}
                        alt="Inspección"
                        style={{ maxWidth: "200px", maxHeight: "200px", display: "block", marginBottom: "5px" }}
                      />
                      <a
                        href={inspeccion.archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver imagen completa
                      </a>
                    </p>
                  )}

                  <p><strong>Estatus:</strong> {inspeccion.estatus || "Pendiente"}</p>
                  {inspeccion.estatus !== "resuelta" && (
                    <button className='btn btn-success rounded-pill shadow-sm' onClick={() => resolverInspeccion(inspeccion.id)}>✔ Marcar como Resuelta</button>
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

export default Inspecciones;
