import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { Sms, Accounts } from "/lib/collections";
import { Reaction, Logger } from "/server/api";

// We lazy load these in order to shave a few seconds off the time
// it takes Meteor to start/restart the app.
let Twilio;
async function lazyLoadTwilio() {
  if (Twilio) return;
  const mod = await import("twilio");
  Twilio = mod.default;
}

let Nexmo;
async function lazyLoadNexmo() {
  if (Nexmo) return;
  const mod = await import("nexmo");
  Nexmo = mod.default;
}

/**
 * @file Meteor methods for SMS. Run these methods using `Meteor.call()`.
 *
 *
 * @namespace Methods/SMS
*/
Meteor.methods({
  /**
   * @name sms/saveSettings
   * @method
   * @memberof Methods/SMS
   * @summary This save the sms provider settings
   * @param {Object} settings - settings
   * @return {object} returns result
   */
  "sms/saveSettings": (settings) => {
    check(settings, Object);
    settings.shopId = Reaction.getShopId();

    const smsDetails = Sms.find().count();
    if (smsDetails >= 1) {
      return Sms.update({ shopId: Reaction.getShopId() }, {
        $set: settings
      });
    }
    return Sms.insert(settings);
  },

  /**
   * @name sms/send
   * @method
   * @memberof Methods/SMS
   * @summary This send the sms to the user
   * @param {String} message - The message to send
   * @param {String} userId - The user to receive the message
   * @param {String} shopId - The currenct shopId
   * @return {object} returns result
   */
  "sms/send": (message, userId, shopId) => {
    check(message, String);
    check(userId, String);
    check(shopId, String);

    const user = Accounts.findOne({ _id: userId });
    const addressBook = user.profile.addressBook;
    let phone = false;
    // check for addressBook phone
    if (user && addressBook) {
      if (addressBook[0].phone) {
        phone = addressBook[0].phone;
      }
    }

    if (!phone) return;

    const smsSettings = Sms.findOne({ shopId });
    if (!smsSettings) return;

    const { apiKey, apiToken, smsPhone, smsProvider } = smsSettings;
    if (smsProvider === "twilio") {
      Logger.debug("choose twilio");
      Promise.await(lazyLoadTwilio());
      const client = new Twilio(apiKey, apiToken);
      client.messages.create({
        to: phone,
        from: smsPhone,
        body: message
      }, (err) => {
        if (err) {
          return Logger.error(err);
        }
      });
      return;
    }

    if (smsProvider === "nexmo") {
      Logger.debug("choose nexmo");
      Promise.await(lazyLoadNexmo());
      const client = new Nexmo({ apiKey, apiSecret: apiToken });
      client.message.sendSms(smsPhone, phone, message, {}, (err) => {
        if (err) {
          return Logger.error(err);
        }
      });
    }
  }
});
