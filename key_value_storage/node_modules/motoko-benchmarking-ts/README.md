### A set of functions to run benchmarks of any complexity for Motoko canisters in TypeScript and save the results to Excel tables. Designed to be used in conjunction with module ['dfx-terminal-commands'](https://www.npmjs.com/package/dfx-terminal-commands).
#### Can be used to measure **performance of data structures**, **function calls**, **controlling the state of used resources of a canister**, **resource usage of different garbage collectors**.
#### It allows to measure: 
```
    rts_stable_memory_size: bigint; //Stable memory pages used
    rts_memory_size: bigint; //Total memory used by canister
    rts_total_allocation: bigint; //Total allocated memory of all time
    rts_reclaimed: bigint; //Total reclaimed memory of all time
    rts_heap_size: bigint; //Used Heap memory size of canister in bytes
    instruction_count: bigint; //Instruction cost of performing operations without costs for calling the function and returning values
    rts_collector_instructions: bigint; //Instructions that are used for garbage collection;
    rts_mutator_instructions: biging; //Total Wasm instructions used by the last called update function, except for garbage collection
    
    Note: if you want to measure GC instructions per function call, use flag "--force-gc" with the type if gc you want to use in dfx.json:
    "--generational-gc" - use generational GC,
    "--incremental-gc" - use incremental GC,
    "--compacting-gc" -  use compacting GC,
    "--copying-gc" - use copying GC (default)
    
    For example, if you want to measure the function resource usage with --incremental-gc:
    "defaults": {
    "build": {
      "args": "--force-gc --incremental-gc",
      ...
    }
  },
```
#### Results are a difference (delta) between the measured values before and after calling the update function, except for **'instruction_count'** and **'rts_mutator_instructions'**: these values are measured per update function call.
#### **'rts_collector_instructions'** is also measured per function call, but since it's value depends on the state of the canister and gc is not usually run per each function call, we measure how much the called update function affects the cost of the next gc run.
---
# Used libraries and references
 #### Motoko library [bench](https://mops.one/bench) - main inspiration for this module. 'motoko-benchmarking-ts' can be considered my attempt to expand functionality and use cases of Motoko Benchmarking by porting it to TypeScript and giving it greater flexibility. 
#### Improvements:
+ ##### Number of measured parameters is expanded;
+ ##### Support for complex testing scenarios due to increased flexibility;
+ ##### Can be used with other TypeScript libraries and manipulate local dfx environment from code and not from terminal;
+ ##### Can test standalone canisters which contain stable variables;
+ ##### Can freely manipulate the results of tests to obtain more precise results (as shown in example later);
+ ##### Can measure performances of a single function call or multiple ones (by adding or substracting measurement results);
+ ##### Results can be saved to Excel which is useful for situations when we are bulk testing.
#### Motoko library [Prim](https://github.com/dfinity/motoko/blob/master/src/prelude/prim.mo) is used to get rts values.
#### Motoko library [ExpimentalInternetComputer](https://internetcomputer.org/docs/current/motoko/main/base/ExperimentalInternetComputer#function-countinstructions) is used to measure instruction costs of operations inside the canisters.
#### @dfinity JavaScript libraries: agent, candid, identity-secp256k1 for interacting with local dfx environment.
#### Exceljs - for saving the results to Excel tables.

# Usage
---
### To be used properly, Motoko canisters should have this minimal interface:
```
actor {
    type RtsData = {
        rts_stable_memory_size: Nat;
        rts_memory_size: Nat;
        rts_total_allocation: Nat;
        rts_reclaimed: Nat;
        rts_heap_size: Nat;
        rts_collector_instructions: Nat;
        rts_mutator_instructions: Nat;
    };
    
    //Function for getting the values of Heap and Stable memory and Garbage Collector instructions
    public composite query func getRtsData() : async RtsData {
        return {
          rts_stable_memory_size = Prim.rts_stable_memory_size();
          rts_memory_size = Prim.rts_memory_size();
          rts_total_allocation = Prim.rts_total_allocation();
          rts_reclaimed = Prim.rts_reclaimed();           
          rts_heap_size = Prim.rts_heap_size();
          rts_collector_instructions = Prim.rts_collector_instructions();
          rts_mutator_instructions = Prim.rts_mutator_instructions();
        };
  };
}
```
### Functions that you want to benchmark should look like this:
```
import IC "mo:base/ExperimentalInternetComputer";
...
public func example_function() : Nat {
        let count = IC.countInstructions(
            func () {
                //Some operations, whose cost you want to measure, for example:
                //var test = 0;
                //for (i in Iter.range(start_index, end_index)) {
                //  test := test + i;
                //}  
                }                
            }
        );
        return count;
    }
```

### After you made the canisters that you want to test and added them to "dfx.json" use command `dfx generate` so that their declaration is generated for use in TypeScript.

