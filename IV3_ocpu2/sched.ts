import { OCSocket } from "./ocsocket";

export type MaintainConfig = {
  recipeItem: string, // Items: <id>/<meta>, Fluids: /<id>
  condItem: string, // Items: <id>/<meta>, Fluids: /<id>
  condition: "<" | ">",
  condThreshold: number,
  requestAmount: number
};

function parseItemId(item: string) {
  const spl = item.split("/");
  if(!spl[0] || !spl[1]) throw new Error("Invalid condItem");
  const itemId = spl[0];
  const itemMeta = parseInt(spl[1]);
  return [itemId, itemMeta];
}

export class RecipeScheduler {
  socket: OCSocket;
  config: MaintainConfig[];

  constructor(socket: OCSocket, config: MaintainConfig[]) {
    this.socket = socket;
    this.config = config;
  }

  async poll(): Promise<void> {
    let luaStr = `
local component = require("component")
local int = component.getPrimary("fluid_interface")
local reqs = {}
`;
    this.config.forEach(config => {
      const condIsFluid = config.condItem.startsWith("/");
      if(condIsFluid) {
        const fluidId = config.condItem.slice(1);
        luaStr += `
local fluid = int.getFluidInNetwork("${fluidId}")
local amt = 0
if fluid ~= nil then amt = fluid.amount end
if amt ${config.condition} ${config.condThreshold} then
`;
      } else {
        const [itemId, itemMeta] = parseItemId(config.condItem);
        luaStr += `
local item = int.getItemInNetwork("${itemId}", ${itemMeta})
local amt = 0
if item ~= nil then amt = item.size end
if amt ${config.condition} ${config.condThreshold} then
`;
      }
      const recipeIsFluid = config.recipeItem.startsWith("/");
      if(recipeIsFluid) {
        const fluidId = config.recipeItem.slice(1);
        luaStr += ` local craftable = int.getCraftables({name="${fluidId}"})[1]\n`;
      } else {
        const [itemId, itemMeta] = parseItemId(config.recipeItem);
        luaStr += ` local craftable = int.getCraftables({name="${itemId}",damage=${itemMeta} })[1]\n`
      }
      luaStr += `
  if craftable ~= nil then
    local status = craftable.request(${config.requestAmount})
    if not status.hasFailed() then
      print("craft " .. craftable.getStack().label .. " x " .. ${config.requestAmount})
      return
    end
  end
end
`;
    });
    await this.socket.executeLua(luaStr);
  }
}