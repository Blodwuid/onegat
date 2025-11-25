import React from "react";
import { Link } from "react-router-dom";
import icon from '../assets/icons/onegat.webp';

const DemoPrueba = () => {
  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-vh-100">
      {/* Título */}
      <div className="w-75 bg-dark text-white py-4 text-center shadow-lg rounded">
        <h1 className="display-5 fw-bold">Demo de Prueba</h1>
      </div>

      {/* Descripción */}
      <p className="text-muted mt-4 text-center w-75" style={{ lineHeight: "1.8", fontSize: "1.1rem" }}>
        Explora todas las funcionalidades de nuestra plataforma con una versión de prueba. 
        Descubre cómo gestionar colonias felinas de manera eficiente y probar todas las herramientas 
        disponibles antes de su implementación.
      </p>

      {/* Imagen Representativa */}
      <img src={icon} alt="App Icon" className="mt-4 shadow-lg" 
        style={{ width: "300px", height: "auto", borderRadius: "15px" }} />

      {/* Botón de Acceso a la Demo */}
      <a href="#" className="mt-4">
        <button className="btn btn-success btn-lg shadow-lg px-5 py-3 rounded-pill">
          Acceder a la Demo
        </button>
      </a>

      {/* Botón de regreso */}
      <Link to="/preview" className="mt-4">
        <button className="btn btn-outline-primary btn-lg shadow-lg px-5 py-3 rounded-pill">
          Volver a Inicio
        </button>
      </Link>
    </div>
  );
};

export default DemoPrueba;
