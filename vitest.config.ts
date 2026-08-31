import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enable global variables like `describe`, `it`, etc.
  },
  server: {
    allowedHosts: ['localhost', '127.0.0.1', 'f75e-2403-4800-2590-b525-9c00-6618-9de9-6b24.ngrok-free.app'],
  },
});