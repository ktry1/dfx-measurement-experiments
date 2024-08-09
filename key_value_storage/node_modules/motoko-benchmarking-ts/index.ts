import ExcelJS from "exceljs";
import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { getReplicaPort } from "dfx-terminal-commands";
import {IDL} from "@dfinity/candid";

/**
 * Represents the data structure for storing rts data.
 */
export declare type RtsData = {
    /** size of used stable memory in 65536 bytes pages */
    rts_stable_memory_size: bigint;
    /** total memory size of a canister in bytes */
    rts_memory_size: bigint;
    /** all time accumulative amount of memory allocated in bytes */
    rts_total_allocation: bigint;
    /** all time accumulative amount of memory reclaimed in bytes */
    rts_reclaimed: bigint;
    /** size of used heap memory in bytes */
    rts_heap_size: bigint;
    /** Wasm instructions used by garbage collector in the last update function call  */
    rts_collector_instructions: bigint;
    /** total Wasm instructions used by the last called update function, except for garbage collection */
    rts_mutator_instructions: bigint;
};

/**
 * Represents the data structure for measuring resource usage.
 */
export declare type MeasurementData = {
    /** size of used stable memory in 65536 bytes pages */
    rts_stable_memory_size: bigint;
    /** total memory size of a canister in bytes */
    rts_memory_size: bigint;
    /** all time accumulative amount of memory allocated in bytes */
    rts_total_allocation: bigint;
    /** all time accumulative amount of memory reclaimed in bytes */
    rts_reclaimed: bigint;
    /** size of used heap memory in bytes */
    rts_heap_size: bigint;
    /** Wasm instructions used by operations measured with ExperimentalInternetComputer.countInstructions() */
    instruction_count: bigint;
    /** Wasm instructions used by garbage collector in the last update function call  */
    rts_collector_instructions: bigint;
    /** total Wasm instructions used by the last called update function, except for garbage collection */
    rts_mutator_instructions: bigint;
};


/**
 * Generates a random Secp256k1KeyIdentity.
 * @returns {Secp256k1KeyIdentity} a new Secp256k1KeyIdentity
 */
export function makeIdentity(): Secp256k1KeyIdentity  {
    return Secp256k1KeyIdentity.generate()
};

/**
 * Creates an agent for interacting with local dfx environment.
 * @param {Secp256k1KeyIdentity} identity - generated Secp256k1KeyIdentity identity
 */
export async function makeAgent(identity: Secp256k1KeyIdentity) : Promise<HttpAgent> {
    // Creating agent 
    const replicaPort = await getReplicaPort();
    const agent = new HttpAgent({ identity, host: `http://127.0.0.1:${replicaPort}` });
    // Needed for update calls on local dev env, shouldn't be used in production!
    await agent.fetchRootKey();

    return agent
};

/**
 * A function to create an actor for calling the local canister
 * @param {HttpAgent} agent - an agent for interacting with local dfx environment.
 * @param idlFactory - idlFactory imported from canister declaration
 * @param canisterId - canister id of a deployed canister
 * @returns {ActorSubclass<_SERVICE>} actor - an actor to interact with local canister
 */
export function makeActor<_SERVICE>(agent: HttpAgent, idlFactory: IDL.InterfaceFactory, canisterId: string): ActorSubclass<_SERVICE> {
    // Creating actor for calling canister
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId,
    });
    
    return actor;
}

/**
 * A function to get rts data from an actor (if it complies with the needed interface).
 * @param actor - an actor to call for getting the rts data
 */
export async function getRtsData(actor: ActorSubclass<any>) : Promise<RtsData> {
    let rts_data: RtsData = await actor.getRtsData();
    return rts_data;
};

