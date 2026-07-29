const mongoose = require('mongoose');

const cmsPageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'privacy-policy',
        'terms-conditions',
        'refund-policy',
        'about-us',
        'contact-us',
      ],
      description: 'URL slug or identifier for the CMS page',
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      description: 'HTML or Markdown content for the page',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      description: 'Admin who last updated the page',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CmsPage', cmsPageSchema);
