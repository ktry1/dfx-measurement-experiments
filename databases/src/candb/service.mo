import CA "mo:candb/CanisterActions";
import CanDB "mo:candb/CanDB";
import Entity "mo:candb/Entity";
import Prim "mo:prim";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";


shared ({ caller = owner }) actor class HelloService({
  // the primary key of this canister
  partitionKey: Text;
  // the scaling options that determine when to auto-scale out this canister storage partition
  scalingOptions: CanDB.ScalingOptions;
  // (optional) allows the developer to specify additional owners (i.e. for allowing admin or backfill access to specific endpoints)
  owners: ?[Principal];
}) {
  /// @required (may wrap, but must be present in some form in the canister)
  stable var db = CanDB.init({
    pk = partitionKey;
    scalingOptions = scalingOptions;
    btreeOrder = null;
  });

  /// @recommended (not required) public API
  public query func getPK(): async Text { db.pk };

  /// @required public API (Do not delete or change)
  public query func skExists(sk: Text): async Bool { 
    CanDB.skExists(db, sk);
  };

  /// @required public API (Do not delete or change)
  public shared({ caller = caller }) func transferCycles(): async () {
    if (caller == owner) {
      return await CA.transferCycles(caller);
    };
  };

  //Testing functions
  type TestData = {attributes : [(Text, {#int : Nat})]; sk : Text};

  public func add_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
    
    let values = Array.tabulate(total_elements, func(i: Nat): TestData {
      {
      sk = Nat.toText(i);
      attributes = [
        ("", #int(1))
      ]}  
    });

    let startingInstructions = IC.performanceCounter(1);

    await* CanDB.batchPut(db, values);

    return IC.performanceCounter(1) - startingInstructions
  };

  public func update_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {

    let values = Array.tabulate(total_elements, func(i: Nat): TestData {
      {
      sk = Nat.toText(i);
      attributes = [
        ("", #int(2))
      ]}  
    });

    let startingInstructions = IC.performanceCounter(1);

    await* CanDB.batchPut(db, values);

    return IC.performanceCounter(1) - startingInstructions
  };

  public func delete_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements - 1;

    let count = IC.countInstructions(
      func () {
        for (i in Iter.range(start_index, end_index)) {
          CanDB.delete(db, {sk = Nat.toText(i)})
        };  
      }
    );
    return count;
  };

  public func read_batch(start_index: Nat, total_elements: Nat) : async(Nat64) {
    let end_index = start_index + total_elements - 1;
    let startingInstructions = IC.performanceCounter(1);

    for (i in Iter.range(start_index, end_index)) {
      ignore CanDB.get(db, { sk = Nat.toText(i) })
    };
        
    return IC.performanceCounter(1) - startingInstructions
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
      db := CanDB.init({
        pk = partitionKey;
        scalingOptions = scalingOptions;
        btreeOrder = null;
      });            
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