/**
 * A function to measure the difference between the MeasurementData before and after update function call.
 * @note instruction_count and rts_mutator_instructions are not substracted because they are measured not accumulatively, but only for the last update function call
 * @param new_values - rts values measured after calling an update function
 * @param prev_values - rts values measured before calling an update function
 * @param instruction_count - Wasm instruction count of operations measured with ExperimentalInternetComputer.countInstructions()
 * @returns MeasurementData object
*/
export function measureDifference(new_values: RtsData, prev_values: RtsData, instruction_count: bigint) : MeasurementData {
    let difference = {
        rts_stable_memory_size: new_values.rts_stable_memory_size - prev_values.rts_stable_memory_size,
        rts_memory_size: new_values.rts_memory_size - prev_values.rts_memory_size,
        rts_total_allocation: new_values.rts_total_allocation - prev_values.rts_total_allocation,
        rts_reclaimed: new_values.rts_reclaimed - prev_values.rts_reclaimed,
        rts_heap_size: new_values.rts_heap_size - prev_values.rts_heap_size,
        instruction_count: instruction_count,
        rts_collector_instructions: new_values.rts_collector_instructions - prev_values.rts_collector_instructions,
        rts_mutator_instructions: new_values.rts_mutator_instructions
    }
    return difference
};

/**
 * A function to measure the difference between the RtsData before and after update function call.
 * @note instruction_count and rts_mutator_instructions are not substracted because they are measured not accumulatively, but only for the last update function call
 * @param new_values - rts values measured after calling an update function
 * @param prev_values - rts values measured before calling an update function
 */
export function measureDifferenceRts(new_values: RtsData, prev_values: RtsData) : RtsData {
    let difference = {
        rts_stable_memory_size: new_values.rts_stable_memory_size - prev_values.rts_stable_memory_size,
        rts_memory_size: new_values.rts_memory_size - prev_values.rts_memory_size,
        rts_total_allocation: new_values.rts_total_allocation - prev_values.rts_total_allocation,
        rts_reclaimed: new_values.rts_reclaimed - prev_values.rts_reclaimed,
        rts_heap_size: new_values.rts_heap_size - prev_values.rts_heap_size,
        rts_collector_instructions: new_values.rts_collector_instructions - prev_values.rts_collector_instructions,
        rts_mutator_instructions: new_values.rts_mutator_instructions
    }
    return difference
}
//
//
/**
 * A function for when you need to know the pure resource usage of operation by substracting usage of needed utils
 * @example When you have a batch element adding function like pseudocode: "public func batch_add() {for (i in 0..100) {Map.add(i)}}". You are using for loop to add elements to a map and you want to know how much resources only the data structure uses and not for loop. You can make a for_loop() function like: "public func for_loop() {for (i in 0..100) {}}" in the canister and measure it's resource usage. Then you can substract usage of for_loop() from batch_add() function and you will get the pure resource usage of data structure map 
 * @param data - Measurement data for the function that you want to measure
 * @param base - Measurement data for the function that has other operations that are inside IC.countInstructions()
 * @returns if the measurement failed - returns all zeroes, substracts all values except for rts_mutator_instructions
 */
export function purifyMeasurementData(data: MeasurementData, base: MeasurementData) : MeasurementData {
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
        rts_mutator_instructions: data.rts_mutator_instructions
    }
    return results;
};

/**
 * A function for getting a sum of all properties of 2 MeasurementData objects.
 * @note Can be useful if you are making multiple update function calls and want to sum up resource usage.
 */
export function addMeasurementData(data_1: MeasurementData, data_2: MeasurementData) : MeasurementData {
    let results = {
        rts_stable_memory_size: data_1.rts_stable_memory_size + data_2.rts_stable_memory_size,
        rts_memory_size: data_1.rts_memory_size + data_2.rts_memory_size,
        rts_total_allocation: data_1.rts_total_allocation + data_2.rts_total_allocation,
        rts_reclaimed: data_1.rts_reclaimed + data_2.rts_reclaimed,
        rts_heap_size: data_1.rts_heap_size + data_2.rts_heap_size,
        instruction_count: data_1.instruction_count + data_2.instruction_count,
        rts_collector_instructions: data_1.rts_collector_instructions + data_2.rts_collector_instructions,
        rts_mutator_instructions: data_1.rts_mutator_instructions + data_2.rts_mutator_instructions
    }
    return results;
};

