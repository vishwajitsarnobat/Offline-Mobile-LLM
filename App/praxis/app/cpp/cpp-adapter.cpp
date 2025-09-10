// android/app/src/main/cpp/cpp-adapter.cpp

#include <jsi/jsi.h>
#include <string>

// We need to use facebook::jsi namespace
using namespace facebook::jsi;

// A simple native function that takes a string and returns a new string.
// This is our "Hello World".
Value helloWorld(Runtime &runtime, const Value &thisValue, const Value *arguments, size_t count) {
    if (count != 1) {
        throw JSError(runtime, "helloWorld expects 1 argument");
    }
    std::string name = arguments[0].asString(runtime).utf8(runtime);
    std::string result = "Hello, " + name + "! This message is from C++.";
    return String::createFromUtf8(runtime, result);
}

// This function is the entry point for our JSI module.
// It's responsible for "installing" our native functions onto the JavaScript global object.
void install(Runtime &jsiRuntime) {
    auto global = jsiRuntime.global();

    // Create a host object that will hold our native functions
    auto nativeModule = Object(jsiRuntime);

    // Expose the helloWorld function to JavaScript under the name "helloWorld"
    nativeModule.setProperty(jsiRuntime, "helloWorld",
        Function::createFromHostFunction(jsiRuntime, PropNameID::forAscii(jsiRuntime, "helloWorld"), 1, helloWorld)
    );
    
    // TODO: Add more functions here later (e.g., generateResponse, performRAGSearch)

    // Install our nativeModule onto the JavaScript global object under the name "NativeAI"
    global.setProperty(jsiRuntime, "NativeAI", std::move(nativeModule));
}