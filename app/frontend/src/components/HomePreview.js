import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import onegatIcon from "../assets/icons/onegat.webp"; // Asegúrate de que la ruta sea correcta
import onegat_menuIcon from "../assets/icons/onegat_menu.webp"; // Asegúrate de que la ruta sea correcta
import registroColoniasImg from "../assets/icons/registro_colonias.webp"; // Imagen para Registro de Colonias
import esterilizacionImg from "../assets/icons/esterilizacion.webp"; // Imagen para Campaña de Esterilización
import mediacionVecinalImg from "../assets/icons/mediacion_vecinal.webp"; // Imagen para Mediación Vecinal

const HomePreview = () => {
    useEffect(() => {
      const header = document.querySelector("header");
      if (header) header.style.display = "none";
  
      return () => {
        if (header) header.style.display = "block";
      };
    }, []);

  return (
    <>
      {/* Header Minimalista */}
      <header className="bg-white shadow-sm fixed-top py-3">
        <div className="container d-flex justify-content-between align-items-center">
          {/* Logo y Nombre */}
          <div className="d-flex align-items-center">
            <img src={onegat_menuIcon} alt="Logo" style={{ width: "40px", height: "40px", marginRight: "10px" }} />
            <h5 className="m-0 fw-bold text-dark">Onegat</h5>
          </div>

          {/* Menú de Navegación */}
          <nav>
            <ul className="nav">
              <li className="nav-item">
                <a className="nav-link text-dark fw-bold" href="/quienes-somos">Quiénes Somos</a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-dark fw-bold" href="/contacto">Contacto</a>
              </li>
              {/*<li className="nav-item">
                <a className="nav-link text-primary fw-bold" href="/demo">Demo de Prueba</a>
              </li>*/}
            </ul>
          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="container-fluid bg-light d-flex flex-column align-items-center justify-content-center"
           style={{ minHeight: "100vh", padding: "80px 20px" }}>

        {/* Encabezado Principal */}
        <div className="w-75 bg-dark text-white py-4 text-center shadow-lg rounded">
          <h1 className="display-5 fw-bold">Onegat</h1>
          <p className="mt-2" style={{ fontSize: "1.1rem", opacity: "0.8" }}>
            Una solución integral para la gestión y protección de colonias felinas en tu municipio.
          </p>
        </div>

        {/* Párrafo resaltando la Ley de Bienestar Animal */}
        <p className="text-muted mt-4 text-justify w-80 mx-auto" 
           style={{ lineHeight: "1.8", fontSize: "1.1rem", fontWeight: "400", textAlign: "justify" }}>
          Esta aplicación se posiciona como una <strong>herramienta esencial</strong> para la gestión municipal en el marco de la 
          <strong> Ley de Bienestar Animal</strong> (Ley 7/2023, de 28 de marzo). Su diseño permite a los ayuntamientos cumplir con 
          las obligaciones establecidas en la normativa, garantizando la <strong>protección y control ético</strong> de las colonias 
          felinas. Facilita la planificación de <strong>programas de esterilización</strong>, el <strong>registro de colonias </strong>
          y la <strong>mediación vecinal</strong>, promoviendo la convivencia responsable y el bienestar animal en el entorno urbano.
        </p>

        {/* Imagen Central */}
        <div className="text-center mt-4">
          <img
            src={onegatIcon}
            alt="App Icon"
            className="shadow-lg"
            style={{
              width: "220px",
              height: "220px",
              borderRadius: "20px",
              objectFit: "cover",
              border: "4px solid #ddd"
            }}
          />
        </div>

        {/* Descripción General */}
        <p className="text-muted mt-4 text-center w-80 mx-auto" 
           style={{ fontSize: "1.1rem", fontWeight: "400" }}>
          <strong>Un sistema integral</strong> para la gestión eficiente de colonias de gatos, diseñado para municipios y entidades 
          responsables del bienestar animal. <br /><br />
          <strong>Optimiza recursos, mejora la convivencia</strong> y asegura un entorno sostenible para los felinos urbanos y la comunidad.
        </p>

        {/* Tarjetas de Funcionalidades */}
        <div className="row mt-4 w-100 justify-content-around">
          <FeatureCard
            image={registroColoniasImg}
            title="Registro de Colonias"
            description="Administra y monitorea las colonias felinas en tu municipio. Registra nuevas colonias, 
            documenta sus habitantes y facilita el seguimiento de su estado de salud."
          />
          <FeatureCard
            image={esterilizacionImg}
            title="Campañas de Esterilización"
            description="Organiza y gestiona programas de esterilización con facilidad. Coordina citas con veterinarios, 
            registra gatos esterilizados y lleva un control detallado de cada intervención."
          />
          <FeatureCard
            image={mediacionVecinalImg}
            title="Mediación Vecinal"
            description="Facilita la convivencia armoniosa entre vecinos y colonias felinas. Promueve el respeto, la educación 
            y la resolución pacífica de conflictos en la comunidad."
          />
        </div>

        {/* Botón CTA */}
        <Link to="/" className="mt-5">
          <button className="btn btn-outline-primary btn-lg shadow-lg px-5 py-3 rounded-pill" 
                  style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
            Descubre cómo mejorar la gestión municipal
          </button>
        </Link>

      </div>
    </>
  );
};

// Componente de Tarjetas con imagen y texto mejorado
const FeatureCard = ({ image, title, description }) => (
  <div className="col-md-3 d-flex justify-content-center">
    <div className="card text-center shadow-lg p-3" style={{ width: "21rem", borderRadius: "12px" }}>
      <img 
        src={image} 
        alt={title} 
        className="card-img-top"
        style={{ height: "180px", objectFit: "cover", borderRadius: "10px" }}
      />
      <div className="card-body">
        <h5 className="card-title fw-bold">{title}</h5>
        <p className="card-text" style={{ fontSize: "0.9rem", textAlign: "justify" }}>{description}</p>
      </div>
    </div>
  </div>
);

export default HomePreview;
