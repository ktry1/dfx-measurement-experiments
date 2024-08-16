import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Prim "mo:prim";
import lib "mo:memory-hashtable";
//dependencies
import measurementDeps "./measurement_dependencies/measurementDeps";

actor memory_hashtable {
  // (1) Initialize the memory-storage. Here parameter value 8 is used. 
  // This means that we will use 8 bytes as replace-buffer.
  // So if we later want to update a blob for a key (in memory), 
  // and the new blob-size is not greater than the
  // size of the initial-blob + 8 bytes (replacebuffer) then the existing 
  // memory-location will be used for updating the blob.
  // Else we will need to allocate new memory and store the blob into new location.
  stable var mem = lib.get_new_memory_storage(8);
  // (2) Instanciate the hashTable with 'memoryStorage' as parameter
  var t = lib.MemoryHashTable(mem);

  public func add_batch(start_index: Nat, total_elements: Nat) : async (Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                  ignore t.put(lib.Blobify.Nat.to_blob(i), lib.Blobify.Nat.to_blob(1));
                }                
            }
        );
        return count;
  };

  public func delete_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements - 1;
     let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                  t.delete(lib.Blobify.Nat.to_blob(i));
                }                
            }
        );
      return count;
  };

  public func update_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements - 1;
    let count = IC.countInstructions(
          func () {
              for (i in Iter.range(start_index, end_index)) {
                //overwriting the existing value
                ignore t.put(lib.Blobify.Nat.to_blob(i), lib.Blobify.Nat.to_blob(2));
              }                
          }
      );
    return count;
  };

  public func read_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements - 1;
    let count = IC.countInstructions(
          func () {
              for (i in Iter.range(start_index, end_index)) {
                let _value = t.get(lib.Blobify.Nat.to_blob(i));
              }                
          }
      );
    return count;
  };

  public func delete_all() : async(Nat64) {
    let count = IC.countInstructions(
            func () {
                t := lib.MemoryHashTable(mem);
            }
        );
    return count;
  };

  public func for_loop(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements - 1;
    let count = IC.countInstructions(
            func () {
              for (i in Iter.range(start_index, end_index)) {}    
            }
        );
    return count;
  };

  //For measurements
  public composite query func getRtsData() : async measurementDeps.RtsData {
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

};

