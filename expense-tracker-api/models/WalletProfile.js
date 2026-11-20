import mongoose from "mongoose";

const walletProfileSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
  },
  { timestamps: true },
);

const WalletProfile = mongoose.model("WalletProfile", walletProfileSchema);

export default WalletProfile;
