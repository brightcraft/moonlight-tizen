# Controller identity regression tests

Run without a TV or Sunshine host:

```sh
c++ -std=c++17 -Wall -Wextra -Werror -Iwasm -Imoonlight-common-c/src tests/gamepad_identity_test.cpp -o /tmp/gamepad-tests
/tmp/gamepad-tests
node tests/gamepad_mask_test.js
```

The tests cover browser-reported controller families, sparse controller indices,
Tizen placeholder devices, simultaneous controllers, failed announcement retries,
same-slot replacements and stream reconnects. Unknown controllers retain the
host's default profile. No controller family is forced globally.

The build workflow also compiles the full backend using Samsung's Emscripten SDK
and produces an unsigned widget. Device signing and physical Tizen testing are
separate steps. Host support determines whether a PlayStation announcement becomes
a DS4 or DS5 virtual device; changing the host driver is outside this patch.
