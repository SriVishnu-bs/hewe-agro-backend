import Address from '../models/Address.js';

export const createAddress = async (req, res) => {
  try {
  const {
  userId,
  title,
  name,
  phone,
  email,
  building,
  street,
  area,
  city,
  pin,
  latitude,
  longitude,
  isDefault,
} = req.body;

    if (!userId || !title || !name || !phone || !building || !street || !city || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing',
      });
    }
    if (req.user && userId !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Not allowed to create address for another user',
  });
}

    if (isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    const address = await Address.create({
      userId,
      title,
      name,
      phone,
      email: email || '',
      building,
      street,
      area: area || '',
      city,
      pin,
      latitude: latitude || null,
      longitude: longitude || null,
      isDefault: !!isDefault,
    });

    return res.status(201).json({
      success: true,
      message: 'Address created successfully',
      address,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const getAddressesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user && userId !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Not allowed to view another user addresses',
  });
}

    const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch addresses',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (updateData.latitude === '') {
  updateData.latitude = null;
}

if (updateData.longitude === '') {
  updateData.longitude = null;
}

    const existing = await Address.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    if (req.user && existing.userId.toString() !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Not allowed to update this address',
  });
}

    if (updateData.isDefault) {
      await Address.updateMany(
        { userId: existing.userId },
        { $set: { isDefault: false } }
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address: updatedAddress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

   const existing = await Address.findById(id);

if (!existing) {
  return res.status(404).json({
    success: false,
    message: 'Address not found',
  });
}

if (req.user && existing.userId.toString() !== req.user._id.toString()) {
  return res.status(403).json({
    success: false,
    message: 'Not allowed to delete this address',
  });
}

await Address.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error:
  process.env.NODE_ENV === 'development'
    ? error.message
    : undefined,
    });
  }
};