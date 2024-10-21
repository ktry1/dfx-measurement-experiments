//Dependencies
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles, getCanisterId, executeCommand } from 'dfx-terminal-commands';
import { makeIdentity, makeAgent, makeActor, MeasurementData, measureFunction, purifyMeasurementData, saveToExcel, getRtsData, measureDifferenceRts, RtsData, addRtsData, saveToExcelRts } from 'motoko-benchmarking-ts';
import { idlFactory as managerIdlFactory, ic_assets } from "../../src/declarations/ic-assets";
//For interacting with files and creating checksums
import * as fs from "fs";
import mime from "mime";
import path from "path";
import crypto from "crypto";

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    await startDfx();
    const canisterName = "ic-assets";
    //Getting identity
    const identity = makeIdentity();
    //Creating agent for making actors
    const agent = await makeAgent(identity);
    //Deploying canister
    await executeCommand("dfx", ["deploy", canisterName, "--argument", "(variant { Init = record {} })"]);
    const canisterId = await getCanisterId(canisterName);
    const actor: typeof ic_assets = makeActor(agent, managerIdlFactory, canisterId);
    await actor.init();
    //Topping the canister up
    await fabricateIcpToCycles(canisterName, 1000000);

    //======================================
    //TESTING
    //======================================
    const testFiles = ["1", "10", "100"];
    let testResults: RtsData[][] = [[], [], [], []];
    for (let file of testFiles) {
        console.log(`==============`);
        console.log(`Testing with ${file} MB file`);
        console.log(`==============`);
        const file_path = `assets/${file}.txt`;
        //Size of the chunk in bytes ≈ 1.9 MB out of possible ingress 2 MB for safety reasons
        const chunkSize = 2000000;
        //Uploading the asset
        console.log(`Measuring uploading file..`);
        console.log("---");
        //Granting the current identity permissions to create batches and add elements
        console.log("Getting permissions for uploading files..");
        await executeCommand("dfx", ["canister", "call", canisterName, "grant_permission",
            `(record {to_principal = principal "${identity.getPrincipal().toString()}"; permission = variant { Prepare = null }})`
        ]);
        await executeCommand("dfx", ["canister", "call", canisterName, "grant_permission",
            `(record {to_principal = principal "${identity.getPrincipal().toString()}"; permission = variant { Commit = null }})`
        ]);
        console.log("---");
        let addData = await uploadAsset(file_path, chunkSize, actor);
        let readData = await readAsset(`/${path.basename(file_path)}`, BigInt(chunkSize), actor);
        let updateData = await updateAsset(file_path, chunkSize, actor);
        let deleteData = await deleteAsset(`/${path.basename(file_path)}`, actor);
        
        //Storing data
        testResults[0].push(addData);
        testResults[1].push(readData);
        testResults[2].push(updateData);
        testResults[3].push(deleteData);
    }

    //======================================
    //WRITING TEST DATA TO TABLES
    //======================================
    console.log(`==============`);
    console.log(`Saving the data to excel table: "${canisterName}.xlsx"..`);
    console.log(`==============`);
    const headers = ['', ...testFiles.map(value => value.toString())];
    saveToExcelRts(`./measurements/results/${canisterName}.xlsx`, ["Add", "Read", "Update", "Delete"], headers, testResults)
    
    //Wrapping up the test
    await stopDfx();
    console.log(`+++++++++++++`);
    console.log(`All done!`);
}

async function uploadAsset(file_path: string, chunkSize: number, actor: typeof ic_assets) : Promise<RtsData> {
    let total_rts_usage = empty_rts_data;
    let prev_rts_data = empty_rts_data;
    let new_rts_data = empty_rts_data;
    //Creating a new batch to accomodate the file chunks
    prev_rts_data = await actor.getRtsData();
    let batchId = (await actor.create_batch({})).batch_id;
    new_rts_data = await actor.getRtsData();
    total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
    //Reading the file
    const asset_buffer = fs.readFileSync(file_path);
    //Converting the file to byte array
    const asset_uint8Array = new Uint8Array(asset_buffer);
    let total_chunks = Math.ceil(asset_uint8Array.length / chunkSize);
    //Cutting the file into chunks of chunkSize and uploading them to current storage canister
    console.log(`Uploading file in ${total_chunks} chunks..`);
    console.log("---");
    let sha256Hash = crypto.createHash("sha256");
    let chunkIds: bigint[] = [];
    for (
        let start = 0, index = 0;
        start < asset_uint8Array.length;
        start += chunkSize, index++
    ) {
        console.log(`Uploading chunk ${index + 1}/${total_chunks}..`);
        const chunk = asset_uint8Array.slice(start, start + chunkSize);
        //Feeding the created chunk into the hasher
        sha256Hash.update(chunk);
        prev_rts_data = await actor.getRtsData();
        let chunkCreationResponse = await actor.create_chunk({
            content: chunk,
            batch_id: batchId
        });
        new_rts_data = await actor.getRtsData();
        total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
        chunkIds.push(chunkCreationResponse.chunk_id);
    }
    
    //Getting the final hash and saving it to Uint8Array
    let asset_hash = new Uint8Array(sha256Hash.digest());
    //Finalizing the asset by committing batch
    prev_rts_data = await actor.getRtsData();
    await actor.commit_batch({
        batch_id: batchId,
        operations: [
            {CreateAsset: {
                key: `/${path.basename(file_path)}`,
                content_type: mime.getType(file_path)!,
                max_age: [],
                headers: [],
                enable_aliasing: [true],
                allow_raw_access: [true]
            }},
            {SetAssetContent: {
                key: `/${path.basename(file_path)}`,
                sha256: [asset_hash],
                chunk_ids: chunkIds,
                content_encoding: "identity"
            }}
        ]
    });
    new_rts_data = await actor.getRtsData();
    total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
    console.log("---");
    console.log("Asset uploaded!");
    console.log("---");
    return total_rts_usage;
}

