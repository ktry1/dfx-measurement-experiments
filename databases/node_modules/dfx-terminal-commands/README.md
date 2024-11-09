### Some dfx terminal commands ported to TypeScript
##### Can be used for local testing or benchmarking of canisters.
### Usage
---
```
import * from 'dfx-terminal-commands';

//Start dfx service
await startDfx();

//Stop dfx service
await stopDfx();

//Deploy a canister
const canisterName = "test";
await deployCanister(canisterName);

//Get id of a deployed canister as string
const canisterName = "test";
const canisterId = await getCanisterId(canisterName);

//Delete a deployed canister by name
const canisterName = "test";
await deleteCanister(canisterName);

//Fabricate ICP tokens and top up a deployed canister by name
const IcpAmount = 1000000;
const canisterName = "Test";
await fabricateIcpToCycles(canisterName, IcpAmount);

//Get ICP Replica port - might be useful for creating agent object in Node, as this is a dynamic value
const replicaPort = await getReplicaPort();

//Execute any command in terminal, examples for dfx commands:
//Starting dfx
await executeCommand("dfx", ["start", "--clean", "--background"]);
//Deploying canister by name
const name = "test";
await executeCommand("dfx", ["deploy", name]);

//For executing commands that give an output that we might want to use, output is truncated
//Commands are passed as a string, for example getting replica port:
const replicaPort = await executeCommandString("dfx info replica-port");
```