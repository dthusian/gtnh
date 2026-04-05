-- ROSSI v0.1
local appFn = nil
rossi = {}
do
  rossi.halt = function()
    while true do computer.pullSignal() end
  end

  -- Search for GPU and screen, if used
  local gpu = component.list("gpu", true)()
  local screen = component.list("screen", true)()
  if gpu ~= nil and screen ~= nil then
    rossi.hasConsole = true
    -- the default lua bios actually does this binding already, but do it again just in case
    local gpuProx = component.proxy(gpu)
    rossi.gpu = gpuProx
    rossi.screen = component.proxy(screen)
    gpuProx.bind(screen)
    rossi.print = function(str)
      local w, h = gpuProx.getResolution()
      for i=1,str.len(),w do
        gpuProx.copy(1, 2, w, h - 1, 0, -1)
        gpuProx.fill(1, h, w, 1, " ")
        gpuProx.set(1, h, string.sub(str, i, i + w))
      end
    end
    rossi.print("rossi: gpu found")
  else
    rossi.hasConsole = false
    rossi.print = function(str) end
  end

  -- Load app.lua
  bootAddr = computer.getBootAddress()
  rossi.print("rossi: boot from " .. bootAddr)
  local bootdisk = component.proxy(bootAddr)

  rossi.readfile = function(path)
    local fp = bootdisk.open(path, "r")
    local buffer = ""
    repeat
      local data = bootdisk.read(fp, 128000)
      buffer = buffer .. (data or "")
    until not data
    bootdisk.close(fp)
    return buffer
  end

  rossi.loadfile = function(path)
    return load(rossi.readfile(path), "=" .. path, "t", _G)
  end

  if bootdisk.type ~= "filesystem" then
    rossi.print("rossi: not a filesystem")
    rossi.halt()
  end
  appFn, err = rossi.loadfile("app.lua")
  if appFn == nil then
    rossi.print("rossi: error loading:")
    rossi.print(err)
    rossi.halt()
  end
end
local _, err = xpcall(appFn, debug.traceback)
if err then
  rossi.print("rossi: error")
  for line in string.gmatch(err, "([^\n]+)") do
    rossi.print(line)
  end
end
rossi.print("rossi: exited")
rossi.halt()