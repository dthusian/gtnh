import { createServer } from "net";
import { OCSocket } from "./ocsocket";
import { MachineConfig, MachineManager } from "./machine";
import { Recipe } from "./recipe";
import { RecipeScheduler, StatusReport } from "./sched";

const machineConfigs: MachineConfig[] = [
  {
    machineType: "lcr",
    itemInput: {
      //todo
    },
    fluidInput: {
      //todo
    },
    maxFluidCapacity: 64000,
    maxFluidSlots: 4
  },
  {
    machineType: "ebf",
    itemInput: {
      //todo
    },
    fluidInput: {
      //todo
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
      { id: "todo pc", meta: 1, amount: 1, nc: true },
      { id: "todo sulfur", meta: 0, amount: 1, nc: false }
    ],
    fluidInputs: [
      { id: "todo water", amount: 1000 },
      { id: "todo oxygen", amount: 3000 }
    ],
    itemOutputs: [],
    fluidOutputs: [
      { id: "todo sulfuric acid", amount: 1000 }
    ],
    maintainItems: [],
    maintainFluids: [16000]
  }
];

const machineManager = new MachineManager(machineConfigs);
const recipeScheduler = new RecipeScheduler(machineManager, recipes);

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  while(true) {
    const socketQueueCopy = socketQueue;
    socketQueue = [];
    await Promise.all(socketQueueCopy.map(v => machineManager.addSocket(v)));
    status = await recipeScheduler.poll();
    await sleep(5000);
  }
}

main();