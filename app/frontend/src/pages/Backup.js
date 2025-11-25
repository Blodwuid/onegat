import React, { useState, useEffect } from "react";
import api from "../api/api";

const Backup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBackups();
  }, []); // Se ejecuta cuando backups cambia

  const fetchBackups = async () => {
    try {
      const response = await api.get("/api/backup/backup/list");
      if (Array.isArray(response.data.backups)) {
        const sortedBackups = response.data.backups.sort((a, b) => b.localeCompare(a));
        setBackups(sortedBackups);
      } else {
        setBackups([]);
      }
    } catch (err) {
      console.error("Error al obtener la lista de backups:", err);
      setError("No se pudo obtener la lista de backups.");
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
        await api.post("/api/backup/backup", { backup_type: "full", format: "sql" });

        // Espera 1 segundo y actualiza la lista solo una vez
        setTimeout(() => {
            fetchBackups();
        }, 1000); // Ajustado a 1000ms para evitar consumo innecesario de recursos

    } catch (err) {
        setError("Error al crear el backup");
    }
    setLoading(false);
};

  const handleRestoreBackup = async (filename) => {
    setLoading(true);
    try {
      await api.post(`/api/backup/restore?backup_filename=${filename}`);
      alert("Restauración completada");
      fetchBackups(); // Actualiza la lista después de restaurar
    } catch (err) {
      setError("Error al restaurar el backup");
    }
    setLoading(false);
};

  const handleDownloadBackup = async (filename) => {
    try {
        const response = await api.get(`/api/backup/backup/download/${filename}`, {
            responseType: 'blob', // Importante para recibir archivos
        });

        // Crear una URL para descargar el archivo
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename); // Nombre del archivo
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Error al descargar el backup:", error);
        alert("No se pudo descargar el backup.");
    }
};

const handleImportBackup = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  setLoading(true);
  try {
      await api.post("/api/backup/backup/import", formData, {
          headers: {
              "Content-Type": "multipart/form-data"
          }
      });
      alert("Backup importado y restaurado correctamente");
      fetchBackups(); // Actualizar lista si lo deseas
  } catch (err) {
      console.error("Error al importar backup:", err);
      alert("Error al importar el backup");
  }
  setLoading(false);
};

  return (
    <div className="container">
      <h2>Gestión de Backups</h2>

      <button className="btn btn-primary mb-3" onClick={handleCreateBackup} disabled={loading}>
        <i className="bi bi-save2"></i> {loading ? "Creando..." : "Crear Backup"}
      </button>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <label htmlFor="import-backup" className="btn btn-secondary">
          <i className="bi bi-upload"></i> Importar Backup
        </label>
        <input
          type="file"
          id="import-backup"
          accept=".sql"
          onChange={handleImportBackup}
          style={{ display: "none" }}
        />
      </div>

      <h4>Lista de Backups</h4>
      {backups.length === 0 ? (
        <p>No hay backups disponibles.</p>
      ) : (
        <ul className="list-group">
          {backups.map((backup) => (
            <li key={backup} className="list-group-item d-flex justify-content-between align-items-center">
              {backup} - {backup.substring(13, 27)}
              <div>
                <button className="btn btn-warning me-2" onClick={() => handleRestoreBackup(backup)} disabled={loading}>
                  <i className="bi bi-arrow-counterclockwise"></i> Restaurar
                </button>
                <button className="btn btn-success" onClick={() => handleDownloadBackup(backup)}>
                  <i className="bi bi-cloud-download"></i> Descargar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Backup;
