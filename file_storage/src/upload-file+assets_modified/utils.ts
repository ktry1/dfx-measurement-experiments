import path from "path";

export function createPromiseWithRetry<T>(promiseFn: () => Promise<T>, retries: number, delay: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const attempt = async (retriesLeft: number) => {
            try {
                const result = await promiseFn(); // Execute the promise-generating function
                resolve(result); // If the promise resolves successfully, resolve the main promise
            } catch (error) {
                if (retriesLeft > 0) {
                    console.log(`Retrying... Attempts left: ${retriesLeft}`);
                    setTimeout(() => attempt(retriesLeft - 1), delay); // Wait for the delay and retry
                } else {
                    reject(error); // If no retries are left, reject the main promise
                }
            }
        };

        attempt(retries); // Start the first attempt
    });
}

export function formatFilepath(filePath: string | Buffer) : string {
    let dirName = path.dirname(String(filePath));
    let fileName = path.basename(String(filePath));
    return path.join(dirName, fileName);
}
