//Libraries
import 'dotenv/config';
//Dependencies
import { idlFactory, map } from "../../../src/declarations/map";
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles } from '../../utils/DfxTerminalCommands';
import { makeIdentity, makeAgent, makeActor, getRtsData } from '../../utils/MeasurementDependencies';

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    await startDfx();
    const canisterName = "map";
    const canisterId: string = process.env.CANISTER_ID_MAP!;
    //Getting identity
    const identity = makeIdentity();
    //Creating agent
    const agent = await makeAgent(identity);
    //Creating actor for calling canister 
    const actor: typeof map = makeActor(agent, idlFactory, canisterId);
    await deployCanister(canisterName, canisterId);
    //Topping the canister up
    await fabricateIcpToCycles(canisterName, 1000000);

    //======================================
    //TESTING THE LIMITS
    //======================================
    console.log(`==============`);
    console.log(`Testing the limits of ${canisterName}`);
    console.log(`==============`);

    let elementCounter = 0n;
    let maxEpochs = 100;
    let totalEpochs = 0;
    let insertionNumber = 10000000n;
    while (insertionNumber != 0n && totalEpochs <= maxEpochs) {
        try {
            totalEpochs += 1;
            console.log("----------");
            console.log(`Epoch: ${totalEpochs}/${maxEpochs}`);
            console.log(`Inserting ${insertionNumber} elements..`);
            await actor.add_batch(elementCounter, insertionNumber);
            elementCounter += insertionNumber;
            console.log(`Total elements: ${elementCounter}`);
            console.log("----------");
        } catch(e) {
            console.log("+++");
            console.log(e);
            console.log("---");
            insertionNumber = insertionNumber / 2n;
            console.log(`Insertion number reduced to: ${insertionNumber} elements`);
            console.log("+++");
        }
    }
    console.log(`==============`);
    console.log(`Max inserted elements: ${elementCounter}`);
    let data = await getRtsData(actor);
    console.log("---");
    console.log(data);

    //Wrapping up the test
    await stopDfx();
    console.log(`+++++++++++++`);
    console.log(`All done!`);
}

main();