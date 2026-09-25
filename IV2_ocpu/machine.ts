import { OCSocket } from "./ocsocket";
import { FluidStack, ItemStack, Recipe } from "./recipe";

export enum MachineSide {
  Bottom = 0,
  Top = 1,
  North = 2,
  South = 3,
  West = 4,
  East = 5,
}

export type TransposerConfig = {
  tpUuid: string,
  machineSide: MachineSide,
  intUuid: string,
  intSide: MachineSide
}

export type MachineConfig = {
  name: string,
  machineType: string,
  itemInput: TransposerConfig,
  fluidInput: TransposerConfig,
  maxFluidCapacity: number,
  maxFluidSlots: number // we assume there will never be issues of too many items
};

export class MachineState {
  config: MachineConfig;
  socket: OCSocket | null = null;
  currentRecipe: Recipe | null = null;

  constructor(config: MachineConfig) {
    this.config = config;
  }

  async resetMachine(): Promise<void> {
    console.log(`${this.config.name}: reset`);
    if(!this.socket) return
    const i = this.config.itemInput;
    const f = this.config.fluidInput;
    await this.socket.executeLua(`
local component = require("component")
local itemTp = component.proxy("${i.tpUuid}")
local itemInt = component.proxy("${i.intUuid}")
local fluidTp = component.proxy("${f.tpUuid}")
local fluidInt = component.proxy("${f.intUuid}")
local invSize = itemTp.getInventorySize(${i.machineSide})
for i=0,8,1 do
  itemInt.setInterfaceConfiguration(i)
end
for i=0,4,1 do
  fluidInt.setFluidInterfaceConfiguration(i)
end
for i=1,invSize,1 do
  intSlot = 0
  if i > 9 then intSlot = i - 9 else intSlot = i end
  itemTp.transferItem(${i.machineSide}, ${i.intSide}, 64, i, intSlot)
end
for i=1,${this.config.maxFluidSlots},1 do
  fluidTp.transferFluid(${f.machineSide}, ${f.intSide}, ${this.config.maxFluidCapacity})
end
`);
    this.currentRecipe = null;
    // TODO: check the machine was successfully emptied
  }

  /// Adds or replaces existing socket
  async onAddSocket(socket: OCSocket) {
    this.socket = socket;
    await this.socket.executeLua(`print("socket connected")`)
    await this.resetMachine();
  }

