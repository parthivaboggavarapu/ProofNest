const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const productService = require('./productService');
const documentService = require('./documentService');

const KNOWN_SELLERS = [
  'Amazon',
  'Flipkart',
  'Best Buy',
  'Apple Store',
  'Walmart',
  'Target',
  'Costco',
  'Reliance Digital',
  'Croma',
  'Vijay Sales',
  'B&H Photo',
  'Newegg',
  'IKEA',
  'Home Depot',
  'eBay'
];

const KNOWN_BRANDS = [
  'Apple',
  'Samsung',
  'Sony',
  'LG',
  'Dell',
  'HP',
  'Lenovo',
  'Asus',
  'Acer',
  'Bose',
  'Canon',
  'Nikon',
  'Microsoft',
  'Google',
  'OnePlus',
  'Xiaomi',
  'Dyson',
  'Philips',
  'Bosch',
  'Whirlpool',
  'JBL',
  'Logitech',
  'Sennheiser',
  'Fitbit',
  'Garmin'
];

class OcrService {
  async extractTextFromFile(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdfParse(buffer);
        return data.text || '';
      } catch (err) {
        console.warn('[PDF Parse Error]:', err.message);
        return '';
      }
    }

    if (mimeType.startsWith('image/')) {
      try {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(buffer);
        await worker.terminate();
        return ret.data.text || '';
      } catch (err) {
        console.warn('[Tesseract OCR Error]:', err.message);
        return '';
      }
    }

    return '';
  }

  parseInvoiceFields(rawText) {
    const text = rawText || '';
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // 1. Detect Seller
    let detectedSeller = '';
    for (const seller of KNOWN_SELLERS) {
      if (new RegExp(`\\b${seller}\\b`, 'i').test(text)) {
        detectedSeller = seller;
        break;
      }
    }

    // 2. Detect Brand
    let detectedBrand = '';
    for (const brand of KNOWN_BRANDS) {
      if (new RegExp(`\\b${brand}\\b`, 'i').test(text)) {
        detectedBrand = brand;
        break;
      }
    }

    // 3. Detect Price
    let detectedPrice = 0;
    const priceMatches = text.match(
      /(?:total\s*amount|grand\s*total|amount\s*paid|invoice\s*value|net\s*amount|total|price|amt)[\s:]*[$₹€£]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/i
    );
    if (priceMatches && priceMatches[1]) {
      detectedPrice = parseFloat(priceMatches[1].replace(/,/g, '')) || 0;
    } else {
      // Fallback: look for generic currency numbers
      const genericCurrency = text.match(/[$₹€£]\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/);
      if (genericCurrency && genericCurrency[1]) {
        detectedPrice = parseFloat(genericCurrency[1].replace(/,/g, '')) || 0;
      }
    }

    // 4. Detect Date
    let detectedPurchaseDate = null;
    const dateRegexes = [
      /(?:date|invoice date|order date)[\s:]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
      /(?:date|invoice date|order date)[\s:]*([0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2})/i,
      /(?:date|invoice date|order date)[\s:]*([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/i,
      /\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/,
      /\b([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})\b/
    ];

    for (const regex of dateRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          detectedPurchaseDate = parsed;
          break;
        }
      }
    }

    if (!detectedPurchaseDate) {
      detectedPurchaseDate = new Date(); // fallback to today
    }

    // 5. Detect Invoice Number
    let detectedInvoiceNumber = '';
    const invoiceMatch = text.match(
      /(?:invoice\s*(?:no|number|#)?|order\s*(?:id|number|#)?)[\s:]*([A-Z0-9_-]{4,25})/i
    );
    if (invoiceMatch && invoiceMatch[1]) {
      detectedInvoiceNumber = invoiceMatch[1].trim();
    }

    // 6. Detect Product Name candidate
    let detectedProductName = '';
    if (detectedBrand) {
      // Find the line containing the brand
      const brandLine = lines.find((l) => new RegExp(`\\b${detectedBrand}\\b`, 'i').test(l));
      if (brandLine && brandLine.length > 4 && brandLine.length < 80) {
        detectedProductName = brandLine;
      }
    }

    if (!detectedProductName) {
      // Look for candidate lines
      const candidate = lines.find(
        (l) =>
          l.length > 5 &&
          l.length < 70 &&
          !/invoice|receipt|tax|total|date|shipping|bill to|subtotal/i.test(l)
      );
      detectedProductName = candidate || (detectedBrand ? `${detectedBrand} Product` : 'Purchased Item');
    }

    // 7. Calculate Warranty End Date (default 1 year if mentioned or standard)
    const warrantyMatch = text.match(/(?:warranty|guarantee)[\s:]*([0-9]+)\s*(year|month)/i);
    let warrantyMonths = 12; // Standard 1 year default
    if (warrantyMatch) {
      const count = parseInt(warrantyMatch[1], 10);
      const unit = warrantyMatch[2].toLowerCase();
      warrantyMonths = unit.startsWith('year') ? count * 12 : count;
    }

    const warrantyStartDate = new Date(detectedPurchaseDate);
    const warrantyEndDate = new Date(detectedPurchaseDate);
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);

    // 8. Calculate Return Deadline (default 15 days from purchase date)
    const returnDeadline = new Date(detectedPurchaseDate);
    returnDeadline.setDate(returnDeadline.getDate() + 15);

    return {
      productName: detectedProductName,
      brand: detectedBrand,
      category: 'Electronics',
      purchaseDate: detectedPurchaseDate.toISOString().split('T')[0],
      purchasePrice: detectedPrice,
      seller: detectedSeller,
      invoiceNumber: detectedInvoiceNumber,
      warrantyStartDate: warrantyStartDate.toISOString().split('T')[0],
      warrantyEndDate: warrantyEndDate.toISOString().split('T')[0],
      returnDeadline: returnDeadline.toISOString().split('T')[0]
    };
  }

  async processAndExtract(buffer, mimeType) {
    const rawText = await this.extractTextFromFile(buffer, mimeType);
    const suggestedFields = this.parseInvoiceFields(rawText);

    return {
      rawText,
      suggestedFields
    };
  }

  async confirmAndSave(userId, { productData, fileData, extractedText }) {
    // 1. Create the product
    const product = await productService.createProduct(userId, productData);

    // 2. If an invoice file was uploaded, save it into GridFS linked to the product
    let document = null;
    if (fileData && fileData.buffer) {
      document = await documentService.uploadDocument({
        userId,
        productId: product._id,
        documentType: 'Invoice',
        file: fileData,
        extractedText: extractedText || ''
      });
    }

    return {
      product,
      document
    };
  }
}

module.exports = new OcrService();
