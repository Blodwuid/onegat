import React from 'react';
import '../styles/LegalModal.css'; // Usa el mismo estilo si ya existe./assets/icons/onegat_menu.webp

const LegalModal = ({ onAccept }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Condiciones de uso</h2>
        <p>
          Este entorno es una <strong>demo de uso restringido</strong>. Su uso sin autorización con fines operativos
          está <strong>prohibido</strong>. Si deseas un entorno de producción, contacta con soporte (onegat@onegat.es).
        </p>
        <button className="accept-btn" onClick={onAccept}>
          Aceptar y continuar
        </button>
      </div>
    </div>
  );
};

export default LegalModal;