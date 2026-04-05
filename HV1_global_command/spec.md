# Spec

Signal roles: Controller "C" and device "T"

Follows strict request-response pattern from the controller in order to ensure
that relays are not overloaded. Request packet consists of opcode, sequence number, request params,
then response packet has same opcode, sequence number, and response params.

Devices remember the highest sequence number it has issued a response to.
- Upon recieving a request with a lower seqeunce number, it should ignore the request.
- Upon recieving the same sequence number, it should send the same response as what it sent the original request, and perform no other action.
- Upon recieving a greater sequence number, process the request as usual and update its "highest sequence number".
This is to ensure idempotency of each packet, and to allow the controller to maintain almost no per-connection state.
The controller will use a single request counter for all devices, so an individual device may observe
gaps in the sequence number.

Protocol `0x0a`: status v1
- `0xa0001` Status `() -> (status: enum status, dirty: boolean)`
  - Request device status.
  - Dirty indicates that a display request should be sent to update the display.
- `0xa0002` Display `() -> (numerical: string, messages: string)`
  - Request device status display data.
  - Format of `numerical`: A set of values in tab-separated format, with columns `Label, Value, MaxValue, Color`
  - Format of `messages`: A set of values in tab-separated format, with columns `Message, Color`
  - Color is given as an 8-bit palette index.

`enum status` values:
- 1: OK (status ok, passively running)
- 2: RUN (status ok, actively running)
- 3: IDLE (status ok, not running)
- 4: MAINT (requires maintenance)
- 5: WARN (has warning, see detailed info)
- 6: ERR (has error, see detailed info)
- DIS (no response recieved in a while)

Protocol `0x0b`: fwupd v1
- `0xb0001` EnterDfuMode `() -> (status: number)`
  - Requests for the device to enter DFU mode.
  - Device returns `0` to indicate it has entered DFU or a non-zero to indicate it is busy.
  - When a device is in DFU mode, it only responds to other fwupd protocol commands from now on.
- `0xb0002` UpdateOpen `(filename: string[256], len: number) -> ()`
  - Opens a file, truncating it.
  - If a file is already open, close it first.
  - Further data/close operations are done on this file.
- `0xb0003` UpdateData `(data: string[4096], seq: number) -> ()`
  - Writes data into an open file.
- `0xb0004` UpdateEnd `() -> ()`
  - Ends DFU mode, closing open files, and requests a shutdown.
  - Controller might use wake-on-lan to wake the device after this succeeds.

## Applications

- Oil monitoring: display current reserves
- AE2 monitoring: display used storage space
- Circuit asm control: display active/control status