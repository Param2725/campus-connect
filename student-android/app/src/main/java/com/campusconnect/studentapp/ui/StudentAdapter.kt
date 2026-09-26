package com.campusconnect.studentapp.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.campusconnect.studentapp.data.Student
import com.campusconnect.studentapp.databinding.ItemStudentBinding

class StudentAdapter(
    private var students: List<Student>,
    private val onItemClick: ((Student) -> Unit)? = null
) : RecyclerView.Adapter<StudentAdapter.StudentViewHolder>() {

    fun updateData(newStudents: List<Student>) {
        students = newStudents
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StudentViewHolder {
        val binding = ItemStudentBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return StudentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        holder.bind(students[position])
    }

    override fun getItemCount(): Int = students.size

    inner class StudentViewHolder(private val binding: ItemStudentBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(student: Student) {
            val initials = if (student.name.isNotBlank()) {
                student.name.split(" ")
                    .filter { it.isNotEmpty() }
                    .take(2)
                    .map { it.first().uppercaseChar() }
                    .joinToString("")
            } else "ST"

            binding.tvAvatar.text = initials
            binding.tvStudentName.text = student.name
            binding.tvStudentEmail.text = student.email
            binding.tvStudentCourse.text = student.course
            binding.tvSemesterBadge.text = "Sem ${student.semester}"

            binding.root.setOnClickListener {
                onItemClick?.invoke(student)
            }
        }
    }
}
