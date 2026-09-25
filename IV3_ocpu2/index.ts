import { createServer } from "net";
import { OCSocket } from "./ocsocket";
import { MaintainConfig, RecipeScheduler } from "./sched";

function pullRecipe(item: string, amount: number, requestAmount: number): MaintainConfig {
  return {
    recipeItem: item,
    condItem: item,
    condition: "<",
    condThreshold: amount,
    requestAmount: requestAmount
  }
}

function pushRecipe(item: string, amount: number, requestAmount: number, output: string): MaintainConfig {
  return {
    recipeItem: output,
    condItem: item,
    condition: ">",
    condThreshold: amount,
    requestAmount: requestAmount
  }
}

const recipes: MaintainConfig[] = [
  // common chem
  pullRecipe("/sulfuricacid", 32000, 8000),
  pullRecipe("/hydrochloricacid_gt5u", 32000, 8000),
  pullRecipe("/nitricacid", 32000, 8000),
  pullRecipe("/ammonia", 32000, 8000),
  pullRecipe("/ammonium chloride", 32000, 8000),

  // Pt
  pullRecipe("/platinum concentrate", 32000, 8000),
  pullRecipe("bartworks:gt.bwMetaGenerateddust/49", 4, 2),
  pullRecipe("bartworks:gt.bwMetaGenerateddust/51", 32, 8),
  pullRecipe("/palladium enriched ammonia", 32000, 8000),
  pullRecipe("gregtech:gt.metaitem.01/2085", 64, 8),
  pushRecipe("bartworks:gt.bwMetaGenerateddust/46", 0, 4, "bartworks:gt.bwMetaGenerateddust/47")
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const server = createServer(async socket => {
    try {
      console.log("got connection: " + socket.remoteAddress);
      const ocSocket = new OCSocket(socket);
      server.close();
      const recipeScheduler = new RecipeScheduler(ocSocket, recipes);
      while(true) {
        await recipeScheduler.poll();
        await sleep(5000);
      }
    } catch(e: unknown) {
      throw e;
    }
  }).listen(18321);
}

main();