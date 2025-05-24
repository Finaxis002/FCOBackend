const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'update', 
      'creation', 
      'assign', 
      'deletion', 
      'user-created', 
      'user-updated', 
      'remark-added', 
      'service-status',
      'status-changed',
      'other',
      'remark',
    ],
    required: true,
  },
  message: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  userName: {  
    type: String,
    required: true 
  },
  caseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Case', 
    required: false 
  },
  caseName: {  
    type: String,
    required: false 
  },
  serviceId: {  // add this if you want service-related notifications
    type: String,
    ref: 'Service',
    required: false
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },

  // Audit fields for tracking who triggered notification
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
