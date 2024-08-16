import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Prim "mo:prim";
import LinkedList "mo:linked-list";
//dependencies
import measurementDeps "./measurement_dependencies/measurementDeps";

actor map {
  stable var t = LinkedList.LinkedList<Nat>();

  public func add_batch(start_index: Nat, total_elements: Nat) : async (Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                    LinkedList.append_node(t, LinkedList.Node(1): LinkedList.Node<Nat>);
                }                
            }
        );
        return count;
  };

  public func delete_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements - 1;
     let count = IC.countInstructions(
            func () {
                for (i in Iter.revRange(end_index, start_index)) {
                  ignore LinkedList.remove(t, Int.abs(i));
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
                ignore LinkedList.replace(t, i, 2);
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
                let _value = LinkedList.get_node(t, i);
              }                
          }
      );
    return count;
  };

  public func delete_all() : async(Nat64) {
    let count = IC.countInstructions(
            func () {
                LinkedList.clear(t);            
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
                    let _arrayForm = LinkedList.toArray(t);
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

