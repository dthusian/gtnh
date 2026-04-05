rossi.print("oil cracking controller v0.1")

local BATCH_SIZE = 5000
local DELAY = 4

local sides = {
  down = 0,
  up = 1,
  north = 2,
  south = 3,
  west = 4,
  east = 5,
}

local fluids = {
  "liquid_medium_oil",
  "liquid_light_fuel",
  "liquid_heavy_fuel",
  "liquid_naphtha",
  "gas_gas",
  "liquid_toluene",
  "benzene",
  "butene",
  "butadiene",
  "propane",
  "propene",
  "ethane",
  "ethylene",
  "methane"
}

local vecFluids = {
  "liquid_light_fuel",
  "liquid_heavy_fuel",
  "liquid_naphtha",
  "gas_gas",
  "liquid_toluene",
  "benzene",
  "butene",
  "propene",
  "ethylene",
}
local vecLen = #vecFluids

local targetVec = {
  50000,
  50000,
  50000,
  50000,
  50000,
  50000,
  50000,
  50000,
  50000
}

-- input, crack level, heavy, light, naphtha, refinery gas, toluene, benzene, butene, propene, ethylene
-- per 1000 L
local recipes = {
  { {"liquid_medium_oil", 0}, {100,   500,   1500,  600,   0,     0,     0,     0,     0} },
  { {"liquid_light_fuel", 2}, {100,   -1000, 250,   0,     50,    300,   90,    200,   150} },
  { {"liquid_light_fuel", 3}, {50,    -1000, 100,   0,     30,    150,   65,    250,   250} },
  { {"liquid_heavy_fuel", 3}, {-1000, 100,   125,   0,     80,    400,   80,    100,   150} },
  { {"liquid_naphtha",    1}, {75,    150,   -1000, 0,     40,    150,   80,    200,   200} },
  { {"liquid_naphtha",    3}, {25,    50,    -1000, 0,     20,    100,   50,    300,   500} },
  { {"butene",            1}, {0,     0,     0,     0,     0,     0,     -1000, 750,   500} },
  { {"butene",            2}, {0,     0,     0,     0,     0,     0,     -1000, 200,   1300} },
  { {"butadiene",         1}, {0,     0,     0,     0,     0,     0,     0,     750,   188} },
  { {"butadiene",         2}, {0,     0,     0,     0,     0,     0,     0,     125,   1125} },
  { {"propane",           1}, {0,     0,     0,     0,     0,     0,     0,     0,     750} },
  { {"propene",           1}, {0,     0,     0,     0,     0,     0,     0,     -1000, 1000} },
  { {"ethane",            1}, {0,     0,     0,     0,     0,     0,     0,     0,     250} }
}

-- Section: Vector library

-- returns array of 9 numbers
local function vCreate(fluidAmts)
  local vec = {}
  for _, f in ipairs(vecFluids) do
    table.insert(vec, fluidAmts[f])
  end
  return vec
end

local function vAdd(a, b)
  local vec = {}
  for i=1,vecLen do
    table.insert(vec, a[i] + b[i])
  end
  return vec
end

local function vSub(a, b)
  local vec = {}
  for i=1,vecLen do
    table.insert(vec, a[i] - b[i])
  end
  return vec
end

local function vScale(a, c)
  local vec = {}
  for i=1,vecLen do
    table.insert(vec, a[i] * c)
  end
  return vec
end

local function vDist(v)
  local sum = 0
  for i=1,vecLen do
    sum = sum + v[i] * v[i]
  end
  return sum
end

-- Section: Transposer functions

local productTransposers = {}
local crudeCircuitTransposer = {}

local function initHw()
  for addr, name in component.list("transposer", true) do
    local proxy = component.proxy(addr)
    local tanks, err = proxy.getTankCount(sides.down)
    if tanks ~= nil and tanks > 0 then
      table.insert(productTransposers, proxy)
      rossi.print("occ: found product transposer " .. proxy.address)
    else
      crudeCircuitTransposer = proxy
      rossi.print("occ: found crude transposer " .. proxy.address)
    end
  end
