//Dependencies
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles, getCanisterId, executeCommand } from 'dfx-terminal-commands';
import { makeIdentity, makeAgent, makeActor, MeasurementData, measureFunction, purifyMeasurementData, saveToExcel, getRtsData, measureDifferenceRts, RtsData, addRtsData, saveToExcelRts } from 'motoko-benchmarking-ts';
import { idlFactory as indexFactory, nacdb_index } from "../../src/declarations/nacdb_index";
import { idlFactory as partitionFactory, nacdb_partition } from "../../src/declarations/nacdb_partition";
import { Principal } from "@dfinity/principal";

export type AttributeValuePrimitive = { 'int' : bigint } |
  { 'float' : number } |
  { 'bool' : boolean } |
  { 'text' : string };

type AttributeValue = { 'int' : bigint } |
  { 'float' : number } |
  { 'tuple' : Array<AttributeValuePrimitive> } |
  { 'bool' : boolean } |
  { 'text' : string } |
  { 'arrayBool' : Array<boolean> } |
  { 'arrayText' : Array<string> } |
  { 'arrayInt' : Array<bigint> } |
  { 'arrayFloat' : Array<number> };

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    await startDfx();
    const canisterName = "nacdb_partition";
    const managerName = "nacdb_index";
    //Getting identity
    const identity = makeIdentity();
    //Creating agent
    const agent = await makeAgent(identity);
    //Deploying canister and getting id
    await deployCanister(managerName);
    const managerId = await getCanisterId(managerName);
    const index: typeof nacdb_index = makeActor(agent, indexFactory, managerId);
    //Initializing the index canister and at the same time creating a partition canister
    await index.init();
    //Obtaining canister id and actor to interact with
    const canisterId = (await index.getCanisters())[0].toString();
    const partition: typeof nacdb_partition = makeActor(agent, partitionFactory, canisterId);
    //Topping the canister up
    await fabricateIcpToCycles(canisterId, 1000000);

    //======================================
    //TESTING
    //======================================
    const testValues: bigint[] = [1n, 10n, 100n, 1000n, 10000n, 100000n, 1000000n, 10000000n];
    //Generating arrays for each function that we want to test
    let testResults: MeasurementData[][] = [[], [], [], []];
    console.log(`+++++++++`);
    console.log(`Beginning testing of canister: "${canisterName}"`);

    //Measurements
    for (let value of testValues) {
      console.log(`==============`);
      console.log(`Testing with ${value} elements`);
      console.log(`==============`);

      //Creating a subDb inside of the partition canister
      let result = await index.createSubDB(generate128BitGUID(), {userData: "", hardCap: []});
      //Saving the outer and inner keys of the created subDb
      let subDbData = {outer: result.outer, inner: result.inner};

      console.log(`Measuring for loop usage..`);
      let forLoopUsage = await measureFunction(partition, partition.for_loop, [0n, value]);
      console.log(`Measuring adding elements..`);
      let addData = await measureFunction(partition, partition.add_batch, [0n, value, subDbData.inner.key]);
      console.log(`Measuring reading elements..`);
      let readData = await measureFunction(partition, partition.read_batch, [0n, value, subDbData.inner.key]);
      console.log(`Measuring updating elements..`);
      let updateData = await measureFunction(partition, partition.update_batch, [0n, value, subDbData.inner.key]);
      console.log(`Measuring deleting elements..`);
      let deleteData = await measureFunction(partition, partition.delete_batch, [0n, value, subDbData.inner.key]);

      //Storing data, substracting resources used by 'for loop' for cleaner results
      console.log(`Storing the test data..`);
      testResults[0].push(purifyMeasurementData(addData, forLoopUsage));
      testResults[1].push(purifyMeasurementData(readData, forLoopUsage));
      testResults[2].push(purifyMeasurementData(updateData, forLoopUsage));
      testResults[3].push(purifyMeasurementData(deleteData, forLoopUsage));        
      await partition.delete_all();        
  }
    //======================================
    //WRITING TEST DATA TO TABLES
    //======================================
    console.log(`==============`);
    console.log(`Saving the data to excel table: "${canisterName}.xlsx"..`);
    console.log(`==============`);

    //Generating headers for Excel table from test values
    const headers = ['', ...testValues.map(value => value.toString())];
    saveToExcel(`./measurements/results/${canisterName}.xlsx`, ["Add", "Read", "Update", "Delete"], headers, testResults);
    
    //Wrapping up the test
    await stopDfx();
    console.log(`+++++++++++++`);
    console.log(`All done!`);
}

function generate128BitGUID(): Uint8Array {
    const array = new Uint8Array(16); // 128 bits / 8 bits per element = 16 elements
  
    // Fill the array with random values between 0 and 255
    crypto.getRandomValues(array);
  
    return array;
}

main();