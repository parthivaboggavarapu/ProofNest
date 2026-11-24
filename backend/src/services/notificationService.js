const { Notification, Product } = require('../models');
const { REMINDER_MILESTONES } = require('../constants/statusEnums');

class NotificationService {
  async getNotifications(userId, query = {}) {
    const filter = { userId };
    if (query.unreadOnly === 'true') {
      filter.read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('productId', 'productName brand category warrantyEndDate returnDeadline')
        .sort({ scheduledDate: -1, createdAt: -1 }),
      Notification.countDocuments({ userId, read: false })
    ]);

    return {
      notifications,
      unreadCount
    };
  }

  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      const err = new Error('Notification not found or access denied.');
      err.status = 404;
      throw err;
    }

    return notification;
  }

  async markAllAsRead(userId) {
    await Notification.updateMany({ userId, read: false }, { read: true });
    return { success: true, message: 'All notifications marked as read.' };
  }

  /**
   * Evaluates warranty and return deadlines for all products and creates in-app notifications.
   * Milestone thresholds: 30, 7, 4, 1, 0 days
   */
  async checkAndGenerateReminders() {
    const now = new Date();
    // Normalize today to start of day in local/Kolkata context
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const products = await Product.find({
      $or: [
        { warrantyEndDate: { $ne: null } },
        { returnDeadline: { $ne: null } }
      ]
    });

    let generatedCount = 0;

    for (const product of products) {
      // 1. Evaluate Warranty End Date
      if (product.warrantyEndDate) {
        const warrantyDate = new Date(product.warrantyEndDate);
        const warrantyDay = new Date(warrantyDate.getFullYear(), warrantyDate.getMonth(), warrantyDate.getDate());
        const diffMs = warrantyDay.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        for (const milestone of REMINDER_MILESTONES) {
          // If days remaining has reached or passed milestone (e.g. 4 days left -> matches milestone 4, or 0 days left -> matches milestone 0)
          if (daysRemaining <= milestone && daysRemaining >= milestone - 1) {
            const alreadySent = await Notification.findOne({
              userId: product.userId,
              productId: product._id,
              notificationType: 'warranty_expiry',
              milestone
            });

            if (!alreadySent) {
              const msg =
                milestone === 0
                  ? `Warranty for "${product.productName}" expires TODAY!`
                  : `Warranty for "${product.productName}" will expire in ${milestone} day${milestone > 1 ? 's' : ''}.`;

              await Notification.create({
                userId: product.userId,
                productId: product._id,
                notificationType: 'warranty_expiry',
                message: msg,
                milestone,
                scheduledDate: now
              });
              generatedCount++;
            }
          }
        }
      }

      // 2. Evaluate Return Deadline
      if (product.returnDeadline) {
        const returnDate = new Date(product.returnDeadline);
        const returnDay = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate());
        const diffMs = returnDay.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        for (const milestone of [7, 4, 1, 0]) {
          if (daysRemaining <= milestone && daysRemaining >= milestone - 1) {
            const alreadySent = await Notification.findOne({
              userId: product.userId,
              productId: product._id,
              notificationType: 'return_deadline',
              milestone
            });

            if (!alreadySent) {
              const msg =
                milestone === 0
                  ? `Return window for "${product.productName}" closes TODAY!`
                  : `Return deadline for "${product.productName}" closes in ${milestone} day${milestone > 1 ? 's' : ''}.`;

              await Notification.create({
                userId: product.userId,
                productId: product._id,
                notificationType: 'return_deadline',
                message: msg,
                milestone,
                scheduledDate: now
              });
              generatedCount++;
            }
          }
        }
      }
    }

    return { success: true, generatedCount };
  }
}

module.exports = new NotificationService();
