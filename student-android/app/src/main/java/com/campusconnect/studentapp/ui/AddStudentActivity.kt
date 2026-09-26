package com.campusconnect.studentapp.ui

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.campusconnect.studentapp.data.ApiErrorResponse
import com.campusconnect.studentapp.data.Student
import com.campusconnect.studentapp.databinding.ActivityAddStudentBinding
import com.campusconnect.studentapp.network.RetrofitClient
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * AddStudentActivity — Add Student Form (POST /students)
 * Web Services & SOA Laboratory — Lab 4
 */
class AddStudentActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAddStudentBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAddStudentBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupListeners()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupListeners() {
        binding.btnSubmit.setOnClickListener {
            submitStudent()
        }
    }

    private fun submitStudent() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val course = binding.etCourse.text.toString().trim()
        val semesterStr = binding.etSemester.text.toString().trim()

        // 1. Client-Side Validation
        binding.tilName.error = null
        binding.tilEmail.error = null
        binding.tilCourse.error = null
        binding.tilSemester.error = null
        binding.tvErrorBanner.visibility = View.GONE

        var isValid = true

        if (name.isEmpty()) {
            binding.tilName.error = "Name is required"
            isValid = false
        }
        val emailPattern = "[a-zA-Z0-9._-]+@[a-z]+\\.+[a-z]+"
        if (email.isEmpty() || !email.matches(emailPattern.toRegex())) {
            binding.tilEmail.error = "Valid email is required"
            isValid = false
        }
        if (course.isEmpty()) {
            binding.tilCourse.error = "Course is required"
            isValid = false
        }
        val semester = semesterStr.toIntOrNull()
        if (semester == null || semester < 1 || semester > 12) {
            binding.tilSemester.error = "Semester must be between 1 and 12"
            isValid = false
        }

        if (!isValid) {
            Toast.makeText(this, "Please fix form validation errors", Toast.LENGTH_SHORT).show()
            return
        }

        val studentPayload = Student(
            name = name,
            email = email,
            course = course,
            semester = semester!!
        )

        // 2. Submit to REST API
        binding.progressBar.visibility = View.VISIBLE
        binding.btnSubmit.isEnabled = false

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val response = RetrofitClient.apiService.createStudent(studentPayload)

                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.btnSubmit.isEnabled = true

                    if (response.isSuccessful) {
                        // HTTP 201 Created
                        Toast.makeText(
                            this@AddStudentActivity,
                            "✅ 201 Created: Student added to MongoDB Atlas!",
                            Toast.LENGTH_LONG
                        ).show()
                        finish()
                    } else if (response.code() == 400) {
                        // HTTP 400 Bad Request
                        val errorBody = response.errorBody()?.string()
                        val parsedError = try {
                            Gson().fromJson(errorBody, ApiErrorResponse::class.java)
                        } catch (e: Exception) {
                            null
                        }

                        val errorMsg = parsedError?.errors?.joinToString("\n")
                            ?: parsedError?.message
                            ?: "HTTP 400: Validation error from server"

                        binding.tvErrorBanner.text = "⚠️ Validation Error:\n$errorMsg"
                        binding.tvErrorBanner.visibility = View.VISIBLE

                        Toast.makeText(
                            this@AddStudentActivity,
                            "❌ HTTP 400 Bad Request: $errorMsg",
                            Toast.LENGTH_LONG
                        ).show()
                    } else {
                        Toast.makeText(
                            this@AddStudentActivity,
                            "Server Error: HTTP ${response.code()}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.btnSubmit.isEnabled = true
                    Toast.makeText(
                        this@AddStudentActivity,
                        "Network Failure: Ensure backend is running at http://10.0.2.2:3000",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }
}
