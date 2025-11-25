import React, { useEffect, useState } from 'react';
import api from "../api/api";

const MisInspecciones = () => {
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
        api.get("/api/inspecciones/inspecciones/mis-inspecciones"),
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
  
    const handleFileChange = (e) => {
      setFormData({ ...formData, archivo: e.target.files[0] });
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
        const response = await api.post("/api/inspecciones/inspecciones/mis-inspecciones", data, {
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
        
        <div className="card">
          <div className="card-body">
            <h3>Lista de Inspecciones</h3>
            <ul className="list-group">
                {currentInspecciones.map((inspeccion) => (
                  <li key={inspeccion.id} className="list-group-item">
                    <p><strong>Fecha:</strong> {inspeccion.fecha}</p>
                    <p><strong>Colonia:</strong> {inspeccion.colonia_nombre || "N/A"}</p>
                    <p><strong>Observaciones:</strong> {inspeccion.observaciones}</p>
                    <p><strong>Acciones Recomendadas:</strong> {inspeccion.acciones_recomendadas || "N/A"}</p>
                    
                    {inspeccion.archivo && (
                      <p>
                        <strong>Archivo:</strong>{" "}
                        {inspeccion.archivo.endsWith(".jpg") || inspeccion.archivo.endsWith(".png") ? (
                          <>
                            <img 
                              src={`${inspeccion.archivo}?v=${new Date().getTime()}`} // ✅ Forzar recarga
                              alt="Inspección" 
                              style={{ maxWidth: "200px", maxHeight: "200px", display: "block", marginBottom: "5px" }} 
                            />
                            <a href={inspeccion.archivo} target="_blank" rel="noopener noreferrer">Ver imagen completa</a>
                          </>
                        ) : (
                          <a href={inspeccion.archivo} target="_blank" rel="noopener noreferrer">Ver archivo</a>
                        )}
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
  }
  
  export default MisInspecciones;