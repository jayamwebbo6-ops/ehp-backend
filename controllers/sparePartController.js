const SparePart = require('../models/SparePart');
const { log } = require('../util/logger');
const fs = require('fs');
const path = require('path');

// Helper to remove orphaned image file
const deleteLocalImage = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return;
  if (imagePath.startsWith('/uploads/')) {
    const absolutePath = path.join(__dirname, '..', imagePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (e) {
        console.error("Failed to delete local image file:", absolutePath, e);
      }
    }
  }
};

// @desc    Get all spare parts
// @route   GET /api/spare-parts
// @access  Private
const getSpareParts = async (req, res) => {
  try {
    const spareParts = await SparePart.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      count: spareParts.length,
      spareParts
    });
  } catch (error) {
    console.error("Error fetching spare parts:", error);
    res.status(500).json({ message: "Failed to fetch spare parts", error: error.message });
  }
};

// @desc    Get single spare part by ID
// @route   GET /api/spare-parts/:id
// @access  Private
const getSparePartById = async (req, res) => {
  try {
    const sparePart = await SparePart.findById(req.params.id);
    if (!sparePart) {
      return res.status(404).json({ message: "Spare part not found" });
    }
    res.status(200).json({
      status: 'success',
      sparePart
    });
  } catch (error) {
    console.error("Error fetching spare part:", error);
    res.status(500).json({ message: "Failed to fetch spare part", error: error.message });
  }
};

// @desc    Create new spare part
// @route   POST /api/spare-parts
// @access  Private
const createSparePart = async (req, res) => {
  try {
    const { name, artNo, price, currency, hsnCode, description, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Spare Part Name is required" });
    }

    const newSparePart = new SparePart({
      name: name.trim(),
      artNo: artNo ? artNo.trim() : '',
      price: price !== undefined && price !== '' ? parseFloat(price) : 0,
      currency: currency || 'EUR',
      hsnCode: hsnCode ? hsnCode.trim() : '',
      description: description ? description.trim() : '',
      image: image || ''
    });

    const savedPart = await newSparePart.save();
    log(`[SparePartController] Spare Part created: "${savedPart.name}" (ID: ${savedPart._id})`);

    res.status(201).json({
      status: 'success',
      message: 'Spare part created successfully',
      sparePart: savedPart
    });
  } catch (error) {
    console.error("Error creating spare part:", error);
    res.status(500).json({ message: "Failed to create spare part", error: error.message });
  }
};

// @desc    Update spare part
// @route   PUT /api/spare-parts/:id
// @access  Private
const updateSparePart = async (req, res) => {
  try {
    const sparePartId = req.params.id;
    const existingPart = await SparePart.findById(sparePartId);

    if (!existingPart) {
      return res.status(404).json({ message: "Spare part not found" });
    }

    const { name, artNo, price, currency, hsnCode, description, image } = req.body;

    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ message: "Spare Part Name is required" });
    }

    // Handle image cleanup if image is being replaced
    if (image !== undefined && existingPart.image && existingPart.image !== image) {
      deleteLocalImage(existingPart.image);
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (artNo !== undefined) updateFields.artNo = artNo.trim();
    if (price !== undefined && price !== '') updateFields.price = parseFloat(price);
    if (currency !== undefined) updateFields.currency = currency;
    if (hsnCode !== undefined) updateFields.hsnCode = hsnCode.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (image !== undefined) updateFields.image = image;

    const updatedPart = await SparePart.findByIdAndUpdate(
      sparePartId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    log(`[SparePartController] Spare Part updated: "${updatedPart.name}" (ID: ${updatedPart._id})`);

    res.status(200).json({
      status: 'success',
      message: 'Spare part updated successfully',
      sparePart: updatedPart
    });
  } catch (error) {
    console.error("Error updating spare part:", error);
    res.status(500).json({ message: "Failed to update spare part", error: error.message });
  }
};

// @desc    Delete spare part
// @route   DELETE /api/spare-parts/:id
// @access  Private
const deleteSparePart = async (req, res) => {
  try {
    const sparePart = await SparePart.findById(req.params.id);
    if (!sparePart) {
      return res.status(404).json({ message: "Spare part not found" });
    }

    if (sparePart.image) {
      deleteLocalImage(sparePart.image);
    }

    await SparePart.findByIdAndDelete(req.params.id);
    log(`[SparePartController] Spare Part deleted: "${sparePart.name}" (ID: ${sparePart._id})`);

    res.status(200).json({
      status: 'success',
      message: 'Spare part deleted successfully'
    });
  } catch (error) {
    console.error("Error deleting spare part:", error);
    res.status(500).json({ message: "Failed to delete spare part", error: error.message });
  }
};

// @desc    Bulk delete spare parts
// @route   POST /api/spare-parts/bulk-delete
// @access  Private
const bulkDeleteSpareParts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Please provide an array of IDs to delete" });
    }

    const spareParts = await SparePart.find({ _id: { $in: ids } });
    for (const part of spareParts) {
      if (part.image) {
        deleteLocalImage(part.image);
      }
    }

    const result = await SparePart.deleteMany({ _id: { $in: ids } });
    log(`[SparePartController] Bulk deleted ${result.deletedCount} spare parts`);

    res.status(200).json({
      status: 'success',
      message: `${result.deletedCount} spare parts deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error bulk deleting spare parts:", error);
    res.status(500).json({ message: "Failed to bulk delete spare parts", error: error.message });
  }
};

module.exports = {
  getSpareParts,
  getSparePartById,
  createSparePart,
  updateSparePart,
  deleteSparePart,
  bulkDeleteSpareParts
};
