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
    if(!this.socket) return
    const i = this.config.itemInput;
    const f = this.config.fluidInput;
    await this.socket.executeLua(`
local component = require("component")
local itemTp = component.proxy("${i.tpUuid}")
local fluidTp = component.proxy("${f.tpUuid}")
local invSize = itemTp.getInventorySize(${i.machineSide})
for i=0,invSize-1,1 do
  itemTp.transferItem(${i.machineSide}, ${i.intSide}, 64, i, 0);
  -- todo: see if wait is needed
done
for i=0,${this.config.maxFluidSlots-1},1 do
  fluidTp.transferFluid(${f.machineSide}, ${f.intSide}, ${this.config.maxFluidCapacity})
done`);
    // TODO: check the machine was successfully emptied
  }

  /// Adds or replaces existing socket
  async onAddSocket(socket: OCSocket) {
    this.socket = socket;
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
local done = `;
      luaStr += this.currentRecipe.itemInputs
        .map((v, i) => v.nc ? null : i)
        .filter(v => v !== null)
        .map(v => `itemTp.getStackInSlot(${i.machineSide}, ${v}) == nil`)
        .join(" and ");
      luaStr += " and ";
      luaStr += this.currentRecipe.fluidInputs
        .map(v => `fluidTp.getFluidInTank(${f.machineSide}) == nil`)
        .join(" and ");
      luaStr += "\nif done then\n";
      luaStr += this.currentRecipe.itemInputs
        .map((v, i) => v.nc ? i : null)
        .filter(v => v !== null)
        .map(v => `itemTp.transferItem(${i.machineSide}, ${i.intSide}, 64, ${v}, )`);
      const resp = await this.socket.executeLua(luaStr);
      if(resp === "true") {
        this.currentRecipe = null;
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  async executeRecipe(): Promise<void> {
    if(this.currentRecipe) {
      throw new Error("Machine is already executing a recipe");
    }
    throw new Error("todo");
  }

  async meGetItems(): Promise<ItemStack[]> {
    throw new Error("todo");
  }

  async meGetFluids(): Promise<FluidStack[]> {
    throw new Error("todo");
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