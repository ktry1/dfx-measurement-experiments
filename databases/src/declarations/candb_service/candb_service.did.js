export const idlFactory = ({ IDL }) => {
  const AutoScalingCanisterSharedFunctionHook = IDL.Func(
      [IDL.Text],
      [IDL.Text],
      [],
    );
  const ScalingLimitType = IDL.Variant({
    'heapSize' : IDL.Nat,
    'count' : IDL.Nat,
  });
  const ScalingOptions = IDL.Record({
    'autoScalingHook' : AutoScalingCanisterSharedFunctionHook,
    'sizeLimit' : ScalingLimitType,
  });
  const RtsData = IDL.Record({
    'rts_stable_memory_size' : IDL.Nat,
    'rts_memory_size' : IDL.Nat,
    'rts_total_allocation' : IDL.Nat,
    'rts_collector_instructions' : IDL.Nat,
    'rts_mutator_instructions' : IDL.Nat,
    'rts_heap_size' : IDL.Nat,
    'rts_reclaimed' : IDL.Nat,
  });
  const HelloService = IDL.Service({
    'add_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'delete_all' : IDL.Func([], [IDL.Nat64], []),
    'delete_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'for_loop' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'getPK' : IDL.Func([], [IDL.Text], ['query']),
    'getRtsData' : IDL.Func([], [RtsData], ['query']),
    'read_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'skExists' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'transferCycles' : IDL.Func([], [], []),
    'update_batch' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
  });
  return HelloService;
};
export const init = ({ IDL }) => {
  const AutoScalingCanisterSharedFunctionHook = IDL.Func(
      [IDL.Text],
      [IDL.Text],
      [],
    );
  const ScalingLimitType = IDL.Variant({
    'heapSize' : IDL.Nat,
    'count' : IDL.Nat,
  });
  const ScalingOptions = IDL.Record({
    'autoScalingHook' : AutoScalingCanisterSharedFunctionHook,
    'sizeLimit' : ScalingLimitType,
  });
  return [
    IDL.Record({
      'owners' : IDL.Opt(IDL.Vec(IDL.Principal)),
      'partitionKey' : IDL.Text,
      'scalingOptions' : ScalingOptions,
    }),
  ];
};
