import React, { useEffect, useState, useRef } from "react";
import api from "../api/api";
import EsterilizacionIndicator from "../components/EsterilizacionIndicator";
import { Link } from "react-router-dom";
import markerIcon from "../assets/icons/marker.png";

const MisColonias = () => {
  const [colonias, setColonias] = useState([]);
  const [gatos, setGatos] = useState([]);
  const [esterilizados, setEsterilizados] = useState({});
  const [selectedColonia, setSelectedColonia] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    ubicacion: "",
    responsable_voluntario: "",
    estado: "activa",
  });
  const [mensaje, setMensaje] = useState("");
  const gatosRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchColonias = async () => {
      try {
        const response = await api.get("/api/colonias/colonias/mis-colonias/");
        setColonias(response.data);
        response.data.forEach(colonia => fetchEsterilizados(colonia.id));
      } catch (error) {
        console.error("Error al obtener las colonias", error);
      }
    };

    fetchColonias();
  }, []);

  const fetchEsterilizados = async (coloniaId) => {
    try {
      const response = await api.get(`/api/colonias/colonias/${coloniaId}/esterilizados`);
      setEsterilizados(prev => ({ ...prev, [coloniaId]: response.data }));
    } catch (error) {
      console.error(`Error al obtener esterilizados para la colonia ${coloniaId}`, error);
    }
  };

  const fetchGatosDeColonia = async (coloniaId) => {
    try {
      if (selectedColonia === coloniaId) {
        // Si ya está abierta, la cerramos
        setSelectedColonia(null);
        setGatos([]);
        return;
      }
  
      // Si está cerrada, hacemos la solicitud y la mostramos
      const response = await api.get(`/api/colonias/colonias/${coloniaId}/gatos`);
      setGatos(response.data);
      setSelectedColonia(coloniaId);
  
      // ⏬ **Scroll automático a la lista de gatos**
      setTimeout(() => {
        gatosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (error) {
      console.error("Error al obtener los gatos de la colonia", error);
    }
  };

  const totalPages = Math.ceil(colonias.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentColonias = colonias.slice(indexOfFirstItem, indexOfLastItem);

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

  {/* Obtener el nombre de la colonia seleccionada */}
  const coloniaActual = currentColonias.find(colonia => colonia.id === selectedColonia);

  return (
    <div className="container mt-4">
      <h1>Gestión de Colonias</h1>


      {/* Lista de colonias */}
      <div className="card mb-4">
        <div className="card-body">
          {/* Encabezado con el botón "Nuevo Gato" */}
          <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex gap-3 ms-auto">
                <Link to="/crear-gato">
                  <button className="btn btn-outline-primary btn-lg shadow-lg px-5 py-3 rounded-pill" 
                    style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                    + Nuevo Gato
                  </button>
                </Link>
                
                <Link to="/mapa">
                  <button className="btn btn-outline-primary btn-lg shadow-lg px-5 py-3 rounded-pill" 
                    style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                    <img src={markerIcon} alt="Marker" width="20" height="20" style={{ marginRight: "8px" }} />
                    Ver Mapa
                  </button>
                </Link>
              </div>
            </div>
          <h3>Lista de Colonias</h3>
          <ul className="list-group">
                {currentColonias.map((colonia) => (
                  <li 
                    key={colonia.id} 
                    className="list-group-item px-3 py-2"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 250px 150px 120px 120px",
                      alignItems: "center",
                      gap: "15px"
                    }}
                  >
                    {/* Columna: Nombre */}
                    <p className="mb-0" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <strong>Nombre:</strong> {colonia.nombre}
                    </p>

                    {/* Columna: Ubicación */}
                    <p className="mb-0" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <strong>Ubicación:</strong> {colonia.ubicacion}
                    </p>

                    {/* Columna: Número de Gatos */}
                    <p className="mb-0 text-center">
                      <strong>Número de Gatos:</strong> {colonia.numero_gatos}
                    </p>

                    {/* Columna: Indicador de porcentaje */}
                    {esterilizados[colonia.id] ? (
                      <div className="d-flex align-items-center justify-content-center">
                        <EsterilizacionIndicator porcentaje={esterilizados[colonia.id].porcentaje_esterilizados} />
                      </div>
                    ) : (
                      <div style={{ minWidth: "60px" }}></div>
                    )}

                    {/* Columna: Botón */}
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => fetchGatosDeColonia(colonia.id)}
                    >
                      Ver Gatos
                    </button>
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

      {selectedColonia && gatos.length > 0 && (
        <div ref={gatosRef} className="card mt-3 mb-5 position-relative">
          <div className="card-body">
            {/* Botón de cierre (X) en la parte superior derecha */}
            <button 
              className="btn btn-close position-absolute" 
              style={{ top: "10px", right: "10px" }} 
              onClick={() => {
                setSelectedColonia(null);
                setGatos([]);
              }}
            >
            </button>

            {/* Título dinámico con el nombre de la colonia */}
            <h3>Gatos de la Colonia {currentColonias.find(colonia => colonia.id === selectedColonia)?.nombre || ''}</h3>
            
            <ul className="list-group">
              {gatos.map((gato) => (
                <li key={gato.id} className="list-group-item">
                  <p><strong>Nombre:</strong> {gato.nombre}</p>
                  <p><strong>Estado de Salud:</strong> {gato.estado_salud}</p>
                  <p><strong>Código:</strong> {gato.codigo_identificacion || "No disponible"}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Mensaje si no hay gatos en la colonia seleccionada */}
      {selectedColonia && gatos.length === 0 && (
        <div className="alert alert-warning mt-3">
          No hay gatos registrados en esta colonia.
        </div>
      )}      
    </div>
  );
};

export default MisColonias;
