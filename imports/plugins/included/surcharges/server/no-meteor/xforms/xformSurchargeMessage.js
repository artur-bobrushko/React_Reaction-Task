import getSurchargeMessageInShopLanguage from "../util/getSurchargeMessageInShopLanguage";

/**
 * @name xformSurchargeMessage
 * @summary Loads full navigation items documents for items in a navigation tree
 * @param {String} language Language to filter items by
 * @param {Array} message Array to check language against
 * @return {String} Translated message to return to client
 */
export default async function xformSurchargeMessage(language, message) {
  const translatedMessage = getSurchargeMessageInShopLanguage(language, message);
  return translatedMessage;
}
