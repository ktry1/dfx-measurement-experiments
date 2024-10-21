import Assets "./assetsDependencies/lib";
import A "./assetsDependencies/Asset";
import B "./assetsDependencies/Batch";
import C "./assetsDependencies/Chunk";
import T "./assetsDependencies/Types";
import U "./assetsDependencies/Utils";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Prim "mo:prim";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Error "mo:base/Error";
import Principal "mo:base/Principal";

shared ({ caller = creator }) actor class FileStorage() {
  stable var entries : Assets.SerializedEntries = ([], [creator]);
  let assets = Assets.Assets({
    serializedEntries = entries;
  });

  system func preupgrade() {
    entries := assets.entries();
  };

  public shared ({ caller }) func authorize(other : Principal) : async () {
    assets.authorize({
      caller;
      other;
    });
  };

  public query func retrieve(path : Assets.Path) : async Assets.Contents {
    assets.retrieve(path);
  };

  public shared ({ caller }) func store(
    arg : {
      key : Assets.Key;
      content_type : Text;
      content_encoding : Text;
      content : Blob;
      sha256 : ?Blob;
    }
  ) : async () {
    assets.store({
      caller;
      arg;
    });
  };

  public query func list(arg : {}) : async [T.AssetDetails] {
    assets.list(arg);
  };
  
  public query func get(
    arg : {
      key : T.Key;
      accept_encodings : [Text];
    }
  ) : async ({
    content : Blob;
    content_type : Text;
    content_encoding : Text;
    total_length : Nat;
    sha256 : ?Blob;
  }) {
    assets.get(arg);
  };

  public query func get_chunk(
    arg : {
      key : T.Key;
      content_encoding : Text;
      index : Nat;
      sha256 : ?Blob;
    }
  ) : async ({
    content : Blob;
  }) {
    assets.get_chunk(arg);
  };

  public shared ({ caller }) func create_batch(arg : {}) : async ({
    batch_id : T.BatchId;
  }) {
    assets.create_batch({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func commit_batch(args : T.CommitBatchArguments) : async () {
    assets.commit_batch({
      caller;
      args;
    });
  };
  
  public shared ({ caller }) func create_asset(arg : T.CreateAssetArguments) : async () {
    assets.create_asset({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func set_asset_content(arg : T.SetAssetContentArguments) : async () {
    assets.set_asset_content({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func unset_asset_content(args : T.UnsetAssetContentArguments) : async () {
    assets.unset_asset_content({
      caller;
      args;
    });
  };

  public shared ({ caller }) func delete_asset(args : T.DeleteAssetArguments) : async () {
    assets.delete_asset({
      caller;
      args;
    });
  };

  public shared ({ caller }) func clear(args : T.ClearArguments) : async () {
    assets.clear({
      caller;
      args;
    });
  };

  public type StreamingStrategy = {
    #Callback : {
      callback : shared query StreamingCallbackToken -> async StreamingCallbackHttpResponse;
      token : StreamingCallbackToken;
    };
  };

  public type HttpResponse = {
    status_code : Nat16;
    headers : [T.HeaderField];
    body : Blob;

    streaming_strategy : ?StreamingStrategy;
  };
  public type StreamingCallbackToken = {
    key : Text;
    content_encoding : Text;
    index : Nat;
    sha256 : ?Blob;
  };

  public type StreamingCallbackHttpResponse = {
    body : Blob;
    token : ?StreamingCallbackToken;
  };
  public query func http_request(request : T.HttpRequest) : async HttpResponse {
    let response = assets.http_request(request);
    switch (response.streaming_strategy) {
      case (null) {
        return {
          status_code = response.status_code;
          headers = response.headers;
          body = response.body;

          streaming_strategy = null;
        };
      };
      case (? #Callback cb) {
        return {
          status_code = response.status_code;
          headers = response.headers;
          body = response.body;

          streaming_strategy = ? #Callback {
            callback = http_request_streaming_callback;
            token = cb.token;
          };
        };
      };
    };
  };

  public query func http_request_streaming_callback(token : T.StreamingCallbackToken) : async StreamingCallbackHttpResponse {
    assets.http_request_streaming_callback(token);
  };

  //=============================
	//MODIFIED PART FOR FIXING "upload-file" CONS
	//=============================

  type Error = {
    #Canister_Full
  };

  private func check_is_full() : Bool {
    let MAX_SIZE_THRESHOLD_MB : Float = 150;

    let rts_memory_size : Nat = Prim.rts_memory_size();
    let mem_size : Float = Float.fromInt(rts_memory_size);
    let memory_in_megabytes = Float.abs(mem_size * 0.000001);

    if (memory_in_megabytes > MAX_SIZE_THRESHOLD_MB) {
      return true;
    } else {
      return false;
    };
  };

  public query func is_full() : async Bool {
    check_is_full();
  };

  public shared ({ caller }) func create_chunk(
    arg : {
      batch_id : T.BatchId;
      content : Blob;
    }
  ) : async (Result.Result <{chunk_id : T.ChunkId;}, Error>
  ) {
    if (check_is_full()) {
      //Sending a request to the FileScalingManager to check the available memory and update the active canister
      ignore trigger_canister_check();
      //Returning #err for handling responses correctly
      return #err(#Canister_Full)
    };

    #ok (assets.create_chunk({
      caller;
      arg;
    }))
  };

  private func trigger_canister_check() : async () {
    let FileScalingManager = actor (Principal.toText(creator)) : actor {
      trigger_canister_check : () -> async ();
    };    
    ignore FileScalingManager.trigger_canister_check();
    return ();
  };

  //=============================
	//MODIFIED PART FOR TESTING
	//=============================
	type RtsData = {
        rts_stable_memory_size: Nat;
        rts_memory_size: Nat;
        rts_total_allocation: Nat;
        rts_reclaimed: Nat;
        rts_heap_size: Nat;
        rts_collector_instructions: Nat;
        rts_mutator_instructions: Nat;
    };

	public query func getRtsData() : async RtsData {
        return {
          rts_stable_memory_size = Prim.rts_stable_memory_size();
          rts_memory_size = Prim.rts_memory_size();
          rts_total_allocation = Prim.rts_total_allocation();
          rts_reclaimed = Prim.rts_reclaimed();           
          rts_heap_size = Prim.rts_heap_size();
          rts_collector_instructions = Prim.rts_collector_instructions();
          rts_mutator_instructions = Prim.rts_mutator_instructions();
        };
  	};
};