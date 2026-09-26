package com.campusconnect.studentapp.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.campusconnect.studentapp.databinding.ActivityMainBinding
import com.campusconnect.studentapp.network.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * MainActivity — List Students Screen (GET /students)
 * Web Services & SOA Laboratory — Lab 4
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: StudentAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupListeners()
        fetchStudents()
    }

    override fun onResume() {
        super.onResume()
        // Re-fetch to display newly added students
        fetchStudents()
    }

    private fun setupRecyclerView() {
        adapter = StudentAdapter(emptyList()) { student ->
            Toast.makeText(
                this,
                "${student.name} • ${student.course} (Sem ${student.semester})",
                Toast.LENGTH_SHORT
            ).show()
        }

        binding.recyclerViewStudents.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = this@MainActivity.adapter
        }
    }

    private fun setupListeners() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            fetchStudents()
        }

        binding.fabAddStudent.setOnClickListener {
            startActivity(Intent(this, AddStudentActivity::class.java))
        }
    }

    private fun fetchStudents() {
        binding.progressBar.visibility = View.VISIBLE
        binding.tvEmptyState.visibility = View.GONE

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val response = RetrofitClient.apiService.getStudents()

                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefreshLayout.isRefreshing = false

                    if (response.isSuccessful) {
                        val studentList = response.body()?.data ?: emptyList()
                        adapter.updateData(studentList)

                        if (studentList.isEmpty()) {
                            binding.tvEmptyState.visibility = View.VISIBLE
                        } else {
                            binding.tvEmptyState.visibility = View.GONE
                        }
                    } else {
                        // HTTP Error
                        val code = response.code()
                        Toast.makeText(
                            this@MainActivity,
                            "Server returned HTTP $code: Unable to load data",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefreshLayout.isRefreshing = false
                    Toast.makeText(
                        this@MainActivity,
                        "Network Error: Cannot connect to API (http://10.0.2.2:3000)",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }
}
