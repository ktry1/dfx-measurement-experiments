//Dependencies
import { startDfx, stopDfx, deployCanister, fabricateIcpToCycles, getCanisterId, executeCommand } from 'dfx-terminal-commands';
import { makeIdentity, makeAgent, makeActor, MeasurementData, measureFunction, purifyMeasurementData, saveToExcel, getRtsData, measureDifferenceRts, RtsData, addRtsData, saveToExcelRts } from 'motoko-benchmarking-ts';
import { idlFactory as managerIdlFactory, file_scaling_manager_modified } from "../declarations/file-scaling-manager_modified";
import { idlFactory as storageIdlFactory, assets_modified } from '../declarations/assets_modified';
import { Actor, HttpAgent } from '@dfinity/agent';

//Importing util functions
import { createPromiseWithRetry, formatFilepath } from './utils';
//For interacting with files and creating checksums
import * as fs from "fs";
import mime from "mime";
import path from "path";
import crypto from "crypto";
//For visualing the upload/download progress
import cliProgress from "cli-progress";

type ChunkUploadPromise = Promise<{ ok: { chunk_id: bigint; }} | {err: ErrorType} >;
type ErrorType = { Canister_Full: null };
type AssetMetadata = {
    storageAddress:  string,
    key: string,
    totalChunks: number,
    hash: Uint8Array,
    content_encoding: string
};
type ChunkDownloadPromise = Promise<{ content: Uint8Array | number[]; }>;

async function main() {
    //======================================
    //PREPARATIONS
    //======================================
    //starting dfx with 8080 port explicitly as the new default port is 4943 and the canister uses port 8080 for generating file urls
    await executeCommand("dfx", ["start", "--background", "--clean", "--host", "127.0.0.1:8080"]);
    const canisterName = "file-scaling-manager_modified";
    //Getting identity
    const identity = makeIdentity();
    //Creating agent for making actors
    const agent = await makeAgent(identity);
    //Deploying FileScalingManager canister and getting id
    await executeCommand("dfx", ["deploy", canisterName, "--argument", "false"]);
    const canisterId = await getCanisterId(canisterName);
    //Creating actor for calling canister 
    const managerActor: typeof file_scaling_manager_modified = makeActor(agent, managerIdlFactory, canisterId);
    //Topping the canister up
    await fabricateIcpToCycles(canisterName, 1000000);
    await managerActor.init();
    //Getting the address of deployed FileStorage canister
    const storagePrincipal = await managerActor.get_file_storage_canister_id();
    console.log(`FileStorage Principal: ${storagePrincipal}`);
    //Getting the actor of created storageActor
    const storageActor: typeof assets_modified = makeActor(agent, storageIdlFactory, storagePrincipal);
    
    //======================================
    //TESTING
    //======================================
    const testFiles = ["1.txt", "10.txt", "100.txt"];

    for (let file of testFiles) {
      console.log(`==============`);
      console.log(`Testing with file: '${file}'`);
      console.log(`==============`);
      const file_path = `assets/${file}`;
      const output_folder = `downloads`;
      //Size of the chunk in bytes ≈ 1.9 MB out of possible ingress 2 MB for safety reasons
      const chunkSizeBytes = 2000000;
      //Uploading the asset
      let assetMetadata = await uploadAsset(file_path, chunkSizeBytes, storageActor, managerActor, agent);
      await downloadAsset(output_folder, assetMetadata, agent);
    } 
    
    //Wrapping up the test
    await stopDfx();
    console.log(`+++++++++++++`);
    console.log(`All done!`);
}

