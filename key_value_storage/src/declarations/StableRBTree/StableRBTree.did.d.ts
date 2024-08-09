import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CanisterMemoryInfo {
  'rts_stable_memory_size' : bigint,
  'rts_memory_size' : bigint,
  'rts_total_allocation' : bigint,
  'rts_collector_instructions' : bigint,
  'rts_mutator_instructions' : bigint,
  'rts_heap_size' : bigint,
  'rts_reclaimed' : bigint,
}
export interface _SERVICE {
  'add_batch' : ActorMethod<[bigint, bigint], bigint>,
  'delete_all' : ActorMethod<[], bigint>,
  'delete_batch' : ActorMethod<[bigint, bigint], bigint>,
  'for_loop' : ActorMethod<[bigint, bigint], bigint>,
  'getRtsData' : ActorMethod<[], CanisterMemoryInfo>,
  'read_batch' : ActorMethod<[bigint, bigint], bigint>,
  'update_batch' : ActorMethod<[bigint, bigint], bigint>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
