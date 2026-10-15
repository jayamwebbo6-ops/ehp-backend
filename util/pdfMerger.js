const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { log } = require('./logger');

/**
 * Resolves binary file buffer from an attachment object or path string.
 */
function resolveAttachmentBuffer(att) {
  if (!att) return null;

  // Direct Buffer
  if (Buffer.isBuffer(att)) {
    return att;
  }
  if (att.content && Buffer.isBuffer(att.content)) {
    return att.content;
  }

  // Base64 string
  if (att.content || att.base64) {
    let b64 = att.content || att.base64;
    if (typeof b64 === 'string') {
      if (b64.includes('base64,')) {
        b64 = b64.split('base64,')[1];
      }
      return Buffer.from(b64, 'base64');
    }
  }

  // File path candidates on local filesystem
  const rawPath = att.path || att.url || (typeof att === 'string' ? att : '');
  const candidateNames = [];
  if (att.filename) candidateNames.push(path.basename(att.filename));
  if (rawPath) candidateNames.push(path.basename(rawPath));

  const searchDirs = [
    path.join(__dirname, '../uploads/attachments'),
    path.join(__dirname, '../uploads/company'),
    path.join(__dirname, '../uploads/quotations'),
    path.join(__dirname, '../uploads')
  ];

  for (const name of candidateNames) {
    for (const dir of searchDirs) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        try {
          return fs.readFileSync(fullPath);
        } catch (e) {
          log(`[PDF Merger] Could not read file ${fullPath}: ${e.message}`);
        }
      }
    }
  }

  // Try direct path or relative path
  if (rawPath) {
    const directCandidates = [
      rawPath,
      path.join(__dirname, '..', rawPath),
      path.join(__dirname, '../uploads', rawPath.replace(/^\/?(api\/)?uploads\//, ''))
    ];
    for (const p of directCandidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        try {
          return fs.readFileSync(p);
        } catch (e) {
          log(`[PDF Merger] Could not read file ${p}: ${e.message}`);
        }
      }
    }
  }

  return null;
}

/**
 * Merges attached PDF files into the main quotation PDF buffer as subsequent pages.
 * @param {Buffer|Uint8Array} mainPdfBuffer - Generated quotation PDF bytes
 * @param {Array} attachments - List of attachments from Settings / Quotation
 * @returns {Promise<{ mergedPdfBuffer: Buffer, unmergedAttachments: Array }>}
 */
async function mergeAttachmentsToPdf(mainPdfBuffer, attachments = []) {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return {
      mergedPdfBuffer: Buffer.isBuffer(mainPdfBuffer) ? mainPdfBuffer : Buffer.from(mainPdfBuffer),
      unmergedAttachments: []
    };
  }

  try {
    const mergedDoc = await PDFDocument.load(mainPdfBuffer);
    const unmergedAttachments = [];
    let mergedCount = 0;

    for (const att of attachments) {
      if (!att) continue;
      const displayName = att.originalName || att.filename || att.name || (typeof att === 'string' ? att : 'file');
      const ext = path.extname(displayName).toLowerCase();

      const buf = resolveAttachmentBuffer(att);
      if (!buf) {
        log(`[PDF Merger] Could not resolve buffer for attachment: ${displayName}`);
        unmergedAttachments.push(att);
        continue;
      }

      // Check if it's a PDF by extension, filename, mimetype, or buffer magic bytes (%PDF-)
      const isPdf = ext === '.pdf' ||
                    (att.filename && att.filename.toLowerCase().endsWith('.pdf')) ||
                    (att.originalName && att.originalName.toLowerCase().endsWith('.pdf')) ||
                    (att.mimetype && att.mimetype.includes('pdf')) ||
                    (buf.length > 5 && buf.slice(0, 5).toString() === '%PDF-');

      // 1. PDF Attachment -> Append all pages
      if (isPdf) {
        try {
          const subDoc = await PDFDocument.load(buf);
          const pageIndices = subDoc.getPageIndices();
          const copiedPages = await mergedDoc.copyPages(subDoc, pageIndices);
          copiedPages.forEach(page => mergedDoc.addPage(page));
          mergedCount++;
          log(`[PDF Merger] Merged ${copiedPages.length} page(s) from "${displayName}" into quotation PDF`);
        } catch (subErr) {
          log(`[PDF Merger] Failed to merge PDF "${displayName}": ${subErr.message}`);
          unmergedAttachments.push(att);
        }
      }
      // 2. Image Attachment -> Append as an A4 page
      else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        try {
          const a4Width = 595.28;
          const a4Height = 841.89;
          const imgPage = mergedDoc.addPage([a4Width, a4Height]);

          let embeddedImg;
          if (ext === '.png') {
            embeddedImg = await mergedDoc.embedPng(buf);
          } else {
            embeddedImg = await mergedDoc.embedJpg(buf);
          }

          const margin = 20;
          const maxWidth = a4Width - (margin * 2);
          const maxHeight = a4Height - (margin * 2);
          const imgDims = embeddedImg.scaleToFit(maxWidth, maxHeight);

          imgPage.drawImage(embeddedImg, {
            x: (a4Width - imgDims.width) / 2,
            y: (a4Height - imgDims.height) / 2,
            width: imgDims.width,
            height: imgDims.height
          });

          mergedCount++;
          log(`[PDF Merger] Embedded image "${displayName}" as next page`);
        } catch (imgErr) {
          log(`[PDF Merger] Failed to embed image "${displayName}": ${imgErr.message}`);
          unmergedAttachments.push(att);
        }
      }
      // 3. Other files (e.g. .xlsx, .docx) -> Keep as separate attachment
      else {
        unmergedAttachments.push(att);
      }
    }

    if (mergedCount > 0) {
      const mergedBytes = await mergedDoc.save();
      log(`[PDF Merger] Successfully merged ${mergedCount} attachment(s). Total pages in final PDF: ${mergedDoc.getPageCount()}`);
      return {
        mergedPdfBuffer: Buffer.from(mergedBytes),
        unmergedAttachments
      };
    }

    return {
      mergedPdfBuffer: Buffer.isBuffer(mainPdfBuffer) ? mainPdfBuffer : Buffer.from(mainPdfBuffer),
      unmergedAttachments
    };
  } catch (err) {
    log(`[PDF Merger] Error during PDF merging: ${err.message}. Returning original quotation PDF.`);
    return {
      mergedPdfBuffer: Buffer.isBuffer(mainPdfBuffer) ? mainPdfBuffer : Buffer.from(mainPdfBuffer),
      unmergedAttachments: attachments
    };
  }
}

module.exports = {
  mergeAttachmentsToPdf,
  resolveAttachmentBuffer
};
