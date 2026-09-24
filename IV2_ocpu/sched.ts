import { MachineManager } from "./machine";
import { Recipe } from "./recipe";

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

  constructor(machineManager: MachineManager, recipes: Recipe[]) {
    this.machineManager = machineManager;
  }

  async poll(): Promise<StatusReport> {
    let report: StatusReport = {
      machines: []
    };
    // find a machine with an identified socket
    const baseMachine = this.machineManager.machines().find(v => v.socket);
    if(baseMachine) {
      const itemMap = {};
      const fluidMap = {};

      const items = await baseMachine.meGetItems();
      const fluids = await baseMachine.meGetFluids();
      items.forEach(v => { itemMap[v.id]. });
    }
  }
}