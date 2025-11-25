// frontend/src/pages/MapaColonias.js
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import EsterilizacionIndicator from "../components/EsterilizacionIndicator";
import markerIcon from "../assets/icons/marker.png";

// Icono personalizado para los marcadores
const customIcon = L.icon({
  iconUrl: markerIcon,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -35],
});

export default function MapaColonias() {
  // Estado de datos
  const [settings, setSettings] = useState(null);
  const [colonias, setColonias] = useState([]);
  const [esterilizados, setEsterilizados] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);

  // Refs (persisten entre renders)
  const mapRef = useRef(null);                // instancia de Leaflet.Map
  const mapContainerRef = useRef(null);       // <div> real del mapa
  const markersLayerRef = useRef(null);       // capa de marcadores
  const markersIndexRef = useRef(new Map());  // id -> marker
  const buscadorRef = useRef(null);           // caja buscador (para cerrar al clicar fuera)

  // Config desde .env
  const API = process.env.REACT_APP_BACKEND_URL;           // p.ej. http://localhost:8000
  const SETTINGS_URL = process.env.REACT_APP_SETTINGS_URL; // p.ej. http://localhost:8000/api/settings
  const TOKEN = localStorage.getItem("token");

  // 1) Cargar settings (centro y zoom)
  useEffect(() => {
    if (!SETTINGS_URL) return;
    fetch(SETTINGS_URL)
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error("❌ Error cargando settings:", err));
  }, [SETTINGS_URL]);

  // 2) Cargar colonias (lista para pintar en el mapa)
  useEffect(() => {
    if (!API || !TOKEN) return;
    fetch(`${API}/api/colonias/colonias/mapa/colonias`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setColonias(data || []))
      .catch((err) => console.error("❌ Error cargando colonias:", err));
  }, [API, TOKEN]);

  // 3) Inicializar mapa UNA sola vez (cuando haya settings y exista el <div>)
  useEffect(() => {
    if (!settings) return;
    if (mapRef.current) return;
    if (!mapContainerRef.current) return; // asegura que el nodo DOM existe

    const { municipio_lat, municipio_lon, map_zoom } = settings;

    const m = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true,
      minZoom: 12,
      maxZoom: 18,
      wheelPxPerZoomLevel: 120,
    }).setView(
      [Number(municipio_lat), Number(municipio_lon)],
      Number(map_zoom ?? 14)
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);

    // Capa de marcadores
    const layer = L.layerGroup().addTo(m);
    markersLayerRef.current = layer;

    // Ajuste de tamaño inicial (evita mapa gris)
    setTimeout(() => {
      m.invalidateSize();
    }, 300);

    // Recalibrar también en resize
    const onResize = () => m.invalidateSize();
    window.addEventListener("resize", onResize);

    mapRef.current = m;

    // Cleanup al desmontar
    return () => {
      window.removeEventListener("resize", onResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
      markersIndexRef.current.clear();
    };
  }, [settings]);

  // 4) Pintar marcadores (cada vez que cambia la lista de colonias)
  useEffect(() => {
    const mapa = mapRef.current;
    const layer = markersLayerRef.current;
    if (!mapa || !layer) return;

    layer.clearLayers();
    markersIndexRef.current.clear();

    if (!Array.isArray(colonias) || colonias.length === 0) {
      // Recalibrar por si el contenedor cambió de tamaño
      setTimeout(() => mapa.invalidateSize(), 250);
      return;
    }

    colonias.forEach((c) => {
      const lat = Number(c.latitude);
      const lon = Number(c.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(layer);

      // Contenido base del popup
      const popupDiv = document.createElement("div");
      popupDiv.innerHTML = `
        <div style="font-size:14px; font-weight:bold; text-align:center;">${c.nombre ?? ""}</div>
        <div style="font-size:12px; text-align:center; margin-bottom:8px;">${c.ubicacion ?? ""}</div>
        <div id="indicador-${c.id}"></div>
      `;
      marker.bindPopup(popupDiv);

      if (c.id != null) markersIndexRef.current.set(String(c.id), marker);
    });

    // Recalibrar tras pintar
    setTimeout(() => {
      mapa.invalidateSize();
    }, 300);
  }, [colonias]);

  // 5) Cargar datos de esterilización por colonia (protegido)
  useEffect(() => {
    if (!API || !TOKEN) return;
    if (!Array.isArray(colonias) || colonias.length === 0) return;

    colonias.forEach(async (c) => {
      if (c?.id == null) return;
      try {
        const r = await fetch(`${API}/api/colonias/colonias/${c.id}/esterilizados`, {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
          },
        });

        if (!r.ok) {
          console.warn(`⚠️ Esterilizados no disponibles para colonia ${c.id} (status ${r.status})`);
          return;
        }

        const data = await r.json();
        setEsterilizados((prev) => ({ ...prev, [c.id]: data }));
      } catch (e) {
        console.error(`❌ Error obteniendo esterilizados de colonia ${c.id}:`, e);
      }
    });
  }, [API, TOKEN, colonias]);

  // 6) Insertar/actualizar indicador React en los popups cuando hay datos
  useEffect(() => {
    const mapa = mapRef.current;
    if (!mapa) return;

    Object.entries(esterilizados).forEach(([id, datos]) => {
      const marker = markersIndexRef.current.get(String(id));
      if (!marker) return;

      const content = marker.getPopup()?.getContent();
      if (!(content instanceof HTMLElement)) return;

      const target = content.querySelector(`#indicador-${id}`);
      if (target) {
        ReactDOM.createRoot(target).render(
          <EsterilizacionIndicator porcentaje={datos?.porcentaje_esterilizados} />
        );
      }
    });
  }, [esterilizados]);

  // ——— Buscador ———
  const handleBuscarColonia = (e) => {
    setBusqueda(e.target.value);
    setMostrarLista(true);
  };

  const seleccionarColonia = (c) => {
    const lat = Number(c.latitude);
    const lon = Number(c.longitude);
    if (!mapRef.current || !Number.isFinite(lat) || !Number.isFinite(lon)) return;

    mapRef.current.setView([lat, lon], 16);

    // Abrir popup si existe el marcador
    const marker = markersIndexRef.current.get(String(c.id));
    if (marker) {
      setTimeout(() => marker.openPopup(), 50);
    } else {
      // Fallback: popup suelto en la coordenada
      const div = document.createElement("div");
      div.innerHTML = `
        <div style="font-size:14px; font-weight:bold; text-align:center;">${c.nombre ?? ""}</div>
        <div style="font-size:12px; text-align:center; margin-bottom:8px;">${c.ubicacion ?? ""}</div>
        <div id="indicador-${c.id}"></div>
      `;
      L.popup().setLatLng([lat, lon]).setContent(div).openOn(mapRef.current);

      const datos = esterilizados[c.id];
      if (datos) {
        const target = div.querySelector(`#indicador-${c.id}`);
        if (target) {
          ReactDOM.createRoot(target).render(
            <EsterilizacionIndicator porcentaje={datos?.porcentaje_esterilizados} />
          );
        }
      }
    }

    // Recalibrar tras el recentrado
    setTimeout(() => {
      mapRef.current && mapRef.current.invalidateSize();
    }, 200);

    setBusqueda("");
    setMostrarLista(false);
  };

  // Cerrar lista al hacer clic fuera
  useEffect(() => {
    const listener = (e) => {
      if (buscadorRef.current && !buscadorRef.current.contains(e.target)) {
        setMostrarLista(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="text-center fw-bold text-dark mb-4">Mapa de Colonias</h1>

      <div className="card shadow-lg border-0 rounded position-relative" style={{ overflow: "hidden" }}>
        {/* Buscador */}
        <div
          className="position-absolute top-0 start-50 translate-middle-x mt-3 p-2 bg-white shadow rounded"
          style={{ zIndex: 1000, width: "60%", maxWidth: 400 }}
          ref={buscadorRef}
        >
          <input
            type="text"
            className="form-control"
            placeholder="Buscar colonia..."
            value={busqueda}
            onChange={handleBuscarColonia}
            onClick={() => setMostrarLista(true)}
          />
          {mostrarLista && (
            <ul className="list-group mt-2" style={{ maxHeight: 200, overflowY: "auto" }}>
              {colonias
                .filter((c) => (c?.nombre || "").toLowerCase().includes(busqueda.toLowerCase()))
                .map((c) => (
                  <li
                    key={c.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => seleccionarColonia(c)}
                    style={{ cursor: "pointer" }}
                  >
                    {c.nombre}
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Contenedor del mapa (con ref, NO por id) */}
        <div
          ref={mapContainerRef}
          style={{ height: "70vh", minHeight: 500, width: "100%" }}
        />
      </div>
    </div>
  );
}
