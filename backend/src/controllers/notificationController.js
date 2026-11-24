const notificationService = require('../services/notificationService');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const data = await notificationService.getNotifications(req.user._id, req.query);
      res.status(200).json({
        success: true,
        ...data
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(req.user._id, req.params.id);
      res.status(200).json({
        success: true,
        notification
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user._id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async triggerReminderCheck(req, res, next) {
    try {
      const result = await notificationService.checkAndGenerateReminders();
      res.status(200).json({
        success: true,
        message: 'Deadline reminder check completed.',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
