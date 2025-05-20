const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, default: 'Pending' },   // you can keep default or let case-service relation manage status individually
  remarks: { type: String, default: '' },
  completionPercentage: { type: Number, default: 0 },
});

module.exports = mongoose.model('Service', serviceSchema);
