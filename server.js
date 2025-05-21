const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const connectDB = require("./config/db.js")
const caseRoutes = require("./routes/caseRoutes.js")
const userRoutes = require ('./routes/userRoutes.js');
const ownerRoutes = require("./routes/ownerRoutes");
const clientRoutes = require("./routes/clientRoutes");
const loginRoute = require('./routes/loginRoute.js');
const { initSocket } = require('./socket/socket.js')
const notificationRoute = require("./routes/notifications.js");
const serviceRoute = require('./routes/serviceRoute.js');
const seedDefaultServices = require('./config/seedServices.js');
const remarkRoute = require('./routes/remarksRoute.js')


dotenv.config();

const app = express();
const corsOptions = {
  origin: [
    "http://localhost:9002", // for local dev frontend (adjust port if needed)
    "https://fco.onrender.com", // deployed frontend URL
  ],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// API Route
app.use('/api/cases', caseRoutes);
app.use('/api/users', userRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/auth", loginRoute);
app.use("/api/notifications", notificationRoute)
app.use("/api/services", serviceRoute);
app.use("/api/cases/:caseId/services", remarkRoute);





app.get("/", (req, res) => {
  res.send("FCO Backend API is running");
});



app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error" });
});


async function startServer() {
  try {
    await connectDB(); // connect only once here
    await seedDefaultServices();
    const server = http.createServer(app);
    const io = initSocket(server);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`FCO Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();