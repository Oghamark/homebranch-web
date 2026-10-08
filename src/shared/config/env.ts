// Deployment settings injected at container start (see docker-entrypoint.d/40-runtime-config.sh).
// They take precedence over build-time values so one image serves every deployment.
const runtime: { cloudMode?: boolean; portalUrl?: string } =
    (typeof window !== 'undefined' &&
        (window as unknown as { __HB_CONFIG__?: { cloudMode?: boolean; portalUrl?: string } }).__HB_CONFIG__) ||
    {};

const cloudMode = runtime.cloudMode ?? import.meta.env.VITE_CLOUD_MODE === 'true';

export const config = {
    apiUrl: import.meta.env.VITE_API_URL,
    authenticationUrl: import.meta.env.VITE_AUTHENTICATION_URL,
    itemsPerPage: Number(import.meta.env.VITE_ITEMS_PER_PAGE) || 20,
    // Hosted service: accounts are created only on the portal website.
    cloudMode,
    portalUrl: (runtime.portalUrl || import.meta.env.VITE_PORTAL_URL) as string | undefined,
    signupEnabled: !cloudMode && import.meta.env.VITE_SIGNUP_ENABLED !== 'false',
};