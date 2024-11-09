import Nac "dependencies/NacDB";
import Partition "./partition";
import StableBuffer "mo:stable-buffer/StableBuffer";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Iter "mo:base/Iter";
import Result "mo:base/Result";
import Cycles "mo:base/ExperimentalCycles";
import Common "dependencies/common";
import Prim "mo:prim";
import IC "mo:base/ExperimentalInternetComputer";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
//For generating UUID
import Source "dependencies/async/SourceV4";
import UUID "dependencies/UUID";


shared actor class Index() = this {
    stable var dbIndex: Nac.DBIndex = Nac.createDBIndex(Common.dbOptions);

    stable var initialized = false;

    public shared func init() : async () {
        if (initialized) {
            Debug.trap("already initialized");
        };
        Cycles.add<system>(50_000_000_000);
        StableBuffer.add(dbIndex.canisters, await Partition.Partition());
        initialized := true;
    };

    public shared func createPartition(): async Principal {
        Cycles.add<system>(50_000_000_000);
        Principal.fromActor(await Partition.Partition());
    };

    public query func getCanisters(): async [Principal] {
        let iter = Iter.map(Nac.getCanisters(dbIndex).vals(), func (x: Nac.PartitionCanister): Principal {Principal.fromActor(x)});
        Iter.toArray(iter);
    };

    public shared func createSubDB(guid: [Nat8], {userData: Text; hardCap: ?Nat})
        : async {inner: {canister: Principal; key: Nac.InnerSubDBKey}; outer: {canister: Principal; key: Nac.OuterSubDBKey}}
    {
        let r = await* Nac.createSubDB(Blob.fromArray(guid), {index = this; dbIndex; dbOptions = Common.dbOptions; userData; hardCap});
        {
            inner = {canister = Principal.fromActor(r.inner.canister); key = r.inner.key};
            outer = {canister = Principal.fromActor(r.outer.canister); key = r.outer.key};
        };
    };

    public shared func insert(guid: [Nat8], {
        outerCanister: Principal;
        outerKey: Nac.OuterSubDBKey;
        sk: Nac.SK;
        value: Nac.AttributeValue;
        hardCap: ?Nat;
    }) : async Result.Result<{inner: {canister: Principal; key: Nac.InnerSubDBKey}; outer: {canister: Principal; key: Nac.OuterSubDBKey}}, Text> {
        let res = await* Nac.insert(Blob.fromArray(guid), {
            indexCanister = Principal.fromActor(this);
            dbIndex;
            outerCanister = outerCanister;
            outerKey;
            sk;
            value;
            hardCap;
        });
        switch (res) {
            case (#ok { inner; outer }) {
                #ok {
                    inner = { canister = Principal.fromActor(inner.canister); key = inner.key};
                    outer = { canister = Principal.fromActor(outer.canister); key = outer.key};
                };
            };
            case (#err err) { #err err };
        };
    };

    public shared func delete(guid: [Nat8], {outerCanister: Principal; outerKey: Nac.OuterSubDBKey; sk: Nac.SK}): async () {
        let outer: Partition.Partition = actor(Principal.toText(outerCanister));
        await* Nac.delete(Blob.fromArray(guid), {dbIndex; outerCanister = outer; outerKey; sk});
    };

    public shared func deleteSubDB(guid: [Nat8], {outerCanister: Principal; outerKey: Nac.OuterSubDBKey}) : async () {
        await* Nac.deleteSubDB(Blob.fromArray(guid), {dbIndex; dbOptions = Common.dbOptions; outerCanister = actor(Principal.toText(outerCanister)); outerKey});
    };

    //Testing functions
    public func add_batch(start_index: Nat, total_elements: Nat, outerKey: Nat, outerCanister: Principal) : async(Nat64) {
        let end_index = start_index + total_elements - 1;
        //Initializng theUUID generator
        let g = Source.Source();
        let startingInstructions = IC.performanceCounter(1);

        for (i in Iter.range(start_index, end_index)) {
            let guid = await g.new();
            ignore await* Nac.insert(Blob.fromArray(guid), {
                indexCanister = Principal.fromActor(this);
                dbIndex;
                outerCanister = outerCanister;
                outerKey = outerKey;
                sk = Nat.toText(i);
                value = #int(1);
                hardCap = null;
        });
    };

    return IC.performanceCounter(1) - startingInstructions
  };
    
    public func update_batch(start_index: Nat, total_elements: Nat, outerKey: Nat, outerCanister: Principal) : async(Nat64) {
        let end_index = start_index + total_elements - 1;
        //Initializng theUUID generator
        let g = Source.Source();
        let startingInstructions = IC.performanceCounter(1);

        for (i in Iter.range(start_index, end_index)) {
            let guid = await g.new();
            ignore await* Nac.insert(Blob.fromArray(guid), {
                indexCanister = Principal.fromActor(this);
                dbIndex;
                outerCanister = outerCanister;
                outerKey = outerKey;
                sk = Nat.toText(i);
                value = #int(1);
                hardCap = null;
            });
        };

        return IC.performanceCounter(1) - startingInstructions
    };

  public func delete_batch(start_index: Nat, total_elements: Nat, outerKey: Nat, outerCanister: Principal) : async(Nat64) {
    let end_index = start_index + total_elements - 1;
    //Initializng theUUID generator
    let g = Source.Source();
    //Getting the actor of outer canister
    let outer: Partition.Partition = actor(Principal.toText(outerCanister));

    let startingInstructions = IC.performanceCounter(1);
    for (i in Iter.range(start_index, end_index)) {
        let guid = await g.new();
        await* Nac.delete(Blob.fromArray(guid), {dbIndex; outerCanister = outer; outerKey; sk = Nat.toText(i)});
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

  public func delete_all(outerCanister: Principal) : async() {
    let outer: Partition.Partition = actor(Principal.toText(outerCanister));
    ignore await outer.delete_all();
    dbIndex := Nac.createDBIndex(Common.dbOptions);
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