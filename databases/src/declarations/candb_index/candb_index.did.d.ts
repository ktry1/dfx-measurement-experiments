import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface IndexCanister {
  'autoScaleHelloServiceCanister' : ActorMethod<[string], string>,
  'createHelloServiceCanisterByGroup' : ActorMethod<[string], [] | [string]>,
  'getCanistersByPK' : ActorMethod<[string], Array<string>>,
  'getRtsData' : ActorMethod<[], RtsData>,
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
export interface _SERVICE extends IndexCanister {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
