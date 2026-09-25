import { createServer } from "net";
import { OCSocket } from "./ocsocket";
import { MachineConfig, MachineManager, MachineSide } from "./machine";
import { Recipe } from "./recipe";
import { RecipeScheduler, StatusReport } from "./sched";

const machineConfigs: MachineConfig[] = [
  {
    name: "LCR",
    machineType: "lcr",
    itemInput: {
      tpUuid: "1ed650ad-88c0-4188-a5f8-2dfbe3bb792e",
      machineSide: MachineSide.East,
      intUuid: "352c75f2-e0a2-416b-aa85-3881935e9db5",
      intSide: MachineSide.North
    },
    fluidInput: {
      tpUuid: "194db9fd-c47c-48cd-933b-e90085cd0765",
      machineSide: MachineSide.East,
      intUuid: "352c75f2-e0a2-416b-aa85-3881935e9db5",
      intSide: MachineSide.South
    },
    maxFluidCapacity: 64000,
    maxFluidSlots: 4
  },
  {
    name: "EBF",
    machineType: "ebf",
    itemInput: {
      tpUuid: "1ed650ad-88c0-4188-a5f8-2dfbe3bb792e",
      machineSide: MachineSide.West,
      intUuid: "efef01ac-ea9a-4c6f-afb4-07863a65ac2f",
      intSide: MachineSide.North
    },
    fluidInput: {
      tpUuid: "194db9fd-c47c-48cd-933b-e90085cd0765",
      machineSide: MachineSide.West,
      intUuid: "efef01ac-ea9a-4c6f-afb4-07863a65ac2f",
      intSide: MachineSide.South
    },
    maxFluidCapacity: 64000,
    maxFluidSlots: 1
  }
];

const recipes: Recipe[] = [
  {
    name: "Sulfuric Acid",
    machineType: "lcr",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 24, amount: 1, nc: true },
      { id: "gregtech:gt.metaitem.01", meta: 2022, amount: 1, nc: false }
    ],
    fluidInputs: [
      { id: "water", amount: 1000 },
      { id: "oxygen", amount: 3000 }
    ],
    itemOutputs: [],
    fluidOutputs: [
      { id: "sulfuricacid", amount: 1000 }
    ],
    maintainItems: [],
    maintainFluids: [16000]
  }
];

const machineManager = new MachineManager(machineConfigs);
const recipeScheduler = new RecipeScheduler(machineManager, recipes);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  let socketQueue: OCSocket[] = []; // we should only access sockets on the main thread, send them there
  let status: StatusReport | null = null;

  createServer(async socket => {
    try {
      console.log("got connection: " + socket.remoteAddress);
      const ocSocket = new OCSocket(socket);
      machineManager.addSocket(ocSocket);
    } catch(e: unknown) {
      console.log(e);
    }
  }).listen(18320);

  while(true) {
    const socketQueueCopy = socketQueue;
    socketQueue = [];
    await Promise.all(socketQueueCopy.map(v => machineManager.addSocket(v)));
    status = await recipeScheduler.poll();
    await sleep(2000);
  }
}

async function machineTest() {
  createServer(async socket => {
    try {
      console.log("got connection: " + socket.remoteAddress);
      const ocSocket = new OCSocket(socket);
      console.log("resetting...");
      await machineManager.addSocket(ocSocket);
      console.log("done resetting");

      const state = machineManager.states[0];
      if(!state) throw new Error("bruh1");
      const recipe = recipes[0];
      if(!recipe) throw new Error("bruh2");
      
      await sleep(5000);
      console.log("executing recipe...");
      await state.executeRecipe(recipe, 1);
      console.log("polling...");
      while(true) {
        const status = await state.poll();
        console.log("poll: " + status);
        await sleep(1000);
        if(status) break;
      }
    } catch(e: unknown) {
      console.log(e);
    }
  }).listen(18320);
}

machineTest();