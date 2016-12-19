import { Meteor } from "meteor/meteor";
import { Reaction, Logger } from "/server/api";
import { Sms } from "/lib/collections";

/**
 * Sms publication
 * @return {Object} return sms cursor
 */
Meteor.publish("Sms", function () {
  const shopId = Reaction.getShopId();
  if (!shopId) {
    Logger.info("Ignoring null request on Sms Subscription");
    return this.ready();
  }

  const result = Sms.find({ shopId });

  return result;
});
