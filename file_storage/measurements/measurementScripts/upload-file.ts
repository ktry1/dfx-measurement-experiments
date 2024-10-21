//Dependencies
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles, getCanisterId, executeCommand } from 'dfx-terminal-commands';
import { makeIdentity, makeAgent, makeActor, MeasurementData, measureFunction, purifyMeasurementData, saveToExcel, getRtsData, measureDifferenceRts, RtsData, addRtsData, saveToExcelRts } from 'motoko-benchmarking-ts';
import { idlFactory as managerIdlFactory, file_scaling_manager } from "../../src/declarations/file-scaling-manager";
import { idlFactory as storageIdlFactory, file_storage } from '../../src/declarations/file-storage';
//For interacting with files and creating checksums
import * as fs from "fs";
import mime from "mime";
import path from "path";
import CRC32 from "crc-32";
//For making HTTP requests
import axios from 'axios';

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    //starting dfx with 8080 port explicitly as the new default port is 4943 and the canister uses port 8080 for generating file urls
    await executeCommand("dfx", ["start", "--background", "--clean", "--host", "127.0.0.1:8080"]);
    const canisterName = "file-scaling-manager";
    //Getting identity
    const identity = makeIdentity();
    //Creating agent for making actors
    const agent = await makeAgent(identity);
    //Deploying FileScalingManager canister and getting id
    await executeCommand("dfx", ["deploy", canisterName, "--argument", "false"]);
    const canisterId = await getCanisterId(canisterName);
    //Creating actor for calling canister 
    const managerActor: typeof file_scaling_manager = makeActor(agent, managerIdlFactory, canisterId);
    //Topping the canister up
    await fabricateIcpToCycles(canisterName, 1000000);
    await managerActor.init();
    //Getting the address of deployed FileStorage canister
    const storagePrincipal = await managerActor.get_file_storage_canister_id();
    console.log(`FileStorage Principal: ${storagePrincipal}`);
    //Getting the actor of created storageActor
    const storageActor: typeof file_storage = makeActor(agent, storageIdlFactory, storagePrincipal);
    
    //======================================
    //TESTING
    //======================================
    const testFiles = ["1", "10", "100"];
    let testResults: RtsData[][] = [[], [], []]; 
    for (let file of testFiles) {
      console.log(`==============`);
      console.log(`Testing with ${file} MB file`);
      console.log(`==============`);
      const file_path = `assets/${file}.txt`;
      //Size of the chunk in bytes ≈ 1.9 MB out of possible ingress 2 MB for safety reasons
      const chunkSize = 2000000;
      //Uploading the asset
      console.log(`Measuring uploading file..`);
      let [addData, assetId] = await uploadAsset(file_path, chunkSize, storageActor);
      let assetData = await storageActor.get(assetId);
      let assetUrl = "";
      if ("ok" in assetData) {
        assetUrl = assetData.ok.url;
      }
      //console.log(`Measuring reading file with HTTP..`);
      //let readDataHttp = await readAssetHttp(assetUrl, storageActor);
      console.log(`Measuring reading file..`);
      let [, readData] = await readAsset(assetId, storageActor);
      console.log(`Measuring deleting file..`);
      let deleteData = await deleteAsset(assetId, storageActor);
      
      //Storing data
      testResults[0].push(addData);
      testResults[1].push(readData);
      //testResults[2].push(readDataHttp);
      testResults[2].push(deleteData);        
    } 

    //======================================
    //WRITING TEST DATA TO TABLES
    //======================================
    console.log(`==============`);
    console.log(`Saving the data to excel table: "upload-file.xlsx"..`);
    console.log(`==============`);
    const headers = ['', ...testFiles.map(value => value.toString())];
    saveToExcelRts(`./measurements/results/upload-file.xlsx`, ["Add", "Read", "Delete"], headers, testResults)
    
    //Wrapping up the test
    await stopDfx();
    console.log(`+++++++++++++`);
    console.log(`All done!`);
    }

const uploadChunk = async ({ storageActor, chunk, order }) => {
  return storageActor.create_chunk(chunk, order);
};