async function uploadChunks(file_path: string, actor: typeof assets_modified, managerActor: typeof file_scaling_manager_modified, chunkSizeBytes: number, batchId: bigint, start_offset: number, uploadBar: cliProgress.Bar, maxConcurrentUploads: number, maxRetries: number) {
    let chunkIds: bigint[] = [];
    let promises: ChunkUploadPromise[] = [];

    const chunksUploadPromise = new Promise<void>((resolve, reject) => {
        //Creating the read stream with set chunk size
        const readStream = fs.createReadStream(file_path, {
            highWaterMark: chunkSizeBytes,
            start: start_offset
        });

        readStream.on('data', async(chunk) => {
            const singleChunkPromise = uploadSingleChunk(chunk, actor, batchId);
            promises.push(createPromiseWithRetry(() => singleChunkPromise, maxRetries, 2000));

            //If the number of prepared promises is equal to Max concurrent uploads -> send them and await for results
            if (promises.length == maxConcurrentUploads) {
                readStream.pause();
                let new_chunk_ids = await handleChunkUploadPromises(promises, uploadBar);

                //If the canister is full and we cannot push more chunks -> stop the readStream and return the already created chunks
                if (new_chunk_ids.length != promises.length) {
                    readStream.destroy();
                    chunkIds.push(...new_chunk_ids);
                    console.log("Exiting readStream...");
                    resolve();
                    return chunkIds;
                } 

                chunkIds.push(...new_chunk_ids);
                promises = [];
                readStream.resume();    
            }
        });

        readStream.on('end', async () => {
            chunkIds.push(...await handleChunkUploadPromises(promises, uploadBar));
            resolve();
        });

        readStream.on('error', (err) => {
            console.error('Error while reading chunks: ', err);
            reject(err);
        });
    });
    
    try {
        await chunksUploadPromise;
    } catch (err) {
        console.log("\n Canister is full");
    }
    //Extracting the chunk ids from successful chunk uploads
    uploadBar.stop();
    
    return chunkIds;
}

async function handleChunkUploadPromises (promises: ChunkUploadPromise[], uploadBar: cliProgress.Bar) : (Promise<bigint[]>) {
    let chunkIds: bigint[] = [];

    let results = await Promise.allSettled(promises);

    for (let i = 0; i < results.length; i++) {
        let result = results[i];
        //If the promise is rejected even after retries -> stop execution, upload failed
        if (result.status === "rejected") {
            console.error(`Promise ${i + 1} rejected with:`);
            console.log(results[i]);
            throw(results[i]);
        } else {

            //If the requst did not cause any unexpected errors             
            if ("err" in result.value) {
                uploadBar.stop();
                if ("Canister_Full" in result.value.err) {
                    console.log("Canister full, comitting part of asset as is...");
                    return chunkIds;
                }
            } else {
                uploadBar.increment();
                chunkIds.push(result.value.ok.chunk_id);
            }
        }
        
    }
        
    return chunkIds;
};

async function uploadSingleChunk(chunk: string | Buffer, actor: typeof assets_modified, batchId: bigint) : ChunkUploadPromise {
    let convertedChunk: Uint8Array;
    if (Buffer.isBuffer(chunk)) {
        // If chunk is a Buffer, convert it to Uint8Array
        convertedChunk = new Uint8Array(chunk);
        return actor.create_chunk({
            content: convertedChunk,
            batch_id: batchId
        });
    } else {
        // If chunk is a string, use TextEncoder to convert it to Uint8Array
        convertedChunk = new TextEncoder().encode(chunk);
        return actor.create_chunk({
            content: convertedChunk,
            batch_id: batchId
        });
    }
}

async function generateHash(file_path: string, chunkSizeBytes: number, start_offset: number, num_chunks: number, hashingBar: cliProgress.Bar) : (Promise<Uint8Array>) {
    //Creating sha256 hash to verify the chunks
    let sha256Hash = crypto.createHash("sha256");

    let hashingPromise = new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(file_path, {
            highWaterMark: chunkSizeBytes,
            start: start_offset,
            end: start_offset + num_chunks * chunkSizeBytes - 1 //We count from 0, so we substract 1
        });
        
        readStream.on('data', (chunk) => {
            sha256Hash.update(chunk);
            hashingBar.increment();
        })

        readStream.on('end', () => {
            hashingBar.stop();
            console.log('Asset hashing finished');
            resolve();
        });

        readStream.on('error', (err) => {
            hashingBar.stop();
            console.error('Error while hashing asset', err);
            reject(err);
        });
    })

    await hashingPromise;
    
    hashingBar.stop();
    //Getting the final hash and saving it to Uint8Array
    let asset_hash = new Uint8Array(sha256Hash.digest());
    return asset_hash;
};

async function commitBatch(file_path: string, actor: typeof assets_modified, batchId: bigint, assetHash: Uint8Array, chunkIds: bigint[]) : Promise<AssetMetadata> {
    //Finalizing the asset by committing batch
    await actor.commit_batch({
        batch_id: batchId,
        operations: [
            {CreateAsset: {
                key: `/${path.basename(file_path)}`,
                content_type: mime.getType(file_path)!
            }},
            {SetAssetContent: {
                key: `/${path.basename(file_path)}`,
                sha256: [assetHash],
                chunk_ids: chunkIds,
                content_encoding: "identity"
            }}
        ]
    });

    return {
        storageAddress:  Actor.canisterIdOf(actor).toString(),
        key: `/${path.basename(file_path)}`,
        totalChunks: chunkIds.length,
        hash: assetHash,
        content_encoding: "identity"
    }
}

