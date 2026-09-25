import { createServer } from "net";
import { OCSocket } from "./ocsocket";
import { MachineConfig, MachineManager, MachineSide } from "./machine";
import { Recipe, RecipeInput } from "./recipe";
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
      intUuid: "352c75f2-e0a2-416b-aa85-3881935e9db5",
      intSide: MachineSide.North
    },
    fluidInput: {
      tpUuid: "194db9fd-c47c-48cd-933b-e90085cd0765",
      machineSide: MachineSide.West,
      intUuid: "352c75f2-e0a2-416b-aa85-3881935e9db5",
      intSide: MachineSide.South
    },
    maxFluidCapacity: 64000,
    maxFluidSlots: 1
  }
];

const recipes: RecipeInput[] = [
  // Common chemicals
  {
    name: "Sulfuric Acid",
    machineType: "lcr",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 24, amount: 1, nc: true },
      { id: "gregtech:gt.metaitem.01", meta: 2022, amount: 1 }
    ],
    fluidInputs: [
      { id: "water", amount: 1000 },
      { id: "oxygen", amount: 3000 }
    ],
    itemOutputs: [],
    fluidOutputs: [
      { id: "sulfuricacid", amount: 1000 }
    ],
    maintainFluids: [32000]
  },
  {
    name: "Hydrochloric Acid",
    machineType: "lcr",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 1, amount: 1, nc: true }
    ],
    fluidInputs: [
      { id: "hydrogen", amount: 1000 },
      { id: "chlorine", amount: 1000 }
    ],
    itemOutputs: [],
    fluidOutputs: [
      { id: "hydrochloricacid_gt5u", amount: 1000 }
    ],
    maintainFluids: [32000]
  },
  {
    name: "Nitric Acid",
    machineType: "lcr",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 21, amount: 1, nc: true }
    ],
    fluidInputs: [
      { id: "hydrogen", amount: 3000 },
      { id: "nitrogen", amount: 1000 },
      { id: "oxygen", amount: 4000 },
    ],
    itemOutputs: [],
    fluidOutputs: [
      { id: "nitricacid", amount: 1000 },
      { id: "water", amount: 1000 },
    ],
    maintainFluids: [32000]
  },
  {
    name: "Ammonia",
    machineType: "lcr",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 1, amount: 1, nc: true }
    ],
    fluidInputs: [
      { id: "hydrogen", amount: 3000 },
      { id: "nitrogen", amount: 1000 }
    ],
    fluidOutputs: [
      { id: "ammonia", amount: 1000 }
    ],
    itemOutputs: [],
    maintainFluids: [32000],
    maintainItems: []
  },
  {
    name: "Ammonium Chloride",
    machineType: "lcr",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 1, amount: 1, nc: true }
    ],
    fluidInputs: [
      { id: "ammonia", amount: 1000 },
      { id: "hydrochloricacid_gt5u", amount: 1000 }
    ],
    fluidOutputs: [
      { id: "ammonium chloride", amount: 1000 }
    ],
    itemOutputs: [],
    maintainFluids: [32000],
    maintainItems: []
  },
  // Pt
  {
    name: "Platinum Concentrate",
    machineType: "lcr",
    itemInputs: [
      { id: "bartworks:gt.bwMetaGenerateddust", meta: 47, amount: 9 },
      { id: "gregtech:gt.integrated_circuit", meta: 9, amount: 1, nc: true }
    ],
    fluidInputs: [
      { id: "aqua regia", amount: 18000 }
    ],
    itemOutputs: [
      { id: "bartworks:gt.bwMetaGenerateddust", meta: 49, amount: 1 }
    ],
    fluidOutputs: [
      { id: "platinum concentrate", amount: 18000 }
    ],
    maintainItems: [32],
    maintainFluids: [32000]
  },
  {
    name: "Reprecipitated Platinum",
    machineType: "lcr",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 3, amount: 1, nc: true }
    ],
    fluidInputs: [
      { id: "platinum concentrate", amount: 36000 },
      { id: "ammonium chloride", amount: 3600 }
    ],
    itemOutputs: [
      { id: "bartworks:gt.bwMetaGenerateddust", meta: 45, amount: 16 },
      { id: "bartworks:gt.bwMetaGenerateddust", meta: 51, amount: 4 }
    ],
    fluidOutputs: [
      { id: "palladium enriched ammonia", amount: 3600 },
      { id: "nitrogendioxide", amount: 9000 },
      { id: "hydrochloricacid_gt5u", amount: 27000 }
    ],
    maintainItems: [0, 32],
    maintainFluids: [32000, 0, 0]
  },
  {
    name: "Platinum Dust",
    machineType: "lcr",
    itemInputs: [
      { id: "bartworks:gt.bwMetaGenerateddust", meta: 51, amount: 4 },
      { id: "gregtech:gt.metaitem.01", meta: 2026, amount: 1 }
    ],
    fluidInputs: [],
    itemOutputs: [
      { id: "gregtech:gt.metaitem.01", meta: 2085, amount: 2 },
      { id: "bartworks:gt.bwMetaGenerateddust", meta: 63, amount: 3 }
    ],
    fluidOutputs: [],
    maintainFluids: [],
    maintainItems: [32, 0]
  },
  {
    name: "Platinum Metallic Powder",
    machineType: "ebf",
    itemInputs: [
      { id: "gregtech:gt.integrated_circuit", meta: 1, amount: 1, nc: true },
      { id: "bartworks:gt.bwMetaGenerateddust", meta: 46, amount: 1 }
    ],
    fluidInputs: [],
    itemOutputs: [
      { id: "minecraft:spawn_egg", meta: 0, amount: 1 }
    ],
    fluidOutputs: [],
    maintainItems: [999] // make this recipe a "push" recipe (always happens if ingredients exist)
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
      socketQueue.push(ocSocket);
    } catch(e: unknown) {
      console.log(e);
    }
  }).listen(18320);

  while(true) {
    const socketQueueCopy = socketQueue;
    socketQueue = [];
    for(const socket of socketQueueCopy) {
      await machineManager.addSocket(socket);
    }
    status = await recipeScheduler.poll();
    await sleep(2000);
  }
}

main();