  /// Returns true if the machine is ready for a recipe
  async poll(): Promise<boolean> {
    if(!this.socket) return false;
    if(this.currentRecipe) {
      // check if the recipe is done
      const i = this.config.itemInput;
      const f = this.config.fluidInput;
      let luaStr = `
local component = require("component")
local itemTp = component.proxy("${i.tpUuid}")
local fluidTp = component.proxy("${f.tpUuid}")
local done = true
`;
      luaStr += "\n";
      luaStr += this.currentRecipe.itemInputs
        .map((v, i) => v.nc ? null : i)
        .filter((v => v !== null) as (x: number | null) => x is number)
        .map(v => `done = done and itemTp.getStackInSlot(${i.machineSide}, ${v + 1}) == nil\n`)
        .join("");
      luaStr += this.currentRecipe.fluidInputs
        .map((v, i) => `done = done and fluidTp.getFluidInTank(${f.machineSide}, ${i + 1}).amount == 0\n`)
        .join("");
      luaStr += "\nreturn done\n";
      const resp = await this.socket.executeLua(luaStr);
      if(resp === "true") {
        await this.resetMachine();
        this.currentRecipe = null;
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  async executeRecipe(recipe: Recipe, multiplier: number): Promise<void> {
    console.log(`${this.config.name}: exec ${recipe.name} x ${multiplier}`);
    if(!this.socket) throw new Error("No socket connected");
    if(this.currentRecipe) throw new Error("Machine is already executing a recipe");
    if(recipe.fluidInputs.length > this.config.maxFluidSlots) throw new Error("Machine cannot support that many fluid ingredients");

    this.currentRecipe = recipe;
    multiplier = Math.floor(multiplier);
    const i = this.config.itemInput;
    const f = this.config.fluidInput;
    let luaStr = `
local component = require("component")
local itemTp = component.proxy("${i.tpUuid}")
local itemInt = component.proxy("${i.intUuid}")
local fluidTp = component.proxy("${f.tpUuid}")
local fluidInt = component.proxy("${f.intUuid}")
local chk = function(ok, msg) if not ok then error(msg) end end
local db = component.getPrimary("database")
`;
    recipe.itemInputs.forEach((v, idx) => {
      luaStr += `
db.set(1, "${v.id}", ${v.meta})
itemInt.setInterfaceConfiguration(${idx}, db.address, 1, 64)
`;
    });
    recipe.fluidInputs.forEach((v, idx) => {
      luaStr += `
fluidInt.setFluidInterfaceConfiguration(${idx}, { name = "${v.id}", amount = 16000 })
`;
    });
    luaStr += "os.sleep(0.5)\n";
    recipe.itemInputs.forEach((v, idx) => {
      const count = v.amount * multiplier;
      if(count > 64) throw new Error("Item stack too large");
      luaStr += `
itemTp.transferItem(${i.intSide}, ${i.machineSide}, ${count}, ${idx + 1}, ${idx + 1})
`;
    });
    recipe.fluidInputs.forEach((v, idx) => {
      const count = v.amount * multiplier;
      if(count > this.config.maxFluidCapacity) throw new Error("Fluid stack too large");
      luaStr += `
local f = 0
while f < ${count} do
  ok, transferred = fluidTp.transferFluid(${f.intSide}, ${f.machineSide}, ${count} - f, ${idx})
  f = f + transferred
end
`;
    });
    recipe.itemInputs.forEach((v, idx) => {
      luaStr += `itemInt.setInterfaceConfiguration(${idx}, db.address, 2, 64)\n`;
    });
    recipe.fluidInputs.forEach((v, idx) => {
      luaStr += `fluidInt.setFluidInterfaceConfiguration(${idx})\n`;
    });
    await this.socket.executeLua(luaStr);
  }

  async meGetItems(): Promise<ItemStack[]> {
    if(!this.socket) throw new Error("Not connected");
    const resp = await this.socket.executeLua(String.raw`
local component = require("component")
local itemInt = component.proxy("${this.config.itemInput.intUuid}")
local resp = {}
for i in itemInt.allItems() do
  table.insert(resp, i.name .. "/" .. i.damage .. "/" .. i.size .. "\n")
end
return table.concat(resp)
`);
    return resp.split("\n").filter(v => v).map(v => {
      const spl = v.split("/");
      if(spl.length != 3) throw new Error("Malformed response from lua");
      if(!spl[0] || !spl[1] || !spl[2]) throw new Error("Unreachable");
      return { id: spl[0], meta: parseInt(spl[1]), amount: parseInt(spl[2]), nc: false }
    });
  }

  async meGetFluids(): Promise<FluidStack[]> {
    if(!this.socket) throw new Error("Not connected");
    const resp = await this.socket.executeLua(String.raw`
local component = require("component")
local fluidInt = component.proxy("${this.config.fluidInput.intUuid}")
local resp = {}
for k, v in ipairs(fluidInt.getFluidsInNetwork()) do
  table.insert(resp, v.name .. "/" .. v.amount .. "\n")
end
return table.concat(resp)
`);
    return resp.split("\n").filter(v => v).map(v => {
      const spl = v.split("/");
      if(spl.length != 2) throw new Error("Malformed response from lua");
      if(!spl[0] || !spl[1]) throw new Error("Unreachable");
      return { id: spl[0], amount: parseInt(spl[1]) }
    });
  }
}

export class MachineManager {
  states: MachineState[];

  constructor(configs: MachineConfig[]) {
    this.states = configs.map(v => new MachineState(v));
  }

  async addSocket(socket: OCSocket) {
    const scriptListComponent = (ty: string) => `
local component = require("component")
local r = ""
for i in component.list("${ty}") do
  r = r .. i .. ","
end
return r
`;
    // list all transposers
    const transposerResp = await socket.executeLua(scriptListComponent("transposer"));
    const transposerList = transposerResp.split(",").filter(v => v);
    // list all interfaces
    const interfaceResp = await socket.executeLua(scriptListComponent("fluid_interface"));
    const interfaceList = interfaceResp.split(",").filter(v => v);
    // find all machines that can be serviced by this socket
    const eligibleMachines = this.states.filter(v =>
      transposerList.includes(v.config.itemInput.tpUuid) &&
      transposerList.includes(v.config.fluidInput.tpUuid) &&
      interfaceList.includes(v.config.itemInput.intUuid) &&
      interfaceList.includes(v.config.fluidInput.intUuid));
    await Promise.all(eligibleMachines.map(v => v.onAddSocket(socket)));
  }

  machines(): MachineState[] {
    return this.states;
  }
}