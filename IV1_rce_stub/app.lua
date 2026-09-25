HOST = "127.0.0.1"
PORT = 18320

-- temporary for testing
local computer = require("computer")
local rossi = {}
rossi.print = print
rossi.halt = os.exit
rossi.sleep = function(s)
  local timeout = computer.uptime() + s
  while computer.uptime() < timeout do
    computer.pullSignal(timeout - computer.uptime())
  end
end

rossi.print("rcestub v0.0.1")
local component = require("component")
local inetAddr, _ = component.list("internet", true)()
if inetAddr == nil then 
  rossi.print("no internet card found")
  rossi.halt()
end
rossi.print("rcestub: found internet card: " .. inetAddr)
local inet = component.proxy(inetAddr)
rossi.print("rcestub: connecting to " .. HOST .. ":" .. PORT)

--[[
Server (external) always creates requests, client (OC) responds

General message format:
- length: u16 - total length not including this field
- opcode: u16 - identifies request number
- seq: u16 - constant within 1 transaction
- data: ...

Requests
- Exec (0x1)
  - lua: string
  - request execution of lua string
- ExecStart (0x2)
  - (no data)
  - indicates request was recieved
- ExecErr (0x3)
  - err: string
- ExecOk (0x4)
  - ret: string

Types
- u16: little endian 16-bit
- string: prefixed with u16 length
]]

local function recvPacket(socket)
  local buf = ""
  while string.len(buf) < 2 do
    local chunk = socket.read(2 - string.len(buf))
    if chunk == "" then
      computer.pullSignal()
    end
    if chunk == nil then
      error("connection closed")
    end
    buf = buf .. chunk
  end
  local n = string.byte(buf, 1) | (string.byte(buf, 2) << 8)
  buf = ""
  while string.len(buf) < n do
    local chunk = socket.read(n - string.len(buf))
    if chunk == "" then
      computer.pullSignal()
    end
    if chunk == nil then
      error("connection closed")
    end
    buf = buf .. chunk
  end
  return {
    buf = buf,
    offset = 1
  }
end

local function readExact(packet, n)
  local chunk = string.sub(packet.buf, packet.offset, packet.offset + n)
  if string.len(chunk) < n then
    error("unexpected end of packet")
  end
  packet.offset = packet.offset + n
  return chunk
end

local function readU16(packet)
  local buf = readExact(packet, 2)
  return string.byte(buf, 1) | (string.byte(buf, 2) << 8)
end

local function readString(packet)
  local len = readU16(packet)
  return readExact(packet, len)
end

local function newPacket()
  return { buf = "", offset = 1 }
end

local function writeU16(packet, num)
  packet.buf = packet.buf .. string.char(num & 0xFF, (num >> 8) & 0xFF)
end

local function writeString(packet, str)
  str = tostring(str)
  writeU16(packet, string.len(str))
  packet.buf = packet.buf .. str
end

local function sendPacket(socket, packet)
  local len = string.len(packet.buf)
  local lenBytes = string.char(len & 0xFF, (len >> 8) & 0xFF)
  socket.write(lenBytes)
  socket.write(packet.buf)
end

while true do
  local socket = inet.connect(HOST, PORT)
  socket.finishConnect()

  local _, ret = pcall(function()
    while true do
      local req = recvPacket(socket)
      local opcode = readU16(req)
      local seq = readU16(req)

      if opcode == 1 then
        local resp1 = newPacket()
        writeU16(resp1, 2)
        writeU16(resp1, seq)
        sendPacket(socket, resp1)

        local snippet = readString(req)
        local ok, ret = xpcall(function()
          local fp, err = load(snippet)
          if err then error(err) end
          return fp()
        end, debug.traceback)

        local resp2 = newPacket()
        if ok then
          writeU16(resp2, 4)
        else
          writeU16(resp2, 3)
        end
        writeU16(resp2, seq)
        writeString(resp2, ret)
        sendPacket(socket, resp2)
      else
        error("malformed packet")
      end
    end
  end)

  rossi.print("err: " .. ret)
  rossi.sleep(10)
end
