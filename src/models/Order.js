import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    reviewed:{type:Boolean,default:false}
  },
  { _id: false }
);

const orderAddressSchema = new mongoose.Schema(
  {
    title: String,
    name: String,
    phone: String,
    email: String,
    building: String,
    street: String,
    area: String,
    city: String,
    pin: String,
  },
  { _id: false }
);

const statusTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    address: {
      type: orderAddressSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    discount: {
  type: Number,
  default: 0,
},

couponCode: {
  type: String,
  default: '',
},

offerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Offer',
  default: null,
},
    
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'netbank', 'cod','online'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed','refund_initiated','refunded','not_applicable'],
      default: 'pending',
    },
    razorpayOrderId: { type: String, default: '' },
razorpayPaymentId: { type: String, default: '' },
razorpaySignature:{type:String,default:''},
    orderStatus: {
      type: String,
      enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
    expectedDelivery:{
      type:String,
      default:'',
    },
    statusTimeline: {
      type: [statusTimelineSchema],
      default: [
        {
          status: 'placed',
          date: new Date(),
        },
      ],
    },
  },
{
  timestamps: true,
}
);

orderSchema.index({
  userId: 1,
  createdAt: -1,
});

orderSchema.index({
  orderStatus: 1,
  createdAt: -1,
});

orderSchema.index({
  paymentStatus: 1,
});

orderSchema.index({
  razorpayOrderId: 1,
});

orderSchema.index({
  createdAt: -1,
});
orderSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayPaymentId: { $type: 'string', $gt: '' },
    },
  }
);

const Order = mongoose.models.Order||mongoose.model('Order', orderSchema);

export default Order;