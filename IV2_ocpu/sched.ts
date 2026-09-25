import { MachineManager } from "./machine";
import { ItemStack, Recipe } from "./recipe";

export type MachineStatusReport = {
  machineName: string,
  connected: boolean,
  machineRecipe: string | null
};

export type StatusReport = {
  machines: MachineStatusReport[]
};

export class RecipeScheduler {
  machineManager: MachineManager;
  recipes: Recipe[];

  constructor(machineManager: MachineManager, recipes: Recipe[]) {
    this.machineManager = machineManager;
    this.recipes = recipes;
  }

  async poll(): Promise<StatusReport> {
    // find a machine with an identified socket
    const baseMachine = this.machineManager.machines().find(v => v.socket);
    if(baseMachine) {
      // collect contents of ME
      const itemMap: { [idmeta: string]: number } = {};
      const fluidMap: { [id: string]: number } = {};
      const items = await baseMachine.meGetItems();
      const fluids = await baseMachine.meGetFluids();
      items.forEach(v => {
        const key = v.id + "/" + v.meta;
        if(!itemMap[key]) itemMap[key] = 0;
        itemMap[key] += v.amount;
      });
      fluids.forEach(v => {
        const key = v.id;
        if(!fluidMap[key]) fluidMap[key] = 0;
        fluidMap[key] += v.amount;
      });

      // filter recipes for everything we want to make
      const wantToMake = this.recipes.map(v => {
        const fluidReq = v.fluidOutputs.map((v2, i) => Math.ceil(((v.maintainFluids[i] || 0) - v2.amount) / v2.amount));
        const itemReq = v.itemOutputs.map((v2, i) => Math.ceil(((v.maintainItems[i] || 0) - v2.amount) / v2.amount));
        const fluidLimits = v.fluidInputs.map(v2 => Math.floor(64000 / v2.amount)); // TODO not hardcoded fluid limit?
        const itemLimits = v.itemInputs.map(v2 => Math.floor(64 / v2.amount));
        const totalLimit = fluidLimits.concat(itemLimits).reduce((a, b) => Math.min(a, b));
        const totalReq = fluidReq.concat(itemReq).reduce((a, b) => Math.max(a, b));
        return [v, Math.min(totalLimit, totalReq)] as [Recipe, number];
      }).filter(v => v[1] > 0);
      
      // schedule to machines
      for(const machine of this.machineManager.machines()) {
        const ready = await machine.poll();
        if(ready) {
          const idx = wantToMake.findIndex(v => {
            return v[0].machineType === machine.config.machineType && v[0].fluidInputs.length <= machine.config.maxFluidSlots;
          });
          const recipe = wantToMake[idx];
          if(recipe) {
            wantToMake.splice(idx, 1);
            await machine.executeRecipe(recipe[0], recipe[1]);
          }
        }
      }
    }
    return {
      machines: this.machineManager.machines().map(v => ({
        machineName: v.config.name,
        connected: v.socket !== null,
        machineRecipe: v.currentRecipe ? v.currentRecipe.name : null
      }))
    }
  }
}