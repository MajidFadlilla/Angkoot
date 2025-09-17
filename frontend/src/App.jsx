import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import L from "leaflet";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function App() {
  const [map, setMap] = useState(null);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleMarkers, setVehicleMarkers] = useState({});

  useEffect(() => {
    const m = L.map("map").setView([-6.5915, 110.6782], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);
    setMap(m);
  }, []);

  useEffect(() => {
    if (!map) return;
    axios.get(`${BACKEND_URL}/api/stops`).then((res) => {
      setStops(res.data);
      res.data.forEach((s) => {
        L.marker([s.lat, s.lng]).addTo(map).bindPopup(s.name);
      });
    });
    axios.get(`${BACKEND_URL}/api/vehicles`).then((res) => {
      setVehicles(res.data);
      const markers = {};
      res.data.forEach((v) => {
        markers[v.id] = L.marker([v.lat, v.lng], { color: "red" })
          .addTo(map)
          .bindPopup(v.name);
      });
      setVehicleMarkers(markers);
    });
  }, [map]);

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socket.on("vehicleUpdate", (data) => {
      setVehicles((prev) =>
        prev.map((v) => (v.id === data.id ? { ...v, ...data } : v))
      );
      if (vehicleMarkers[data.id]) {
        vehicleMarkers[data.id].setLatLng([data.lat, data.lng]);
      }
    });
    return () => socket.disconnect();
  }, [vehicleMarkers]);

  return (
    <div style={{ display: "flex" }}>
      <div id="map" style={{ height: "100vh", width: "70%" }}></div>
      <div style={{ width: "30%", padding: "10px" }}>
        <h2>Daftar Angkot</h2>
        <ul>
          {vehicles.map((v) => (
            <li key={v.id}>
              {v.name} → Posisi: {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}