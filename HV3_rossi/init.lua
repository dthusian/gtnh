-- ROSSI v0.2
local appFn = nil
rossi = {}
do
  -- Early logging implementation, replaced later
  local printbuf = {}
  rossi.print = function(str)
    table.insert(rossi.printbuf, str)
  end

  rossi.halt = function()
    while true do computer.pullSignal() end
  end

  rossi.sleep = function(s)
    local timeout = computer.uptime() + s
    while computer.uptime() < timeout do
      computer.pullSignal(timeout - computer.uptime())
    end
  end

  -- Search for GPU and screen, if used
  local gpu = component.list("gpu", true)()
  local screen = component.list("screen", true)()
  local console_print
  if gpu ~= nil and screen ~= nil then
    rossi.hasConsole = true
    -- the default lua bios actually does this binding already, but do it again just in case
    local gpuProx = component.proxy(gpu)
    rossi.gpu = gpuProx
    rossi.screen = component.proxy(screen)
    gpuProx.bind(screen)
    rossi.console_print = function(str)
      local w, h = gpuProx.getResolution()
      for i=1,string.len(str),w do
        gpuProx.copy(1, 2, w, h - 1, 0, -1)
        gpuProx.fill(1, h, w, 1, " ")
        gpuProx.set(1, h, string.sub(str, i, i + w))
      end
    end
    rossi.print("rossi: gpu found")
  else
    rossi.hasConsole = false
    rossi.console_print = function(str) end
  end

  -- Mount bootdisk
  local bootAddr = computer.getBootAddress()
  rossi.print("rossi: bootdisk at " .. bootAddr)
  rossi.bootdisk = component.proxy(bootAddr)
  if rossi.bootdisk.type ~= "filesystem" then
    -- errors must be printed to console as real logger isn't up yet
    rossi.console_print("rossi: not a filesystem")
    rossi.halt()
  end
  if rossi.bootdisk.isReadonly() then
    rossi.print("rossi: warn: filesystem is read-only, logging to disk is disabled")
  end

  rossi.readfile = function(path)
    local fp = rossi.bootdisk.open(path, "r")
    local buffer = ""
    repeat
      local data = rossi.bootdisk.read(fp, 128000)
      buffer = buffer .. (data or "")
    until not data
    rossi.bootdisk.close(fp)
    return buffer
  end

  rossi.loadfile = function(path)
    return load(rossi.readfile(path), "=" .. path, "t", _G)
  end

  -- Switch to real logger
  local logFp = nil
  if not rossi.bootdisk.isReadOnly() then
    local time = os.time()
    local worldTicks = (time * 1000 / 60 / 60) - 6000
    local day = worldTicks / 24000
    local tick = worldTicks % 24000
    rossi.bootdisk.makeDirectory("log/")
    logFp = rossi.bootdisk.open("log/rossi-" .. day .. "-" .. tick .. ".log", "w")
  end
  rossi.print = function(str)
    console_print(str)
    if logFp then
      rossi.bootdisk.write(logFp, str .. "\n")
    end
  end
  for _, str in ipairs(printbuf) do
    rossi.print(str)
  end

  -- Load app.lua
  appFn, err = rossi.loadfile("app.lua")
  if appFn == nil then
    rossi.print("rossi: error loading:")
    rossi.print(err)
    rossi.halt()
  end
end

local _, err = xpcall(appFn, debug.traceback)
if err then
  pfn = rossi.print
  while true do
    pfn("rossi: error")
    rossi.sleep(0.5)
    computer.beep(349, 2)
    for line in string.gmatch(err, "([^\n]+)") do
      pfn(line)
      rossi.sleep(0.5)
    end
    pfn = rossi.console_print
  end
end
rossi.print("rossi: exited")

rossi.halt()