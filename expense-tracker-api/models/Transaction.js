import mongoose from "mongoose";

const categories = ["Food", "Travel", "Shopping", "Bills", "Other", "Rent"];

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    type: {
      type: String,
      enum: ["expense", "income"],
      default: "expense",
      required: true,
    },
    category: {
      type: String,
      enum: [...categories, "Income"],
      default: "Other",
    },
    date: {
      type: String,
      required: true,
      validate: {
        validator: isCalendarDate,
        message: "Date must be a valid YYYY-MM-DD date.",
      },
    },
  },
  { timestamps: true },
);

transactionSchema.pre("validate", function normalizeIncomeCategory() {
  if (this.type === "income") {
    this.category = "Income";
  }
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
