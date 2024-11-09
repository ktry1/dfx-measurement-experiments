import Blob "mo:base/Blob";
import BTree "mo:stableheapbtreemap/BTree";
import Nat64 "mo:base/Nat64";
import Int32 "mo:base/Int32";
import Nat32 "mo:base/Nat32";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Prim "mo:⛔";
import Vector "mo:vector";
import RXMDB "./";
import O "mo:rxmo";
import PK "primarykey";
import IDX "index"; 

module {

// Document Type
public type Doc = {
    id: Nat64;
    value: Nat
};

public type PKKey = Nat64;

public type Init = { // All stable
    db : RXMDB.RXMDB<Doc>;
    pk : PK.Init<Nat64>;
};

public func init() : Init {
    return {
    db = RXMDB.init<Doc>();
    pk = PK.init<PKKey>(?32);
    };
};

public func pk_key(h : Doc) : PKKey = h.id;

public type Use = {
    db : RXMDB.Use<Doc>;
    pk : PK.Use<PKKey, Doc>;
};

public func use(init : Init) : Use {
    let obs = RXMDB.init_obs<Doc>(); // Observables for attachments

    // PK
    let pk_config : PK.Config<PKKey, Doc> = {
        db=init.db;
        obs;
        store=init.pk;
        compare=Nat64.compare;
        key=pk_key;
        regenerate=#no;
        };
    PK.Subscribe<PKKey, Doc>(pk_config); 

    return {
        db = RXMDB.Use<Doc>(init.db, obs);
        pk = PK.Use(pk_config);
    }
};

}