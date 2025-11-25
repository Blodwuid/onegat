import React, { useEffect, useState, useRef } from "react";
import api from "../api/api";
import EsterilizacionIndicator from '../components/EsterilizacionIndicator';

const ListadoColonias = ({ usuario }) => {
  const [colonias, setColonias] = useState([]);
  const [gatos, setGatos] = useState([]);
  const [esterilizados, setEsterilizados] = useState({});
  const [selectedColonia, setSelectedColonia] = useState(null);
  const gatosRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchColonias = async () => {
      try {
        const response = await api.get("/api/colonias/colonias/");
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
      console.error(`Error al obtener esterilizados para colonia ${coloniaId}`, error);
    }
  };

  const fetchGatosDeColonia = async (coloniaId) => {
    try {
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

  return (
    <div className="container mt-4">
      <h1>Gestión de Colonias</h1>

      {/* Lista de colonias */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Lista de Colonias</h3>
          <ul className="list-group">
          {currentColonias.map((colonia) => (
              <li key={colonia.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <p><strong>Nombre:</strong> {colonia.nombre}</p>
                  <p><strong>Ubicación:</strong> {colonia.ubicacion}</p>
                  <p><strong>Número de Gatos:</strong> {colonia.numero_gatos}</p>
                  
                  {/* Indicador visual de esterilización con espacio */}
                  {esterilizados[colonia.id] && (
                    <div className="mt-2">
                      <EsterilizacionIndicator porcentaje={esterilizados[colonia.id].porcentaje_esterilizados} />
                    </div>
                  )}
                  
                  {/* Botón con espacio superior */}
                  <button className="btn btn-secondary btn-sm mt-3" onClick={() => fetchGatosDeColonia(colonia.id)}>
                    Ver Gatos
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>        
      </div>

      {/* Lista de gatos de la colonia seleccionada */}
      {selectedColonia && gatos.length > 0 && (
        <div ref={gatosRef} className="card mt-3">
          <div className="card-body">
            <h3>Gatos de la Colonia</h3>
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
  );
};

export default ListadoColonias;
