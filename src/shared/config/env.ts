const cloudMode = import.meta.env.VITE_CLOUD_MODE === 'true';

export const config = {
    apiUrl: import.meta.env.VITE_API_URL,
    authenticationUrl: import.meta.env.VITE_AUTHENTICATION_URL,
    itemsPerPage: Number(import.meta.env.VITE_ITEMS_PER_PAGE) || 20,
    // Hosted service: accounts are created only on the portal website.
    cloudMode,
    portalUrl: import.meta.env.VITE_PORTAL_URL as string | undefined,
    signupEnabled: !cloudMode && import.meta.env.VITE_SIGNUP_ENABLED !== 'false',
};