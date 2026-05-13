import mongoose from 'mongoose';

const homeContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['banner', 'offer', 'promo', 'trust'],
      required: true,
    },

    title: {
      type: String,
      default: '',
      trim: true,
    },

    subtitle: {
      type: String,
      default: '',
      trim: true,
    },

    image: {
      type: String,
      default: '',
    },

    imagePublicId: {
      type: String,
      default: '',
    },

    icon: {
      type: String,
      default: '',
    },

    color: {
      type: String,
      default: '',
    },

    couponCode: {
      type: String,
      default: '',
      trim: true,
    },

    linkType: {
      type: String,
      enum: ['none', 'product', 'category', 'offer'],
      default: 'none',
    },

    linkValue: {
      type: String,
      default: '',
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('HomeContent', homeContentSchema);