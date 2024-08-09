//Dependencies
import { idlFactory, Trie } from '../../../src/declarations/Trie';
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles, getCanisterId } from 'dfx-terminal-commands';
import { makeIdentity, makeAgent, makeActor, MeasurementData, measureFunction, purifyMeasurementData, saveToExcel, getRtsData } from 'motoko-benchmarking-ts';

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    await startDfx();
    const canisterName = "Trie";
    //Getting identity
    const identity = makeIdentity();
    //Creating agent
    const agent = await makeAgent(identity);
    //Deploying canister and getting id
    await deployCanister(canisterName);
    const canisterId = await getCanisterId(canisterName);
    //Creating actor for calling canister 
    const actor: typeof Trie = makeActor(agent, idlFactory, canisterId);
    //Topping the canister up
    await fabricateIcpToCycles(canisterName, 1000000);

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
    
        console.log(`Measuring for loop usage..`);
        let forLoopUsage = await measureFunction(actor, actor.for_loop, [0n, value]);
        console.log(`Measuring adding elements..`);
        let addData = await measureFunction(actor, actor.add_batch, [0n, value]);
        console.log(`Measuring reading elements..`);
        let readData = await measureFunction(actor, actor.read_batch, [0n, value]);
        console.log(`Measuring updating elements..`);
        let updateData = await measureFunction(actor, actor.update_batch, [0n, value]);
        console.log(`Measuring deleting elements..`);
        let deleteData = await measureFunction(actor, actor.delete_batch, [0n, value]);
    
        //Storing data, substracting resources used by 'for loop' for cleaner results
        console.log(`Storing the test data..`);
        testResults[0].push(purifyMeasurementData(addData, forLoopUsage));
        testResults[1].push(purifyMeasurementData(readData, forLoopUsage));
        testResults[2].push(purifyMeasurementData(updateData, forLoopUsage));
        testResults[3].push(purifyMeasurementData(deleteData, forLoopUsage));        
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
    saveToExcel(`./measurements/key_value_storage/results/${canisterName}.xlsx`, ["Add", "Read", "Update", "Delete"], headers, testResults);
    
    //Wrapping up the test
    await stopDfx();
    console.log(`+++++++++++++`);
    console.log(`All done!`);
};

main();