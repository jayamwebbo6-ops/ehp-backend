const mongoose = require('mongoose');

const { Schema } = mongoose;

/* =========================================================
   TECHNICAL DATA
========================================================= */

const TechnicalDataSchema = new Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true
    },
    value: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);


/* =========================================================
   ACCESSORIES / OPTIONALS
   Keep Mixed only if these objects can have different shapes.
========================================================= */

const ProductItemSchema = new Schema(
  {
    productId: {
      type: String,
      default: '',
      trim: true
    },

    productName: {
      type: String,
      required: true,
      trim: true
    },

    productDesc: {
      type: String,
      default: '',
      trim: true
    },

    qty: {
      type: Number,
      required: true,
      min: 1
    },

    unit: {
      type: String,
      default: 'Nos',
      trim: true
    },

    basePrice: {
      type: Number,
      default: 0,
      min: 0
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    /* GST */
    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    desc: {
      type: String,
      default: '',
      trim: true
    },

    image: {
      type: String,
      default: '',
      trim: true
    },

    websiteUrl: {
      type: String,
      default: '',
      trim: true
    },

    youtubeUrl: {
      type: String,
      default: '',
      trim: true
    },

    technicalData: {
      type: [TechnicalDataSchema],
      default: []
    },

    selectedAccessories: {
      type: [Schema.Types.Mixed],
      default: []
    },

    selectedOptionals: {
      type: [Schema.Types.Mixed],
      default: []
    }
  },
  { _id: true }
);


/* =========================================================
   BANK DETAILS
========================================================= */

const BankDetailsSchema = new Schema(
  {
    bankContentIndia: {
      type: String,
      default: ''
    },
    bankContentEurope: {
      type: String,
      default: ''
    },
    qrCodeIndia: {
      type: String,
      default: ''
    },
    qrCodeEurope: {
      type: String,
      default: ''
    },
    showBankDetails: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);


/* =========================================================
   TRANSPORT / INSTALLATION
========================================================= */

const AdditionalChargeSchema = new Schema(
  {
    show: {
      type: Boolean,
      default: true
    },

    name: {
      type: String,
      default: '',
      trim: true
    },

    price: {
      type: Number,
      default: 0,
      min: 0
    },

    currency: {
      type: String,
      enum: ['INR', 'EUR'],
      default: 'INR'
    },

    gstOption: {
      type: String,
      default: 'extra',
      trim: true
    },

    gstPercent: {
      type: Number,
      default: 18,
      min: 0
    }
  },
  { _id: false }
);


/* =========================================================
   REQUIREMENTS
========================================================= */

const RequirementSchema = new Schema(
  {
    requirementId: {
      type: String,
      default: '',
      trim: true
    },

    title: {
      type: String,
      default: '',
      trim: true
    },

    value: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);


/* =========================================================
   SECTIONS
========================================================= */

const SectionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    content: {
      type: String,
      default: ''
    },

    isActive: {
      type: Boolean,
      default: true
    },

    order: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);


/* =========================================================
   ATTACHMENTS
========================================================= */

const AttachmentSchema = new Schema(
  {
    filename: {
      type: String,
      default: '',
      trim: true
    },
    originalName: {
      type: String,
      default: '',
      trim: true
    },
    path: {
      type: String,
      default: '',
      trim: true
    },
    url: {
      type: String,
      default: '',
      trim: true
    },
    mimetype: {
      type: String,
      default: '',
      trim: true
    },
    size: {
      type: Number,
      default: 0
    }
  },
  { _id: true }
);


/* =========================================================
   QUOTATION
========================================================= */

const QuotationSchema = new Schema(
  {
    quoteNo: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    productType: {
      type: String,
      enum: ['Scale', 'Spare Parts'],
      default: 'Scale',
      trim: true
    },

    version: {
      type: Number,
      default: 1,
      min: 1
    },

    date: {
      type: String,
      required: true,
      trim: true
    },

    validity: {
      type: String,
      required: true,
      trim: true
    },

    subject: {
      type: String,
      default: '',
      trim: true
    },

    /* ================= CUSTOMER ================= */

    customerName: {
      type: String,
      required: true,
      trim: true
    },

    companyName: {
      type: String,
      required: true,
      trim: true
    },

    country: {
      type: String,
      required: true,
      trim: true
    },

    customerMobile: {
      type: String,
      required: true,
      trim: true
    },

    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    gstNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },

    /* ================= ITEMS ================= */

    items: {
      type: [ProductItemSchema],
      default: []
    },

    /* ================= GST ================= */

    gstOption: {
      type: String,
      enum: ['withGst', 'withoutGst', ''],
      default: 'withGst',
      trim: true
    },

    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    /* ================= AMOUNTS ================= */

    subTotal: {
      type: Number,
      required: true,
      min: 0
    },

    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0
    },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },

    amountInWords: {
      type: String,
      default: '',
      trim: true
    },

    /* ================= SETTINGS ================= */

    businessType: {
      type: String,
      enum: ['product', 'service'],
      default: 'product'
    },

    currency: {
      type: String,
      enum: ['INR', 'EUR'],
      default: 'INR'
    },

    shippingAddress: {
      type: String,
      default: '',
      trim: true
    },

    roundOff: {
      type: Boolean,
      default: false
    },

    showBankDetails: {
      type: Boolean,
      default: true
    },

    showProductImages: {
      type: Boolean,
      default: true
    },

    /* ================= BANK ================= */

    bankDetails: {
      type: BankDetailsSchema,
      default: () => ({})
    },

    /* ================= ADDITIONAL CHARGES ================= */

    transportStorage: {
      type: AdditionalChargeSchema,
      default: () => ({})
    },

    installation: {
      type: AdditionalChargeSchema,
      default: () => ({})
    },

    /* ================= REQUIREMENTS ================= */

    requirementsOption: {
      type: Boolean,
      default: true
    },

    requirements: {
      type: [RequirementSchema],
      default: []
    },

    /* ================= CUSTOM SECTIONS ================= */

    introContent: {
      type: String,
      default: '',
      trim: true
    },

    sections: {
      type: [SectionSchema],
      default: []
    },

    /* ================= ATTACHMENTS ================= */

    attachments: {
      type: [AttachmentSchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);


/* =========================================================
   INDEXES
========================================================= */

/*
 * Useful for customer quotation history.
 */
QuotationSchema.index({
  customerEmail: 1,
  createdAt: -1
});

/*
 * Useful for company-wise quotation listing.
 */
QuotationSchema.index({
  companyName: 1,
  createdAt: -1
});

/*
 * Useful for date-based quotation listing.
 */
QuotationSchema.index({
  date: -1
});


module.exports = mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);