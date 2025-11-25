import React from "react";
import { Link } from "react-router-dom";
import icon from '../assets/icons/onegat.webp';

const QuienesSomos = () => {
  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-vh-100">
      {/* Título */}
      <div className="w-75 bg-dark text-white py-4 text-center shadow-lg rounded">
        <h1 className="display-5 fw-bold">Quiénes Somos</h1>
      </div>

      {/* Descripción */}
      <p className="text-muted mt-4 text-center w-75" style={{ lineHeight: "1.8", fontSize: "1.1rem" }}>
        Somos un equipo de profesionales comprometidos con el <strong>bienestar animal</strong> y la 
        <strong> gestión eficiente</strong> de colonias felinas en entornos urbanos. Nuestra plataforma está 
        diseñada para ayudar a los municipios a cumplir con la <strong>Ley de Bienestar Animal</strong>, facilitando 
        la administración de registros, campañas de esterilización y mediación vecinal.
      </p>

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

export default QuienesSomos;
