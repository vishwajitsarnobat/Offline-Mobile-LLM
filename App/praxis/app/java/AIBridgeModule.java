// android/app/src/main/java/com/your-app-name/AIBridgeModule.java

package com.your-app-name; // Use your app's package name

import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = AIBridgeModule.NAME)
public class AIBridgeModule extends ReactContextBaseJavaModule {
    public static final String NAME = "AIBridge";

    // Load the C++ library that we will create
    static {
        System.loadLibrary("cpp_adapter");
    }

    // This is the native C++ function that will install our JSI bindings
    private native void installNative(long jsiPtr);

    public AIBridgeModule(com.facebook.react.bridge.ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return NAME;
    }

    public void install(JavaScriptContextHolder jsContext) {
        if (jsContext.get() != 0) {
            this.installNative(jsContext.get());
        }
    }
}