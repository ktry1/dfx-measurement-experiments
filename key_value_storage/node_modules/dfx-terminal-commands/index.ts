import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const executeCommand = async (command: string, args: string[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit' });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with exit code ${code}`));
            } else {
                resolve();
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
};

export const executeCommandString = async (command: string): Promise<string> => {
    try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        return stdout.trim();
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        throw error;
    }
};

export const startDfx = async () => {
    await executeCommand("dfx", ["start", "--clean", "--background"]);
};

export const stopDfx = async () => {
    await executeCommand("dfx", ["stop"]);
};

export const deployCanister = async (name: string) => {
    await executeCommand("dfx", ["deploy", name]);
};

export const getCanisterId = async (name: string): Promise<string> => {
    const output = await executeCommandString(`dfx canister id ${name}`);
    return output
}

export const deleteCanister = async(name: string) => {
    await executeCommand("dfx", ["canister", "stop", name]);
    await executeCommand("dfx", ["canister", "delete", name]);
};

export const fabricateIcpToCycles = async (name: string, icp_amount: number) => {
    await executeCommand("dfx", ["ledger", "fabricate-cycles", "--icp", icp_amount.toString(), "--canister", name]);
};

export const getReplicaPort = async (): Promise<string> => {
    const output = await executeCommandString("dfx info replica-port");
    return output
};