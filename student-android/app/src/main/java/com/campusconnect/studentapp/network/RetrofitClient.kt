package com.campusconnect.studentapp.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton Retrofit Client Configuration — Lab 4
 *
 * Base URL Consideration:
 * - 10.0.2.2 is the special alias for the host machine's loopback interface in the Android Emulator.
 * - Change to your local Wi-Fi IP (e.g. http://192.168.1.100:3000/) when running on a physical Android phone.
 */
object RetrofitClient {

    // Centralized API Base URL
    const val API_BASE_URL = "http://10.0.2.2:3000/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    val apiService: StudentApiService by lazy {
        Retrofit.Builder()
            .baseUrl(API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(StudentApiService::class.java)
    }
}
