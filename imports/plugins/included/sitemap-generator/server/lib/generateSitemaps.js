import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import Hooks from "@reactioncommerce/hooks";
import Reaction from "/imports/plugins/core/core/server/Reaction";
import { Products, Shops, Tags } from "/lib/collections"
import { Sitemaps } from "../../lib/collections/Sitemaps";

const DEFAULT_URLS_PER_SITEMAP = 50000;

/**
 * @name generateSitemaps
 * @summary Generates & stores sitemap documents for one or more shops, without Meteor method context
 * @param {Array} [shopIds] - _id of shops to generate sitemaps for. Defaults to primary shop _id
 * @param {Number} [urlsPerSitemap] - Max # of URLs per sitemap
 */
export default function generateSitemaps (shopIds = [], urlsPerSitemap = DEFAULT_URLS_PER_SITEMAP) {
  // Add primary shop _id if none provided
  if (shopIds.length === 0) {
    shopIds.push(Reaction.getPrimaryShopId());
  }

  // Generate sitemaps for each shop
  shopIds.forEach((shopId) => {
    const shop = Shops.findOne({ _id: shopId }, { fields: { _id: 1 } });
    if (!shop) {
      throw new Meteor.Error("not-found", `Shop ${shopId} not found`);
    }

    // Delete existing sitemap documents for shop
    Sitemaps.remove({ shopId });

    // Allow custom shops to add arbitrary URLs to the sitemap
    const basicUrls = Hooks.Events.run("onGenerateSitemap", ["BASE_URL"]);

    // Get URLs for visible tags and products
    const tagUrls = Tags.find({
      shopId,
      isVisible: true,
      isDeleted: false
    }, { fields: { slug: 1 } }).map((tag) => `BASE_URL/tag/${tag.slug}`);
    const productUrls = Products.find({
      shopId,
      type: "simple",
      isVisible: true,
      isDeleted: false
    }, { fields: { handle: 1 } }).map((product) => `BASE_URL/product/${product.handle}`);

    // Build and save XML for sitemaps
    const sitemapIndexUrls = [];
    // Basic pages
    for (let i = 1; i <= Math.ceil(basicUrls.length / urlsPerSitemap); i++) {
      Sitemaps.insert({
        shopId,
        xml: generateSitemapXML(basicUrls, i, urlsPerSitemap),
        handle: `sitemap-pages-${i}.xml`,
        createdAt: new Date()
      });
      sitemapIndexUrls.push(`BASE_URL/sitemap-pages-${i}.xml`);
    }

    // Tags
    for (let i = 1; i <= Math.ceil(tagUrls.length / urlsPerSitemap); i++) {
      Sitemaps.insert({
        shopId,
        xml: generateSitemapXML(tagUrls, i, urlsPerSitemap),
        handle: `sitemap-tags-${i}.xml`,
        createdAt: new Date()
      });
      sitemapIndexUrls.push(`BASE_URL/sitemap-tags-${i}.xml`);
    }

    // Product detail pages
    for (let i = 1; i <= Math.ceil(productUrls.length / urlsPerSitemap); i++) {
      Sitemaps.insert({
        shopId,
        xml: generateSitemapXML(productUrls, i, urlsPerSitemap),
        handle: `sitemap-products-${i}.xml`,
        createdAt: new Date()
      });
      sitemapIndexUrls.push(`BASE_URL/sitemap-products-${i}.xml`);
    }

    // Sitemap index
    Sitemaps.insert({
      shopId,
      xml: generateIndexXML(sitemapIndexUrls),
      handle: `sitemap.xml`,
      createdAt: new Date()
    });
  });
}

/**
 * @name generateIndexXML
 * @summary Generates & returns XML for a sitemap index (doc that points to sitemaps)
 * @private
 * @param {Array} urls - Array of URL strings
 * @return {String} - Generated XML
 */
function generateIndexXML (urls) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;

  urls.forEach((url) => {
    xml += `
      <sitemap>
        <loc>URL</loc>
        <lastmod>LAST_MOD</lastmod>
      </sitemap>`.replace("URL", url);
  });

  xml += "\n</sitemapindex>";

  return xml;
}

/**
 * @name generateSitemapXML
 * @summary Generates & returns XML for a sitemap document
 * @private
 * @param {Array} urls - Array of URL strings
 * @param {Number} currentPage - Starting at 1, current page to generate sitemap XML for
 * @param {Number} urlsPerSitemap - Max # of URLs for this sitemap
 */
function generateSitemapXML (urls, currentPage, urlsPerSitemap) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;

  const startIndex = (currentPage - 1) * urlsPerSitemap;
  const endIndex = startIndex + urlsPerSitemap;
  const sitemapPageUrls = urls.slice(startIndex, endIndex)

  sitemapPageUrls.forEach((url) => {
    xml += `
      <url>
        <loc>URL</loc>
        <lastmod>LAST_MOD</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
      </url>`.replace("URL", url);
  });

  xml += "\n</urlset>";

  return xml;
}
