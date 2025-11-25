import React from "react";
import api from "../api/api";
import { Link } from "react-router-dom";


const Informes = () => {
  // Función para descargar el informe de colonias
  const descargarInformeColonias = async () => {
    try {
      const response = await api.get("/api/informes/informes/colonias", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "informe_colonias.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al descargar el informe de colonias", error);
      alert("Hubo un error al descargar el informe de colonias.");
    }
  };

  // Función para descargar el informe de campañas
  const descargarInformeCampanas = async () => {
    try {
      const response = await api.get("/api/informes/informes/campanas", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "informe_campanas.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al descargar el informe de campañas", error);
      alert("Hubo un error al descargar el informe de campañas.");
    }
  };

  // Función para descargar gráfico de colonias (con matplotlib)
  const descargarInformeGraficosColonias = async () => {
    try {
      const response = await api.get("/api/informes/informes/graficos/colonias", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "informe_graficos_colonias.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al descargar el informe gráfico", error);
      alert("Hubo un error al descargar el informe visual.");
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">Gestión de Informes</h1>

      {/* Informes clásicos */}
      <div className="card p-4 shadow-sm mb-4">
        <h3>📥 Informes Clásicos</h3>
        <p className="text-muted">Seleccione el informe completo que desea descargar:</p>
        <div className="d-flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={descargarInformeColonias}>
            📘 Informe de Colonias
          </button>
          <button className="btn btn-secondary" onClick={descargarInformeCampanas}>
            📕 Informe de Campañas
          </button>
        </div>
      </div>

      {/* Informes visuales */}
      <div className="card p-4 shadow-sm mb-4">
        <h3>📊 Informes Visuales</h3>
        <p className="text-muted">Resumen gráfico de datos clave.</p>
        <div className="d-flex flex-wrap gap-3">
          <button className="btn btn-outline-success" onClick={descargarInformeGraficosColonias}>
            📊 Gatos por Colonia (Visual con Gráfico pdf)
          </button>
          <Link to="/graficos" className="btn btn-outline-info">
            📈 Ver en Pantalla
          </Link>
        </div>
      </div>

      {/* Imagen inferior decorativa */}
      <div className="mt-5 text-center">
        <img
          src="/assets/icons/report.png"
          alt="Report Icon"
          className="img-fluid"
          style={{ maxWidth: "300px" }}
        />
        <h2 className="mt-3">Gestión de Colonias Felinas</h2>
        <p className="text-muted">Optimización y control de información</p>
      </div>
    </div>
  );
};

export default Informes;