/**
 * A function for getting a sum of all properties of 2 RtsData objects.
 * @note Can be useful if you are making multiple update function calls and want to sum up resource usage.
 */
export function addRtsData(data_1: RtsData, data_2: RtsData) : RtsData {
    let results = {
        rts_stable_memory_size: data_1.rts_stable_memory_size + data_2.rts_stable_memory_size,
        rts_memory_size: data_1.rts_memory_size + data_2.rts_memory_size,
        rts_total_allocation: data_1.rts_total_allocation + data_2.rts_total_allocation,
        rts_reclaimed: data_1.rts_reclaimed + data_2.rts_reclaimed,
        rts_heap_size: data_1.rts_heap_size + data_2.rts_heap_size,
        rts_collector_instructions: data_1.rts_collector_instructions + data_2.rts_collector_instructions,
        rts_mutator_instructions: data_1.rts_mutator_instructions + data_2.rts_mutator_instructions
    }
    return results;
};

/**
 * A function to substract two MeasurementData objects.
 */
export function substractMeasurementData(data_1: MeasurementData, data_2: MeasurementData) : MeasurementData {
    let results = {
        rts_stable_memory_size: data_1.rts_stable_memory_size - data_2.rts_stable_memory_size,
        rts_memory_size: data_1.rts_memory_size - data_2.rts_memory_size,
        rts_total_allocation: data_1.rts_total_allocation - data_2.rts_total_allocation,
        rts_reclaimed: data_1.rts_reclaimed - data_2.rts_reclaimed,
        rts_heap_size: data_1.rts_heap_size - data_2.rts_heap_size,
        instruction_count: data_1.instruction_count - data_2.instruction_count,
        rts_collector_instructions: data_1.rts_collector_instructions - data_2.rts_collector_instructions,
        rts_mutator_instructions: data_1.rts_mutator_instructions - data_2.rts_mutator_instructions
    }
    return results;
};

/**
 * A function to substract two RtsData objects.
 */
export function substractRtsData(data: RtsData, base: RtsData) : RtsData {
    let results = {
        rts_stable_memory_size: data.rts_stable_memory_size - base.rts_stable_memory_size,
        rts_memory_size: data.rts_memory_size - base.rts_memory_size,
        rts_total_allocation: data.rts_total_allocation - base.rts_total_allocation,
        rts_reclaimed: data.rts_reclaimed - base.rts_reclaimed,
        rts_heap_size: data.rts_heap_size - base.rts_heap_size,
        rts_collector_instructions: data.rts_collector_instructions - base.rts_collector_instructions,
        rts_mutator_instructions: data.rts_mutator_instructions - base.rts_mutator_instructions
    };

    return results;
};

/**
 * 
 * @param actor - an actor that will be used to interact with a local canister
 * @param fn - a function of the actor that will be called
 * @param args - arguments to the called function
 * @returns MeasurementData object
 */
export async function measureFunction<T extends (...args: any[]) => Promise<bigint>>(
    actor: ActorSubclass<any>,
    fn: T,
    args: Parameters<T>
): Promise<MeasurementData> {
    let prev_rts_data = await getRtsData(actor);
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
            rts_mutator_instructions: 0n
        }
    }
    let new_rts_data = await getRtsData(actor);

    return measureDifference(new_rts_data, prev_rts_data, instructionCount);
}

/**
 * A function that creates a new sheet inside excel workbook;
 * @param workbook - excel workbook object that will be altered
 * @param name - name of the new sheet
 * @param headers - headers of the sheet
 * @param rows - rows of the sheet
 * @param data - data that will be used to fill created rows
 * @returns changed excel workbook object
 */
