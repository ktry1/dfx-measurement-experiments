import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AttributeValue = { 'int' : bigint } |
  { 'float' : number } |
  { 'tuple' : Array<AttributeValuePrimitive> } |
  { 'bool' : boolean } |
  { 'text' : string } |
  { 'arrayBool' : Array<boolean> } |
  { 'arrayText' : Array<string> } |
  { 'arrayInt' : Array<bigint> } |
  { 'arrayFloat' : Array<number> };
export type AttributeValuePrimitive = { 'int' : bigint } |
  { 'float' : number } |
  { 'bool' : boolean } |
  { 'text' : string };
export type Direction = { 'bwd' : null } |
  { 'fwd' : null };
export type InnerSubDBKey = bigint;
export type OuterSubDBKey = bigint;
export interface Partition {
  'add_batch' : ActorMethod<[bigint, bigint, bigint], bigint>,
  'createOuter' : ActorMethod<
    [
      {
        'part' : Principal,
        'outerKey' : OuterSubDBKey,
        'innerKey' : InnerSubDBKey,
      },
    ],
    {
      'outer' : { 'key' : OuterSubDBKey, 'canister' : Principal },
      'inner' : { 'key' : InnerSubDBKey, 'canister' : Principal },
    }
  >,
  'cycles_simple_availableCycles' : ActorMethod<[], bigint>,
  'cycles_simple_topUpCycles' : ActorMethod<[bigint], undefined>,
  'deleteInner' : ActorMethod<
    [{ 'sk' : SK, 'innerKey' : InnerSubDBKey }],
    undefined
  >,
  'deleteSubDBInner' : ActorMethod<[{ 'innerKey' : InnerSubDBKey }], undefined>,
  'deleteSubDBOuter' : ActorMethod<[{ 'outerKey' : OuterSubDBKey }], undefined>,
  'delete_all' : ActorMethod<[], bigint>,
  'delete_batch' : ActorMethod<[bigint, bigint, bigint], bigint>,
  'for_loop' : ActorMethod<[bigint, bigint], bigint>,
  'getByInner' : ActorMethod<
    [{ 'sk' : SK, 'innerKey' : InnerSubDBKey }],
    [] | [AttributeValue]
  >,
  'getByOuter' : ActorMethod<
    [{ 'sk' : SK, 'outerKey' : OuterSubDBKey }],
    [] | [AttributeValue]
  >,
  'getInner' : ActorMethod<
    [{ 'outerKey' : OuterSubDBKey }],
    [] | [{ 'key' : InnerSubDBKey, 'canister' : Principal }]
  >,
  'getRtsData' : ActorMethod<[], RtsData>,
  'getSubDBUserDataInner' : ActorMethod<
    [{ 'innerKey' : InnerSubDBKey }],
    [] | [string]
  >,
  'getSubDBUserDataOuter' : ActorMethod<
    [{ 'outerKey' : OuterSubDBKey }],
    [] | [string]
  >,
  'hasByInner' : ActorMethod<
    [{ 'sk' : SK, 'innerKey' : InnerSubDBKey }],
    boolean
  >,
  'hasByOuter' : ActorMethod<
    [{ 'sk' : SK, 'outerKey' : OuterSubDBKey }],
    boolean
  >,
  'hasSubDBByInner' : ActorMethod<[{ 'innerKey' : InnerSubDBKey }], boolean>,
  'hasSubDBByOuter' : ActorMethod<[{ 'outerKey' : OuterSubDBKey }], boolean>,
  'isOverflowed' : ActorMethod<[], boolean>,
  'putLocation' : ActorMethod<
    [
      {
        'innerCanister' : Principal,
        'outerKey' : OuterSubDBKey,
        'innerKey' : InnerSubDBKey,
      },
    ],
    undefined
  >,
  'rawDeleteSubDB' : ActorMethod<[{ 'innerKey' : InnerSubDBKey }], undefined>,
  'rawGetSubDB' : ActorMethod<
    [{ 'innerKey' : InnerSubDBKey }],
    [] | [{ 'map' : Array<[SK, AttributeValue]>, 'userData' : string }]
  >,
  'rawInsertSubDB' : ActorMethod<
    [
      {
        'map' : Array<[SK, AttributeValue]>,
        'userData' : string,
        'hardCap' : [] | [bigint],
        'innerKey' : [] | [InnerSubDBKey],
      },
    ],
    { 'innerKey' : InnerSubDBKey }
  >,
  'rawInsertSubDBAndSetOuter' : ActorMethod<
    [
      {
        'map' : Array<[SK, AttributeValue]>,
        'userData' : string,
        'keys' : [] | [
          { 'outerKey' : OuterSubDBKey, 'innerKey' : InnerSubDBKey }
        ],
        'hardCap' : [] | [bigint],
      },
    ],
    { 'outerKey' : OuterSubDBKey, 'innerKey' : InnerSubDBKey }
  >,
  'read_batch' : ActorMethod<[bigint, bigint, bigint], bigint>,
  'scanLimitInner' : ActorMethod<
    [
      {
        'dir' : Direction,
        'lowerBound' : SK,
        'limit' : bigint,
        'upperBound' : SK,
        'innerKey' : InnerSubDBKey,
      },
    ],
    ScanLimitResult
  >,
  'scanLimitOuter' : ActorMethod<
    [
      {
        'dir' : Direction,
        'lowerBound' : string,
        'limit' : bigint,
        'upperBound' : string,
        'outerKey' : OuterSubDBKey,
      },
    ],
    ScanLimitResult
  >,
  'scanSubDBs' : ActorMethod<
    [],
    Array<[OuterSubDBKey, { 'key' : InnerSubDBKey, 'canister' : Principal }]>
  >,
  'startInsertingImpl' : ActorMethod<
    [{ 'sk' : SK, 'value' : AttributeValue, 'innerKey' : InnerSubDBKey }],
    undefined
  >,
  'subDBSizeByInner' : ActorMethod<
    [{ 'innerKey' : InnerSubDBKey }],
    [] | [bigint]
  >,
  'subDBSizeByOuter' : ActorMethod<
    [{ 'outerKey' : OuterSubDBKey }],
    [] | [bigint]
  >,
  'subDBSizeOuterImpl' : ActorMethod<
    [{ 'outerKey' : OuterSubDBKey }],
    [] | [bigint]
  >,
  'superDBSize' : ActorMethod<[], bigint>,
  'update_batch' : ActorMethod<[bigint, bigint, bigint], bigint>,
}
export interface RtsData {
  'rts_stable_memory_size' : bigint,
  'rts_memory_size' : bigint,
  'rts_total_allocation' : bigint,
  'rts_collector_instructions' : bigint,
  'rts_mutator_instructions' : bigint,
  'rts_heap_size' : bigint,
  'rts_reclaimed' : bigint,
}
export type SK = string;
export interface ScanLimitResult {
  'results' : Array<[string, AttributeValue]>,
  'nextKey' : [] | [string],
}
export interface _SERVICE extends Partition {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
