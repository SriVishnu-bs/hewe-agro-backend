import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
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
      match: [/^[6-9]\d{9}$/, 'Enter valid 10-digit phone number'],
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: '',
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    otpAttempts: {
  type: Number,
  default: 0,
},
otpRequestCount: {
  type: Number,
  default: 0,
},
otpWindowStart: {
  type: Date,
  default: null,
},
   profileImage: {
  type: String,
  default: '',
},
profileImagePublicId: {
  type: String,
  default: '',
},
refreshToken: {
  type: String,
  default: '',
},
expoPushToken: {
  type: String,
  default: '',
},
    role:{
      type:String,
      enum:['user','admin'],
      default:'user',
    }
    
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;