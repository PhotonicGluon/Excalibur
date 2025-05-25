/**
 * Checks if the verifier is enrolled on the server.
 *
 * @param apiURL The URL of the Excalibur API.
 * @returns Whether the verifier is enrolled.
 */
export async function checkVerifier(apiURL: string) {
    const response = await fetch(`${apiURL}/security/srp/verifier`, {
        method: "HEAD",
    });

    if (response.status === 404) {
        return false;
    }

    return true;
}