## Benchmarking with TypeScript files
___
#### For example, a canister that has functions for_loop() and add_batch():
```
...
import Map "mo:map/Map";

actor {
stable var t = Map.new<Nat, Nat>();

public func for_loop(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements;
    let count = IC.countInstructions(
            func () {
              for (i in Iter.range(start_index, end_index)) {}    
            }
        );
    return count;
  };
  
  public func add_batch(start_index: Nat, total_elements: Nat) : async (Nat64) {
        let end_index = start_index + total_elements;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                  Map.set(t, nhash, i, 1);
                }                
            }
        );
        return count;
  };
  
  public func delete_all() {
    Map.clear(t);            
  };
}
```
#### Then we can measure their resource usage:
### Preparations for testing
```
import * from 'motoko-benchmarking-ts';
import * from 'dfx-terminal-commands';
//Importing interface and idlFactory from canister declaration
import { idlFactory, map } from "../../../src/declarations/map";

async function main() {
    //Starting dfx for testing
    await startDfx();
    //Setting a name that will be used later
    const canisterName = "map";
    //Generating random secp256k1 identity 
    const identity = makeIdentity();
    //Creating agent
    const agent = await makeAgent(identity);
    //Deploying canister and getting id
    await deployCanister(canisterName);
    const canisterId = await getCanisterId(canisterName);
    //Creating actor for calling canister 
    const actor: typeof memory_hashtable = makeActor(agent, idlFactory, canisterId);
    //Topping the canister up (fabricating ICP and transfering it's cycles value to canister)
    await fabricateIcpToCycles(canisterName, 1000000);
    ...
```
### Example of Benchmarking

```
...
//======================================
//TESTING
//======================================
const testValues: bigint[] = [1n, 10n, 100n, 1000n, 10000n, 100000n, 1000000n, 10000000n];
//Making arrays for each function that we want to test, the more function you want to test, the more empty arrays of MeasurementData you should make
let testResults: MeasurementData[][] = [[], []];
 console.log(`+++++++++`);
console.log(`Beginning testing of canister: "${canisterName}"`);
//Measurements
for (let value of testValues) {
    console.log(`==============`);
    console.log(`Testing with ${value} elements`);
    console.log(`==============`);
    console.log(`Measuring for loop usage..`);
    //We pass in (actor, {function that we want to measure}, {arguments for function})
    let forLoopUsage = await measureFunction(actor, actor.for_loop, [0n, value]);
    console.log(`Measuring adding elements..`);
    let addData = await measureFunction(actor, actor.add_batch, [0n, value]);
    
    //Saving the for loop usage to subarray 0
    testResults[0].push(forLoopUsage);
    
    //When we call add_batch function, the resources used by for loop are also taken into account so if we want to know the exact cost of adding elements we can measure the cost of for loop without any other operations and then substract the obtained values from measurement results
    //Getting the usage of only Map.set(t, nhash, i, 1) operation, without for loop
    let purifiedAddData = purifyMeasurementData(addData, forLoopUsage);
    //Saving the purified data to subarray 1
    testResults[1].push(purifiedAddData);
    
    //Resetting the data structure
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
saveToExcel(`./results/${canisterName}.xlsx`, ["For loop", "Batch adding"], headers, testResults);

//Stopping the dfx service
await stopDfx();
console.log(`+++++++++++++`);
console.log(`All done!`);
}; //end of main()

main();
```

### Custom usage
---
#### Functions for making custom benchmarks
```
//A function to get current rts data from an actor (if it complies with the needed interface)
async function getRtsData(actor: ActorSubclass<any>) : Promise<RtsData> 

//A function to measure the difference between the MeasurementData before and after update function call.
function measureDifference(new_values: RtsData, prev_values: RtsData, instruction_count: bigint) : MeasurementData

//A function to measure the difference between the RtsData before and after update function call.
export function measureDifferenceRts(new_values: RtsData, prev_values: RtsData) : RtsData

//A function for when you need to know the pure resource usage of operation by substracting resource usage of needed utils
function purifyMeasurementData(data: MeasurementData, base: MeasurementData) : MeasurementData 

//A function for getting a sum of all properties of 2 MeasurementData objects.
function addMeasurementData(data_1: MeasurementData, data_2: MeasurementData) : MeasurementData

//A function for getting a sum of all properties of 2 RtsData objects.
function addRtsData(data_1: RtsData, data_2: RtsData) : RtsData 

//A function to substract two MeasurementData objects.
function substractMeasurementData(data_1: MeasurementData, data_2: MeasurementData) : MeasurementData

//A function to substract two RtsData objects.
function substractRtsData(data: RtsData, base: RtsData) : RtsData 

//A function to save 2D array of RtsData to the Excel file.
async function saveToExcelRts(file_path: string, sheet_names: string[], headers: string[], data: RtsData[][])

//A function to save your custom data type to excel table. Useful if you want to conduct your own tests with different properties.
async function saveToExcelCustom<T extends Record<string, unknown>>(file_path: string, rows:string[], sheet_names: string[], headers: string[], data: T[][])
```

#### Examples of custom usage

#### Measuring multiple function calls resource usage:
```
...
let totalUsage: MeasurementData = {
    rts_stable_memory_size: 0n,
    rts_memory_size: 0n,
    rts_total_allocation: 0n,
    rts_reclaimed: 0n,
    rts_heap_size: 0n,
    instruction_count: 0n,
    rts_collector_instructions: 0n,
    rts_mutator_instructions: 0n
};
let numberOfCalls = 100;
for (let i = 0; i < numberOfCalls; i++) {
    let usage = await measureFunction(actor, actor.add_batch, [0n, 1n]);
    totalUsage = addMeasurementData(totalUsage, usage);
}

console.log(totalUsage);
...
```

#### Using RtsData:
```
let rtsDataPrev = await getRtsData(actor);
await actor.add_batch([0n, 1n]);
let rtsDataNew = await getRtsData(actor);

let rtsUsage = measureDifferenceRts(rtsDataNew, rtsDataPrev);
console.log(rtsUsage);
```