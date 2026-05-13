import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const toObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const getStableProductId = (item) => {
  return String(item?.productId || item?.id || '').trim();
};

export const getCart = async (req, res) => {
  try {
    const  userId  = req.user._id;
  
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const objectUserId = toObjectId(userId);
    if (!objectUserId) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    let cart = await Cart.findOne({ userId: objectUserId });

    if (!cart) {
      cart = await Cart.create({
        userId: objectUserId,
        items: [],
      });
    }

    return res.status(200).json({
      message: 'Cart fetched successfully',
      cart,
    });
  } catch (error) {
    console.log('GET CART ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

export const updateCart = async (req, res) => {
  try {
  const userId = req.user._id;

const { items } = req.body;
   
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const objectUserId = toObjectId(userId);
    if (!objectUserId) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const safeItems = Array.isArray(items) ? items : [];

    const normalizedItems = safeItems
      .map((item) => {
        const productId = getStableProductId(item);
        if (!productId) return null;

        return {
          productId,
          name: String(item?.name || '').trim(),
          price: Number(item?.price || 0),
          qty: Math.max(1, Number(item?.qty || 1)),
          image: String(item?.image || '').trim(),
        };
      })
      .filter(Boolean);

    const cart = await Cart.findOneAndUpdate(
  { userId: objectUserId },
  {
    userId: objectUserId,
    items: normalizedItems,
  },
  {
    returnDocument: 'after', // 🔥 replaces new: true
    upsert: true,
    setDefaultsOnInsert: true,
  }
);

    return res.status(200).json({
      message: 'Cart updated successfully',
      cart,
    });
  } catch (error) {
    console.log('UPDATE CART ERROR:', error);
    return res.status(500).json({ message: 'Failed to update cart' });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
  
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const objectUserId = toObjectId(userId);
    if (!objectUserId) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: objectUserId },
      { items: [] },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: 'Cart cleared successfully',
      cart,
    });
  } catch (error) {
    console.log('CLEAR CART ERROR:', error);
    return res.status(500).json({ message: 'Failed to clear cart' });
  }
};
export const getCartSummary = async (
  req,
  res
) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({
      userId,
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        summary: {
          subtotal: 0,
          shipping: 0,
          gstIncluded: true,
          total: 0,
          itemCount: 0,
        },
      });
    }

    let subtotal = 0;
    let itemCount = 0;

    for (const item of cart.items) {
      const product =
        await Product.findById(
          item.productId
        );

      if (!product) continue;

      const price = Number(
        product.price || 0
      );

      const qty = Number(
        item.qty || 1
      );

      subtotal += price * qty;

      itemCount += qty;
    }

    const shipping =
      subtotal >= 500 ? 0 : 50;

    const total =
      subtotal + shipping;

    return res.status(200).json({
      success: true,
      summary: {
        subtotal,
        shipping,
        gstIncluded: true,
        total,
        itemCount,
      },
    });
  } catch (error) {
    console.log(
      'GET CART SUMMARY ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch cart summary',
    });
  }
};