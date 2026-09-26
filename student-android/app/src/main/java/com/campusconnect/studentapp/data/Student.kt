package com.campusconnect.studentapp.data

import com.google.gson.annotations.SerializedName

/**
 * Student Data Model — Lab 4
 * Matches the MongoDB Atlas schema exposed by the REST API.
 */
data class Student(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("_id")
    val mongoId: String? = null,

    @SerializedName("name")
    val name: String,

    @SerializedName("email")
    val email: String,

    @SerializedName("course")
    val course: String,

    @SerializedName("semester")
    val semester: Int
) {
    val displayId: String
        get() = id ?: mongoId ?: "N/A"
}
