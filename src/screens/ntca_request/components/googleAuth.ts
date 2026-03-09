declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
                    }) => {
                        requestAccessToken: (options?: { prompt?: string }) => void;
                    };
                };
            };
        };
    }
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services';

export const loadGoogleIdentityScript = async (): Promise<void> => {
    if (typeof window === 'undefined') {
        throw new Error('Google sign-in is only available in the browser.');
    }

    if (window.google?.accounts?.oauth2) {
        return;
    }

    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
        await new Promise<void>((resolve, reject) => {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true });
        });
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = GOOGLE_IDENTITY_SCRIPT_ID;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
        document.head.appendChild(script);
    });
};

export const requestGoogleSheetsAccessToken = async (clientId: string): Promise<string> => {
    if (!clientId) {
        throw new Error('Missing VITE_GOOGLE_CLIENT_ID.');
    }

    await loadGoogleIdentityScript();

    return new Promise<string>((resolve, reject) => {
        const tokenClient = window.google?.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (response) => {
                if (response.error || !response.access_token) {
                    reject(new Error(response.error_description || response.error || 'Google authorization failed.'));
                    return;
                }

                resolve(response.access_token);
            },
        });

        if (!tokenClient) {
            reject(new Error('Unable to initialize Google authorization.'));
            return;
        }

        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

export {};