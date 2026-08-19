const { withInfoPlist } = require('expo/config-plugins');
module.exports = function withFormShiftRoomPlan(config) {
  return withInfoPlist(config, (next) => {
    next.modResults.NSCameraUsageDescription ||= 'FormShift uses the camera and supported depth sensors to measure and model spaces.';
    return next;
  });
};
