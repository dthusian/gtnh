local HOST_IP = "127.0.0.1"
local HOST_PORT = "5353"

local internet = component.list("internet")()
local socket = internet.connect(HOST_IP, HOST_PORT)

if not socket.finishConnect() then
  computer.beep(440, 1)
  computer.shutdown()
end

