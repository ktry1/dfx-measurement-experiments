module {
    public type RtsData = {
        rts_stable_memory_size: Nat;
        rts_memory_size: Nat;
        rts_total_allocation: Nat;
        rts_reclaimed: Nat;
        rts_heap_size: Nat;
        rts_collector_instructions: Nat;
        rts_mutator_instructions: Nat;
    };
}