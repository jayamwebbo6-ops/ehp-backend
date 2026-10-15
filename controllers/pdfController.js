const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const Setting = require('../models/Setting');
const { mergeAttachmentsToPdf } = require('../util/pdfMerger');

const convertLocalImagesToBase64 = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');

  return htmlContent.replace(/src=["']([^"']*\/uploads\/[^"']+)["']/gi, (match, srcUrl) => {
    try {
      const matchIndex = srcUrl.indexOf('/uploads/');
      if (matchIndex === -1) return match;

      const relPath = srcUrl.substring(matchIndex + '/uploads/'.length).split('?')[0].split('#')[0];
      const localFilePath = path.join(uploadsDir, decodeURIComponent(relPath));

      if (fs.existsSync(localFilePath)) {
        const ext = path.extname(localFilePath).toLowerCase();
        let mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.svg') mimeType = 'image/svg+xml';
        else if (ext === '.gif') mimeType = 'image/gif';

        const fileData = fs.readFileSync(localFilePath);
        const base64 = fileData.toString('base64');
        return `src="data:${mimeType};base64,${base64}"`;
      }
    } catch (err) {
      console.warn('Failed to embed local image to base64:', err.message);
    }
    return match;
  });
};

const generatePDF = async (req, res) => {
  let browser;
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ message: 'HTML content is required' });
    }
    
    try {
      fs.writeFileSync(path.join(__dirname, '..', 'debug.html'), html);
    } catch (e) {
      console.error('Failed to write debug.html:', e);
    }

    const processedHtml = convertLocalImagesToBase64(html);

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide the React footer completely */
          .pdf-page-footer {
            display: none !important;
          }

          thead {
            display: table-header-group !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          thead tr {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          .prose-preview ul {
            list-style-type: disc !important;
            padding-left: 1.25rem !important;
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
            display: block !important;
          }
          .prose-preview ol {
            list-style-type: decimal !important;
            padding-left: 1.25rem !important;
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
            display: block !important;
          }
          .prose-preview li {
            margin-bottom: 0.35rem !important;
            display: list-item !important;
          }
          .prose-preview p {
            margin-top: 0 !important;
            margin-bottom: 0.375rem !important;
          }
          .prose-preview p:empty,
          .prose-preview p:has(> br:only-child) {
            margin-bottom: 0 !important;
            line-height: 0 !important;
          }
          @page {
            size: A4;
            margin: 10mm 5mm 12mm 5mm;
          }

          @page :first {
            margin-top: 5mm;
          }

          .prose-preview p:last-child {
            margin-bottom: 0 !important;
          }
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${processedHtml}
      </body>
      </html>
    `;

    let executablePath;

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === 'win32') {
      // Local Windows: do not specify executablePath, let Puppeteer automatically resolve its bundled Chrome
      executablePath = undefined;
    } else {
      // Linux Server
      const linuxBrowsers = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium'
      ];

      executablePath = linuxBrowsers.find(path => fs.existsSync(path));

      if (!executablePath) {
        throw new Error(
          `No Chrome/Chromium browser found.
Checked:
${linuxBrowsers.join('\n')}`
        );
      }
    }

    const launchOptions = {
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--disable-default-apps'
      ]
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    await page.emulateMediaType('print');
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 4000); // 4s timeout fallback
          });
        })
      );
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,

      // Empty header — zero height, no space added
      headerTemplate: `<div style="font-size:1px;line-height:0;height:0;margin:0;padding:0;"></div>`,

      footerTemplate: `
        <div style="
          width:100%;
          padding: 0 5mm;
          font-size: 9pt;
          font-family: Arial, sans-serif;
          text-align: center;
          color: #000000;
          box-sizing: border-box;
          line-height: 1.8;
        ">
          Page <span class="pageNumber" style="font-size:9pt;"></span>
          of
          <span class="totalPages" style="font-size:9pt;"></span>
        </div>
      `,

      margin: {
        top: '5mm',
        right: '5mm',
        bottom: '12mm',   
        left: '5mm',
      },
    });

    let finalPdfBuffer = pdfBuffer;
    let attachmentsToMerge = req.body.attachments;

    if (!attachmentsToMerge && req.body.includeAttachments !== false) {
      try {
        const settings = await Setting.findOne();
        if (settings && settings.defaultMailAndSubject && Array.isArray(settings.defaultMailAndSubject.attachments)) {
          attachmentsToMerge = settings.defaultMailAndSubject.attachments;
        }
      } catch (sErr) {
        console.warn('Could not read default attachments from settings:', sErr.message);
      }
    }

    if (attachmentsToMerge && Array.isArray(attachmentsToMerge) && attachmentsToMerge.length > 0) {
      try {
        const { mergedPdfBuffer } = await mergeAttachmentsToPdf(pdfBuffer, attachmentsToMerge);
        if (mergedPdfBuffer) {
          finalPdfBuffer = mergedPdfBuffer;
        }
      } catch (mErr) {
        console.error('Failed to merge attachments to PDF:', mErr.message);
      }
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': finalPdfBuffer.length
    });

    return res.send(finalPdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({
      message: 'Error generating PDF',
      error: error.message
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing puppeteer browser:', err);
      }
    }
  }
};

module.exports = { generatePDF };