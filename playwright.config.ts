import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:8000',
    },
    webServer: [
        {
            command: 'npm run serve:ws',
            port: 8787,
            reuseExistingServer: true,
            timeout: 30000,
        },
        {
            command: 'npm run dev',
            port: 8000,
            reuseExistingServer: true,
            timeout: 15000,
        },
    ],
});