async function readAsset(key: string, chunkSize: bigint, actor: typeof ic_assets) : Promise<RtsData> {
    console.log(`Reading an asset..`);
    let total_rts_usage = empty_rts_data;
    let prev_rts_data = empty_rts_data;
    let new_rts_data = empty_rts_data;

    //Getting the asset data which contains the first chunk of it's content
    prev_rts_data = await actor.getRtsData();
    let assetData = await actor.get({
        key: key,
        accept_encodings: ["gzip", "identity"]
    });
    new_rts_data = await actor.getRtsData();
    total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));

    //Calculating the total amount of chunks that the file by dividing byte size by chunk size in bigint format
    let totalChunks = (assetData.total_length + chunkSize - 1n) / chunkSize;
    console.log(`Total chunks:  ${totalChunks}`);
    console.log("---");
    let assetContent: Uint8Array[] = [];
    //Appending the first chunk of content that we received from 'get' function
    assetContent.push(new Uint8Array(assetData.content));
    console.log("Got the first chunk..");

    if (assetData.total_length != 1n) {
        for (let i = 1n; i < totalChunks; i++) {
            console.log(`Downloading chunk ${i + 1n}/${totalChunks}..`);
            prev_rts_data = await actor.getRtsData();
            let chunk = await actor.get_chunk({
                key: key,
                content_encoding: assetData.content_encoding,
                index: i,
                sha256: []
            })
            new_rts_data = await actor.getRtsData();
            total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
            assetContent.push(new Uint8Array(chunk.content));
        }
    }

    console.log("---");
    console.log("Asset downloaded!");
    console.log("---");
    return total_rts_usage;
}

async function deleteAsset(key: string, actor: typeof ic_assets) : Promise<RtsData> {
    let total_rts_usage = empty_rts_data;

    console.log(`Deleting an asset..`);
    let prev_rts_data = await actor.getRtsData();
    await actor.delete_asset({
        key: key
    });
    let new_rts_data = await actor.getRtsData();
    total_rts_usage = measureDifferenceRts(new_rts_data, prev_rts_data);

    console.log("---");
    console.log("Asset deleted!");
    console.log("---");
    return total_rts_usage;
}

async function updateAsset(file_path: string, chunkSize: number, actor: typeof ic_assets) : Promise<RtsData> {
    let total_rts_usage = empty_rts_data;
    let prev_rts_data = empty_rts_data;
    let new_rts_data = empty_rts_data;
    console.log("Updating an asset..");

    //==================================================
    //UPLOADING NEW ASSET CONTENT IN CHUNKS
    //==================================================
    //Creating a new batch to accomodate the file chunks
    prev_rts_data = await actor.getRtsData();
    let batchId = (await actor.create_batch({})).batch_id;
    new_rts_data = await actor.getRtsData();
    total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
    //Reading the file
    const asset_buffer = fs.readFileSync(file_path);
    //Converting the file to byte array
    const asset_uint8Array = new Uint8Array(asset_buffer);
    let total_chunks = Math.ceil(asset_uint8Array.length / chunkSize);
    //Cutting the file into chunks of chunkSize and uploading them to current storage canister
    console.log(`Uploading file in ${total_chunks} chunks..`);
    console.log("---");
    let sha256Hash = crypto.createHash("sha256");
    let chunkIds: bigint[] = [];
    for (
        let start = 0, index = 0;
        start < asset_uint8Array.length;
        start += chunkSize, index++
    ) {
        console.log(`Uploading chunk ${index + 1}/${total_chunks}..`);
        const chunk = asset_uint8Array.slice(start, start + chunkSize);
        //Feeding the created chunk into the hasher
        sha256Hash.update(chunk);
        prev_rts_data = await actor.getRtsData();
        let chunkCreationResponse = await actor.create_chunk({
            content: chunk,
            batch_id: batchId
        });
        new_rts_data = await actor.getRtsData();
        total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
        chunkIds.push(chunkCreationResponse.chunk_id);
    }
    
    //Getting the final hash and saving it to Uint8Array
    let asset_hash = new Uint8Array(sha256Hash.digest());
    
    //==================================================
    //UPDATING THE ASSET CONTENT
    //==================================================
    console.log("---");
    console.log("Updating asset's content..");
    prev_rts_data = await actor.getRtsData();
    await actor.set_asset_content({
        key: `/${path.basename(file_path)}`,
        sha256: [asset_hash],
        chunk_ids: chunkIds,
        content_encoding: "identity"
    });
    new_rts_data = await actor.getRtsData();
    total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
    console.log("---");
    console.log("Asset content updated!");
    console.log("---");
    return total_rts_usage;
};

//To set the empty rts_parameter values
let empty_rts_data = {
    rts_stable_memory_size: 0n,
    rts_memory_size: 0n,
    rts_total_allocation: 0n,
    rts_reclaimed: 0n,
    rts_heap_size: 0n,
    rts_collector_instructions: 0n,
    rts_mutator_instructions: 0n
};

main();