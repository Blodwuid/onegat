import React from "react";

// Función para determinar el color basado en el porcentaje
const getColorFromPercentage = (percentage) => {
    if (percentage >= 90) return "#2ecc71"; // Verde
    if (percentage >= 70) return "#f1c40f"; // Amarillo-Verde
    if (percentage >= 50) return "#e67e22"; // Naranja
    if (percentage >= 10) return "#d35400"; // Rojo-Naranja
    return "#c0392b"; // Rojo
};

const EsterilizacionIndicator = ({ porcentaje }) => {
    const color = getColorFromPercentage(porcentaje);

    return (
        <div
            style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#fff",
                fontSize: "14px",
                boxShadow: "0px 0px 5px rgba(0,0,0,0.3)",
            }}
            title={`Porcentaje: ${porcentaje}%`}
        >
            {porcentaje}%
        </div>
    );
};

export default EsterilizacionIndicator;
