import ExpoModulesCore
import RoomPlan

public final class FormShiftRoomPlanModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FormShiftRoomPlan")

    AsyncFunction("isSupported") { () -> Bool in
      if #available(iOS 16.0, *) {
        return RoomCaptureSession.isSupported
      }
      return false
    }

    AsyncFunction("capabilitySummary") { () -> [String: Any] in
      let supported: Bool
      if #available(iOS 16.0, *) {
        supported = RoomCaptureSession.isSupported
      } else {
        supported = false
      }
      return [
        "supported": supported,
        "framework": "RoomPlan",
        "note": supported
          ? "Enhanced LiDAR-assisted room capture is available. Measurements still require review before build-critical use."
          : "Use standard photo capture and manual/verified measurements on this device."
      ]
    }
  }
}
