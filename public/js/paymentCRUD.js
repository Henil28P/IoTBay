// Function to create payment details
async function createPayment(paymentData) {
  paymentData.userId = userId; //Associate paymentID to userID
  const newPayment = new Payment(paymentData);
  await newPayment.save();
  //Save Details attached to user
  const user = await db.collection("Users").findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(userId) },
    { $push: { payments: newPayment } }
  );
  return newPayment;
}

// Read by ID
async function viewPayment(paymentId) {
    return await Payment.findById(paymentId).exec();
  }
  
//Read all payments
async function getAllPayments() {
    return await Payment.find().exec();
  }
  
// Update payment details
async function updatePayment(paymentId, updates) {
    return await Payment.findByIdAndUpdate(paymentId, updates, { new: true }).exec();
  }

//Delete payment details
async function deletePayment(paymentId) {
    return await Payment.findByIdAndDelete(paymentId).exec();
  }