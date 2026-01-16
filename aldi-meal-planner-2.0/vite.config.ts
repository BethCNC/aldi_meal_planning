import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env from both current directory and parent directory
    // loadEnv automatically loads .env, .env.local, .env.[mode], .env.[mode].local
    // Priority: parent .env.local > parent .env > local .env.local > local .env
    const parentEnv = loadEnv(mode, '..', '');
    const localEnv = loadEnv(mode, '.', '');
    const env = { ...parentEnv, ...localEnv }; // Parent env takes precedence, then local overrides
    
    const apiKey = env.GEMINI_API_KEY || env.API_KEY || '';
    if (!apiKey && mode === 'development') {
      console.warn('⚠️  WARNING: GEMINI_API_KEY not found in .env file');
      console.warn('   Checked: ../.env and ./.env files');
      console.warn('   Create a .env file in aldi-meal-planner-2.0/ or root directory with:');
      console.warn('   GEMINI_API_KEY=your_api_key_here');
    } else if (apiKey && mode === 'development') {
      console.log('✅ GEMINI_API_KEY loaded successfully');
    }
    
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
