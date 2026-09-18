# Dynamic Backend URL Configuration

The frontend now automatically detects and connects to the backend API without hardcoded URLs.

## How it works

1. **Environment Variable**: Set `VITE_BACKEND_URL` in your `.env` file to specify a custom backend URL
2. **Auto-detection**: If no environment variable is set, the frontend automatically detects the backend URL based on:
   - Current window location (hostname and port)
   - Common backend ports (5001, 5000, 63684, 63685)
   - Fallback to `https://localhost:5001`

## Configuration Options

### Option 1: Environment Variable (Recommended)
Create a `.env` file in the frontend directory:
```
VITE_BACKEND_URL=https://localhost:5001
```

### Option 2: Auto-detection (Default)
The frontend will automatically find the backend by trying common ports.

## Files Updated

- `frontend/src/utils/api.ts` - New utility functions for dynamic URL detection
- All frontend components and pages now use `buildApiUrl()` instead of hardcoded URLs
- `frontend/src/services/scenarioService.ts` - Updated to use dynamic URLs

## Benefits

- ✅ No more hardcoded backend URLs
- ✅ Automatic backend detection
- ✅ Easy configuration via environment variables
- ✅ Works across different development environments
- ✅ Fallback mechanisms for reliability
