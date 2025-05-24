export async function checkVerifier(apiURL: string) {
    const response = await fetch(`${apiURL}/srp/verifier`, {
        method: "HEAD",
    });

    if (response.status === 404) {
        return false;
    }

    return true;
}
