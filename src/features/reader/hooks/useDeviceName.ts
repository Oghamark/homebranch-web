const STORAGE_KEY = "homebranch-device-name";

function generateDeviceName(): string {
    if (typeof navigator === "undefined") return "Unknown Device";

    const ua = navigator.userAgent;

    let browser = "Unknown Browser";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    let os = "Unknown OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    return `${browser} on ${os}`;
}

export function useDeviceName(): string {
    if (typeof window === "undefined") return "Unknown Device";

    let name = localStorage.getItem(STORAGE_KEY);
    if (!name) {
        name = generateDeviceName();
        localStorage.setItem(STORAGE_KEY, name);
    }
    return name;
}
