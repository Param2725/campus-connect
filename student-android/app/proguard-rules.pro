# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:\Users\Admin\AppData\Local\Android\Sdk/tools/proguard/proguard-android.txt

# Keep Retrofit data models
-keep class com.campusconnect.studentapp.data.** { *; }
-keepclassmembers class com.campusconnect.studentapp.data.** { *; }
