
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 40,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    icon: {
      type: String,
      default: 'apps',
      trim: true,
    },

    color: {
      type: String,
      default: '#F4F6F8',
      trim: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastUpdatedLabel: {
      type: String,
      default: 'Recently updated',
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ sortOrder: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });

export default mongoose.model('Category', categorySchema);
