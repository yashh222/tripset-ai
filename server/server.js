import app from "./app.js";
import connectDB from "./config/database.config.js";

const PORT = process.env.PORT || 5000;

try {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Helix Server running on port ${PORT}`);
    console.log("Node:", process.version);
  });
} catch (error) {
  console.error("Failed to connect to MongoDB:", error);
  process.exit(1);
}

export default app;