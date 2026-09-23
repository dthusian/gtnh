import { createServer } from "net";
import { OCSocket } from "./ocsocket";
import { MachineConfig } from "./ machine";

const config: MachineConfig[] = [
  {
    machineType: "lcr",
    
  }
]

createServer(async socket => {
  try {
    console.log("got connection: " + socket.remoteAddress);
    const ocSocket = new OCSocket(socket);
    console.log("executing lua...");
    const res = await ocSocket.executeLua(`return require("computer").address()`);
    console.log("got result: " + res);
  } catch(e: unknown) {
    console.log(e);
  }
}).listen(18320);