const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "db.sqlite");
const db = new sqlite3.Database(dbPath);

// buat tabel
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    lat REAL,
    lng REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    lat REAL,
    lng REAL,
    stop_id INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    stop_id INTEGER,
    departure_time TEXT
  )`);
});

// seed data
const stops = [
  ["Panggang", -6.5915, 110.6782],
  ["Pecangaan", -6.6715, 110.7594],
  ["Tahunan", -6.6112, 110.6923],
  ["Pengkol", -6.6284, 110.7161],
  ["Mlonggo", -6.5619, 110.6788],
  ["Bawu", -6.6505, 110.7517],
];

db.serialize(() => {
  db.get("SELECT COUNT(*) as cnt FROM stops", (err, row) => {
    if (row.cnt === 0) {
      stops.forEach(([name, lat, lng]) => {
        db.run("INSERT INTO stops (name, lat, lng) VALUES (?, ?, ?)", [
          name,
          lat,
          lng,
        ]);
      });
      console.log("Seeded stops");
    }
  });
});

// API
app.get("/api/stops", (req, res) => {
  db.all("SELECT * FROM stops", (err, rows) => {
    res.json(rows);
  });
});

app.get("/api/vehicles", (req, res) => {
  db.all("SELECT * FROM vehicles", (err, rows) => {
    res.json(rows);
  });
});

app.get("/api/schedules", (req, res) => {
  db.all("SELECT * FROM schedules", (err, rows) => {
    res.json(rows);
  });
});

// simulasi GPS
function simulateVehicles() {
  db.all("SELECT * FROM stops", (err, stops) => {
    if (stops.length === 0) return;
    db.get("SELECT COUNT(*) as cnt FROM vehicles", (err, row) => {
      if (row.cnt === 0) {
        stops.forEach((s, idx) => {
          db.run(
            "INSERT INTO vehicles (name, lat, lng, stop_id) VALUES (?, ?, ?, ?)",
            [`Angkot ${idx + 1}`, s.lat, s.lng, s.id]
          );
        });
      } else {
        db.all("SELECT * FROM vehicles", (err, vehicles) => {
          vehicles.forEach((v) => {
            const dLat = (Math.random() - 0.5) * 0.001;
            const dLng = (Math.random() - 0.5) * 0.001;
            const newLat = v.lat + dLat;
            const newLng = v.lng + dLng;
            db.run("UPDATE vehicles SET lat=?, lng=? WHERE id=?", [
              newLat,
              newLng,
              v.id,
            ]);
            io.emit("vehicleUpdate", { id: v.id, lat: newLat, lng: newLng });
          });
        });
      }
    });
  });
}
setInterval(simulateVehicles, 5000);

server.listen(4000, () => {
  console.log("Backend running at http://localhost:4000");
});