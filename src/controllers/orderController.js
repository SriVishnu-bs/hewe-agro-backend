import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import crypto from 'crypto';
import mongoose from 'mongoose';

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Offer from '../models/Offer.js';
import { createNotification } from './notificationController.js';
import { createAdminNotification } from './adminNotificationController.js';
import sendPushNotification from '../utils/sendPushNotification.js';
import User from '../models/User.js';
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const FREE_SHIPPING_LIMIT = 500;
const SHIPPING_CHARGE = 50;
const sendUserOrderPush = async ({
  userId,
  title,
  message,
  data = {},
}) => {
  try {
    const user = await User.findById(userId).select(
      'expoPushToken'
    );

    if (!user?.expoPushToken) return;

    await sendPushNotification({
      expoPushToken: user.expoPushToken,
      title,
      body: message,
      data: {
        type: 'order',
        ...data,
      },
    });
  } catch (error) {
    console.log(
      'USER ORDER PUSH ERROR:',
      error.message
    );
  }
};
const generateOrderId = () => {
  const now = new Date();
  const datePart =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `HEWE${datePart}${randomPart}`;
};

const generateExpectedDelivery = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const calculateOrderTotals = async (items, session = null) => {
  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.productId) {
      throw new Error(`${item.name || 'Product'} productId missing`);
    }

    const query = Product.findById(item.productId);
    if (session) query.session(session);

    const product = await query;

    if (!product) {
      throw new Error(`${item.name || 'Product'} not found`);
    }

    const qty = Math.max(1, Number(item.qty || 1));

    if (Number(product.stock || 0) < qty) {
      throw new Error(`${product.name} is out of stock`);
    }

    const price = Number(product.price || 0);

    subtotal += price * qty;

    validatedItems.push({
      productId: product._id,
      name: product.name,
      price,
      qty,
      image: product.image || item.image || '',
    });
  }

  const shipping = subtotal >= FREE_SHIPPING_LIMIT ? 0 : SHIPPING_CHARGE;
  const total = subtotal + shipping;

  return {
    validatedItems,
    subtotal,
    shipping,
    total,
  };
};
export const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const event = JSON.parse(req.body.toString());

    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;

    if (eventType === 'payment.captured' && paymentEntity?.id) {
      await Order.findOneAndUpdate(
        { razorpayPaymentId: paymentEntity.id },
        {
          paymentStatus: 'paid',
        },
        { new: true }
      );
    }

    if (eventType === 'payment.failed' && paymentEntity?.id) {
      await Order.findOneAndUpdate(
        { razorpayPaymentId: paymentEntity.id },
        {
          paymentStatus: 'failed',
        },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.log('RAZORPAY WEBHOOK ERROR:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Webhook handling failed',
    });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { items,finalPayable } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required',
      });
    }

    const { total } = await calculateOrderTotals(items);

