import React from 'react';

const CondicionesUso = () => (
  <div className="container py-5">
    <h2 className="mb-4">Términos y Condiciones de Uso</h2>
    <p><strong>Última actualización:</strong> 29 de marzo de 2025</p>

    <h4>1. Objeto</h4>
    <p>
      El presente documento regula el acceso y uso del sistema informático <strong>Onegat - Gestión de Colonias Felinas</strong>, desarrollado y registrado por su autor original como obra de propiedad intelectual, y licenciado para su uso por la Administración Local correspondiente. Su finalidad es coordinar y gestionar las colonias felinas urbanas mediante usuarios autorizados, garantizando trazabilidad, transparencia y eficiencia.
    </p>

    <h4>2. Ámbito de aplicación</h4>
    <p>
      El acceso está restringido a personas autorizadas (administradores, responsables municipales, voluntariado, veterinariado y ciudadanía usuaria registrada). El uso indebido o fuera del marco de funciones puede ser sancionado administrativa o penalmente.
    </p>

    <h4>3. Obligaciones de las personas usuarias</h4>
    <ul>
      <li>Acceder con credenciales personales y mantener su confidencialidad.</li>
      <li>Utilizar el sistema conforme a sus funciones asignadas.</li>
      <li>No modificar, difundir o usar la información con fines distintos a los autorizados.</li>
    </ul>

    <h4>4. Derechos de propiedad</h4>
    <p>
      El software, su código fuente, diseño, interfaz, estructura y funcionalidad están registrados como propiedad intelectual de su autor original. La Administración Local dispone de una licencia de uso limitada, no exclusiva e intransferible. Cualquier reproducción, modificación o redistribución no autorizada queda prohibida.
    </p>

    <h4>5. Disponibilidad del servicio</h4>
    <p>
      El sistema puede interrumpirse temporalmente por mantenimiento técnico sin responsabilidad para la entidad titular de la licencia.
    </p>

    <h4>6. Aceptación</h4>
    <p>
      La aceptación de estos Términos es condición indispensable para acceder al sistema. Su uso implica conformidad plena y sin reservas.
    </p>

    <div className="mt-4">
      <a
        className="btn btn-outline-secondary"
        href="/Terminos_y_Privacidad_Onegat.pdf"
        download
      >
        Descargar documento completo en PDF
      </a>
    </div>
  </div>
);

export default CondicionesUso;