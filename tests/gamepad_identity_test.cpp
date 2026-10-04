#include "gamepad_identity.hpp"
#include <cassert>
#include <iostream>

using namespace gamepad_identity;

int main() {
  assert(controllerType("\"DualSense Wireless Controller\" (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)") == LI_CTYPE_PS);
  assert(controllerType("Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)") == LI_CTYPE_XBOX);
  assert(controllerType("DualShock 4") == LI_CTYPE_PS);
  assert(controllerType("Wireless Controller (Vendor:054C Product:09CC)") == LI_CTYPE_PS);
  assert(controllerType("054c-0ce6-Wireless Controller") == LI_CTYPE_PS);
  assert(controllerType("Sony Interactive Entertainment Wireless Controller") == LI_CTYPE_PS);
  assert(controllerType("045e-0b13-XInput Controller") == LI_CTYPE_XBOX);
  assert(controllerType("Nintendo Switch Pro Controller") == LI_CTYPE_NINTENDO);
  assert(controllerType("Generic USB Gamepad") == LI_CTYPE_UNKNOWN);
  assert(controllerType("Wireless Controller") == LI_CTYPE_UNKNOWN);
  assert(supportedButtons(0) == 0);
  assert(supportedButtons(1) == A_FLAG);
  assert(supportedButtons(7) == supportedButtons(6));
  assert(!(supportedButtons(16) & SPECIAL_FLAG));
  assert(supportedButtons(17) & SPECIAL_FLAG);
  assert(supportedButtons(100) == supportedButtons(17));

  Tracker tracker;
  std::array<Sample, kMaxControllers> samples{};
  samples[0] = {true, 0, "placeholder"};
  assert(tracker.update(samples).mask == 0);
  samples[2] = {true, 1, "DualSense"};
  auto change = tracker.update(samples);
  assert(change.mask == 4 && change.arrived == std::vector<unsigned>{2});
  // Failed announcement must be retried; successful announcement is sent once.
  assert(tracker.update(samples).arrived == std::vector<unsigned>{2});
  tracker.announced(2);
  assert(tracker.update(samples).arrived.empty());
  samples[2].timestamp = 0;
  assert(tracker.update(samples).mask == 4);
  samples[3] = {true, 2, "Xbox Wireless Controller"};
  change = tracker.update(samples);
  assert(change.mask == 12 && change.arrived == std::vector<unsigned>{3});
  tracker.announced(3);
  samples[2] = {};
  change = tracker.update(samples);
  assert(change.mask == 8 && change.removed == std::vector<unsigned>{2});
  // Replacement in the same browser slot is an explicit remove/arrival pair.
  samples[3] = {true, 3, "DualSense"};
  change = tracker.update(samples);
  assert(change.removed == std::vector<unsigned>{3});
  assert(change.arrived == std::vector<unsigned>{3});
  tracker.announced(3);
  tracker.reset();
  assert(tracker.update(samples).arrived == std::vector<unsigned>{3});
  tracker.announced(3);
  samples[3] = {true, 0, "Xbox"};
  change = tracker.update(samples);
  assert(change.mask == 0 && change.removed == std::vector<unsigned>{3});
  assert(change.arrived.empty());
  samples = {};
  samples[15] = {true, 4, "Xbox"};
  change = tracker.update(samples);
  assert(change.mask == 0x8000 && change.arrived == std::vector<unsigned>{15});
  std::cout << "Controller identity, sparse slots, simultaneous pads, retries, replacement and reconnect: pass\n";
}
