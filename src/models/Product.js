import mongoose from 'mongoose';

const nutritionSchema = new mongoose.Schema({
  label: String,
  value: String,
}, { _id: false });

const howToUseSchema = new mongoose.Schema({
  icon: String,
  title: String,
  desc: String,
}, { _id: false });

const detailsSchema = new mongoose.Schema({
  label: String,
  value: String,
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  name: String,
  loc: String,
  rating: Number,
  text: String,

  // 👇 NEW FIELD (for one-time edit)
  editedOnce: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  originalPrice: Number,
  image: String,
imagePublicId: String,

images: {
  type: [String],
  default: [],
},

imagePublicIds: {
  type: [String],
  default: [],
},
  tag: String,
  bestseller: Boolean,
  stock:{
    type:Number,
    default:0,
  },
desc: String,

aboutProduct: {
  type: String,
  default: '',
},

storageInstructions: {
  type: String,
  default: '',
},

deliveryInfo: {
  type: [String],
  default: [],
},

primaryTag: {
  type: String,
  default: '',
},

organicBadge: {
  type: String,
  default: '100% Organic',
},

packInfo: {
  type: String,
  default: '',
},

reviewHeadline: {
  type: String,
  default: 'Loved by customers',
},

reviewSubtitle: {
  type: String,
  default: 'Top rated wellness product',
},

qualityPromise: {
  type: [String],
  default: [],
},

  ingredients: [String],
  benefits: [String],

  nutrition: [nutritionSchema],
  howToUse: [howToUseSchema],
  detailsTable: [detailsSchema],

  reviews: [reviewSchema],
}, { timestamps: true });

export default mongoose.model('Product', productSchema);