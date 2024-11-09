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
export interface Index {
  'add_batch' : ActorMethod<[bigint, bigint, bigint, Principal], bigint>,
  'createPartition' : ActorMethod<[], Principal>,
  'createSubDB' : ActorMethod<
    [Uint8Array | number[], { 'userData' : string, 'hardCap' : [] | [bigint] }],
    {
      'outer' : { 'key' : OuterSubDBKey, 'canister' : Principal },
      'inner' : { 'key' : InnerSubDBKey, 'canister' : Principal },
    }
  >,
  'delete' : ActorMethod<
    [
      Uint8Array | number[],
      { 'sk' : SK, 'outerKey' : OuterSubDBKey, 'outerCanister' : Principal },
    ],
    undefined
  >,
  'deleteSubDB' : ActorMethod<
    [
      Uint8Array | number[],
      { 'outerKey' : OuterSubDBKey, 'outerCanister' : Principal },
    ],
    undefined
  >,
  'delete_all' : ActorMethod<[Principal], undefined>,
  'delete_batch' : ActorMethod<[bigint, bigint, bigint, Principal], bigint>,
  'for_loop' : ActorMethod<[bigint, bigint], bigint>,
  'getCanisters' : ActorMethod<[], Array<Principal>>,
  'getRtsData' : ActorMethod<[], RtsData>,
  'init' : ActorMethod<[], undefined>,
  'insert' : ActorMethod<
    [
      Uint8Array | number[],
      {
        'sk' : SK,
        'value' : AttributeValue,
        'hardCap' : [] | [bigint],
        'outerKey' : OuterSubDBKey,
        'outerCanister' : Principal,
      },
    ],
    Result
  >,
  'update_batch' : ActorMethod<[bigint, bigint, bigint, Principal], bigint>,
}
export type InnerSubDBKey = bigint;
export type OuterSubDBKey = bigint;
export type Result = {
    'ok' : {
      'outer' : { 'key' : OuterSubDBKey, 'canister' : Principal },
      'inner' : { 'key' : InnerSubDBKey, 'canister' : Principal },
    }
  } |
  { 'err' : string };
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
export interface _SERVICE extends Index {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