end

local function getFluidSafe(transposer, side)
  local success, ret = pcall(function() return transposer.getFluidInTank(side, 1) end)
  if not success then return {name="", amount=0} else return ret end
end

local function readFluids()
  local amounts = {}
  for _, fluid in ipairs(fluids) do
    amounts[fluid] = 0
  end
  for _, transposer in ipairs(productTransposers) do
    for _, side in ipairs({sides.east, sides.west, sides.up}) do
      local fluid = getFluidSafe(transposer, side)
      if amounts[fluid.name] ~= nil then
        amounts[fluid.name] = amounts[fluid.name] + fluid.amount
      end
    end
  end
  local fluid = getFluidSafe(crudeCircuitTransposer, sides.north)
  if amounts[fluid.name] ~= nil then
    amounts[fluid.name] = amounts[fluid.name] + fluid.amount
  end
  return amounts
end

-- returns {[1] = fluid, [2] = crack level} or nil
local function selectRecipe(fluidAmts)
  local v = vCreate(fluidAmts)
  local deficitVec = vSub(v, targetVec)
  local bestScore = vDist(deficitVec)
  rossi.print("occ: do nothing = " .. bestScore)
  local bestScoringRecipe = nil
  for _, recipeDef in ipairs(recipes) do
    local recipe = recipeDef[1]
    local recipeVec = recipeDef[2]
    if fluidAmts[recipe[1]] > BATCH_SIZE then
      local afterRecipeVec = vAdd(deficitVec, vScale(recipeVec, BATCH_SIZE / 1000))
      local score = vDist(afterRecipeVec)
      rossi.print("occ: " .. recipe[1] .. recipe[2] .. " = " .. score)
      if score < bestScore then
        bestScoringRecipe = recipe
        bestScore = score
      end
    else
      rossi.print("occ: " recipe[1] .. recipe[2] .. " missing")
    end
  end
  rossi.print("occ: " .. recipe[1] .. recipe[2])
  return bestScoringRecipe
end

local function execRecipe(recipe)
  if recipe[2] == 0 then
    -- crude oil
    success, err = crudeCircuitTransposer.transferFluid(sides.north, sides.east, BATCH_SIZE)
    if not success then rossi.print("occ: err: " .. err) end
  else
    -- some super tank product
    -- set circuit
    success, err = crudeCircuitTransposer.transferItem(sides.west, sides.down, 1, recipe[2], 1)
    if not success then rossi.print("occ: err: " .. err) end
    -- transfer fluid
    for _, transposer in ipairs(productTransposers) do
      for _, side in ipairs({sides.east, sides.west, sides.up}) do
        if transposer.getFluidInTank(side, 1).name == recipe[1] then
          success, err = transposer.transferFluid(side, sides.down, BATCH_SIZE)
          if not success then rossi.print("occ: err: " .. err) end
        end
      end
    end
  end
end

local function cleanupRecipe(recipe)
  success, err = crudeCircuitTransposer.transferItem(sides.down, sides.west, 1, 1, recipe[2])
  if not success then rossi.print("occ: err: " .. err) end
end

local function sleep(s)
  timeout = computer.uptime() + s
  while computer.uptime() < timeout do
    computer.pullSignal(timeout - computer.uptime())
  end
end

local function mainloop()
  initHw()
  if BATCH_SIZE % 5000 ~= 0 then
    rossi.print("occ: Batch size not divisible by 5000")
    return
  end
  while true do
    local fluidAmts = readFluids()
    for _, k in ipairs(fluids) do
      rossi.print("occ: " .. k .. " " .. fluidAmts[k])
    end
    local recipe = selectRecipe(fluidAmts)
    if recipe ~= nil then
      rossi.print("occ: exec " .. recipe[1] .. " " .. recipe[2])
      execRecipe(recipe)
    end
    sleep((BATCH_SIZE * 6 / 5000) * 6 + DELAY)
    if recipe ~= nil then
      cleanupRecipe(recipe)
    end
  end
end

mainloop()