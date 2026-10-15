const path = require('path');
const fs = require('fs');
const Setting = require('../models/Setting');
const { log } = require('../util/logger');

// Helper to delete an uploaded file
const deleteFile = (filename) => {
  if (!filename) return;
  const baseFilename = path.basename(filename);
  let filePath = path.join(__dirname, '../uploads/company', baseFilename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '../uploads/attachments', baseFilename);
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '../uploads', baseFilename);
  }
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        log(`[Settings Controller] Failed to delete old file ${baseFilename}: ${err.message}`);
      } else {
        log(`[Settings Controller] Successfully deleted old file ${baseFilename}`);
      }
    });
  }
};

// Get settings
const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      // Return a default seeded structure if none exists in the database
      const defaultSections = [
        {
          title: "Payment Terms",
          content: `<ul>\n  <li><strong>50% Advance Payment:</strong> Payable along with the formal Purchase Order to initiate production.</li>\n  <li><strong>Balance 50% Payment:</strong> Payable against Proforma Invoice and QC verification report prior to shipment dispatch.</li>\n  <li>All payments must be remitted in USD/EUR via secure bank telegraphic wire transfer (T/T).</li>\n  <li>Any delay in balance payment beyond 15 days will incur an interest charge of 1.5% per month.</li>\n</ul>`,
          isActive: true
        },
        {
          title: "Delivery Terms",
          content: `<ul>\n  <li><strong>Delivery Period:</strong> Standard dispatch will be made within 10 working days from receipt of advance wire and signed drawing approval.</li>\n  <li><strong>Delivery Location:</strong> Customer Site as specified in the Purchase Order unless agreed otherwise in writing.</li>\n  <li><strong>Freight & Transport:</strong> All quoted prices are inclusive of freight/transport charges to the destination site.</li>\n</ul>`,
          isActive: true
        },
        {
          title: "Warranty",
          content: `<ul>\n  <li><strong>12 Months Standard Warranty:</strong> Covers all mechanical, structural, and electrical faults starting from the commissioning/installation date.</li>\n  <li>Warranty includes the cost of replacement parts, engineering labor, and technical remote support.</li>\n  <li>Defects resulting from misuse, lack of maintenance, unauthorized modification, or force majeure are excluded.</li>\n  <li>Option for extended warranty coverage up to 36 months is available upon request.</li>\n</ul>`,
          isActive: true
        },
        {
          title: "Terms & Conditions",
          content: `<ul>\n  <li><strong>Validity of Quote:</strong> Quoted prices are valid and firm for a period of 30 calendar days from the date of issuance.</li>\n  <li><strong>Delivery Lead Time:</strong> Standard dispatch will be made within 4-6 weeks from receipt of advance wire and signed drawing approval.</li>\n  <li><strong>Shipping Terms:</strong> All quotes are subject to EXW (Ex Works) unless explicitly agreed otherwise in writing.</li>\n  <li><strong>Governing Law:</strong> All disputes and contracts are governed by local commercial laws and jurisdiction courts.</li>\n</ul>`,
          isActive: true
        }
      ];

      settings = new Setting({
        companyDetails: {
          companyName: '',
          state: '',
          address: '',
          mobileNumber: '',
          emailAddress: '',
          authorizedSignatory: '',
          hasGst: false,
          gstNumber: '',
          gstRate: '',
          companyLogo: '',
          companySeal: '',
          pdfHeaderImage: '',
          pdfFooterImage: '',
          authSignatoryImage: '',
          businessType: 'product',
          firstPageContent: '',
          showFirstPageContent: false
        },
        defaultMailAndSubject: {
          subject: 'Official Business Quotation',
          body: `Dear [Contact Person Name],

Please find the attached quotation for your review.

Kindly verify the content, terms, specifications, and formatting. If any corrections or updates are required, please let us know.

Looking forward to your feedback.

Thank you.

Regards,
[Company Name]`
        },
        bankDetails: {
          bankContentIndia: '',
          bankContentEurope: '',
          qrCodeIndia: '',
          qrCodeEurope: '',
          showBankDetails: true
        },
        sections: defaultSections
      });
      // Save the default seeded settings
      await settings.save();
    }
    return res.status(200).json({ settings });
  } catch (error) {
    log(`[Settings Controller] Get settings error: ${error.message}`);
    return res.status(500).json({ message: "Failed to retrieve settings" });
  }
};

