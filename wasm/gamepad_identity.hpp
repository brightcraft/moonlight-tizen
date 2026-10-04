#pragma once

#include <algorithm>
#include <array>
#include <cctype>
#include <cstdint>
#include <string>
#include <vector>

#include <Limelight.h>

namespace gamepad_identity {
constexpr unsigned kMaxControllers = 16;

inline uint8_t controllerType(std::string id) {
  std::transform(id.begin(), id.end(), id.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  const auto contains = [&id](const char* value) {
    return id.find(value) != std::string::npos;
  };
  if (contains("vendor: 054c") || contains("vendor:054c") || id.find("054c-") == 0 ||
      contains("dualsense") || contains("dualshock") || contains("playstation") ||
      contains("sony interactive entertainment") || contains("sony computer entertainment")) {
    return LI_CTYPE_PS;
  }
  if (contains("vendor: 045e") || contains("vendor:045e") || id.find("045e-") == 0 || contains("xbox")) {
    return LI_CTYPE_XBOX;
  }
  if (contains("vendor: 057e") || contains("vendor:057e") || id.find("057e-") == 0 ||
      contains("nintendo") || contains("joy-con")) {
    return LI_CTYPE_NINTENDO;
  }
  return LI_CTYPE_UNKNOWN;
}

inline uint32_t supportedButtons(int count) {
  static constexpr uint32_t buttons[] = {
    A_FLAG, B_FLAG, X_FLAG, Y_FLAG, LB_FLAG, RB_FLAG, 0, 0,
    BACK_FLAG, PLAY_FLAG, LS_CLK_FLAG, RS_CLK_FLAG,
    UP_FLAG, DOWN_FLAG, LEFT_FLAG, RIGHT_FLAG, SPECIAL_FLAG
  };
  uint32_t flags = 0;
  for (int i = 0; i < count && i < 17; ++i) {
    flags |= buttons[i];
  }
  return flags;
}

struct Sample {
  bool connected = false;
  double timestamp = 0;
  std::string id;
};

struct Changes {
  uint16_t mask = 0;
  std::vector<unsigned> removed;
  std::vector<unsigned> arrived;
};

// Browser arrays contain null slots and Tizen placeholder devices. Preserve
// physical indices, and announce each real device before its first input packet.
class Tracker {
 public:
  Changes update(const std::array<Sample, kMaxControllers>& samples) {
    Changes changes;
    for (unsigned i = 0; i < kMaxControllers; ++i) {
      const auto& sample = samples[i];
      auto& state = states_[i];
      const bool sameDevice = state.id == sample.id;
      const bool real = sample.connected &&
                        (sample.timestamp != 0 || (sameDevice && state.seenTimestamp));
      if (state.announced && (!real || !sameDevice)) {
        changes.removed.push_back(i);
        state.announced = false;
      }
      if (!real) {
        state = {};
        continue;
      }
      state.id = sample.id;
      state.seenTimestamp = true;
      changes.mask |= static_cast<uint16_t>(1u << i);
      if (!state.announced) {
        changes.arrived.push_back(i);
      }
    }
    return changes;
  }

  void announced(unsigned i) { states_.at(i).announced = true; }
  bool isAnnounced(unsigned i) const { return states_.at(i).announced; }
  void reset() { states_ = {}; }

 private:
  struct State {
    bool seenTimestamp = false;
    bool announced = false;
    std::string id;
  };
  std::array<State, kMaxControllers> states_{};
};
}  // namespace gamepad_identity
