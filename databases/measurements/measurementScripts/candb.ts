//Dependencies
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles, getCanisterId, executeCommand } from 'dfx-terminal-commands';
import { makeIdentity, makeAgent, makeActor, MeasurementData, measureFunction, purifyMeasurementData, saveToExcel, getRtsData, measureDifferenceRts, RtsData, addRtsData, saveToExcelRts } from 'motoko-benchmarking-ts';
import { idlFactory as indexFactory, candb_index } from "../../src/declarations/candb_index";
import { idlFactory as serviceFactory, candb_service } from "../../src/declarations/candb_service";

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    await startDfx();
    const canisterName = "candb_service";
    const managerName = "candb_index";
    //Getting identity
    const identity = makeIdentity();
    //Creating agent
    const agent = await makeAgent(identity);
    //Deploying canister and getting id
    await deployCanister(managerName);
    const managerId = await getCanisterId(managerName);
    const index: typeof candb_index = makeActor(agent, indexFactory, managerId);
    //Creating a service canister by group name
    await index.createHelloServiceCanisterByGroup("1");
    //Obtaining canister id and actor to interact with
    const canisterId = (await index.getCanistersByPK("group#1"))[0];
    const service: typeof candb_service = makeActor(agent, serviceFactory, canisterId);
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

        console.log(`Measuring for loop usage..`);
        let forLoopUsage = await measureFunction(service, service.for_loop, [0n, value]);
        console.log(`Measuring adding elements..`);
        let addData = await measureFunction(service, service.add_batch, [0n, value]);
        console.log(`Measuring reading elements..`);
        let readData = await measureFunction(service, service.read_batch, [0n, value]);
        console.log(`Measuring updating elements..`);
        let updateData = await measureFunction(service, service.update_batch, [0n, value]);
        console.log(`Measuring deleting elements..`);
        let deleteData = await measureFunction(service, service.delete_batch, [0n, value]);

        //Storing data, substracting resources used by 'for loop' for cleaner results
        console.log(`Storing the test data..`);
        testResults[0].push(addData);
        testResults[1].push(purifyMeasurementData(readData, forLoopUsage));
        testResults[2].push(updateData);
        testResults[3].push(purifyMeasurementData(deleteData, forLoopUsage));        
        await service.delete_all();        
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

main();