
export type FluidStack = {
  id: string,
  amount: number
};

export type ItemStack = {
  id: string,
  meta: number,
  nc: boolean,
  amount: number
};

export type Recipe = {
  name: string,
  machineType: string,
  itemInputs: ItemStack[],
  fluidInputs: FluidStack[],
  itemOutputs: ItemStack[],
  fluidOutputs: FluidStack[],
  maintainItems: number[],
  maintainFluids: number[]
};