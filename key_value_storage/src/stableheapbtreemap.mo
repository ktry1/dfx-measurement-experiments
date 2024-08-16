import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Prim "mo:prim";
import BTree "mo:stableheapbtreemap/BTree";
//dependencies
import measurementDeps "./measurement_dependencies/measurementDeps";

actor stableheapbtreemap {
  stable var t = BTree.init<Nat, Nat>(?32);

  public func add_batch(start_index: Nat, total_elements: Nat) : async (Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                  ignore BTree.insert(t, Nat.compare, i, 1);
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
                  ignore BTree.delete(t, Nat.compare, i);
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
                ignore BTree.update(
                    t,
                    Nat.compare,
                    i,
                    //Function to update the existing element
                    func (_v: ?Nat) : Nat {
                        return 2;
                    })
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
                let _value = BTree.get(t, Nat.compare, i);
              }                
          }
      );
    return count;
  };

  public func delete_all() : async(Nat64) {
    let count = IC.countInstructions(
            func () {
                BTree.clear(t);            
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

