const mongoose = require("mongoose");
const productsSchema = new mongoose.Schema({
    DeviceCategory: {
        type: String,
        required: true,
    },
    DeviceDescription: {
        type: String,
        required: true,
    },
    DeviceManufacturer: {
        type: String,
        required: true,
    },
    DeviceName: {
        type: String,
        required: true,
    },
    DevicePrice: {
        type: String,
        required: true,
    },
    DeviceStock: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('Product', productsSchema); // User is the model name