package com.campusconnect.studentapp.data

import com.google.gson.annotations.SerializedName

/**
 * Standard API Response envelope from the Express.js / MongoDB REST API.
 */
data class StudentListResponse(
    @SerializedName("status")
    val status: String,

    @SerializedName("count")
    val count: Int,

    @SerializedName("storage")
    val storage: String?,

    @SerializedName("data")
    val data: List<Student>
)

data class SingleStudentResponse(
    @SerializedName("status")
    val status: String,

    @SerializedName("data")
    val data: Student
)

data class ApiErrorResponse(
    @SerializedName("status")
    val status: String?,

    @SerializedName("message")
    val message: String?,

    @SerializedName("errors")
    val errors: List<String>?
)
