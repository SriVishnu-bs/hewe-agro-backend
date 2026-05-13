import Product from '../models/Product.js';

import cloudinary from '../config/cloudinary.js';
import Order from '../models/Order.js'; // ✅ ADD THIS
import { createAdminNotification } from './adminNotificationController.js';
// GET ALL PRODUCTS
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// GET SINGLE PRODUCT
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (e) {
    res.status(500).json({ message: 'Error fetching product' });
  }
};


export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await createAdminNotification({
  title: 'New Product Launched',
  message: `${product.name} was added to the store.`,
  type: 'product',
  data: {
    productId: product._id,
    productName: product.name,
  },
});
    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    console.log('UPDATE PRODUCT BODY:', req.body);
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
  ...req.body,
  image: req.body.image || req.body.images?.[0] || '',
  imagePublicId:
    req.body.imagePublicId ||
    req.body.imagePublicIds?.[0] ||
    '',
  images: req.body.images || [],
  imagePublicIds: req.body.imagePublicIds || [],
},
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await createAdminNotification({
  title: 'Product Updated',
  message: `${product.name} was updated.`,
  type: 'product',
  data: {
    productId: product._id,
    productName: product.name,
    stock: product.stock,
  },
});

if (Number(product.stock || 0) === 0) {
  await createAdminNotification({
    title: 'Out of Stock',
    message: `${product.name} is now out of stock.`,
    type: 'product',
    data: {
      productId: product._id,
      productName: product.name,
      stock: product.stock,
    },
  });
} else if (Number(product.stock || 0) <= 10) {
  await createAdminNotification({
    title: 'Low Stock Alert',
    message: `${product.name} has only ${product.stock} items left.`,
    type: 'product',
    data: {
      productId: product._id,
      productName: product.name,
      stock: product.stock,
    },
  });
}

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const publicIds = [
      ...(product.imagePublicIds || []),
      ...(product.imagePublicId ? [product.imagePublicId] : []),
    ];

    for (const publicId of publicIds) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.log('CLOUDINARY DELETE ERROR:', e);
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

// ADD REVIEW
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, name, loc, rating, text, orderId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Please login to review this product',
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const alreadyReviewed = product.reviews.find(
      (review) => String(review.userId) === String(userId)
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    // ✅ ADD REVIEW
    product.reviews.unshift({
      userId,
      name,
      loc,
      rating,
      text,
      editedOnce: false,
    });

    await product.save();

    // ✅ MARK AS REVIEWED IN ORDER
    if (orderId) {
      const order = await Order.findById(orderId);

      if (order) {
        const item = order.items.find(
          (i) => String(i.productId) === String(id)
        );

        if (item) {
          item.reviewed = true;
          await order.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Review added successfully',
      reviews: product.reviews,
    });

  } catch (error) {
    console.log('ADD REVIEW ERROR',error);
    return res.status(500).json({
      success: false,
      message: error.message,
      
    });
  }
};

// EDIT REVIEW (no change)
export const editReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const { userId, name, loc, rating, text } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const review = product.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (String(review.userId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to edit this review',
      });
    }

    if (review.editedOnce) {
      return res.status(400).json({
        success: false,
        message: 'You can edit only once',
      });
    }

    review.name = name;
    review.loc = loc;
    review.rating = rating;
    review.text = text;
    review.editedOnce = true;

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      reviews: product.reviews,
    });

  } catch (error) {
    console.log('EDIT REVIEW ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to edit review',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded',
      });
    }

    return res.status(200).json({
      success: true,
      image: req.file.path,
      publicId: req.file.filename,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const deleteReviewByAdmin = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.reviews = product.reviews.filter(
      (review) => String(review._id) !== String(reviewId)
    );

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      reviews: product.reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};
export const deleteProductImage = async (req, res) => {
  try {
    const { productId } = req.params;
    const { image, publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await cloudinary.uploader.destroy(publicId);

    product.images = (product.images || []).filter(
      (img) => img !== image
    );

    product.imagePublicIds = (
      product.imagePublicIds || []
    ).filter((id) => id !== publicId);

    if (product.image === image) {
      product.image = product.images[0] || '';
      product.imagePublicId =
        product.imagePublicIds[0] || '';
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete image',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const deleteUploadedProductImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }

    await cloudinary.uploader.destroy(publicId);

    return res.status(200).json({
      success: true,
      message: 'Uploaded image deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete uploaded image',
     error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};