async function getNewStorageAddress(prevActor: typeof assets_modified, managerActor: typeof file_scaling_manager_modified) : Promise<string> {
    let delayMs = 2000;
    let retries = 3;
    let prevAddress = Actor.canisterIdOf(prevActor).toText();
    let currentAddress = prevAddress;

    while ((prevAddress === currentAddress) && (retries != 0)) {
        
        let canisterData = await managerActor.get_current_canister();
        if (canisterData != undefined) {
            currentAddress = canisterData[0]!.id;
        };

        if ( prevAddress === currentAddress) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            retries -= 1;
        }
    };

    console.log("+++++++++++++++++")
    console.log(`Prev address: ${prevAddress}`);
    console.log(`Current address: ${currentAddress}`);
    console.log("+++++++++++++++++")
    return currentAddress;
}

async function updateStorageActor(agent: HttpAgent, newStorageAddress: string) : Promise<typeof assets_modified> {
    const newActor: typeof assets_modified = makeActor(agent, storageIdlFactory, newStorageAddress);
    return newActor;
}

async function uploadAsset(file_path: string, chunkSizeBytes: number, actor: typeof assets_modified, managerActor: typeof file_scaling_manager_modified, agent: HttpAgent) : Promise<AssetMetadata[]> {
    let MAX_CONCURRENT_UPLOADS = 5;
    let MAX_RETRIES = 3;
    
    //Measuring the amount of chunks that the file will be divided into
    let totalChunks = Math.ceil(fs.statSync(file_path).size / chunkSizeBytes);

    let start_offset = 0;
    let chunksUploaded = 0;
    //Initialazing an upload bar to track the progress
    const uploadBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const hashingBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    console.log(`Total chunks: ${totalChunks}`);
    let assetMetadata: AssetMetadata[] = [];

    while (chunksUploaded != totalChunks) {
        //Creating a batch and retrieving it's id to upload assets
        let batchId = (await actor.create_batch({})).batch_id;
        //Cutting the file into chunks of chunkSizeBytes and uploading them to current storage canister
        console.log("---");
        console.log(`Uploading chunks..`);
        uploadBar.start(totalChunks, chunksUploaded);
        let chunkIds: bigint[] = await uploadChunks(file_path, actor, managerActor, chunkSizeBytes, batchId, start_offset, uploadBar, MAX_CONCURRENT_UPLOADS, MAX_RETRIES);
        console.log(`Chunk ids:`);
        console.log(chunkIds);
        chunksUploaded += chunkIds.length;
        
        //Hashing the successfully uploaded chunks and uploaded chunks.length != 0
        if (chunkIds.length != 0) {
            console.log("---");
            console.log(`Hashing the ${chunkIds.length} chunks..`);
            hashingBar.start(chunkIds.length, 0);
            let assetHash = await generateHash(file_path, chunkSizeBytes, start_offset, chunkIds.length, hashingBar);
            
            //Committing the asset with uploaded chunks 
            console.log("---");
            console.log(`Committing the asset with ${chunksUploaded} chunks..`);
            let newMetadata = await commitBatch(file_path, actor, batchId, assetHash, chunkIds);
            assetMetadata.push(newMetadata);
        }

        //If we could save only a part of asset -> wait for FileScalingManager to create new storage and swith to uploading to it;
        if (chunksUploaded < totalChunks) {
            console.log("Getting new address of storage..");
            let currentStorageAddress = await getNewStorageAddress(actor, managerActor);
            
            //If FileScalingManager is not validly updating the storage address -> abort upload;
            if (currentStorageAddress == Actor.canisterIdOf(actor).toString()) {
                console.log("FileScalingManager is not updating the storage canister, aborting upload..");
                console.log("Uploaded asset metadata:");
                console.log(assetMetadata);
                throw("Upload failed");
            }

            console.log("Updating storage canister actor..");
            actor = await updateStorageActor(agent, currentStorageAddress);
            console.log("Resuming upload on a new storage canister..");
        }
        
        start_offset = chunksUploaded * chunkSizeBytes;
    }

    console.log("---");
    console.log("Asset uploaded!");
    console.log("---");
    console.log("Upload metadata:");
    console.log(assetMetadata);
    return assetMetadata
}

