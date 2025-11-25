import React, { useEffect, useState } from "react";
import api from "../api/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const InformesGraficos = () => {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const response = await api.get("/api/informes/informes/datos/colonias");
        setDatos(response.data);
      } catch (error) {
        console.error("Error al obtener datos de colonias", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">📊 Gráficos de Gatos por Colonia</h1>
      {loading ? (
        <p className="text-center">Cargando datos...</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={datos}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="colonia" />
            <Tooltip />
            <Legend />
            <Bar dataKey="gatos" fill="#4a90e2" name="Número de Gatos" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default InformesGraficos;
