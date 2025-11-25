// MisGatosWrapper.js
import React from "react";
import MisGatos from "./MisGatos";
import MisGatosDesdeListado from "./MisGatosDesdeListado";

const MisGatosWrapper = () => {
  // ✅ Recuperar usuario directamente de localStorage
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) {
    return <div className="alert alert-warning m-4">No hay información de usuario.</div>;
  }

  // Mostrar vista personalizada según el rol
  if (user.role === "voluntario") {
    return <MisGatosDesdeListado />;
  } else if (user.role === "usuario") {
    return <MisGatos />;
  } else {
    return <div className="alert alert-warning m-4">Rol no permitido para esta vista.</div>;
  }
};

export default MisGatosWrapper;

