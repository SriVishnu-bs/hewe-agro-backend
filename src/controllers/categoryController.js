
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Offer from '../models/Offer.js';

const createSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const buildUpdatedLabel = () => {
  return 'Updated today';
};

export const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
    }).sort({
      sortOrder: 1,
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};

export const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({
      sortOrder: 1,
      createdAt: 1,
    });

    const updatedCategories = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          tag: category.name,
        });

        return {
          ...category.toObject(),
          productCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      categories: updatedCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin categories',
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const {
      name,
      icon,
      color,
      sortOrder,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const normalizedName = name.trim();

    const existingCategory = await Category.findOne({
      name: {
        $regex: `^${normalizedName}$`,
        $options: 'i',
      },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists',
      });
    }

    const slug = createSlug(normalizedName);

    const category = await Category.create({
      name: normalizedName,
      slug,
      icon: icon || 'apps',
      color: color || '#F4F6F8',
      sortOrder: Number(sortOrder || 0),
      isActive: true,
      productCount: 0,
      lastUpdatedLabel: buildUpdatedLabel(),
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const nextName = req.body.name?.trim();

    if (!nextName) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const duplicate = await Category.findOne({
      _id: { $ne: category._id },
      name: {
        $regex: `^${nextName}$`,
        $options: 'i',
      },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists',
      });
    }

    const oldName = category.name;

    category.name = nextName;
    category.slug = createSlug(nextName);
    category.icon = req.body.icon || category.icon;
    category.color = req.body.color || category.color;

    if (req.body.sortOrder !== undefined) {
      category.sortOrder = Number(req.body.sortOrder || 0);
    }

    if (req.body.isActive !== undefined) {
      category.isActive = !!req.body.isActive;
    }

    category.lastUpdatedLabel = buildUpdatedLabel();

    await category.save();

    if (oldName !== nextName) {
      await Product.updateMany(
        { tag: oldName },
        {
          $set: {
            tag: nextName,
          },
        }
      );

      await Offer.updateMany(
        { category: oldName },
        {
          $set: {
            category: nextName,
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const linkedProducts = await Product.countDocuments({
      tag: category.name,
    });

    if (linkedProducts > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Category contains products. Disable it instead of deleting.',
      });
    }

    const linkedOffers = await Offer.countDocuments({
      category: category.name,
      isActive: true,
    });

    if (linkedOffers > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Active offers are using this category.',
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

export const reorderCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories array is required',
      });
    }

    for (const item of categories) {
      await Category.findByIdAndUpdate(item.id, {
        sortOrder: Number(item.sortOrder || 0),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category order updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder categories',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};