// Update settings
const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({});
    }

    const {
      companyName,
      state,
      address,
      mobileNumber,
      emailAddress,
      authorizedSignatory,
      hasGst,
      gstNumber,
      gstRate,
      igstRate,
      defaultMailSubject,
      defaultMailBody,
      businessType,
      firstPageContent,
      showFirstPageContent
    } = req.body;

    const effectiveGstRate = gstRate || igstRate || '';

    // Build the companyDetails object
    const companyDetails = {
      companyName: companyName || '',
      state: state || '',
      address: address || '',
      mobileNumber: mobileNumber || '',
      emailAddress: emailAddress || '',
      authorizedSignatory: authorizedSignatory || '',
      hasGst: hasGst === 'yes' || hasGst === 'true' || hasGst === true,
      gstNumber: (hasGst === 'yes' || hasGst === 'true' || hasGst === true) ? (gstNumber || '') : '',
      gstRate: (hasGst === 'yes' || hasGst === 'true' || hasGst === true) ? (effectiveGstRate || '') : '',
      businessType: businessType || 'product',
      firstPageContent: firstPageContent || '',
      showFirstPageContent: showFirstPageContent === 'true' || showFirstPageContent === true,
      firstPageContentSpare: req.body.firstPageContentSpare || '',
      showFirstPageContentSpare: req.body.showFirstPageContentSpare === 'true' || req.body.showFirstPageContentSpare === true
    };

    // File fields to check
    const fileFields = ['companyLogo', 'companySeal', 'pdfHeaderImage', 'pdfFooterImage', 'authSignatoryImage'];

    fileFields.forEach(field => {
      const oldFilename = settings.companyDetails ? settings.companyDetails[field] : '';

      // 1. If a new file is uploaded for this field, save its filename with prefix and delete the old file
      if (req.files && req.files[field] && req.files[field][0]) {
        companyDetails[field] = '/uploads/company/' + req.files[field][0].filename;
        if (oldFilename && oldFilename !== companyDetails[field]) {
          deleteFile(oldFilename);
        }
      }
      // 2. If the user explicitly removed the file (i.e. sent an empty string in the request body)
      else if (req.body[field] === '') {
        companyDetails[field] = '';
        if (oldFilename) {
          deleteFile(oldFilename);
        }
      }
      // 3. Otherwise, retain the existing filename from DB
      else {
        companyDetails[field] = oldFilename;
      }
    });

    settings.companyDetails = companyDetails;

    // Process Bank Details
    let bankDetails = {};
    if (req.body.bankDetails) {
      try {
        bankDetails = JSON.parse(req.body.bankDetails);
      } catch (e) {
        bankDetails = {};
      }
    }

    const oldBankDetails = settings.bankDetails || {};
    const oldQrCodeIndia = oldBankDetails.qrCodeIndia || '';
    const oldQrCodeEurope = oldBankDetails.qrCodeEurope || '';

    // Handle Bank QR Code India
    if (req.files && req.files.bankQrCodeIndia && req.files.bankQrCodeIndia[0]) {
      bankDetails.qrCodeIndia = '/uploads/company/' + req.files.bankQrCodeIndia[0].filename;
      if (oldQrCodeIndia && oldQrCodeIndia !== bankDetails.qrCodeIndia) {
        deleteFile(oldQrCodeIndia);
      }
    } else if (req.body.bankQrCodeIndia === '') {
      bankDetails.qrCodeIndia = '';
      if (oldQrCodeIndia) deleteFile(oldQrCodeIndia);
    } else {
      bankDetails.qrCodeIndia = bankDetails.qrCodeIndia || oldQrCodeIndia;
    }

    // Handle Bank QR Code Europe
    if (req.files && req.files.bankQrCodeEurope && req.files.bankQrCodeEurope[0]) {
      bankDetails.qrCodeEurope = '/uploads/company/' + req.files.bankQrCodeEurope[0].filename;
      if (oldQrCodeEurope && oldQrCodeEurope !== bankDetails.qrCodeEurope) {
        deleteFile(oldQrCodeEurope);
      }
    } else if (req.body.bankQrCodeEurope === '') {
      bankDetails.qrCodeEurope = '';
      if (oldQrCodeEurope) deleteFile(oldQrCodeEurope);
    } else {
      bankDetails.qrCodeEurope = bankDetails.qrCodeEurope || oldQrCodeEurope;
    }

    settings.bankDetails = {
      qrCodeIndia: bankDetails.qrCodeIndia || '',
      qrCodeEurope: bankDetails.qrCodeEurope || '',
      bankContentIndia: bankDetails.bankContentIndia || '',
      bankContentEurope: bankDetails.bankContentEurope || '',
      showBankDetails: bankDetails.showBankDetails !== false
    };

    // Mail settings & attachments
    let preservedAttachments = [];
    if (req.body.existingAttachments) {
      try {
        preservedAttachments = typeof req.body.existingAttachments === 'string'
          ? JSON.parse(req.body.existingAttachments)
          : req.body.existingAttachments;
      } catch (e) {
        log(`[Settings Controller] Parse existingAttachments error: ${e.message}`);
      }
    } else if (settings.defaultMailAndSubject && settings.defaultMailAndSubject.attachments) {
      // If existingAttachments was not explicitly passed, retain existing
      preservedAttachments = settings.defaultMailAndSubject.attachments;
    }

    // Check which previous attachments were deleted and remove them from disk
    const previousAttachments = (settings.defaultMailAndSubject && settings.defaultMailAndSubject.attachments) || [];
    const preservedFilenames = new Set(preservedAttachments.map(a => a.filename || path.basename(a.path || a.url || '')));
    previousAttachments.forEach(prevAtt => {
      const prevFn = prevAtt.filename || path.basename(prevAtt.path || prevAtt.url || '');
      if (prevFn && !preservedFilenames.has(prevFn)) {
        deleteFile(prevAtt.path || prevAtt.url || prevAtt.filename);
      }
    });

    // Add newly uploaded attachments (from mailAttachments or attachments)
    const newAttachments = [];
    const uploadedFiles = [
      ...(req.files && req.files['mailAttachments'] ? req.files['mailAttachments'] : []),
      ...(req.files && req.files['attachments'] ? req.files['attachments'] : [])
    ];
    uploadedFiles.forEach(file => {
      newAttachments.push({
        filename: file.filename,
        originalName: file.originalname,
        path: '/uploads/attachments/' + file.filename,
        url: '/uploads/attachments/' + file.filename,
        mimetype: file.mimetype,
        size: file.size
      });
    });

    settings.defaultMailAndSubject = {
      subject: defaultMailSubject || '',
      body: defaultMailBody || '',
      attachments: [...preservedAttachments, ...newAttachments]
    };

    // Custom sections
    if (req.body.sections) {
      try {
        settings.sections = typeof req.body.sections === 'string'
          ? JSON.parse(req.body.sections)
          : req.body.sections;
      } catch (e) {
        log(`[Settings Controller] Parse sections error: ${e.message}`);
      }
    }

    // Custom sections for Spare Parts
    if (req.body.sectionsSpare) {
      try {
        settings.sectionsSpare = typeof req.body.sectionsSpare === 'string'
          ? JSON.parse(req.body.sectionsSpare)
          : req.body.sectionsSpare;
      } catch (e) {
        log(`[Settings Controller] Parse sectionsSpare error: ${e.message}`);
      }
    }

    await settings.save();
    log(`[Settings Controller] Settings updated successfully by: ${req.admin.email}`);

    return res.status(200).json({ message: "Settings updated successfully", settings });
  } catch (error) {
    log(`[Settings Controller] Update settings error: ${error.message}`);
    return res.status(500).json({ message: "Failed to update settings" });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
