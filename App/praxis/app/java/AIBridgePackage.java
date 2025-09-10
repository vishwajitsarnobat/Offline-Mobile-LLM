// android/app/src/main/java/com/your-app-name/AIBridgePackage.java

package com.your-app-name; // Use your app's package name

import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;

import java.util.Collections;
import java.util.List;

public class AIBridgePackage implements JSIModulePackage {
    @Override
    public List<JSIModuleSpec> getJSIModules(
            ReactApplicationContext reactApplicationContext,
            JavaScriptContextHolder jsContext
    ) {
        reactApplicationContext.getNativeModule(AIBridgeModule.class).install(jsContext);
        return Collections.emptyList();
    }
}