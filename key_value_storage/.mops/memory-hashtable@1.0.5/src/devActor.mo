import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64";
import lib "lib";

actor {

    // (1) Initialize the memory-storage. Here parameter value 8 is used. This means that we will use 8 bytes as replace-buffer.
    //     So if we later want to update a blob for a key (in memory), and the new blob-size is not greater than the
    //     size of the initial-blob + 8 bytes (replacebuffer) then the existing memory-location will be used for updating the blob.
    //     Else we will need to allocate new memory and store the blob into new location.
    stable var mem = lib.get_new_memory_storage(8);
    
    // (2) Instanciate the hashTable with 'memoryStorage' as parameter
    let hashTable = lib.MemoryHashTable(mem);
    

    public shared func examples():async (){

        let key1:Blob = lib.Blobify.Text.to_blob("key1");
        let key2:Blob = lib.Blobify.Text.to_blob("key2");

        let blob1 : Blob = lib.Blobify.Text.to_blob("hello world");
        let blob2 : Blob = lib.Blobify.Text.to_blob("example value");
        
        // (3) Example of adding new entries;
        ignore hashTable.put(key1, blob1);
        ignore hashTable.put(key2, blob2);

        // (4) Example of overwriting existing value for key1
        let storedMemoryAddress:Nat64 = hashTable.put(key1, blob2);

        // (5) Example of getting the blob-value for the key 'key1'.
        //     -> The value will be null if key was not found.
        let blobValue:?Blob = hashTable.get(key1);

        // (6) Example of deleting existing key (and the related value)
        hashTable.delete(key1);
    };
};

