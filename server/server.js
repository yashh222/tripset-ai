import app from "./app.js";
import connectDB from "./config/database.config.js";

try {
  await connectDB();

  console.log("Helix Server is running!");
  console.log("Node:", process.version);
} catch (error) {
  console.error("Failed to connect to MongoDB:", error);
  throw error;
}

export default app;