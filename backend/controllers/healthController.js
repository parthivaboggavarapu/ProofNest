const mongoose = require("mongoose");

const getMongoStatus = () => {
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "disconnected";
  }
};

const getHealth = (req, res) => {
  const mongodb = getMongoStatus();
  const isHealthy = mongodb === "connected";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? "ok" : "unhealthy",
      timestamp: new Date().toISOString(),
      environment: req.app.locals.environment,
      mongodb,
    },
  });
};

module.exports = { getHealth };
