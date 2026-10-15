const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({

    companyDetails: {
        companyName: String,
        state: String,
        address: String,
        mobileNumber: String,
        emailAddress: String,
        companyLogo: String,
        authorizedSignatory: String,
        hasGst: Boolean,
        gstNumber: String,
        gstRate: String,
        authSignatoryImage: String,
        companySeal: String,
        pdfHeaderImage: String,
        pdfFooterImage: String,
        businessType: { type: String, default: 'product' },
        firstPageContent: String,
        showFirstPageContent: { type: Boolean, default: true },
        firstPageContentSpare: String,
        showFirstPageContentSpare: { type: Boolean, default: true }
    },

    defaultMailAndSubject: {
        subject: String,
        body: String,
        attachments: [{
            filename: String,
            originalName: String,
            path: String,
            url: String,
            mimetype: String,
            size: Number
        }]
    },

    bankDetails: {
        bankContentIndia: String,
        bankContentEurope: String,
        qrCodeIndia: String,
        qrCodeEurope: String,
        showBankDetails: { type: Boolean, default: true }
    },

    sections: [{
        title: String,
        content: String,
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 }
    }],

    sectionsSpare: [{
        title: String,
        content: String,
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 }
    }]


}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
