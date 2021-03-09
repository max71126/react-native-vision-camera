# Contributing

## Guidelines

1. Don't be rude.

## Get started

1. Fork & clone the repository
2. Install dependencies
   ```
   cd react-native-vision-camera
   yarn bootstrap
   ```

> You can also open VisionCamera in [a quick online editor (github1s)](https://github1s.com/cuvent/react-native-vision-camera)

### iOS

1. Open the `example/ios/VisionCameraExample.xcworkspace` file with Xcode
2. Change signing configuration to your developer account
3. Select your device in the devices drop-down
4. Hit run

### Android

1. Open the `example/android/` folder with Android Studio
2. Select your device in the devices drop-down
3. Hit run

## Committing

We love to keep our codebases clean. To achieve that, we use linters and formatters which output errors when something isn't formatted the way we like it to be.

Before pushing your changes, you can verify that everything is still correctly formatted by running all linters:

```
yarn check-all
```

This validates Swift, Kotlin, C++ and JS/TS code:

```bash
$ yarn check-all
   yarn run v1.22.10
   Formatting Swift code..
   Linting Swift code..
   Linting Kotlin code..
   Linting JS/TS code..
   All done!
   ✨  Done in 8.05s.
```
