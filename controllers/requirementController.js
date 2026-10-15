const Requirement = require('../models/Requirement');

// Get all requirements
const getRequirements = async (req, res) => {
  try {
    const requirements = await Requirement.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({ requirements });
  } catch (error) {
    console.error("Error fetching requirements:", error);
    res.status(500).json({ message: "Failed to fetch requirements" });
  }
};

// Create a new requirement
const createRequirement = async (req, res) => {
  try {
    const { title, order } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Requirement title is required" });
    }

    const requirement = new Requirement({
      title: title.trim(),
      order: order !== undefined ? Number(order) : 0
    });

    await requirement.save();
    res.status(201).json({ message: "Requirement created successfully", requirement });
  } catch (error) {
    console.error("Error creating requirement:", error);
    res.status(500).json({ message: "Failed to create requirement" });
  }
};

// Update requirement
const updateRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, order } = req.body;

    const requirement = await Requirement.findById(id);
    if (!requirement) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    if (title !== undefined) requirement.title = title.trim();
    if (order !== undefined) requirement.order = Number(order);

    await requirement.save();
    res.status(200).json({ message: "Requirement updated successfully", requirement });
  } catch (error) {
    console.error("Error updating requirement:", error);
    res.status(500).json({ message: "Failed to update requirement" });
  }
};

// Delete requirement
const deleteRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const requirement = await Requirement.findByIdAndDelete(id);

    if (!requirement) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    res.status(200).json({ message: "Requirement deleted successfully" });
  } catch (error) {
    console.error("Error deleting requirement:", error);
    res.status(500).json({ message: "Failed to delete requirement" });
  }
};

// Delete multiple requirements in bulk
const bulkDeleteRequirements = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No requirement IDs provided for deletion" });
    }

    await Requirement.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: `${ids.length} requirement(s) deleted successfully` });
  } catch (error) {
    console.error("Error bulk deleting requirements:", error);
    res.status(500).json({ message: "Failed to delete selected requirements" });
  }
};

module.exports = {
  getRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  bulkDeleteRequirements
};