function makeNewSheet<T extends Record<string, unknown>>(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: string[], data: T[]) : ExcelJS.Workbook {
    let sheet = workbook.addWorksheet(name);
    sheet.columns = headers.map(header => ({ header, key: header }));

    for (let i = 0; i < rows.length; i++) {
        sheet.addRow([rows[i], ...data.map(item => (Object.values(item)[i] as string)?.toString() || '')]);
    }
    
    //Autosizing the width of columns
    sheet.columns.forEach(function (column) {
        var dataMax = 0;
        column.eachCell!({ includeEmpty: true }, function (cell) { 
          dataMax = cell.value?cell.value.toString().length:0;
          if(dataMax <= (column.header!.length+2) ){
              if(column.width! > dataMax){
                  //retain its default width
              } else {
                  column.width = column.header!.length+5;
              }
          } else {
              column.width = dataMax+5;
          }
          dataMax = 0;
        })
        
      });

    return workbook
};

/**
 * A function to save 2D array of MeasurementData to the excel file.
 * @param file_path - that full path to the file that will be saved. example: "./tests/map.xlsx"
 * @param sheet_names - array of sheet names that will be in a new excel file
 * @param headers - array of headers that the sheets will have
 * @param data {MeasurementData[][]} - 2D array of MeasurementData obtained from measureFunction()
 */
export async function saveToExcel(file_path: string, sheet_names: string[], headers: string[], data: MeasurementData[][]) {
    if (sheet_names.length != data.length) {
        console.log("+++");
        console.log("Numbers of sheets and data arrays must be the same");
        console.log("+++");
        return
    }
    const rows = ["Δ Stable memory pages", "Δ Total Memory", "Δ Allocated memory", "Δ Reclaimed memory", "Δ Heap memory", "Δ Instructions", "Δ GC instructions", "Δ Mutator instructions"];
    let workbook = new ExcelJS.Workbook();
    for (let i = 0; i < sheet_names.length; i++) {
        workbook = makeNewSheet(workbook, sheet_names[i], headers, rows, data[i])
    };
    await workbook.xlsx.writeFile(file_path);
};

/**
 * A function to save 2D array of RtsData to the excel file. Useful if you want to only measure rts values and not instruction count from ExperimentalInternetComputer.countInstructions()
 * @param file_path - that full path to the file that will be saved. example: "./tests/map.xlsx"
 * @param sheet_names - array of sheet names that will be in a new excel file
 * @param headers - array of headers that the sheets will have
 * @param data {RtsData[][]} - 2D array of RtsData
 */
export async function saveToExcelRts(file_path: string, sheet_names: string[], headers: string[], data: RtsData[][]) {
    if (sheet_names.length != data.length) {
        console.log("+++");
        console.log("Numbers of sheets and data arrays must be the same");
        console.log("+++");
        return
    }
    const rows = ["Δ Stable memory pages", "Δ Total Memory", "Δ Allocated memory", "Δ Reclaimed memory", "Δ Heap memory", "Δ GC instructions", "Δ Mutator instructions"];
    let workbook = new ExcelJS.Workbook();
    for (let i = 0; i < sheet_names.length; i++) {
        workbook = makeNewSheet(workbook, sheet_names[i], headers, rows, data[i])
    };
    await workbook.xlsx.writeFile(file_path);
};

/**
 * A function to save your custom data type to excel table. Useful if you want to conduct your own tests with different properties.
 * @param file_path - that full path to the file that will be saved. example: "./tests/map.xlsx"
 * @param sheet_names - array of sheet names that will be in a new excel file
 * @param headers - array of headers that the sheets will have
 * @param data {YourDataType[][]} - 2D array of your custom data type objects
 */
export async function saveToExcelCustom<T extends Record<string, unknown>>(file_path: string, rows:string[], sheet_names: string[], headers: string[], data: T[][]) {
    if (sheet_names.length != data.length) {
        console.log("+++");
        console.log("Numbers of sheets and data arrays must be the same");
        console.log("+++");
        return
    }
    let workbook = new ExcelJS.Workbook();
    for (let i = 0; i < sheet_names.length; i++) {
        workbook = makeNewSheet(workbook, sheet_names[i], headers, rows, data[i])
    };
    await workbook.xlsx.writeFile(file_path);
};