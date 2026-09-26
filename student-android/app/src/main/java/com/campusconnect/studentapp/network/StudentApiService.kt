package com.campusconnect.studentapp.network

import com.campusconnect.studentapp.data.SingleStudentResponse
import com.campusconnect.studentapp.data.Student
import com.campusconnect.studentapp.data.StudentListResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit REST API interface for Student endpoints.
 * Consumes the common REST service per the SOA multi-client contract.
 */
interface StudentApiService {

    // 1. List Students — GET /students
    @GET("students")
    suspend fun getStudents(): Response<StudentListResponse>

    // 2. Get Student by ID — GET /students/{id}
    @GET("students/{id}")
    suspend fun getStudentById(@Path("id") id: String): Response<SingleStudentResponse>

    // 3. Add Student — POST /students
    @POST("students")
    suspend fun createStudent(@Body student: Student): Response<SingleStudentResponse>
}
