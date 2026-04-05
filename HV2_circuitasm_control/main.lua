local t = component.transposer

-- config
local RECIPES = {
  ["foo"] = { ingredients = { name = "foo", count = 4 } },
}
local STOCK_LEVELS = {
  { name = "foo", count = 8}
}
local STORAGE_SPACE = 54
local INPUT_SIDE = 0 -- todo
local OUTPUT_SIDE = 0 -- todo
local STORAGE_SIDE = 0 -- todo

local function main()
  while true do
    -- rescan inventory
    local itemCounts = {}
    for i = 1,54,1 do
      local stack = t.getStackInSlot(STORAGE_SIDE, i)
      if itemCounts[stack.name] == nil then itemCounts[stack.name] = 0 end
      itemCounts[stack.name] += stack.count
    end
    -- check for items to be stocked
    local targetRecipe = nil
    local targetCount = 0
    for stock in STOCK_LEVELS do
      if itemCounts[stock.name] == nil then itemCounts[stock.name] = 0 end
      if itemCounts[stock.name] < stock.count then
        targetRecipe = stock.name
        targetCount = stock.count - itemCounts[stock.name]
        break
      end
    end
    -- check if there are enough ingredients for the crafting
    for ingredient in RECIPES[targetRecipe].ingredients do
      if itemCounts[ingredient.name] == nil then itemCounts[ingredient.name] = 0 end
      if itemCounts[ingredient.name] < ingredient.count * targetCount then
        targetCount = math.floor(itemCounts[ingredient.name] / ingredient.count)
      end
    end
    if targetCount > 0 then
      -- transfer items
      for j, ingredient in ipairs(RECIPES[targetRecipe].ingredients) end
        toTransfer = ingredient.count * targetCount
        for i = 1,54,1 do
          local stack = t.getStackInSlot(STORAGE_SIDE, i)
          if stack.name == ingredient.name then
            t.transferItem(STORAGE_SIDE, i, toTransfer, INPUT_SIDE, j)
          end
        end
      end
      -- wait for results
      while t.getStackInSlot(OUTPUT_SIDE, 1).count < 
    else
      -- idle
    end
  end
end

local function onerr()

end

xpcall(main, onerr)