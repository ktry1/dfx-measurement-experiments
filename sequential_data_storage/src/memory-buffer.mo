import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Prim "mo:prim";
import { MemoryBufferClass; Blobify; VersionedMemoryBuffer; MemoryBuffer; } "mo:memory-buffer";
//importing Encoder and decoder for candid values
import Encoder "mo:candid/Encoder";
import Decoder "mo:candid/Decoder";
//dependencies
import measurementDeps "./measurement_dependencies/measurementDeps";


actor memory_buffer {
  
  //Making a custom object of type: Blobify<Nat> so that we can encode/decode more efficiently with candid library then default Blob
  let candidEncoderDecoder = {
    to_blob = func(n: Nat): Blob {
      return Encoder.encode([{ value = #nat(n); type_ = #nat }]);
    };
    from_blob = func(candidBytes: Blob) : Nat {
      let decodedValues = Decoder.decode(candidBytes);
      switch (decodedValues) {
        case (?values) {
          switch (values[0].value) {
            case (#nat(n)) {
              return n;
            };
            case (_) {
              return 0;
            };
          }
        };
        case null {
          return 0;
        }
      }
    };
  }; 

  stable var mem_store = MemoryBufferClass.newStableStore<Nat>();
  var t = MemoryBufferClass.MemoryBufferClass(mem_store, candidEncoderDecoder);

  public func add_batch(start_index: Nat, total_elements: Nat) : async (Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                  t.add(1);
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
                  ignore t.removeLast();
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
                t.put(i, 2);
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
                let _value = t.get(i);
              }                
          }
      );
    return count;
  };

  public func delete_all() : async(Nat64) {
    let count = IC.countInstructions(
            func () {
              //t.clear();            
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

  public func transformToArray() : async (Nat64) {
        let count = IC.countInstructions(
                func () {
                    let _arrayForm = t.toArray();
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

  //Getting the stable memory space used in bytes
  public query func getStableMemoryData() : async ({bytes: Nat; metadata_bytes: Nat}) {
    return {
      bytes = t.bytes();
      metadata_bytes = t.metadataBytes();
    }
  };

};