const razorpayAmount = finalPayable
  ? Number(finalPayable)
  : total;

    if (!razorpayAmount || razorpayAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount',
      });
    }

    const options = {
     amount: Math.round(razorpayAmount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order,
      amount: razorpayAmount,
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      message: e.message || 'Razorpay order creation failed',
    });
  }
};

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  let createdOrder = null;
  let notificationPayload = null;
  let adminNotificationPayload = null;

  try {
    const {
      userId,
      items,
      address,
      discount,
      couponCode,
      offerId,
      paymentMethod,
      paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!userId || !items || !items.length || !address) {
      return res.status(400).json({
        success: false,
        message: 'Required order fields are missing',
      });
    }

    if (req.user && userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to create order for another user',
      });
    }
    if (paymentMethod === 'online' && razorpayPaymentId) {
  const existingPaidOrder = await Order.findOne({
    razorpayPaymentId,
  });

  if (existingPaidOrder) {
    return res.status(200).json({
      success: true,
      message: 'Order already created for this payment',
      order: existingPaidOrder,
    });
  }
}
    if (paymentMethod === 'online') {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification details missing',
        });
      }

      const body = `${razorpayOrderId}|${razorpayPaymentId}`;

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
        });
      }
    }

    await session.withTransaction(async () => {
      const calculated = await calculateOrderTotals(items, session);

      let finalDiscount = Number(discount || 0);

      if (offerId) {
        const offer = await Offer.findById(offerId).session(session);

        if (!offer) throw new Error('Offer not found');
        if (!offer.isActive) throw new Error('Coupon inactive');

        const now = new Date();

        if (now > new Date(offer.endDate)) {
          throw new Error('Coupon expired');
        }

        if (offer.usageLimit > 0 && offer.usedCount >= offer.usageLimit) {
          throw new Error('Coupon limit reached');
        }

        const existingUserUsage = offer.usedByUsers.find(
          (u) => String(u.userId) === String(userId)
        );

        if (existingUserUsage && existingUserUsage.count >= offer.perUserLimit) {
          throw new Error('Coupon usage limit reached for user');
        }

        if (calculated.subtotal < offer.minimumOrderAmount) {
          throw new Error(`Minimum order should be ₹${offer.minimumOrderAmount}`);
        }

        offer.usedCount += 1;

        if (existingUserUsage) {
          existingUserUsage.count += 1;
        } else {
          offer.usedByUsers.push({
            userId,
            count: 1,
          });
        }

        if (offer.usageLimit > 0 && offer.usedCount >= offer.usageLimit) {
          offer.isActive = false;
        }

        await offer.save({ session });
      }

      const finalTotal = Math.max(
        0,
        calculated.subtotal + calculated.shipping - finalDiscount
      );

      for (const item of calculated.validatedItems) {
        const stockUpdate = await Product.updateOne(
          {
            _id: item.productId,
            stock: { $gte: item.qty },
          },
          {
            $inc: { stock: -item.qty },
          },
          { session }
        );

        if (stockUpdate.modifiedCount !== 1) {
          throw new Error(`${item.name} is out of stock`);
        }
      }

      const [order] = await Order.create(
        [
          {
            orderId: generateOrderId(),
            userId,
            items: calculated.validatedItems,
            address,
            subtotal: calculated.subtotal,
            shipping: calculated.shipping,
            total: finalTotal,
            discount: finalDiscount,
            couponCode: couponCode || '',
            offerId: offerId || null,
            paymentMethod: paymentMethod || 'cod',
            paymentStatus:
              paymentStatus || (paymentMethod === 'cod' ? 'pending' : 'paid'),
            razorpayOrderId: razorpayOrderId || '',
            razorpayPaymentId: razorpayPaymentId || '',
            razorpaySignature: razorpaySignature || '',
            orderStatus: 'placed',
            expectedDelivery: generateExpectedDelivery(),
            statusTimeline: [{ status: 'placed', date: new Date() }],
          },
        ],
        { session }
      );

      createdOrder = order;

      notificationPayload = {
        userId,
        title: 'Order Placed',
        message: `Your order ${order.orderId} has been placed successfully.`,
        type: 'order',
        data: {
          orderId: order._id,
          orderNumber: order.orderId,
        },
      };

      adminNotificationPayload = {
        title: 'New Order Placed',
        message: `Order ${order.orderId} received for ₹${order.total}.`,
        type: 'order',
        data: {
          orderId: order._id,
          orderNumber: order.orderId,
          total: order.total,
          discount: finalDiscount,
          couponCode: couponCode || '',
          offerId: offerId || null,
          userId: order.userId,
        },
      };
    });

    if (notificationPayload) {
  await createNotification(notificationPayload);

  await sendUserOrderPush({
    userId: notificationPayload.userId,
    title: notificationPayload.title,
    message: notificationPayload.message,
    data: notificationPayload.data,
  });
}

    if (adminNotificationPayload) {
      await createAdminNotification(adminNotificationPayload);
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: createdOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch all orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (
      req.user &&
      req.user.role !== 'admin' &&
      userId !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to view another user orders',
      });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(30, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ userId }),
    ]);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (
      req.user &&
      req.user.role !== 'admin' &&
      order.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to view this order',
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();

  let updatedOrder = null;
  const userNotifications = [];
  const adminNotifications = [];

  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new Error('Order not found');
      }

      if (orderStatus && order.orderStatus !== orderStatus) {
        order.orderStatus = orderStatus;
        order.statusTimeline.push({
          status: orderStatus,
          date: new Date(),
        });
      }

      if (orderStatus === 'cancelled') {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: item.qty } },
            { session }
          );
        }

        if (order.paymentMethod === 'cod') {
          order.paymentStatus = 'not_applicable';
        } else if (order.paymentStatus === 'paid') {
          order.paymentStatus = 'refund_initiated';
        }
      }

      if (paymentStatus) {
        order.paymentStatus = paymentStatus;
      }

      await order.save({ session });
      updatedOrder = order;

      if (paymentStatus === 'refund_initiated') {
        userNotifications.push({
          userId: order.userId,
          title: 'Refund Initiated',
          message: `Your refund for order ${order.orderId} has been initiated. It will be credited within 5-7 business days.`,
          type: 'order',
          data: {
            orderId: order._id,
            orderNumber: order.orderId,
            paymentStatus: 'refund_initiated',
          },
        });
      }

      if (paymentStatus === 'refunded') {
        userNotifications.push({
          userId: order.userId,
          title: 'Refund Completed ✓',
          message: `Your refund of ₹${order.total} for order ${order.orderId} has been credited to your account.`,
          type: 'order',
          data: {
            orderId: order._id,
            orderNumber: order.orderId,
            paymentStatus: 'refunded',
          },
        });
      }

      if (orderStatus === 'cancelled') {
        adminNotifications.push({
          title: 'Order Cancelled',
          message: `Order ${order.orderId} was cancelled.`,
          type: 'order',
          data: {
            orderId: order._id,
            orderNumber: order.orderId,
            status: 'cancelled',
          },
        });
      }

      if (paymentStatus === 'paid') {
        adminNotifications.push({
          title: 'Payment Received',
          message: `Payment received for order ${order.orderId}.`,
          type: 'payment',
          data: {
            orderId: order._id,
            orderNumber: order.orderId,
            paymentStatus: 'paid',
          },
        });
      }

      if (paymentStatus === 'failed') {
        adminNotifications.push({
          title: 'Payment Failed',
          message: `Payment failed for order ${order.orderId}.`,
          type: 'payment',
          data: {
            orderId: order._id,
            orderNumber: order.orderId,
            paymentStatus: 'failed',
          },
        });
      }

      if (orderStatus) {
        userNotifications.push({
          userId: order.userId,
          title: 'Order Status Updated',
          message: `Your order ${order.orderId} is now ${orderStatus}.`,
          type: 'order',
          data: {
            orderId: order._id,
            orderNumber: order.orderId,
            status: orderStatus,
          },
        });
      }
    });

    for (const item of userNotifications) {
  await createNotification(item);

  await sendUserOrderPush({
    userId: item.userId,
    title: item.title,
    message: item.message,
    data: item.data,
  });
}

    for (const item of adminNotifications) {
      await createAdminNotification(item);
    }

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    const statusCode = error.message === 'Order not found' ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message === 'Order not found'
          ? 'Order not found'
          : 'Failed to update order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  let cancelledOrder = null;
  const userNotifications = [];
  const adminNotifications = [];

  try {
    const { id } = req.params;

    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId.toString() !== req.user._id.toString()) {
        throw new Error('Not authorized');
      }

      if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
        throw new Error(`Cannot cancel order with status: ${order.orderStatus}`);
      }

      order.orderStatus = 'cancelled';
      order.statusTimeline.push({
        status: 'cancelled',
        date: new Date(),
      });

      if (order.offerId) {
        const offer = await Offer.findById(order.offerId).session(session);

        if (offer) {
          offer.usedCount = Math.max(0, Number(offer.usedCount || 0) - 1);

          const existingUser = offer.usedByUsers.find(
            (u) => String(u.userId) === String(order.userId)
          );

          if (existingUser) {
            existingUser.count = Math.max(
              0,
              Number(existingUser.count || 0) - 1
            );
          }

          offer.usedByUsers = offer.usedByUsers.filter(
            (u) => Number(u.count || 0) > 0
          );

          const now = new Date();

          if (
            offer.endDate >= now &&
            (!offer.usageLimit || offer.usedCount < offer.usageLimit)
          ) {
            offer.isActive = true;
          }

          await offer.save({ session });
        }
      }

      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.qty } },
          { session }
        );
      }

      if (order.paymentMethod === 'cod') {
        order.paymentStatus = 'not_applicable';
      } else if (order.paymentStatus === 'paid') {
        order.paymentStatus = 'refund_initiated';

        userNotifications.push({
          userId: order.userId,
          title: 'Refund Initiated',
          message: `Your refund for order ${order.orderId} has been initiated. It will be credited within 5-7 business days.`,
          type: 'order',
          data: {
            orderId: order._id,
            orderNumber: order.orderId,
            paymentStatus: 'refund_initiated',
          },
        });
      }

      await order.save({ session });
      cancelledOrder = order;

      userNotifications.push({
        userId: order.userId,
        title: 'Order Cancelled',
        message: `Your order ${order.orderId} has been cancelled successfully.`,
        type: 'order',
        data: {
          orderId: order._id,
          orderNumber: order.orderId,
          status: 'cancelled',
        },
      });

      adminNotifications.push({
        title: 'Customer Cancelled Order',
        message: `Customer cancelled order ${order.orderId}.`,
        type: 'order',
        data: {
          orderId: order._id,
          orderNumber: order.orderId,
          status: 'cancelled',
        },
      });
    });

  for (const item of userNotifications) {
  await createNotification(item);

  await sendUserOrderPush({
    userId: item.userId,
    title: item.title,
    message: item.message,
    data: item.data,
  });
}

    for (const item of adminNotifications) {
      await createAdminNotification(item);
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order: cancelledOrder,
    });
  } catch (error) {
    let statusCode = 500;

    if (error.message === 'Order not found') statusCode = 404;
    if (
      error.message === 'Not authorized' ||
      error.message.includes('Cannot cancel order')
    ) {
      statusCode = error.message === 'Not authorized' ? 403 : 400;
    }

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        'Failed to cancel order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};