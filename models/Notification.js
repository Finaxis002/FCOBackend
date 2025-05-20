const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['update', 'creation', 'assign', 'deletion', 'other'],
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
  read: { 
    type: Boolean, 
    default: false 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },

  // New audit fields:
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