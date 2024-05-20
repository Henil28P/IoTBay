const mongoose = require("mongoose");
const PaymentSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    cardNumber: {
      type: Number,
      required: true,
    },
    holderName: {
      type: String,
      required: false,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    cvv: {
      type: Number,
      required: true,
    },
  });
  
  // Create a model from the schema
  module.exports = mongoose.model('Payment', PaymentSchema);