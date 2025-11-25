import React from 'react';

const KeyHandlerWrapper = ({ children, onEnterPress }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevenir el comportamiento por defecto
      onEnterPress(); // Ejecutar la función pasada como prop
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};

export default KeyHandlerWrapper;
