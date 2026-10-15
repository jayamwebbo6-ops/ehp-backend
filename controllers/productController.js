const Product = require('../models/Product');
const { log } = require('../util/logger');
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.warn("Sharp is not installed or failed to load. Falling back to saving image in original format.");
}

// Helper function to convert base64 image into saved file in specified folder (e.g., 'accessories' or 'optionals')
const saveBase64Image = async (base64String, folderName) => {
  if (!base64String || typeof base64String !== 'string') return '';
  if (!base64String.startsWith('data:image/')) {
    // Already a saved image path or URL
    return base64String;
  }

  try {
    const targetDir = path.join(__dirname, '../uploads', folderName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const matches = base64String.match(/^data:image\/([a-zA-Z0-9+\-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return '';
    }

    const extType = matches[1].toLowerCase();
    const imageBuffer = Buffer.from(matches[2], 'base64');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    if (sharp) {
      const filename = `${uniqueSuffix}.webp`;
      const filepath = path.join(targetDir, filename);
      await sharp(imageBuffer)
        .webp({ quality: 80 })
        .toFile(filepath);
      return `/uploads/${folderName}/${filename}`;
    } else {
      const ext = extType === 'jpeg' ? '.jpg' : (extType === 'svg+xml' ? '.svg' : `.${extType}`);
      const filename = `${uniqueSuffix}${ext}`;
      const filepath = path.join(targetDir, filename);
      fs.writeFileSync(filepath, imageBuffer);
      return `/uploads/${folderName}/${filename}`;
    }
  } catch (err) {
    console.error(`Failed to save base64 image in ${folderName}:`, err);
    return '';
  }
};

// Helper to remove orphaned image file
const deleteLocalImage = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return;
  if (imagePath.startsWith('/uploads/')) {
    const absolutePath = path.join(__dirname, '..', imagePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        console.error(`Failed to delete file ${imagePath}:`, err);
      }
    }
  }
};

// 1. Get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ products });
  } catch (error) {
    log(`[Product Controller] Fetch products error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 2. Create a new product
const createProduct = async (req, res) => {
  try {
    const { name, description, unitPrice } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const price = parseFloat(unitPrice) || 0;

    let technicalData = [];
    if (req.body.technicalData) {
      try {
        technicalData = typeof req.body.technicalData === 'string' ? JSON.parse(req.body.technicalData) : req.body.technicalData;
      } catch (e) {
        console.error("Error parsing technicalData JSON:", e);
      }
    }

    let accessories = [];
    if (req.body.accessories) {
      try {
        accessories = typeof req.body.accessories === 'string' ? JSON.parse(req.body.accessories) : req.body.accessories;
      } catch (e) {
        console.error("Error parsing accessories JSON:", e);
      }
    }

    let optionals = [];
    if (req.body.optionals) {
      try {
        optionals = typeof req.body.optionals === 'string' ? JSON.parse(req.body.optionals) : req.body.optionals;
      } catch (e) {
        console.error("Error parsing optionals JSON:", e);
      }
    }


    // Process accessories images (convert Base64 to /uploads/accessories/ filename)
    if (Array.isArray(accessories)) {
      for (let i = 0; i < accessories.length; i++) {
        if (accessories[i].image && accessories[i].image.startsWith('data:image/')) {
          accessories[i].image = await saveBase64Image(accessories[i].image, 'accessories');
        }
      }
    }

    // Process optionals images (convert Base64 to /uploads/optionals/ filename)
    if (Array.isArray(optionals)) {
      for (let i = 0; i < optionals.length; i++) {
        if (optionals[i].image && optionals[i].image.startsWith('data:image/')) {
          optionals[i].image = await saveBase64Image(optionals[i].image, 'optionals');
        }
      }
    }


    const currency = (req.body.currency && ['INR', 'EUR'].includes(req.body.currency.toUpperCase())) ? req.body.currency.toUpperCase() : 'EUR';
    const productType = (req.body.productType && ['Scale', 'Spare Parts'].includes(req.body.productType)) ? req.body.productType : '';

    const newProduct = new Product({
      name: name.trim(),
      productType: productType,
      description: description ? description.trim() : '',
      unitPrice: price,
      currency: currency,
      websiteUrl: req.body.websiteUrl ? req.body.websiteUrl.trim() : (req.body.websiteLink ? req.body.websiteLink.trim() : ''),
      youtubeUrl: req.body.youtubeUrl ? req.body.youtubeUrl.trim() : (req.body.youtubeLink ? req.body.youtubeLink.trim() : ''),
      image: req.body.image ? req.body.image.trim() : '',
      technicalData: Array.isArray(technicalData) ? technicalData : [],
      accessories: Array.isArray(accessories) ? accessories : [],
      optionals: Array.isArray(optionals) ? optionals : []
    });

    await newProduct.save();
    log(`[Product Controller] Created product: ${name}`);

    res.status(201).json({
      message: "Product created successfully",
      product: newProduct
    });
  } catch (error) {
    log(`[Product Controller] Create product error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3. Update product details
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, productType, description, unitPrice, websiteUrl, websiteLink, youtubeUrl, youtubeLink } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (name) product.name = name.trim();
    if (productType && ['Scale', 'Spare Parts'].includes(productType)) {
      product.productType = productType;
    }
    if (description !== undefined) product.description = description.trim();
    if (websiteUrl !== undefined) product.websiteUrl = websiteUrl.trim();
    else if (websiteLink !== undefined) product.websiteUrl = websiteLink.trim();
    if (youtubeUrl !== undefined) product.youtubeUrl = youtubeUrl.trim();
    else if (youtubeLink !== undefined) product.youtubeUrl = youtubeLink.trim();
    if (unitPrice !== undefined && unitPrice !== null && unitPrice !== '') {
      const price = parseFloat(unitPrice);
      if (!isNaN(price)) {
        product.unitPrice = price;
      }
    }
    if (req.body.currency && ['INR', 'EUR'].includes(req.body.currency.toUpperCase())) {
      product.currency = req.body.currency.toUpperCase();
    }

    // Update main image path if provided
    if (req.body.image !== undefined) {
      const targetImage = req.body.image === 'null' || req.body.image === '' ? null : req.body.image;
      if (product.image && product.image !== targetImage) {
        deleteLocalImage(product.image);
      }
      product.image = targetImage;
    }

    // Update technicalData array if passed
    if (req.body.technicalData !== undefined) {
      try {
        const techData = typeof req.body.technicalData === 'string' ? JSON.parse(req.body.technicalData) : req.body.technicalData;
        if (Array.isArray(techData)) {
          product.technicalData = techData;
        }
      } catch (e) {
        console.error("Error updating technicalData:", e);
      }
    }

    // Update accessories array if passed
    if (req.body.accessories !== undefined) {
      try {
        const accs = typeof req.body.accessories === 'string' ? JSON.parse(req.body.accessories) : req.body.accessories;
        if (Array.isArray(accs)) {
          for (let i = 0; i < accs.length; i++) {
            if (accs[i].image && accs[i].image.startsWith('data:image/')) {
              accs[i].image = await saveBase64Image(accs[i].image, 'accessories');
            }
          }
          product.accessories = accs;
        }
      } catch (e) {
        console.error("Error updating accessories:", e);
      }
    }

    // Update optionals array if passed
    if (req.body.optionals !== undefined) {
      try {
        const opts = typeof req.body.optionals === 'string' ? JSON.parse(req.body.optionals) : req.body.optionals;
        if (Array.isArray(opts)) {
          for (let i = 0; i < opts.length; i++) {
            if (opts[i].image && opts[i].image.startsWith('data:image/')) {
              opts[i].image = await saveBase64Image(opts[i].image, 'optionals');
            }
          }
          product.optionals = opts;
        }
      } catch (e) {
        console.error("Error updating optionals:", e);
      }
    }
    
    await product.save();
    log(`[Product Controller] Updated product: ${product.name}`);

    res.status(200).json({
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    log(`[Product Controller] Update product error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 4. Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete product main image file
    if (product.image) {
      deleteLocalImage(product.image);
    }

    // Delete accessories images
    if (Array.isArray(product.accessories)) {
      product.accessories.forEach(acc => {
        if (acc.image) deleteLocalImage(acc.image);
      });
    }

    // Delete optionals images
    if (Array.isArray(product.optionals)) {
      product.optionals.forEach(opt => {
        if (opt.image) deleteLocalImage(opt.image);
      });
    }


    await Product.findByIdAndDelete(id);
    log(`[Product Controller] Deleted product: ${product.name}`);

    res.status(200).json({ message: `Product "${product.name}" deleted successfully` });
  } catch (error) {
    log(`[Product Controller] Delete product error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 5. Import multiple products
const importProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "No products provided or invalid format" });
    }

    const savedProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const name = p.name || p["Product Name"] || p["name"] || p["ProductName"] || p["Item Name"] || p["ItemName"] || p["Product"];
      const description = p.description || p["Description"] || p["desc"] || p["Product Description"] || p["details"] || p["Details"];
      const rawPrice = p.unitPrice !== undefined ? p.unitPrice : (p.price !== undefined ? p.price : p["Unit Price"] || p["Price"] || p["unitprice"] || p["rate"] || p["UnitPrice"] || p["Rate"]);

      if (!name) {
        errors.push(`Row ${i + 1}: Name is required`);
        continue;
      }
      if (!description) {
        errors.push(`Row ${i + 1} (${name}): Description is required`);
        continue;
      }
      if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
        errors.push(`Row ${i + 1} (${name}): Unit price is required`);
        continue;
      }

      const price = parseFloat(rawPrice);
      if (isNaN(price) || price <= 0) {
        errors.push(`Row ${i + 1} (${name}): Unit price must be a valid positive number`);
        continue;
      }

      const newProduct = new Product({
        name: name.toString().trim(),
        description: description.toString().trim(),
        unitPrice: price
      });

      await newProduct.save();
      savedProducts.push(newProduct);
    }

    log(`[Product Controller] Imported ${savedProducts.length} products`);

    res.status(200).json({
      message: `Import completed. Successfully imported ${savedProducts.length} products.`,
      successCount: savedProducts.length,
      failedCount: errors.length,
      errors
    });
  } catch (error) {
    log(`[Product Controller] Import products error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 6. Bulk delete products
const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided for deletion" });
    }

    const products = await Product.find({ _id: { $in: ids } });

    // Clean up images for all deleted products
    products.forEach(product => {
      if (product.image) deleteLocalImage(product.image);
      if (Array.isArray(product.accessories)) {
        product.accessories.forEach(acc => {
          if (acc.image) deleteLocalImage(acc.image);
        });
      }
      if (Array.isArray(product.optionals)) {
        product.optionals.forEach(opt => {
          if (opt.image) deleteLocalImage(opt.image);
        });
      }
    });

    await Product.deleteMany({ _id: { $in: ids } });
    log(`[Product Controller] Bulk deleted ${ids.length} products`);

    res.status(200).json({ message: `${ids.length} product(s) deleted successfully` });
  } catch (error) {
    log(`[Product Controller] Bulk delete products error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  importProducts,
  bulkDeleteProducts
};
