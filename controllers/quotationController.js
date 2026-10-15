const path = require('path');
const fs = require('fs');
const Quotation = require('../models/Quotation');
const Setting = require('../models/Setting');
const { log } = require('../util/logger');
const { sendQuotationEmail } = require('../util/email');

// 1. Get all quotations
const getQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.status(200).json({ quotations });
  } catch (error) {
    log(`[Quotation Controller] Fetch quotations error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 2. Get quotation by ID
const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.status(200).json({ quotation });
  } catch (error) {
    log(`[Quotation Controller] Fetch quotation by ID error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3. Create a new quotation
const createQuotation = async (req, res) => {
  try {
    const quotationData = req.body;
    
    // Quick validation
    if (!quotationData.quoteNo || !quotationData.customerName || !quotationData.companyName || !quotationData.items || quotationData.items.length === 0) {
      return res.status(400).json({ message: "Quote number, customer name, company name, and at least one item are required" });
    }

    const trimmedQuoteNo = String(quotationData.quoteNo || '').trim();
    if (trimmedQuoteNo) {
      const existing = await Quotation.findOne({
        quoteNo: { $regex: new RegExp(`^${trimmedQuoteNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({
          message: `Quotation number "${trimmedQuoteNo}" already exists. Duplicate quotation numbers are not allowed.`
        });
      }
    }

    if (!quotationData.country) {
      quotationData.country = 'India';
    }

    const newQuotation = new Quotation(quotationData);
    await newQuotation.save();
    
    log(`[Quotation Controller] Created quotation: ${newQuotation.quoteNo} (${newQuotation.version})`);
    
    res.status(201).json({
      message: "Quotation generated successfully",
      quotation: newQuotation
    });
  } catch (error) {
    log(`[Quotation Controller] Create quotation error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 4. Update quotation
const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const quotationData = req.body;

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotationData.quoteNo) {
      const trimmedQuoteNo = String(quotationData.quoteNo).trim();
      const existing = await Quotation.findOne({
        _id: { $ne: id },
        quoteNo: { $regex: new RegExp(`^${trimmedQuoteNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({
          message: `Quotation number "${trimmedQuoteNo}" already exists. Duplicate quotation numbers are not allowed.`
        });
      }
    }

    if (!quotationData.country) {
      quotationData.country = 'India';
    }

    // Overwrite fields
    Object.assign(quotation, quotationData);
    await quotation.save();

    log(`[Quotation Controller] Updated quotation: ${quotation.quoteNo} (${quotation.version})`);

    res.status(200).json({
      message: "Quotation updated successfully",
      quotation
    });
  } catch (error) {
    log(`[Quotation Controller] Update quotation error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 5. Delete quotation
const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    await Quotation.findByIdAndDelete(id);
    log(`[Quotation Controller] Deleted quotation: ${quotation.quoteNo} (${quotation.version})`);

    res.status(200).json({ message: `Quotation "${quotation.quoteNo}" deleted successfully` });
  } catch (error) {
    log(`[Quotation Controller] Delete quotation error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 5b. Delete multiple quotations in bulk
const bulkDeleteQuotations = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No quotation IDs provided for deletion" });
    }

    await Quotation.deleteMany({ _id: { $in: ids } });
    log(`[Quotation Controller] Bulk deleted ${ids.length} quotation(s)`);

    res.status(200).json({ message: `${ids.length} quotation(s) deleted successfully` });
  } catch (error) {
    log(`[Quotation Controller] Bulk delete quotations error: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 6. Send email with quotation and attachments
const sendQuotationEmailRoute = async (req, res) => {
  try {
    const { to, subject, message, pdfBase64, filename, attachments, quoteId } = req.body;

    if (!to || !subject || !message || !pdfBase64 || !filename) {
      return res.status(400).json({ message: "Recipient, subject, message body, filename, and PDF data are required" });
    }

    // Clean up base64 prefix if present
    let base64Data = pdfBase64;
    if (pdfBase64.includes('base64,')) {
      base64Data = pdfBase64.split('base64,')[1];
    }

    // Determine candidate attachments (passed in request or fallback to Settings default attachments)
    let candidateAttachments = Array.isArray(attachments) && attachments.length > 0 ? attachments : null;
    if (!candidateAttachments) {
      try {
        const settings = await Setting.findOne();
        if (settings && settings.defaultMailAndSubject && Array.isArray(settings.defaultMailAndSubject.attachments)) {
          candidateAttachments = settings.defaultMailAndSubject.attachments;
        }
      } catch (sErr) {
        log(`[Quotation Controller] Read default attachments error: ${sErr.message}`);
      }
    }

    log(`[Quotation Controller] Processing quotation email for ${to}. Sending single unified PDF.`);

    // Send email with the single quotation PDF (pdfController already merged attachments into pdfBase64)
    await sendQuotationEmail(to, subject, message, base64Data, filename, []);

    // If quoteId was provided, record quotation's attachments history
    if (quoteId && Array.isArray(candidateAttachments) && candidateAttachments.length > 0) {
      try {
        const cleanToStore = candidateAttachments.map(a => ({
          filename: a.filename || '',
          originalName: a.originalName || a.filename || '',
          path: a.path || a.url || '',
          url: a.url || a.path || '',
          mimetype: a.mimetype || a.contentType || '',
          size: a.size || 0
        }));
        await Quotation.findByIdAndUpdate(quoteId, {
          $addToSet: { attachments: { $each: cleanToStore } }
        });
      } catch (err) {
        log(`[Quotation Controller] Record quotation attachments error: ${err.message}`);
      }
    }

    res.status(200).json({ message: "Email sent successfully with quotation and attachments" });
  } catch (error) {
    log(`[Quotation Controller] Send quotation email error: ${error.message}`);
    res.status(500).json({ message: error.message || "Failed to send email" });
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  bulkDeleteQuotations,
  sendQuotationEmailRoute
};
