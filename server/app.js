import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import errorHandler from "./middleware/error-handler.middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorHandler);

export default app;
