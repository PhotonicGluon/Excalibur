export async function checkConnection(url: string): Promise<boolean> {
    // Try to connect
    try {
        await fetch(url);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
