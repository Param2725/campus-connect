# CampusConnect Mobile Application (Android - Lab 4)

**Service-Oriented Architecture (SOA) Lab 4 Assignment**  
**Tech Stack**: Android SDK (Kotlin, Material Design 3, Retrofit 2, Kotlin Coroutines)

---

## 📱 Application Modules & Screens

Corresponding to the requirements for Lab 4 Part C:
1. **Student Overview (`MainActivity`)**: Connects to `GET /students` using Retrofit and displays student records using `RecyclerView` integrated with pull-to-refresh (`SwipeRefreshLayout`).
2. **New Student Registration (`AddStudentActivity`)**: Sends requests to `POST /students` via Retrofit, featuring input validation, standard HTTP `201 Created` confirmation, and `400 Bad Request` error handling via Android `Toast` notifications.

---

## 🌐 Network Configuration

The API base URL is specified inside:
`app/src/main/java/com/campusconnect/studentapp/network/RetrofitClient.kt`

```kotlin
// Android Emulator host alias (10.0.2.2 routes to computer localhost)
const val API_BASE_URL = "http://10.0.2.2:3000/"

// For physical Android hardware on the local network:
// const val API_BASE_URL = "http://192.168.1.X:3000/"
```

---

## 🚀 Execution Steps in Android Studio

1. Launch **Android Studio**.
2. Select **Open** and target the `student-android` workspace folder.
3. Wait for Gradle dependency sync (Retrofit, Gson, Material Components, SwipeRefreshLayout).
4. Launch an Android Virtual Device (AVD with Android 7.0 / API 24 or newer).
5. Confirm the backend API node is active on port 3000 (`npm start` inside `student-api`).
6. Press **Run 'app'** (`Shift + F10`).

---

## 📸 Verification & Screenshots

1. **Student Directory View**: Displaying records fetched from the REST API / MongoDB.
2. **Registration Form**: Entering details for a new student record.
3. **Success Notice**: Displaying `✅ 201 Created: Student added to MongoDB Atlas!`.
4. **Validation Test (Negative path)**: Submitting blank fields triggering `❌ HTTP 400 Bad Request`.

