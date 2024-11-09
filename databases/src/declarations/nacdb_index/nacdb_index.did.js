export const idlFactory = ({ IDL }) => {
  const OuterSubDBKey = IDL.Nat;
  const InnerSubDBKey = IDL.Nat;
  const SK = IDL.Text;
  const RtsData = IDL.Record({
    'rts_stable_memory_size' : IDL.Nat,
    'rts_memory_size' : IDL.Nat,
    'rts_total_allocation' : IDL.Nat,
    'rts_collector_instructions' : IDL.Nat,
    'rts_mutator_instructions' : IDL.Nat,
    'rts_heap_size' : IDL.Nat,
    'rts_reclaimed' : IDL.Nat,
  });
  const AttributeValuePrimitive = IDL.Variant({
    'int' : IDL.Int,
    'float' : IDL.Float64,
    'bool' : IDL.Bool,
    'text' : IDL.Text,
  });
  const AttributeValue = IDL.Variant({
    'int' : IDL.Int,
    'float' : IDL.Float64,
    'tuple' : IDL.Vec(AttributeValuePrimitive),
    'bool' : IDL.Bool,
    'text' : IDL.Text,
    'arrayBool' : IDL.Vec(IDL.Bool),
    'arrayText' : IDL.Vec(IDL.Text),
    'arrayInt' : IDL.Vec(IDL.Int),
    'arrayFloat' : IDL.Vec(IDL.Float64),
  });
  const Result = IDL.Variant({
    'ok' : IDL.Record({
      'outer' : IDL.Record({
        'key' : OuterSubDBKey,
        'canister' : IDL.Principal,
      }),
      'inner' : IDL.Record({
        'key' : InnerSubDBKey,
        'canister' : IDL.Principal,
      }),
    }),
    'err' : IDL.Text,
  });
  const Index = IDL.Service({
    'add_batch' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Principal],
        [IDL.Nat64],
        [],
      ),
    'createPartition' : IDL.Func([], [IDL.Principal], []),
    'createSubDB' : IDL.Func(
        [
          IDL.Vec(IDL.Nat8),
          IDL.Record({ 'userData' : IDL.Text, 'hardCap' : IDL.Opt(IDL.Nat) }),
        ],
        [
          IDL.Record({
            'outer' : IDL.Record({
              'key' : OuterSubDBKey,
              'canister' : IDL.Principal,
            }),
            'inner' : IDL.Record({
              'key' : InnerSubDBKey,
              'canister' : IDL.Principal,
            }),
          }),
        ],
        [],
      ),
    'delete' : IDL.Func(
        [
          IDL.Vec(IDL.Nat8),
          IDL.Record({
            'sk' : SK,
            'outerKey' : OuterSubDBKey,
            'outerCanister' : IDL.Principal,
          }),
        ],
        [],
        [],
      ),
    'deleteSubDB' : IDL.Func(
        [
          IDL.Vec(IDL.Nat8),
          IDL.Record({
            'outerKey' : OuterSubDBKey,
            'outerCanister' : IDL.Principal,
          }),
        ],
        [],
        [],
      ),
    'delete_all' : IDL.Func([IDL.Principal], [], []),
    'delete_batch' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Principal],
        [IDL.Nat64],
        [],
      ),
    'for_loop' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat64], []),
    'getCanisters' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getRtsData' : IDL.Func([], [RtsData], ['query']),
    'init' : IDL.Func([], [], []),
    'insert' : IDL.Func(
        [
          IDL.Vec(IDL.Nat8),
          IDL.Record({
            'sk' : SK,
            'value' : AttributeValue,
            'hardCap' : IDL.Opt(IDL.Nat),
            'outerKey' : OuterSubDBKey,
            'outerCanister' : IDL.Principal,
          }),
        ],
        [Result],
        [],
      ),
    'update_batch' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Principal],
        [IDL.Nat64],
        [],
      ),
  });
  return Index;
};
export const init = ({ IDL }) => { return []; };
