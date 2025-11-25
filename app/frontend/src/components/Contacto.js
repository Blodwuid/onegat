import React from "react";
import { Link } from "react-router-dom";
import icon from '../assets/icons/onegat.webp';

const Contacto = () => {
  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-vh-100">
      {/* Título */}
      <div className="w-75 bg-dark text-white py-4 text-center shadow-lg rounded">
        <h1 className="display-5 fw-bold">Contacto</h1>
      </div>

      {/* Descripción */}
      <p className="text-muted mt-4 text-center w-75" style={{ lineHeight: "1.8", fontSize: "1.1rem" }}>
        Si tienes dudas, sugerencias o deseas más información sobre nuestra plataforma, 
        no dudes en escribirnos. Estaremos encantados de atenderte.
      </p>

      {/* Correo de contacto */}
      <div className="mt-3 bg-light p-3 rounded shadow-sm">
        <h5 className="fw-bold text-center">📧 Correo de Contacto</h5>
        <p className="text-center">
          <a href="mailto:onegatgestion@gmail.com" className="text-primary fw-bold">
            onegat@onegat.es
          </a>
        </p>
      </div>

      {/* Imagen Representativa */}
      <img src={icon} alt="App Icon" className="mt-4 shadow-lg" 
        style={{ width: "300px", height: "auto", borderRadius: "15px" }} />

      {/* Botón de regreso */}
      <Link to="/preview" className="mt-5">
        <button className="btn btn-outline-primary btn-lg shadow-lg px-5 py-3 rounded-pill">
          Volver a Inicio
        </button>
      </Link>
    </div>
  );
};

export default Contacto;
