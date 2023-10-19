package com.mrousavy.camera.frameprocessor;

import androidx.annotation.Keep;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.proguard.annotations.DoNotStrip;
import java.util.Map;

/**
 * The base class of a native Frame Processor Plugin.
 *
 * Subclass this to create a custom Frame Processor Plugin, which can be called from a JS Frame Processor.
 * Once subclassed, it needs to be registered in the VisionCamera Frame Processor
 * runtime via `FrameProcessorPluginRegistry.addFrameProcessorPlugin` - ideally at app startup.

 * See: <a href="https://react-native-vision-camera.com/docs/guides/frame-processors-plugins-android">Creating Frame Processor Plugins (Android)</a>
 * for more information
 */
@DoNotStrip
@Keep
public abstract class FrameProcessorPlugin {
    /**
     * The initializer of this Frame Processor Plugin.
     * This is called everytime this Frame Processor Plugin is loaded from the JS side (`initFrameProcessorPlugin(..)`).
     * Optionally override this method to implement custom initialization logic.
     * @param options An options dictionary passed from the JS side, or null if none.
     */
    public FrameProcessorPlugin(@Nullable Map<String, Object> options) {}

    /**
     * The actual Frame Processor Plugin's implementation that runs when `plugin.call(..)` is called in the JS Frame Processor.
     * Implement your Frame Processing here, and keep in mind that this is a hot-path so optimize as good as possible.
     * See: <a href="https://react-native-vision-camera.com/docs/guides/frame-processors-tips#fast-frame-processor-plugins">Performance Tips</a>
     *
     * @param frame The Frame from the Camera. Don't call .close() on this, as VisionCamera handles that.
     * @return You can return any primitive, map or array you want.
     *         See the <a href="https://react-native-vision-camera.com/docs/guides/frame-processors-plugins-overview#types">Types</a>
     *         table for a list of supported types.
     */
    @DoNotStrip
    @Keep
    public abstract @Nullable Object callback(@NonNull Frame frame, @Nullable Map<String, Object> params);
}
