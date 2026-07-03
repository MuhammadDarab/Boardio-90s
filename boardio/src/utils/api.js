export async function Fetch(...args) {
    const locked = await fetch(...args);
    const response = await locked.json();
    return response;
}