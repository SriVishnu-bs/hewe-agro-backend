import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    code: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    appliesTo: {
      type: String,
      enum: ['all', 'category', 'product','combo'],
      default: 'all',
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    comboProductIds: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
   notifyUsers: {
  type: Boolean,
  default: true,
},

minimumOrderAmount: {
  type: Number,
  default: 0,
},

usageLimit: {
  type: Number,
  default: 0,
},

usedCount: {
  type: Number,
  default: 0,
},

perUserLimit: {
  type: Number,
  default: 1,
},
icon: {
  type: String,
  default: 'pricetag-outline',
},
usedByUsers: [
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    count: {
      type: Number,
      default: 0,
    },
  },
],

  },
  { timestamps: true }
);

offerSchema.index({ endDate: 1 });

const Offer =
  mongoose.models.Offer || mongoose.model('Offer', offerSchema);

export default Offer;