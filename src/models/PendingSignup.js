import mongoose from 'mongoose';

const pendingSignupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpires: {
      type: Date,
      required: true,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpRequestCount: {
      type: Number,
      default: 1,
    },
    otpWindowStart: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

pendingSignupSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

const PendingSignup =
  mongoose.models.PendingSignup ||
  mongoose.model('PendingSignup', pendingSignupSchema);

export default PendingSignup;