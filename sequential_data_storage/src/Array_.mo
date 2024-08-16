import Array "mo:base/Array";
import Nat "mo:base/Nat";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Nat64 "mo:base/Nat64";
import Prim "mo:prim";
//dependencies
import measurementDeps "measurement_dependencies/measurementDeps";

actor Array_ {
    stable var t = Array.init<Nat>(0, 0);

    public func init_array(size: Nat) : async (Nat64) {
        let count = IC.countInstructions(
            func() {
                t := Array.init<Nat>(size, 0);
            }
        );
        return count
    };

    public func update_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                    t[i] := 1;
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
                    let _value = t[i];
                }                
            }
        );
        return count;
    };

    public func delete_all() : async(Nat64) {
        let count = IC.countInstructions(
                func () {
                    t := Array.init(0, 0);            
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
                    let _arrayForm = Array.freeze<Nat>(t);
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

}