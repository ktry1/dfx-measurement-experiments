import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AutoScalingCanisterSharedFunctionHook = ActorMethod<
  [string],
  string
>;
export interface HelloService {
  'add_batch' : ActorMethod<[bigint, bigint], bigint>,
  'delete_all' : ActorMethod<[], bigint>,
  'delete_batch' : ActorMethod<[bigint, bigint], bigint>,
  'for_loop' : ActorMethod<[bigint, bigint], bigint>,
  'getPK' : ActorMethod<[], string>,
  'getRtsData' : ActorMethod<[], RtsData>,
  'read_batch' : ActorMethod<[bigint, bigint], bigint>,
  'skExists' : ActorMethod<[string], boolean>,
  'transferCycles' : ActorMethod<[], undefined>,
  'update_batch' : ActorMethod<[bigint, bigint], bigint>,
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
export type ScalingLimitType = { 'heapSize' : bigint } |
  { 'count' : bigint };
export interface ScalingOptions {
  'autoScalingHook' : AutoScalingCanisterSharedFunctionHook,
  'sizeLimit' : ScalingLimitType,
}
export interface _SERVICE extends HelloService {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
