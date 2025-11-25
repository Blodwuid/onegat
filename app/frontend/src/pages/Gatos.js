import React, { useEffect, useState } from 'react';
import api from '../api/api';
import KeyHandlerWrapper from '../components/KeyHandlerWrapper'; // Importar el wrapper
import { resizeImage } from '../components/imageResizer'; // Optimaiza imagen

const Gatos = () => {
  const [nombre, setNombre] = useState('');
  const [raza, setRaza] = useState('');
  const [sexo, setSexo] = useState('');
  const [edadNum, setEdadNum] = useState('');
  const [edadUnidad, setEdadUnidad] = useState('meses');
  const [estadoSalud, setEstadoSalud] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [coloniaId, setColoniaId] = useState('');
  const [colonias, setColonias] = useState([]); // ✅ Estado para almacenar las colonias
  const [evaluacionSanitaria, setEvaluacionSanitaria] = useState('');
  const [adoptabilidad, setAdoptabilidad] = useState('');
  const [fechaVacunacion, setFechaVacunacion] = useState('');
  const [tipoVacuna, setTipoVacuna] = useState('');
  const [fechaDesparasitacion, setFechaDesparasitacion] = useState('');
  const [fechaEsterilizacion, setFechaEsterilizacion] = useState('');
  const [codigoIdentificacion, setCodigoIdentificacion] = useState('');
  const [imagen, setImagen] = useState(null);
  const [errors, setErrors] = useState({});
  const [csvFile, setCsvFile] = useState(null);

  useEffect(() => {
    fetchColonias(); // ✅ Cargar las colonias al inicio
  }, []);

  const fetchColonias = async () => {
    try {
      console.log("🔄 Cargando colonias...");
      const response = await api.get("/api/gatos/gatos/colonias/");
      console.log("✅ Colonias cargadas:", response.data);
      setColonias(response.data);
    } catch (error) {
      console.error("❌ Error al obtener las colonias", error);
    }
  };

  const formatISODate = (date) => {
    return date ? new Date(date).toISOString() : null; // Evita error si el campo está vacío
  };

  const resizeImage = async (file, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();
  
      reader.onload = (event) => {
        image.src = event.target.result;
      };
  
      image.onload = () => {
        const canvas = document.createElement("canvas");
        let width = image.width;
        let height = image.height;
  
        // Escalar manteniendo proporción
        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width = width * scale;
          height = height * scale;
        }
  
        canvas.width = width;
        canvas.height = height;
  
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
  
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject("No se pudo convertir la imagen.");
            const resizedFile = new File([blob], file.name, { type: file.type });
            resolve(resizedFile);
          },
          file.type,
          0.9 // calidad (para JPEG)
        );
      };
  
      image.onerror = () => reject("No se pudo cargar la imagen.");
      reader.onerror = () => reject("No se pudo leer el archivo.");
  
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resizedFile = await resizeImage(file);
        setImagen(resizedFile); // ahora es un File válido
      } catch (error) {
        console.error("Error al redimensionar la imagen:", error);
        alert("Hubo un problema con la imagen. Intenta con otro archivo.");
      }
    }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!nombre) newErrors.nombre = "El nombre es obligatorio";
    if (!sexo) newErrors.sexo = "Selecciona el sexo";
    if (!ubicacion) newErrors.ubicacion = "La ubicación es obligatoria";
    if (!coloniaId) newErrors.coloniaId = "Debe seleccionar una colonia";
    if (!imagen) newErrors.imagen = "Debe subir una imagen";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateGato = async () => {
    if (!validateForm()) return;
  
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('sexo', sexo);
    formData.append('ubicacion', ubicacion);
    formData.append('colonia_id', parseInt(coloniaId)); // ✅ Ahora toma el ID seleccionado
    formData.append('file', imagen);

    if (raza) formData.append('raza', raza);
    if (edadNum) formData.append('edad_num', parseInt(edadNum));
    if (edadUnidad) formData.append('edad_unidad', edadUnidad);
    if (estadoSalud) formData.append('estado_salud', estadoSalud);
    if (evaluacionSanitaria) formData.append('evaluacion_sanitaria', evaluacionSanitaria);
    if (adoptabilidad) formData.append('adoptabilidad', adoptabilidad);
    if (fechaVacunacion) formData.append('fecha_vacunacion', formatISODate(fechaVacunacion));
    if (tipoVacuna) formData.append('tipo_vacuna', tipoVacuna);
    if (fechaDesparasitacion) formData.append('fecha_desparasitacion', formatISODate(fechaDesparasitacion));
    if (fechaEsterilizacion) formData.append('fecha_esterilizacion', formatISODate(fechaEsterilizacion));
    if (codigoIdentificacion) formData.append('codigo_identificacion', codigoIdentificacion);

    try {
      const response = await api.post('/api/gatos/gatos/', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200) {
        alert('Gato creado con éxito');
      } else {
        alert('Error al crear el gato');
      }
    } catch (error) {
      console.error('Error:', error);
      const mensaje = error?.response?.data?.detail || 'Error al crear el gato';
      alert(mensaje);
    }
  };

  const handleCsvChange = (e) => {
    setCsvFile(e.target.files[0]);
  };
  
  const handleCsvImport = async () => {
    if (!csvFile) {
      alert("Por favor selecciona un archivo CSV.");
      return;
    }
  
    const formData = new FormData();
    formData.append('file', csvFile);
  
    try {
      const response = await api.post('/api/gatos/gatos/importar-csv', formData);
      alert(response.data.detalle);
    } catch (error) {
      console.error('Error al importar CSV:', error);
  
      const detalle = error?.response?.data?.detail;
  
      if (error?.response?.status === 403 && detalle) {
        alert(`🚫 ${detalle}`);
      } else {
        alert('Error al importar el archivo CSV.');
      }
    }
  };

  return (
    <KeyHandlerWrapper onEnterPress={handleCreateGato}>
      <div className="container mt-5">

        <div className="card p-4 shadow-sm">
          <h2 className="text-center mb-3">Crear Nuevo Gato
          <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              id="csvUploader"
              onChange={handleCsvChange}
            />
            <label
              htmlFor="csvUploader"
              className="btn btn-outline-primary btn-sm float-end me-2"
              style={{ position: 'absolute', right: '130px', top: '20px' }}
            >
              Seleccionar CSV
            </label>
            <button
              className="btn btn-outline-primary btn-sm float-end"
              onClick={handleCsvImport}
              style={{ position: 'absolute', right: '30px', top: '20px' }}
            >
              Importar CSV
            </button>
          </h2>

          <div className="mb-3">
            <input className={`form-control ${errors.nombre ? 'is-invalid' : ''}`} placeholder="Nombre *" onChange={(e) => setNombre(e.target.value)} />
            {errors.nombre && <div className="invalid-feedback">{errors.nombre}</div>}
          </div>
          <div className="mb-2">
            <input className="form-control" placeholder="Raza" onChange={(e) => setRaza(e.target.value)} />
          </div>
          <div className="mb-3">
            <select className={`form-control ${errors.sexo ? 'is-invalid' : ''}`} onChange={(e) => setSexo(e.target.value)} value={sexo}>
              <option value="">Sexo *</option>
              <option value="M">Macho</option>
              <option value="H">Hembra</option>
            </select>
            {errors.sexo && <div className="invalid-feedback">{errors.sexo}</div>}
          </div>
          <div className="mb-2">
            <div className="row">
              <div className="col">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Edad"
                  onChange={(e) => setEdadNum(e.target.value)}
                />
              </div>
              <div className="col">
                <select
                  className="form-control"
                  onChange={(e) => setEdadUnidad(e.target.value)}
                  value={edadUnidad}
                >
                  <option value="meses">Meses</option>
                  <option value="años">Años</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mb-2">
            <select
              className="form-control"
              onChange={(e) => setEstadoSalud(e.target.value)}
              value={estadoSalud}
            >
              <option value="">Seleccione Estado de Salud</option>
              <option value="Malo">Malo</option>
              <option value="Regular">Regular</option>
              <option value="Bueno">Bueno</option>
              <option value="Excelente">Excelente</option>
            </select>
          </div>
          <div className="mb-3">
            <input className={`form-control ${errors.ubicacion ? 'is-invalid' : ''}`} placeholder="Ubicación *" onChange={(e) => setUbicacion(e.target.value)} />
            {errors.ubicacion && <div className="invalid-feedback">{errors.ubicacion}</div>}
          </div>


          <div className="mb-3">
            <select className={`form-control ${errors.coloniaId ? 'is-invalid' : ''}`} value={coloniaId} onChange={(e) => setColoniaId(e.target.value)}>
              <option value="">Seleccione una colonia *</option>
              {colonias.map((colonia) => (
                <option key={colonia.id} value={colonia.id}>{colonia.nombre}</option>
              ))}
            </select>
            {errors.coloniaId && <div className="invalid-feedback">{errors.coloniaId}</div>}
          </div>


          <div className="mb-3">
            <input
              className="form-control"
              placeholder="Resultado evaluación sanitaria"
              onChange={(e) => setEvaluacionSanitaria(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <input
              className="form-control"
              placeholder="Resultado evaluación gato/a adoptable"
              onChange={(e) => setAdoptabilidad(e.target.value)}
            />
          </div>
          <div className="row mb-3">
            <div className="col-sm-4 col-lg-3">
              <label htmlFor="fechaVacunacion" className="form-label">Fecha de Vacunación</label>
            </div>
            <div className="col-sm-8 col-lg-9">
              <input
                type="date"
                className="form-control"
                id="fechaVacunacion"
                value={fechaVacunacion}
                onChange={(e) => setFechaVacunacion(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-3">
            <input
              className="form-control"
              placeholder="Tipo Vacuna"
              onChange={(e) => setTipoVacuna(e.target.value)}
            />
          </div>
          <div className="row mb-3">
            <div className="col-sm-4 col-lg-3">
              <label htmlFor="fechaDesparasitacion" className="form-label">Fecha de Desparasitación</label>
            </div>
            <div className="col-sm-8 col-lg-9">
              <input
                type="date"
                className="form-control"
                id="fechaDesparasitacion"
                name="fechaDesparasitacion"
                value={fechaDesparasitacion}
                onChange={(e) => setFechaDesparasitacion(e.target.value)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-sm-4 col-lg-3">
              <label htmlFor="fechaEsterilizacion" className="form-label">Fecha de Esterilización</label>
            </div>
            <div className="col-sm-8 col-lg-9">
              <input
                type="date"
                className="form-control"
                id="fechaEsterilizacion"
                name="fechaEsterilizacion"
                value={fechaEsterilizacion}
                onChange={(e) => setFechaEsterilizacion(e.target.value)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-sm-4 col-lg-3">
              <label htmlFor="codigoIdentificacion" className="form-label">Código de Identificación</label>
            </div>
            <div className="col-sm-8 col-lg-9">
              <input
                type="text"
                className="form-control"
                id="codigoIdentificacion"
                maxLength="15" // Limita la longitud a 15 caracteres
                pattern="\d{15}" // Solo acepta dígitos
                value={codigoIdentificacion}
                onChange={(e) => setCodigoIdentificacion(e.target.value)}
                placeholder="Ingresa el código de identificación 15 dígitos"
                required
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-sm-4 col-lg-3">
              <label htmlFor="imagen" className="form-label">Subir Imagen *</label>
            </div>
            <div className="col-sm-8 col-lg-9">
              <input type="file" className={`form-control ${errors.imagen ? 'is-invalid' : ''}`} onChange={handleImageChange} />
              {errors.imagen && <div className="invalid-feedback">{errors.imagen}</div>}
            </div>
          </div>
          <button onClick={handleCreateGato} className="btn btn-success w-100">
            Crear Gato
          </button>
        </div>
      </div>
    </KeyHandlerWrapper>
  );
};

export default Gatos;
