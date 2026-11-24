/**
 * ProofNest Status & Type Enums
 */

const DOCUMENT_TYPES = [
  'Invoice',
  'Receipt',
  'Warranty Card',
  'User Manual',
  'Repair Bill',
  'Other'
];

const REPAIR_STATUSES = [
  'requested',
  'approved',
  'in_progress',
  'completed',
  'rejected'
];

const NOTIFICATION_TYPES = [
  'warranty_expiry',
  'return_deadline',
  'repair_update',
  'system'
];

const REMINDER_MILESTONES = [30, 7, 4, 1, 0];

const PRODUCT_CATEGORIES = [
  'Electronics',
  'Appliances',
  'Computers & Laptops',
  'Mobile & Tablets',
  'Audio & Headphones',
  'Furniture',
  'Automotive',
  'Tools & Hardware',
  'Fashion & Wearables',
  'Other'
];

module.exports = {
  DOCUMENT_TYPES,
  REPAIR_STATUSES,
  NOTIFICATION_TYPES,
  REMINDER_MILESTONES,
  PRODUCT_CATEGORIES
};
