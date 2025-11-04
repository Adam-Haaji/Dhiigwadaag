# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Trouble starting? Offline mode

If you see a `TypeError: fetch failed` during startup (often due to a proxy, firewall, or temporary network issue), you can start Expo in offline mode which skips network lookups:

```powershell
npm run start:offline
```

Alternatively for a single session:

```powershell
$env:EXPO_OFFLINE="1"; npx expo start -c
```

Optional: disable telemetry in restricted networks

```powershell
$env:EXPO_NO_TELEMETRY="1"; npx expo start
```

If you're behind a corporate proxy, ensure the `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables are set correctly for your shell, or unset them if not needed:

```powershell
Remove-Item Env:HTTP_PROXY -ErrorAction SilentlyContinue; Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue; npx expo start
```

## API connectivity

The app talks to the backend REST API. By default, it tries to auto-detect your LAN IP from Expo and use `http://<LAN_IP>:5000`. You can override this via environment variables when starting Expo:

- EXPO_PUBLIC_API_BASE_URL: Full base URL for the backend, e.g. `http://192.168.1.20:5000`
- EXPO_PUBLIC_API_TIMEOUT_MS: Request timeout in ms. Set `0` to disable timeouts during debugging.

Examples (Windows PowerShell):

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.20:5000"; $env:EXPO_PUBLIC_API_TIMEOUT_MS="0"; npx expo start
```

Tips:
- Android emulator: use `http://10.0.2.2:5000`
- Real device on same Wi‑Fi: use your PC LAN IP (e.g., `http://192.168.x.x:5000`)
- Verify backend health at `http://<BASE_URL>/api/health`

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