async function uploadAsset(file_path: string, chunkSize: number, storageActor: typeof file_storage) : Promise<[RtsData, string]> {
    //Reading the file
    const asset_buffer = fs.readFileSync(file_path);
    //Converting the file to byte array
    const asset_uint8Array = new Uint8Array(asset_buffer);
    //Starting checksum that will be used to verify the validity of data
    let checksum = 0n;
    //Vector of ids of all uploaded file chunks
    let chunk_ids: bigint[] = [];
    let total_rts_usage: RtsData = {
      rts_stable_memory_size: 0n,
      rts_memory_size: 0n,
      rts_total_allocation: 0n,
      rts_reclaimed: 0n,
      rts_heap_size: 0n,
      rts_collector_instructions: 0n,
      rts_mutator_instructions: 0n
    };
    let total_chunks = Math.ceil(asset_uint8Array.length / chunkSize);
    //Cutting the file into chunks of chunkSize and uploading them to current storage canister
    console.log(`Uploading file in ${total_chunks} chunks..`);
    console.log("---");
    for (
        let start = 0, index = 0;
        start < asset_uint8Array.length;
        start += chunkSize, index++
    ) {
        console.log(`Uploading chunk ${index + 1}/${total_chunks}..`);
        const chunk = asset_uint8Array.slice(start, start + chunkSize);
    
        checksum = BigInt(updateChecksum(chunk, checksum));
        let prev_rts_data = await storageActor.getRtsData();
        chunk_ids.push(
          await uploadChunk({
            storageActor,
            chunk,
            order: index,
          }
        ));
        let new_rts_data = await storageActor.getRtsData();
        let rts_delta = measureDifferenceRts(new_rts_data, prev_rts_data);
        total_rts_usage = addRtsData(total_rts_usage, rts_delta);
    }
    console.log("---");

    //Committing the asset
    let prev_rts_data = await storageActor.getRtsData();
    const asset_filename = path.basename(file_path);
    const asset_content_type = mime.getType(file_path);
    const result = await storageActor.commit_batch(
        chunk_ids,
        {
          filename: asset_filename,
          checksum: checksum,
          content_encoding: { Identity: null },
          content_type: asset_content_type!,
        }
    );
    let new_rts_data = await storageActor.getRtsData();
    total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));

    if("err" in result) {
      console.log("Uploading the asset failed");
      return [
      {
        rts_stable_memory_size: 0n,
        rts_memory_size: 0n,
        rts_total_allocation: 0n,
        rts_reclaimed: 0n,
        rts_heap_size: 0n,
        rts_collector_instructions: 0n,
        rts_mutator_instructions: 0n
      }, 
      ""
    ]
    }
  console.log('Asset uploaded! Asset_ID:', result.ok);

  return [total_rts_usage, result.ok];
}

async function readAssetHttp(assetUrl: string, storageActor: typeof file_storage) : Promise<RtsData> {
  let prev_rts_data = await storageActor.getRtsData();
  //Downloading the file
  console.log(`Reading asset using HTTP..`);
  try {
    const response = await axios({
      url: assetUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 5000
    });

  } catch (e) {console.log(e)};
  let new_rts_data = await storageActor.getRtsData();
  console.log("Read successfully!");
  return measureDifferenceRts(new_rts_data, prev_rts_data);
};

async function readAsset(assetId: string, storageActor: typeof file_storage) : Promise<[Uint8Array[], RtsData]> {
  let assetData = await storageActor.get(assetId);
  if ("err" in assetData) {
    console.log("Failed to read asset");
    return [
      [],
      {
        rts_stable_memory_size: 0n,
        rts_memory_size: 0n,
        rts_total_allocation: 0n,
        rts_reclaimed: 0n,
        rts_heap_size: 0n,
        rts_collector_instructions: 0n,
        rts_mutator_instructions: 0n
      }
    ]
  }

  let total_rts_usage = {
    rts_stable_memory_size: 0n,
    rts_memory_size: 0n,
    rts_total_allocation: 0n,
    rts_reclaimed: 0n,
    rts_heap_size: 0n,
    rts_collector_instructions: 0n,
    rts_mutator_instructions: 0n
  };
  let chunks: Uint8Array[] = [];
  let total_chunks = assetData.ok.chunks_size;
  console.log(`Reading file of ${total_chunks} chunks..`);
  console.log("---");

  for (let i = 0n; i < assetData.ok.chunks_size; i++) {
    console.log(`Reading chunk ${i + 1n}/${total_chunks}..`);
    let prev_rts_data = await storageActor.getRtsData();
    let result = await storageActor.getChunk(assetId, i);
    if ("ok" in result) {
      let new_rts_data = await storageActor.getRtsData();
      total_rts_usage = addRtsData(total_rts_usage, measureDifferenceRts(new_rts_data, prev_rts_data));
      chunks.push(new Uint8Array(result.ok));
    
    } else {
      console.log("Failed to read asset");
      return [
        [],
        {
          rts_stable_memory_size: 0n,
          rts_memory_size: 0n,
          rts_total_allocation: 0n,
          rts_reclaimed: 0n,
          rts_heap_size: 0n,
          rts_collector_instructions: 0n,
          rts_mutator_instructions: 0n
        }
      ]
    }
  }
  console.log("---");
  return [chunks, total_rts_usage];
}

async function deleteAsset(assetId: string, storageActor: typeof file_storage) : Promise<RtsData> {
  let prev_rts_data = await storageActor.getRtsData();
  console.log(await storageActor.delete_asset(assetId));
  let new_rts_data = await storageActor.getRtsData();
  return measureDifferenceRts(new_rts_data, prev_rts_data);
};

//Function from utils.cjs
function updateChecksum(chunk, checksum) {
    const moduloValue = 400000000; // Range: 0 to 400_000_000
  
    // Calculate the signed checksum for the given chunk
    const signedChecksum = CRC32.buf(Buffer.from(chunk, "binary"), 0);
  
    // Convert the signed checksum to an unsigned value
    const unsignedChecksum = signedChecksum >>> 0;
  
    // Update the checksum and apply modulo operation
    const updatedChecksum = (checksum + BigInt(unsignedChecksum)) % BigInt(moduloValue);
  
    // Return the updated checksum
    return updatedChecksum;
}
  

main();