const errorHandler = (err, _req, res, _next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
};

export default errorHandler;
