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
  const IndexCanister = IDL.Service({
    'autoScaleHelloServiceCanister' : IDL.Func([IDL.Text], [IDL.Text], []),
    'createHelloServiceCanisterByGroup' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Text)],
        [],
      ),
    'getCanistersByPK' : IDL.Func([IDL.Text], [IDL.Vec(IDL.Text)], ['query']),
    'getRtsData' : IDL.Func([], [RtsData], ['query']),
  });
  return IndexCanister;
};
export const init = ({ IDL }) => { return []; };
