import Prim "mo:prim";
import TestDb "./dependencies/testDb";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Nat64 "mo:base/Nat64";

actor RxMoDb {
    type Data = TestDb.Doc;

    stable var testStore  = TestDb.init();
    var testDb = TestDb.use(testStore);

    public func add_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                testDb.db.insert({ id = Nat64.fromNat(i); value = 1 });
            }
        });
        return count;
    };

    public func update_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
          func () {
                for (i in Iter.range(start_index, end_index)) {
                    testDb.db.insert({ id = Nat64.fromNat(i); value = 2 });
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
                    testDb.db.deleteIdx(i);
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
                    ignore testDb.db.getIdx(i);
                }                
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

    public func delete_all() : async(Nat64) {
    let count = IC.countInstructions(
            func () {
                testStore := TestDb.init();
                testDb := TestDb.use(testStore);            
            }
        );
    return count;
    };

    //For measurements
	type RtsData = {
        rts_stable_memory_size: Nat;
        rts_memory_size: Nat;
        rts_total_allocation: Nat;
        rts_reclaimed: Nat;
        rts_heap_size: Nat;
        rts_collector_instructions: Nat;
        rts_mutator_instructions: Nat;
    };

	public query func getRtsData() : async RtsData {
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