//==================
//Functions for downloading the assets
//==================
async function downloadAsset(outputFolder: string, assetMetadata: AssetMetadata[], agent: HttpAgent) {
    let MAX_CONCURRENT_DOWNLOADS = 5;
    let MAX_RETRIES = 3;
    
    let outputPath = `${outputFolder}/${assetMetadata[0].key}`;
    //Checking if the file already exists
    if (fs.existsSync(outputPath)) {
        throw(`File '${path.basename(outputPath)}' already exists in folder '${outputFolder}'`);
    }

    let fileWriter = fs.createWriteStream(outputPath);

    console.log();
    console.log("---");
    console.log(`Total parts: ${assetMetadata.length}`);
    console.log(`Downloading the asset..`);

    for (let i = 0; i < assetMetadata.length; i++) {
        console.log("---");
        console.log(`Downloading part ${i + 1}/${assetMetadata.length}`);
        let metadata = assetMetadata[i];
        await downloadChunks(metadata, agent, fileWriter, MAX_CONCURRENT_DOWNLOADS, MAX_RETRIES);
        console.log("---");
        console.log(`Part ${i + 1}/${assetMetadata.length} downloaded ✅`);
    }

    console.log("++++++")
    console.log(`File: ${path.basename(outputPath)} downloaded ✅`);
};

async function downloadChunks(metadata: AssetMetadata, agent: HttpAgent, fileWriter: fs.WriteStream, maxConcurrentDownloads: number, maxRetries: number) {
    let promises: Promise<{ content: Uint8Array | number[]; }>[] = [];
    let actor: typeof assets_modified = makeActor(agent, storageIdlFactory, metadata.storageAddress);
    let downloadBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    downloadBar.start(metadata.totalChunks, 0);
    let hash = crypto.createHash("sha256");
    let filePath = formatFilepath(fileWriter.path);
    let startingSize = 0;
    if (fs.existsSync(filePath)) {
        startingSize = fs.statSync(filePath).size;
    }

    for (let i = 0; i < metadata.totalChunks; i++) {

        let singleChunkPromise = actor.get_chunk({
            key: metadata.key,
            content_encoding: metadata.content_encoding,
            index: BigInt(i),
            sha256: []
        });

        promises.push(createPromiseWithRetry(() => singleChunkPromise, maxRetries, 2000));

        if (promises.length == maxConcurrentDownloads) {
            await handleChunkDownloadPromises(promises, fileWriter, downloadBar, hash);
            promises = [];
        }

    }
    //Finishing off remaining promises
    await handleChunkDownloadPromises(promises, fileWriter, downloadBar, hash);
    downloadBar.stop();
    
    let checksum = new Uint8Array(hash.digest());
    //Verifying checksum and if it is not valid -> restarting download of this part
    if (!areHashesEqual(checksum, metadata.hash)) {
        console.log(`Checksum invalid ❌, restarting part download..`);
        await fs.truncate(filePath, startingSize, (error) => {throw(error)});
        return downloadChunks(metadata, agent, fileWriter, maxConcurrentDownloads, maxRetries);
    } else {
        console.log("Checksum valid ✅");
    }
};

async function handleChunkDownloadPromises(promises: ChunkDownloadPromise[], fileWriter: fs.WriteStream, downloadBar: cliProgress.Bar, hash: crypto.Hash) {
    let results = await Promise.allSettled(promises);

    for (let i = 0; i < results.length; i++) {
        let result = results[i];
        //If the promise is rejected even after retries -> stop execution, download failed
        if (result.status === "rejected") {
            console.error(`Promise ${i + 1} rejected with:`);
            console.log(results[i]);
            throw(results[i]);
        } else {
            downloadBar.increment();
            await fileWriter.write(result.value.content);
            hash.update(Array.isArray(result.value.content) ? new Uint8Array(result.value.content) : result.value.content);
        }
        
    }
};
  
function areHashesEqual(hash1: Uint8Array, hash2: Uint8Array): boolean {
    if (hash1.length !== hash2.length) {
        return false;
    }

    //Comparing bytes
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            return false;
        }
    }

    return true;
}


main();