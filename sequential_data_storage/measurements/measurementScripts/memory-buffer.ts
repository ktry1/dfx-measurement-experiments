//Dependencies
import {idlFactory, memory_buffer} from "../../src/declarations/memory-buffer";
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles, getCanisterId } from 'dfx-terminal-commands';
import { makeIdentity, makeAgent, makeActor, MeasurementData, measureFunction, purifyMeasurementData, saveToExcel, getRtsData, measureDifference, saveToExcelCustom } from 'motoko-benchmarking-ts';
import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";

//Extended measurement type for measuring stable memory bytes from MemoryRegion
type ExtendedMeasurementData = {
    rts_stable_memory_size: bigint;
    rts_memory_size: bigint;
    rts_total_allocation: bigint;
    rts_reclaimed: bigint;
    rts_heap_size: bigint;
    instruction_count: bigint;
    rts_collector_instructions: bigint;
    rts_mutator_instructions: bigint;
    bytes: bigint;
    metadata_bytes: bigint;
};

//Extended measuring function for getting rts_data + stable memory bytes from MemoryRegion
async function measureFunctionExtended<T extends (...args: any[]) => Promise<bigint>>(
    actor: ActorSubclass<any>,
    fn: T,
    args: Parameters<T>
): Promise<ExtendedMeasurementData> {
    let prev_rts_data = await getRtsData(actor);
    let prev_stable_memory_data: {bytes: bigint, metadata_bytes: bigint} = await actor.getStableMemoryData();
    let instructionCount = 0n;
    try {
        instructionCount = await fn(...args);
    } catch(e) {
        console.log("+++");
        console.log("Function call failed");
        console.log(e);
        console.log("+++");
        return {
            rts_stable_memory_size: 0n,
            rts_memory_size: 0n,
            rts_total_allocation: 0n,
            rts_reclaimed: 0n,
            rts_heap_size: 0n,
            instruction_count: 0n,
            rts_collector_instructions: 0n,
            rts_mutator_instructions: 0n,
            bytes: 0n,
            metadata_bytes: 0n
        }
    }
    let new_rts_data = await getRtsData(actor);
    let new_stable_memory_data = await actor.getStableMemoryData();

    let extendedMeasurementData = {
        ...measureDifference(new_rts_data, prev_rts_data, instructionCount),
        bytes: new_stable_memory_data.bytes - prev_stable_memory_data.bytes,
        metadata_bytes: new_stable_memory_data.metadata_bytes - prev_stable_memory_data.metadata_bytes
    };

    return extendedMeasurementData;
}

//Purification function for ExtendedMeasurementData(
function purifyExtendedMeasurementData(data: ExtendedMeasurementData, base: ExtendedMeasurementData) : ExtendedMeasurementData {
    //If the measurement result failed (is filled with 0n) - return it without substraction
    if (data.instruction_count == 0n) {
        return data;
    }
    let results = {
        rts_stable_memory_size: data.rts_stable_memory_size - base.rts_stable_memory_size,
        rts_memory_size: data.rts_memory_size - base.rts_memory_size,
        rts_total_allocation: data.rts_total_allocation - base.rts_total_allocation,
        rts_reclaimed: data.rts_reclaimed - base.rts_reclaimed,
        rts_heap_size: data.rts_heap_size - base.rts_heap_size,
        instruction_count: data.instruction_count - base.instruction_count,
        rts_collector_instructions: data.rts_collector_instructions - base.rts_collector_instructions,
        rts_mutator_instructions: data.rts_mutator_instructions,
        bytes: data.bytes - base.bytes,
        metadata_bytes: data.metadata_bytes - base.metadata_bytes
    }
    return results;
};

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    await startDfx();
    const canisterName = "memory-buffer";
    //Getting identity
    const identity = makeIdentity();
    //Creating agent
    const agent = await makeAgent(identity);
    //Deploying canister and getting id
    await deployCanister(canisterName);
    const canisterId = await getCanisterId(canisterName);
    //Creating actor for calling canister 
    const actor: typeof memory_buffer = makeActor(agent, idlFactory, canisterId);
    //Topping the canister up
    await fabricateIcpToCycles(canisterName, 1000000);

    //======================================
    //TESTING
    //======================================
    const testValues: bigint[] = [1n, 10n, 100n, 1000n, 10000n, 100000n, 1000000n, 10000000n];
    //Generating arrays for each function that we want to test
    let testResults: ExtendedMeasurementData[][] = [[], [], [], [], []];
       console.log(`+++++++++`);
    console.log(`Beginning testing of canister: "${canisterName}"`);
    
    //Measurements
    for (let value of testValues) {
        console.log(`==============`);
        console.log(`Testing with ${value} elements`);
        console.log(`==============`);
    
        console.log(`Measuring for loop usage..`);
        let forLoopUsage = await measureFunctionExtended(actor, actor.for_loop, [0n, value]);
        console.log(`Measuring adding elements..`);
        let addData = await measureFunctionExtended(actor, actor.add_batch, [0n, value]);
        console.log(`Measuring reading elements..`);
        let readData = await measureFunctionExtended(actor, actor.read_batch, [0n, value]);
        console.log(`Measuring updating elements..`);
        let updateData = await measureFunctionExtended(actor, actor.update_batch, [0n, value]);
        console.log(`Measuring transforming to immutable array..`);
        let TransformData = await measureFunctionExtended(actor, actor.transformToArray, []);
        console.log(`Measuring deleting elements..`);
        let deleteData = await measureFunctionExtended(actor, actor.delete_batch, [0n, value]);
    
        //Storing data, substracting resources used by 'for loop' for cleaner results
        console.log(`Storing the test data..`);
        testResults[0].push(purifyExtendedMeasurementData(addData, forLoopUsage));
        testResults[1].push(purifyExtendedMeasurementData(readData, forLoopUsage));
        testResults[2].push(purifyExtendedMeasurementData(updateData, forLoopUsage));
        testResults[3].push(purifyExtendedMeasurementData(deleteData, forLoopUsage));
        testResults[4].push(TransformData);        
        await actor.delete_all();        
    }

    //======================================
    //WRITING TEST DATA TO TABLES
    //======================================
    console.log(`==============`);
    console.log(`Saving the data to excel table: "${canisterName}.xlsx"..`);
    console.log(`==============`);
    //Generating headers for Excel table from test values
    const headers = ['', ...testValues.map(value => value.toString())];
    saveToExcelCustom(`./measurements/results/${canisterName}.xlsx`, ["Δ Stable memory pages", "Δ Total Memory", "Δ Allocated memory", "Δ Reclaimed memory", "Δ Heap memory", "Δ Instructions", "Δ GC instructions", "Δ Mutator instructions", "Δ stable bytes", "Δ stable metadata"], ["Add", "Read", "Update", "Delete", "TransformToArray"], headers, testResults);
    
    //Wrapping up the test
    await stopDfx();
    console.log(`+++++++++++++`);
    console.log(`All done!`);
};

main();