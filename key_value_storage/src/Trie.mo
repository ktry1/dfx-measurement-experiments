import Nat "mo:base/Nat";
import IC "mo:base/ExperimentalInternetComputer";
import Iter "mo:base/Iter";
import Prim "mo:prim";
import Trie "mo:base/Trie";
import Text "mo:base/Text";
//dependencies
import measurementDeps "./measurement_dependencies/measurementDeps";

actor TrieCanister {
    type Trie<K, V> = Trie.Trie<K, V>;
    type Key<K> = Trie.Key<K>;
    
    stable var t: Trie<Nat, Nat> = Trie.empty();
    //Function for generating Trie key-hash bindings
    func key(element: Nat) : Key<Nat> { { hash = Text.hash(Nat.toText(element)); key = element } };

    public func add_batch(start_index: Nat, total_elements: Nat) : async (Nat64) {
        let end_index = start_index + total_elements - 1;
        let count = IC.countInstructions(
            func () {
                for (i in Iter.range(start_index, end_index)) {
                  t := Trie.put(t, key i, Nat.equal, 1).0;
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
                  t := Trie.remove(t, key i, Nat.equal).0;               
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
                t := Trie.replace(t, key i, Nat.equal, ?2).0;  
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
                let _value = Trie.get(t, key i, Nat.equal);                
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
                t := Trie.empty();
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