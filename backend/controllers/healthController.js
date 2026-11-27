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
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: req.app.locals.environment,
      mongodb: getMongoStatus(),
    },
  });
};

module.exports = { getHealth };
