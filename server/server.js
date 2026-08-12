import app from "./app.js";

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Helix Server running on port ${PORT}`);
  });
}

export default app;