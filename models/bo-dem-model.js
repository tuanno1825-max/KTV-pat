const mongoose = require("mongoose");

const BoDemSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { collection: "counters", versionKey: false },
);

module.exports = mongoose.models.BoDem || mongoose.model("BoDem", BoDemSchema);
