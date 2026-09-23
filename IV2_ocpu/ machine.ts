import { OCSocket } from "./ocsocket";

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
  tpSide: MachineSide,
  intUuid: string,
  intSide: MachineSide
}

export type MachineConfig = {
  machineType: string,
  itemInput: TransposerConfig,
  fluidInput: TransposerConfig
};

class MachineState {
  config: MachineConfig;
  socket: OCSocket | null = null;

  constructor(config: MachineConfig) {
    this.config = config;
  }

  async onAddSocket(socket: OCSocket) {
    this.socket = socket;
    // empty the machine
    const scriptEmptyThing = (tpUuid: string, tpSide: string, ) => `
`;
  }

  async onPoll() {

  }
}

export class MachineManager {
  states: MachineState[];

  constructor(configs: MachineConfig[]) {
    this.states = configs.map(v => new MachineState(v));
  }

  async addSocket(socket: OCSocket) {
    // not immune to injection attacks
    const scriptListComponent = (ty: string) => `
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
}