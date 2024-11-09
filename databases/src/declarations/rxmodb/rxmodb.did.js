export const idlFactory = ({ IDL }) => {
  const RtsData = IDL.Record({
    'rts_stable_memory_size' : IDL.Nat,
    'rts_memory_size' : IDL.Nat,
    'rts_total_allocation' : IDL.Nat,
    'rts_collector_instructions' : IDL.Nat,
    'rts_mutator_instructions' : IDL.Nat,
    'rts_heap_size' : IDL.Nat,
    'rts_reclaimed' : IDL.Nat,
  });
  return IDL.Service({
    'add_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'delete_all' : IDL.Func([], [IDL.Nat64], []),
    'delete_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'for_loop' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'getRtsData' : IDL.Func([], [RtsData], ['query']),
    'read_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'update_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
  });
};
export const init = ({ IDL }) => { return []; };
